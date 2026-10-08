// Playwright CLI evaluates this expression against actual Vite/M00/MySQL, with synthetic DB records only.
/* eslint-disable no-unused-expressions -- Standalone Playwright CLI function expression. */
async (page) => {
  const checks = [];
  const responses = [];
  const jsErrors = [];
  page.on('pageerror', error => jsErrors.push(error.name));
  const track = response => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/api/')) responses.push({ path, method: response.request().method(), status: response.status() });
  };
  page.on('response', track);
  const root = 'output/playwright/real-integration/';
  // Each run starts an anonymous browser jar; prior disposable test sessions confer no local identity.
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:15191/login');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('login')?.disabled);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });

  /** Audit only visible test states; never read cookie values, tokens, inputs or real PII into evidence. */
  async function audit(step) {
    const result = await page.evaluate(async () => ({
      stylesLoaded: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#ca0026',
      violations: (await window.axe.run(document.body)).violations.map(v => v.id),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      httpOnlyCookieAbsentFromScript: !document.cookie.includes('HSAAS_SESSION'),
      persistentStorageEmpty: localStorage.length === 0 && sessionStorage.length === 0,
    }));
    if (!result.stylesLoaded || result.violations.length || result.horizontalOverflow || !result.httpOnlyCookieAbsentFromScript || !result.persistentStorageEmpty) throw new Error('Real integration state audit failed: ' + step + ' ' + JSON.stringify(result));
    checks.push({ step, ...result });
    await page.screenshot({ path: root + step + '.png', fullPage: true });
  }
  /** UI login submits exactly once; only explicit actions perform a new authentication write. */
  async function signIn(account, password = 'Synthetic-only-password_1') {
    await page.getByLabel('Username / Staff account').fill(account);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  /** Separate loopback test control changes only the temporary fixture database. */
  async function control(action) {
    const response = await page.request.post('http://127.0.0.1:15192/' + action);
    if (response.status() !== 204) throw new Error('Owned fixture control failed');
  }

  await signIn('staff_integration', 'incorrect-fixture-password');
  await page.getByText('The staff account or password is incorrect.', { exact: true }).waitFor();
  if (new URL(page.url()).pathname !== '/login') throw new Error('Invalid login created local identity');
  await audit('real-login-rejected-mobile');
  await signIn('staff_integration'); await page.waitForURL('**/staff');
  // Mobile navigation is hidden until opened; the visible sign-out control proves the mounted shell.
  await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  await audit('real-staff-mobile');
  const cookieFlags = (await page.context().cookies()).filter(cookie => cookie.name === 'HSAAS_SESSION').map(cookie => ({ httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path, sessionScoped: cookie.expires === -1 }));
  if (cookieFlags.length !== 1 || cookieFlags.some(cookie => !cookie.httpOnly || cookie.sameSite !== 'Lax' || cookie.path !== '/' || !cookie.sessionScoped)) throw new Error('Browser session cookie policy failed');

  await control('logout-fault');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Server sign-out could not be confirmed.', { exact: true }).waitFor();
  if (await page.locator('.workspace').count()) throw new Error('Protected content remained after actual logout 503');
  if (!responses.some(response => response.path === '/api/auth/logout' && response.status === 503)) throw new Error('Actual deletion fault did not produce backend 503');
  await audit('real-logout-503-mobile');
  await control('clear-fault');
  await page.getByRole('button', { name: 'Check sign-out status', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  await audit('real-logout-me401-mobile');

  await signIn('staff_integration'); await page.waitForURL('**/staff');
  await control('revoke-staff');
  // Import the same Vite module instance used by AuthProvider to exercise its actual expiry subscription.
  const expired = await page.evaluate(async () => {
    const { apiClient } = await import('/src/lib/api-client.ts');
    const { sessionSchema } = await import('/src/lib/contracts.ts');
    try { await apiClient.get('/api/auth/me', sessionSchema, { authRequired: true }); return false; }
    catch (error) { return error.status === 401 && error.code === 'AUTHENTICATION_REQUIRED'; }
  });
  if (!expired) throw new Error('Actual protected client request did not expire');
  await page.waitForURL('**/login');
  if (await page.locator('.workspace').count()) throw new Error('Expired protected content remained');
  await audit('real-epoch-expiry-mobile');

  // Drop only the post-login CSRF response after it really reaches M00; no fake successful response is supplied.
  await page.reload(); await page.waitForFunction(() => !document.getElementById('login')?.disabled);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  let csrfReads = 0;
  const loginBefore = responses.filter(response => response.path === '/api/auth/login' && response.method === 'POST').length;
  await page.route('**/api/public/csrf', async route => {
    csrfReads++;
    if (csrfReads === 2) { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await signIn('staff_integration');
  await page.getByRole('alert').waitFor();
  await audit('real-login-csrf-response-lost-mobile');
  await page.unroute('**/api/public/csrf');
  await page.getByRole('button', { name: 'Check current session', exact: true }).click();
  await page.waitForURL('**/staff');
  const ambiguousLoginPosts = responses.filter(response => response.path === '/api/auth/login' && response.method === 'POST').length - loginBefore;
  if (ambiguousLoginPosts !== 1) throw new Error('Unknown authentication replayed login');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  await signIn('admin_integration'); await page.waitForURL('**/admin');
  await page.setViewportSize({ width: 1440, height: 1024 });
  // History changes before React commits the new route; audit the ready administrator shell, not that transition.
  await page.getByRole('navigation', { name: 'Administrator navigation' }).waitFor();
  await page.getByRole('heading', { name: 'A clear view of access and accountability.', exact: true }).waitFor();
  await audit('real-admin-desktop');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  page.off('response', track);
  if (jsErrors.length) throw new Error('Uncaught application exception during real integration');
  const result = { provenance: 'Actual M00 / temporary real MySQL / Vite proxy; only post-login CSRF network response is deliberately dropped', success: true, checks, responses, cookieFlags, actualLogout503ThenMe401: true, actualClientExpiryClearedContent: true, ambiguousLoginPosts, noUncaughtJavaScriptErrors: true, https: 'NOT_RUN' };
  // Store only the sanitized result on the CLI node side through this function's returned value.
  return result;
}
