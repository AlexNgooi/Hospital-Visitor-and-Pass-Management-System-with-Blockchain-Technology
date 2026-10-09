// Explicit synthetic UI fixture: audit rendered pages and bounds, never mirror CSS values in unit tests.
/* eslint-disable no-unused-expressions -- Playwright CLI evaluates this standalone expression. */
async (page) => {
  const base = 'http://127.0.0.1:15197';
  const output = 'output/playwright/ui-maintenance/';
  const results = [];
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.name));
  let loginPosts = 0;
  page.on('request', request => { if (request.url().endsWith('/api/auth/login') && request.method() === 'POST') loginPosts++; });
  const outage = route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ timestamp: 'test', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Synthetic UI outage only', correlationId: 'synthetic-ui', fieldErrors: [] }) });
  const viewports = [[1366, 768], [1440, 900], [790, 885], [375, 812], [390, 844]];

  /** New documents receive only locally installed axe; wait for actual content before inspecting it. */
  async function open(path) {
    await page.goto(base + path);
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  }

  /** Record visible targets and prove scroll reachability when the viewport cannot contain all content. */
  async function audit(state, { screenshot = false, fit = false, login = false } = {}) {
    await page.evaluate(() => new Promise(accept => requestAnimationFrame(() => requestAnimationFrame(accept))));
    const result = await page.evaluate(async () => {
      const bounds = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        document: { scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight, scrollWidth: document.documentElement.scrollWidth },
        stylesLoaded: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#ca0026',
        signIn: bounds('.sign-in'), sessionCheck: bounds('.login-actions .button-ghost'), retryLogout: bounds('.login-feedback .button-secondary'),
        security: bounds('.login-security'), footer: bounds('.login-footer, .workspace-footer'),
        summaryFocused: document.activeElement.getAttribute('role') === 'alert',
        summaryLinks: [...document.querySelectorAll('.login-feedback li a')].map(element => ({ field: element.hash.slice(1), height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width })),
        controls: [...document.querySelectorAll('button, input, select, .area-card, .status-action a')].filter(element => element.getClientRects().length).map(element => ({ tag: element.tagName, height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width })),
        violations: (await window.axe.run(document.body)).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),
      };
    });
    if (!result.stylesLoaded || result.violations.length || result.document.scrollWidth > result.viewport.width + 1) throw new Error('Rendered UI audit failed: ' + state + ' ' + JSON.stringify(result));
    if (result.controls.some(control => control.height < 43.9 || control.width < 43.9) || result.summaryLinks.some(link => link.height < 43.9 || link.width < 43.9)) throw new Error('Touch target below44: ' + state);
    result.hasVerticalScroll = result.document.scrollHeight > result.document.clientHeight + 1;
    if (fit && (result.hasVerticalScroll || result.footer?.bottom > result.viewport.height + 1 || result.signIn?.bottom > result.viewport.height + 1 || result.sessionCheck?.bottom > result.viewport.height + 1)) throw new Error('Primary login state does not fit: ' + state);
    const last = page.locator(login ? '.login-footer' : 'main').last();
    await last.scrollIntoViewIfNeeded();
    if (login) {
      result.footerReachable = await last.evaluate(element => { const r = element.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1; });
      if (!result.footerReachable) throw new Error('Footer clipped: ' + state);
    }
    await page.evaluate(() => scrollTo(0, 0));
    results.push({ state, ...result });
    if (screenshot) await page.screenshot({ path: output + state + '.png', fullPage: true });
    return result;
  }

  /** Synthetic credentials are used only against the explicitly started local fixture. */
  async function signIn(role) {
    await open('/login');
    await page.waitForFunction(() => !document.getElementById('login')?.disabled);
    await page.getByLabel('Username / Staff account').fill(role === 'ADMIN' ? 'fixture_admin' : 'fixture_staff');
    await page.getByLabel('Password', { exact: true }).fill('fixture-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(role === 'ADMIN' ? '**/admin' : '**/staff');
    await page.getByRole('heading', { name: 'Your workspace, ready.', exact: true }).waitFor();
  }

  await page.context().clearCookies();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await open('/login');
    await page.waitForFunction(() => !document.getElementById('login')?.disabled);
    await audit('login-normal-' + width, { login: true, fit: true, screenshot: width === 1366 || width === 375 });
    await page.route('**/api/auth/me', outage);
    await open('/login');
    await page.getByText('Unable to check your current session.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('alert', { name: 'Please check your sign-in details' }).waitFor();
    const result = await audit('login-error-session-' + width, { login: true, fit: true, screenshot: true });
    if (!result.summaryFocused) throw new Error('Error summary lost focus');
    for (const [label, id] of [['Username', 'login'], ['Password', 'password']]) {
      await page.getByRole('link', { name: label, exact: true }).click();
      if (!(await page.evaluate(expected => document.activeElement.id === expected, id))) throw new Error('Summary link lost field focus');
    }
    result.fieldLinksFocusInputs = true;
    await page.unroute('**/api/auth/me', outage);
  }
  if (loginPosts !== 0) throw new Error('Invalid local input made an authentication request');

  // Effective CSS viewport halves at 200% desktop zoom; DPR doubles to preserve physical image scale.
  await page.setViewportSize({ width: 683, height: 384 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 683, height: 384, deviceScaleFactor: 2.5, mobile: false });
  await page.route('**/api/auth/me', outage);
  await open('/login');
  await page.getByText('Unable to check your current session.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await audit('login-200-percent-reflow', { login: true, screenshot: true });
  await page.unroute('**/api/auth/me', outage);
  await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
  await page.setViewportSize({ width: 812, height: 375 });
  await page.route('**/api/auth/me', outage);
  await open('/login');
  await page.getByText('Unable to check your current session.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await audit('login-short-landscape', { login: true, screenshot: true });
  await page.unroute('**/api/auth/me', outage);

  for (const role of ['COUNTER_STAFF', 'ADMIN']) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await signIn(role);
    await audit(role + '-overview-desktop', { screenshot: true, fit: true });
    const paths = role === 'ADMIN' ? ['users', 'settings', 'audit'] : ['registrations', 'registration-qr', 'passes'];
    for (const viewport of [[1366, 768], [375, 812]]) {
      await page.setViewportSize({ width: viewport[0], height: viewport[1] });
      await open(role === 'ADMIN' ? '/admin' : '/staff');
      await page.getByRole('heading', { name: 'Your workspace, ready.', exact: true }).waitFor();
      await audit(role + '-overview-' + viewport[0], { screenshot: viewport[0] === 375, fit: true });
      for (const path of paths) {
        await open((role === 'ADMIN' ? '/admin/' : '/staff/') + path);
        await page.getByRole('heading', { name: 'This module is not connected' }).waitFor();
        await audit(role + '-reserved-' + path + '-' + viewport[0], { screenshot: path === paths[0] && viewport[0] === 375 });
      }
    }
    await open(role === 'ADMIN' ? '/staff' : '/admin');
    await page.getByRole('heading', { name: 'Access restricted', exact: true }).waitFor();
    await audit(role + '-access-restricted-mobile');
    await open(role === 'ADMIN' ? '/admin' : '/staff');
    await page.getByRole('heading', { name: 'Your workspace, ready.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn('COUNTER_STAFF');
  await page.route('**/api/auth/logout', outage);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Server sign-out could not be confirmed.', { exact: true }).waitFor();
  if (await page.locator('.workspace').count() || !(await page.getByRole('button', { name: 'Sign in', exact: true }).isDisabled())) throw new Error('UNKNOWN logout lost fail-closed state');
  await audit('logout-unknown-mobile', { login: true, screenshot: true });
  await page.unroute('**/api/auth/logout', outage);
  await page.getByRole('button', { name: 'Retry sign out', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  await open('/register'); await page.getByRole('heading', { name: 'Pendaftaran pelawat', exact: true }).waitFor();
  await audit('visitor-pending-mobile', { screenshot: true });
  await open('/unknown-ui-page'); await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  await audit('page-not-found-mobile');
  await page.route('**/api/auth/me', outage);
  await open('/staff'); await page.getByRole('heading', { name: 'Unable to check your session' }).waitFor();
  await audit('bootstrap-error-mobile', { screenshot: true });
  await page.unroute('**/api/auth/me', outage);
  // Keep the loading request in flight until after its visible state is captured.
  let pendingMe;
  await page.route('**/api/auth/me', route => { pendingMe = route; });
  await open('/staff'); await page.getByRole('heading', { name: 'Checking your session' }).waitFor();
  await audit('bootstrap-loading-mobile');
  await pendingMe.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ timestamp: 'test', status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Synthetic only', correlationId: 'synthetic-ui', fieldErrors: [] }) });
  await page.unroute('**/api/auth/me');
  if (exceptions.length) throw new Error('Uncaught UI exception');
  return { synthetic: true, engine: 'Chromium / final dist preview / explicit synthetic HTTP fixture', zoomScope: '200% desktop reflow simulation via CDP: 1366x768 physical CSS window -> 683x384 effective CSS viewport with doubled DPR; not native toolbar zoom', nativeBrowserZoom: 'NOT_RUN', noUncaughtJavaScriptErrors: true, invalidInputLoginPosts: 0, results };
}
