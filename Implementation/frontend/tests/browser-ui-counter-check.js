// Shared chooser regression uses synthetic C01 decimal-string IDs; no M02 business operation is performed.
/* eslint-disable no-unused-expressions -- Standalone Playwright CLI expression. */
async (page) => {
  const ids = ['9007199254741001', '9007199254741002'];
  const results = [];
  await page.context().clearCookies();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://127.0.0.1:15197/login');
  await page.waitForFunction(() => !document.getElementById('login')?.disabled);
  await page.getByLabel('Username / Staff account').fill('fixture_staff');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/staff');
  // Only the browser's explicit fixture response substitutes long counter grants for this layout specimen.
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '9007199254740993', login: 'fixture_staff', role: 'COUNTER_STAFF', counterIds: ids }) }));
  await page.reload();
  await page.getByRole('combobox', { name: 'Counter access', exact: true }).waitFor();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  for (const zoom of [1, 2]) {
    await page.evaluate(scale => { document.body.style.zoom = String(scale); }, zoom);
    await page.getByRole('combobox', { name: 'Counter access', exact: true }).selectOption(ids[1]);
    const result = await page.evaluate(async () => {
      const select = document.querySelector('.counter-bar select');
      const bounds = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      return { viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, select: bounds(select), container: bounds(select.parentElement), selectedValue: select.value, optionValues: [...select.options].map(option => option.value), violations: (await window.axe.run(document.body)).violations.map(v => v.id) };
    });
    if (result.scrollWidth > result.viewport.width + 1 || result.select.right > result.container.right + 1 || result.select.width > result.container.width + 1 || result.select.height < 43.9 || result.selectedValue !== ids[1] || JSON.stringify(result.optionValues) !== JSON.stringify(ids) || result.violations.length) throw new Error('Long counter layout failed: ' + JSON.stringify(result));
    results.push({ cssZoom: zoom, nativeBrowserZoom: 'NOT_RUN', ...result });
    await page.screenshot({ path: `output/playwright/ui-maintenance/counter-long-id-css-zoom-${zoom}.png`, fullPage: true });
  }
  await page.evaluate(() => { document.body.style.zoom = ''; });
  await page.unroute('**/api/auth/me');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  return { synthetic: true, scope: 'Shared counter chooser only; CSS zoom simulation, no M02 source or business operation', results };
}
