// Targeted confirmation of the final mobile spacing change against explicit synthetic UI identities.
async (page) => {
  const results = [];
  await page.context().clearCookies();
  for (const role of ['COUNTER_STAFF', 'ADMIN']) {
    await page.goto('http://127.0.0.1:15197/login');
    await page.waitForFunction(() => !document.getElementById('login')?.disabled);
    await page.getByLabel('Username / Staff account').fill(role === 'ADMIN' ? 'fixture_admin' : 'fixture_staff');
    await page.getByLabel('Password', { exact: true }).fill('fixture-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(role === 'ADMIN' ? '**/admin' : '**/staff');
    await page.getByRole('heading', { name: 'Your workspace, ready.', exact: true }).waitFor();
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    for (const [width, height] of [[375, 812], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(accept => requestAnimationFrame(() => requestAnimationFrame(accept))));
      const result = await page.evaluate(async () => {
        const footer = document.querySelector('.workspace-footer').getBoundingClientRect();
        return { viewport: { width: innerWidth, height: innerHeight }, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight, scrollWidth: document.documentElement.scrollWidth, footerBottom: footer.bottom, violations: (await window.axe.run(document.body)).violations.map(v => v.id) };
      });
      if (result.scrollHeight > result.clientHeight + 1 || result.footerBottom > result.viewport.height + 1 || result.scrollWidth > result.viewport.width + 1 || result.violations.length) throw new Error('Overview fit failed: ' + role + ' ' + JSON.stringify(result));
      results.push({ role, ...result });
    }
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByText('Local staff access is cleared. Your staff session is no longer authorised.', { exact: true }).waitFor();
  }
  return { synthetic: true, fitAssertions: true, results };
}
