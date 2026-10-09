// Reflow specimen uses explicit effective CSS metrics; native browser toolbar zoom remains NOT_RUN.
/* eslint-disable no-unused-expressions -- Standalone Playwright CLI expression. */
async (page) => {
  await page.context().clearCookies();
  // Keep Playwright's viewport bookkeeping consistent with CDP so full-page screenshots match measured layout.
  await page.setViewportSize({ width: 683, height: 384 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 683, height: 384, deviceScaleFactor: 2.5, mobile: false });
  await page.route('**/api/auth/me', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ timestamp: 'test', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Synthetic UI only', correlationId: 'synthetic-ui', fieldErrors: [] }) }));
  await page.goto('http://127.0.0.1:15197/login');
  await page.getByText('Unable to check your current session.', { exact: true }).waitFor();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert', { name: 'Please check your sign-in details' }).waitFor();
  const result = await page.evaluate(async () => ({ viewport: { width: innerWidth, height: innerHeight, devicePixelRatio }, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight, scrollWidth: document.documentElement.scrollWidth, violations: (await window.axe.run(document.body)).violations.map(v => v.id) }));
  await page.locator('.login-footer').scrollIntoViewIfNeeded();
  const footerReachable = await page.locator('.login-footer').evaluate(element => { const r = element.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1; });
  if (!footerReachable || result.scrollWidth > result.viewport.width + 1 || result.violations.length) throw new Error('Reflow specimen failed');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/ui-maintenance/login-200-percent-reflow.png', fullPage: true });
  await page.unroute('**/api/auth/me');
  await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
  await page.setViewportSize({ width: 375, height: 812 });
  return { synthetic: true, nativeBrowserZoom: 'NOT_RUN', mode: 'CDP 200% desktop reflow simulation with effective 683x384 CSS viewport and doubled DPR2.5', footerReachable, ...result };
}
