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
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByLabel("Username / Staff account").fill("staff_integration");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-only-password_1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/staff");
  await page.getByRole("navigation", { name: "Counter navigation" }).getByRole("link", { name: "Registration QR", exact: true }).click();
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
    // CSS zoom can misplace Playwright's coordinate mask. Hide every current/replaced image through CSS instead.
    const redaction = await target.addStyleTag({ content: ".qr-scan-area img { visibility: hidden !important; }" });
    try { await target.screenshot({ path: root + step + ".png", fullPage: true }); }
    finally { await redaction.evaluate(element => element.remove()); }
  }
  /** Measure actual first-screen controls and decode the current PNG at its rendered pixelated size, memory only. */
  async function primaryFit(target, step, recovery = false) {
    await target.addScriptTag({ path: "node_modules/jsqr/dist/jsQR.js" });
    const result = await target.evaluate(recovery => {
      const bounds = element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      const items = recovery ? [document.querySelector(".qr-revocation button")] : [document.querySelector(".qr-scan-area img"), document.querySelector(".qr-display-feature .qr-live"), ...document.querySelectorAll(".qr-controls button")];
      const rectangles = items.map(element => element && bounds(element));
      const visible = rectangles.every(box => box && box.top >= 0 && box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1);
      const touchSized = [...document.querySelectorAll(recovery ? ".qr-revocation button" : ".qr-controls button")].every(element => bounds(element).height >= 44 && bounds(element).width >= 44);
      let decodedAtRenderedSize = null, renderedPixels = null;
      if (!recovery) {
        const image = document.querySelector(".qr-scan-area img"), box = bounds(image);
        const decode = (width, height) => {
          const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
          const context = canvas.getContext("2d"); context.imageSmoothingEnabled = false;
          context.drawImage(image, 0, 0, width, height);
          return window.jsQR(context.getImageData(0, 0, width, height).data, width, height);
        };
        const original = decode(image.naturalWidth, image.naturalHeight), resized = decode(Math.round(box.width), Math.round(box.height));
        // Compare decoded capabilities only in memory; return no PNG bytes, URL, token or public reference.
        decodedAtRenderedSize = Boolean(original && resized && original.data === resized.data);
        renderedPixels = { width: Math.round(box.width), height: Math.round(box.height) };
      }
      return { viewport: { width: innerWidth, height: innerHeight }, rectangles, visible, touchSized, decodedAtRenderedSize, renderedPixels,
        renderedDecoder: recovery ? null : "nearest-neighbor canvas simulation at measured CSS size; physical camera NOT_RUN",
        documentHeight: document.documentElement.scrollHeight, documentFits: document.documentElement.scrollHeight <= innerHeight + 1 };
    }, recovery);
    if (!result.visible || !result.touchSized || !result.documentFits || (!recovery && !result.decodedAtRenderedSize)) throw new Error("QR primary viewport/decode failed: " + step + " " + JSON.stringify(result));
    checks.push({ step, ...result });
  }
  await primaryFit(page, "live-first-screen-desktop1366");
  await audit(page, "live-display-desktop");
  await page.setViewportSize({ width: 1440, height: 900 });
  await primaryFit(page, "live-first-screen-desktop1440"); await audit(page, "live-display-desktop1440");
  const image = await page.getByRole("img").getAttribute("src");
  // Observe an actual next-slot image, rather than locally changing an illustrative QR.
  await page.waitForFunction(old => document.querySelector(".qr-scan-area img")?.getAttribute("src") !== old && !!document.querySelector(".qr-scan-area img"), image, { timeout: 40000 });
  checks.push({ step: "server-slot-real-payload-change", changed: true });
  await page.setViewportSize({ width: 375, height: 812 }); await page.evaluate(() => window.scrollTo(0, 0));
  await primaryFit(page, "live-first-screen-mobile"); await audit(page, "live-display-mobile");
  await page.locator(".qr-guidance summary").focus(); await page.keyboard.press("Enter");
  if (!await page.getByText("The server changes this QR every 30 seconds. Each code expires after 45 seconds.").isVisible()) throw new Error("Keyboard guidance disclosure failed");
  await audit(page, "live-guidance-expanded-mobile"); await page.keyboard.press("Enter"); await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 375, height: 568 }); await audit(page, "live-display-short-screen");
  await page.setViewportSize({ width: 375, height: 812 });
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
  // Lose the actual successful revoke response, then retry only the original source after changing selected counter.
  let revokePosts = 0, originalRevokePath;
  await page.route("**/api/staff/registration-qr-sessions/*/revoke", async route => {
    const path = new URL(route.request().url()).pathname; revokePosts++;
    if (revokePosts === 1) {
      originalRevokePath = path; const response = await route.fetch(); await response.dispose(); await route.abort("failed");
    } else {
      if (path !== originalRevokePath) throw new Error("Revoke retry changed the original source");
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "Revoke display", exact: true }).click();
  await page.getByText("Display revocation is unconfirmed", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0)); await primaryFit(page, "unknown-revoke-retry-first-screen", true);
  await audit(page, "revoke-unknown-hidden");
  await page.setViewportSize({ width: 1366, height: 768 }); await page.evaluate(() => window.scrollTo(0, 0));
  await primaryFit(page, "unknown-revoke-first-screen-desktop1366", true); await audit(page, "revoke-unknown-desktop");
  await page.setViewportSize({ width: 1440, height: 900 });
  await primaryFit(page, "unknown-revoke-first-screen-desktop1440", true); await audit(page, "revoke-unknown-desktop1440");
  await page.setViewportSize({ width: 375, height: 812 }); await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("combobox").selectOption("9007199254741002");
  await page.getByText("Original counter 9007199254741001", { exact: true }).waitFor();
  await primaryFit(page, "unknown-revoke-changed-counter-first-screen", true);
  if (revokePosts !== 1 || await page.getByRole("img").count()) throw new Error("Unknown revoke auto-retried or restored a code");
  await audit(page, "revoke-unknown-counter-changed");
  await page.getByRole("button", { name: "Retry revoke", exact: true }).click(); await page.getByText(/This display was revoked/).waitFor();
  if (revokePosts !== 2) throw new Error("Explicit revoke retry did not preserve one original command");
  checks.push({ step: "real-revoke-response-loss-original-source", originalCounterPreserved: true, sameOriginalDisplay: true, writeAttempts: revokePosts, automaticRetries: 0 });
  await page.unroute("**/api/staff/registration-qr-sessions/*/revoke");
  await audit(page, "revoked-display-hidden");
  if (errors.length) throw new Error("Unexpected browser exception");
  await visitorContext.close();
  await page.evaluate(async receipt => {
    await fetch("http://127.0.0.1:15293/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(receipt) });
  }, { checks, responseStatuses: responses, browserErrors: errors, realBackend: true, realMysql: true, syntheticRecords: true, cameraAndProductionHttps: "NOT_RUN" });
  return { checks: checks.length, browserErrors: errors.length, screenshotQrRedacted: true, realBackend: true, syntheticRecords: true };
}
