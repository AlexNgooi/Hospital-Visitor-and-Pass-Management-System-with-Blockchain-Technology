// Explicit synthetic fixture check for review regressions; no real M00 session/DB is used.
/* eslint-disable no-unused-expressions -- Playwright CLI evaluates this standalone function expression. */
async (page) => {
  // Reset client CSRF/auth memory so this regression flow can be repeated against the fixture.
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('login')?.disabled);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits = [];
  async function audit(step) {
    const result = await page.evaluate(async () => ({ stylesLoaded: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#ca0026', violations: (await window.axe.run(document.body)).violations.map(v => v.id), horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
    if (!result.stylesLoaded || result.violations.length || result.horizontalOverflow) throw new Error('Synthetic recovery accessibility check failed: ' + JSON.stringify(result));
    audits.push({ step, ...result });
  }
  let csrfRequests = 0;
  let loginPosts = 0;
  const countLogin = request => { if (request.url().endsWith('/api/auth/login') && request.method() === 'POST') loginPosts++; };
  page.on('request', countLogin);
  const unavailable = JSON.stringify({ timestamp: 'test', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Synthetic failure only', correlationId: 'synthetic-review', fieldErrors: [] });
  await page.route('**/api/public/csrf', async route => {
    csrfRequests++;
    if (csrfRequests === 2) await route.fulfill({ status: 503, contentType: 'application/json', body: unavailable });
    else await route.continue();
  });
  await page.getByLabel('Username / Staff account').fill('fixture_staff');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').waitFor();
  await page.getByRole('button', { name: 'Check current session', exact: true }).waitFor();
  if (loginPosts !== 1) throw new Error('Unexpected automatic login replay.');
  await audit('login-CSRF-unknown');
  await page.screenshot({ path: 'output/playwright/review-login-csrf-unknown-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Check current session', exact: true }).click();
  await page.waitForURL('**/staff');
  if (loginPosts !== 1) throw new Error('Session recovery replayed login.');
  await page.route('**/api/auth/logout', route => route.fulfill({ status: 503, contentType: 'application/json', body: unavailable }));
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Server sign-out could not be confirmed.', { exact: true }).waitFor();
  if (await page.getByRole('navigation', { name: 'Counter navigation' }).count()) throw new Error('Protected navigation survived logout.');
  if (!(await page.getByRole('button', { name: 'Sign in', exact: true }).isDisabled())) throw new Error('Unresolved logout permitted login.');
  await audit('logout-unknown');
  await page.screenshot({ path: 'output/playwright/review-logout-unknown-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Check sign-out status', exact: true }).click();
  await page.getByText(/The server session is still active/).waitFor();
  if (new URL(page.url()).pathname !== '/login') throw new Error('Old server identity was restored.');
  await audit('logout-still-active');
  await page.screenshot({ path: 'output/playwright/review-logout-still-active-mobile.png', fullPage: true });
  await page.unroute('**/api/auth/logout');
  await page.getByRole('button', { name: 'Retry sign out', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  await audit('logout-confirmed');
  await page.screenshot({ path: 'output/playwright/review-logout-confirmed-mobile.png', fullPage: true });
  await page.unroute('**/api/public/csrf');
  page.off('request', countLogin);
  return { synthetic: true, explicitSessionCheck: true, loginPosts, protectedContentCleared: true, oldIdentityNotRestored: true, explicitLogoutRetry: true, audits };
}
