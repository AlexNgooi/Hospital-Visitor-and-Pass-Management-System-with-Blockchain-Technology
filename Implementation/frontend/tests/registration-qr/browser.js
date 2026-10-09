// Playwright CLI runs this against actual M02/M00/Vite and an owned temporary MySQL; only records are synthetic.
/* eslint-disable no-unused-expressions -- Playwright CLI consumes this function expression. */
async (page) => {
  const root = "output/playwright/m02-qr/";
  const origin = "http://127.0.0.1:15292";
  const checks = [], errors = [], responses = [];
  page.on("pageerror", error => errors.push(error.name));
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/")) responses.push({ path: url.pathname, method: response.request().method(), status: response.status() });
  });
  await page.context().clearCookies(); await page.goto(origin + "/login");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Username / Staff account").fill("staff_integration");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-only-password_1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/staff");
  await page.getByRole("link", { name: "Registration QR", exact: true }).click();
  await page.getByRole("button", { name: "Display registration QR", exact: true }).click();
  await page.getByRole("img", { name: /Scan this current QR/ }).waitFor();

  /** Audit/screenshot metadata never stores cookies, token URLs, or the scannable token image. */
  async function audit(target, step) {
    await target.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const result = await target.evaluate(async () => ({
      violations: (await window.axe.run(document.body)).violations.map(value => value.id),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      storageEmpty: localStorage.length === 0 && sessionStorage.length === 0,
      tokenAbsentFromVisibleText: !document.body.innerText.includes("#entry="),
      fragmentCleared: !location.hash,
    }));
    if (result.violations.length || result.horizontalOverflow || !result.storageEmpty || !result.tokenAbsentFromVisibleText || !result.fragmentCleared) throw new Error("QR browser audit failed: " + step + " " + JSON.stringify(result));
    checks.push({ step, ...result });
    await target.screenshot({ path: root + step + ".png", fullPage: true, mask: [target.locator(".qr-scan-area img")], maskColor: "#d9dde3" });
  }
  await audit(page, "live-display-desktop");
  const image = await page.getByRole("img").getAttribute("src");
  // Observe an actual next-slot image, rather than locally changing an illustrative QR.
  await page.waitForFunction(old => document.querySelector(".qr-scan-area img")?.getAttribute("src") !== old && !!document.querySelector(".qr-scan-area img"), image, { timeout: 40000 });
  checks.push({ step: "server-slot-real-payload-change", changed: true });
  await page.setViewportSize({ width: 375, height: 812 }); await audit(page, "live-display-mobile");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; }); await audit(page, "live-display-mobile-zoom200");
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  await page.context().setOffline(true); await page.waitForFunction(() => !document.querySelector(".qr-scan-area img"));
  await audit(page, "display-offline-hidden");
  await page.context().setOffline(false); await page.getByRole("img").waitFor();

  // Entry URLs stay in this process's memory; they are neither printed nor written into receipts.
  const firstUrl = await page.evaluate(async () => {
    const bootstrap = await (await fetch("/api/public/csrf", { cache: "no-store" })).json();
    const created = await (await fetch("/api/staff/registration-qr-sessions", { method: "POST", headers: { "Content-Type": "application/json", [bootstrap.headerName]: bootstrap.token }, body: JSON.stringify({ counterId: "9007199254741001", categoryScope: null }) })).json();
    return (await (await fetch(`/api/staff/registration-qr-sessions/${created.displaySessionId}/current`, { cache: "no-store" })).json()).entryUrl;
  });
  const visitorContext = await page.context().browser().newContext({ viewport: { width: 375, height: 812 } });
  const visitor = await visitorContext.newPage(); visitor.on("pageerror", error => errors.push(error.name));
  await visitor.goto(firstUrl); await visitor.getByText("Akses borang aktif", { exact: true }).waitFor();
  await audit(visitor, "visitor-entry-mobile");
  const secondUrl = await page.evaluate(async () => {
    const bootstrap = await (await fetch("/api/public/csrf", { cache: "no-store" })).json();
    const created = await (await fetch("/api/staff/registration-qr-sessions", { method: "POST", headers: { "Content-Type": "application/json", [bootstrap.headerName]: bootstrap.token }, body: JSON.stringify({ counterId: "9007199254741002", categoryScope: "1" }) })).json();
    return (await (await fetch(`/api/staff/registration-qr-sessions/${created.displaySessionId}/current`, { cache: "no-store" })).json()).entryUrl;
  });
  await visitor.goto(secondUrl); await visitor.getByRole("dialog").waitFor();await audit(visitor, "visitor-restart-confirmation");
  await visitor.getByRole("button", { name: "Kekalkan borang" }).click();await visitor.getByText("Akses borang aktif", { exact: true }).waitFor();
  checks.push({ step: "cancel-keeps-existing-form", oldCounterVisible: (await visitor.locator(".qr-entry-card h2").innerText()).includes("9007199254741001") });
  await visitor.goto(secondUrl);await visitor.getByRole("dialog").waitFor();
  await visitor.getByRole("button", { name: "Mulakan semula" }).click();await visitor.getByText("Kaunter 9007199254741002 · kategori 1", { exact: true }).waitFor();
  await audit(visitor, "visitor-confirmed-restart");
  const bound = await visitor.evaluate(async () => (await (await fetch("/api/public/registration-entry", { cache: "no-store" })).json()).formContext);
  // Drop only the response after the confirmed command reaches the actual backend; recovery must use GET.
  let commandPosts = 0;
  await visitor.route("**/api/public/registration-entry/exchange", async route => { commandPosts++; const response = await route.fetch(); await response.dispose(); await route.abort("failed"); });
  await visitor.goto(secondUrl);await visitor.getByText("Semak akses pendaftaran", { exact: true }).waitFor();
  await visitor.getByRole("button", { name: "Semak status semasa" }).click();await visitor.getByText("Akses borang aktif", { exact: true }).waitFor();
  const same = await visitor.evaluate(async previous => {
    const value = await (await fetch("/api/public/registration-entry", { cache: "no-store" })).json();
    return value.formContext.grantReference === previous.grantReference && value.formContext.bindingVersion === previous.bindingVersion;
  }, bound);
  if (!same || commandPosts !== 1) throw new Error("Unknown entry response caused a new command/context");
  checks.push({ step: "real-response-loss-recovery", sameContext: same, writeAttempts: commandPosts });
  await visitor.unroute("**/api/public/registration-entry/exchange");await audit(visitor, "visitor-unknown-recovered");
  await page.getByRole("button", { name: "Revoke display", exact: true }).click();await page.getByText(/This display was revoked/).waitFor();
  await audit(page, "revoked-display-hidden");
  if (errors.length) throw new Error("Unexpected browser exception");
  await visitorContext.close();
  await page.evaluate(async receipt => {
    await fetch("http://127.0.0.1:15293/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(receipt) });
  }, { checks, responseStatuses: responses, browserErrors: errors, realBackend: true, realMysql: true, syntheticRecords: true, cameraAndProductionHttps: "NOT_RUN" });
  return { checks: checks.length, browserErrors: errors.length, screenshotQrRedacted: true, realBackend: true, syntheticRecords: true };
}
