// Synthetic-only CLI check; page URL must be sanitized before any screenshot is taken.
/* eslint-disable no-unused-expressions -- The CLI evaluates this standalone function expression. */
async (page) => {
  const origin = new URL(page.url()).origin;
  // Load the current build, then check both first ingress and another same-document hash entry.
  await page.reload();
  await page.goto(origin + "/register#entry=synthetic-test-only");
  await page.getByRole("heading", { name: "Pendaftaran pelawat" }).waitFor();
  await page.waitForFunction(() => location.hash === '');
  await page.goto(origin + '/register#entry=synthetic-second-entry');
  await page.waitForFunction(() => location.hash === '');
  const result = await page.evaluate(() => ({
    fragmentCleared: location.hash === "",
    language: document.documentElement.lang,
    noPersistentStorage:
      localStorage.length === 0 && sessionStorage.length === 0,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  if (
    !result.fragmentCleared ||
    result.language !== "ms" ||
    !result.noPersistentStorage ||
    result.horizontalOverflow
  )
    throw new Error("Synthetic public entry check failed: " + JSON.stringify(result));
  return result;
}
