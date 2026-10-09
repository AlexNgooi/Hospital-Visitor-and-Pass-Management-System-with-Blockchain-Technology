// Playwright CLI executes this against the dedicated synthetic M04 harness, never a real root/database adapter.
/* eslint-disable no-unused-expressions -- Playwright CLI consumes this function expression. */
async (page) => {
  const origin = "http://127.0.0.1:15404/tests/counter-review/harness.html";
  const output = "output/playwright/m04-review/";
  const checks = [], errors = [];
  page.on("pageerror", error => errors.push(error.name));

  /** UI structure and contrast run in Chromium; no auth cookies, command payloads or raw provider bodies are recorded. */
  async function audit(step) {
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const result = await page.evaluate(async () => {
      const previous = document.activeElement;
      const violations = (await window.axe.run(document.body)).violations.map(value => value.id);
      // axe may focus/scroll elements during its checks; restore the user's valid focus before taking layout evidence.
      const restore = previous instanceof HTMLElement && previous.isConnected && !previous.matches(":disabled") ? previous
        : document.querySelector(".review-detail h2, .review-page h1");
      restore?.focus({ preventScroll: true });
      return { violations,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      storageEmpty: localStorage.length === 0 && sessionStorage.length === 0,
      undersizedControls: [...document.querySelectorAll(".review-page button, .review-page select, .review-checks label, .review-reject-dialog .button, .review-reject-dialog select")]
        .filter(node => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44); }).length,
      };
    });
    if (result.violations.length || result.horizontalOverflow || !result.storageEmpty || result.undersizedControls) throw new Error("M04 browser audit failed: " + step + " " + JSON.stringify(result));
    checks.push({ step, ...result });
    await page.screenshot({ path: output + step + ".png", fullPage: true });
    await page.screenshot({ path: output + step + "-viewport.png", fullPage: false });
  }
  async function fresh(width, height) {
    await page.setViewportSize({ width, height }); await page.goto(origin);
    await page.getByRole("button", { name: /R-TEST-001/ }).waitFor();
  }
  async function selectFirst() {
    await page.getByRole("button", { name: /R-TEST-001/ }).click();
    await page.getByRole("heading", { name: "R-TEST-001", exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.matches(".review-detail h2"));
  }
  async function confirm() {
    await page.getByRole("checkbox", { name: /identity record/ }).check();
    await page.getByRole("checkbox", { name: /MRN record/ }).check();
    await page.getByRole("checkbox", { name: /ward matches/ }).check();
  }

  await fresh(1366, 768); await audit("desktop-queue"); await selectFirst();
  if (!(await page.getByRole("button", { name: "Approve registration", exact: true }).isDisabled())) throw new Error("Mock MATCH prematurely enabled approval");
  checks.push({ step: "mock-match-does-not-approve", pass: true }); await audit("desktop-detail");
  await confirm(); await page.evaluate(() => window.__m04Fixture.setFault("unknown-once"));
  await page.getByRole("button", { name: "Approve registration", exact: true }).click();
  await page.getByRole("button", { name: "Retry original command" }).waitFor();
  const disabledChecks = await page.getByRole("checkbox").evaluateAll(nodes => nodes.length === 3 && nodes.every(node => node.matches(":disabled")));
  if (!disabledChecks) throw new Error("UNKNOWN fieldset did not natively disable confirmations");
  checks.push({ step: "unknown-fieldset-native-disabled", pass: true });
  await audit("desktop-unknown");
  await page.getByRole("button", { name: "Refresh detail" }).click();
  await page.getByRole("heading", { name: "Review record", exact: true }).waitFor();
  await page.getByRole("button", { name: "Retry original command" }).waitFor();
  const before = await page.evaluate(() => window.__m04Fixture.counts());
  if (before.commandCount !== 1 || before.writeCount !== 1) throw new Error("Status read replayed a command");
  await page.getByRole("button", { name: "Retry original command" }).click();
  await page.getByText(/Approved registration R-TEST-001/).waitFor();
  const after = await page.evaluate(() => window.__m04Fixture.counts());
  if (after.commandCount !== 1 || after.writeCount !== 2 || after.keys[0] !== after.keys[1]) throw new Error("UNKNOWN retry replaced its handle/key");
  checks.push({ step: "unknown-original-handle-after-generic-detail-refresh", pass: true }); await audit("desktop-approved");

  await fresh(1366, 768); await selectFirst(); await confirm(); await page.evaluate(() => window.__m04Fixture.setFault("conflict"));
  await page.getByRole("button", { name: "Approve registration", exact: true }).click(); await page.getByText(/This review conflicts/).waitFor();
  if (await page.getByRole("checkbox").evaluateAll(nodes => nodes.some(node => node.checked))) throw new Error("Conflict retained confirmations");
  await audit("desktop-conflict"); await page.getByRole("button", { name: "Refresh detail" }).click();
  await page.getByRole("heading", { name: "R-TEST-001", exact: true }).waitFor();
  if (!(await page.getByRole("button", { name: "Approve registration", exact: true }).isDisabled())) throw new Error("Refresh silently restored evidence");
  checks.push({ step: "version-conflict-clears-evidence", pass: true });
  await page.getByRole("button", { name: "Reject registration", exact: true }).click();
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await page.getByText("A reason is required.").waitFor();
  const focused = await page.evaluate(() => document.activeElement?.textContent.includes("Choose a rejection reason"));
  if (!focused) throw new Error("Rejection summary did not receive focus");
  await audit("desktop-rejection-required"); await page.getByRole("combobox", { name: "Rejection reason", exact: true }).selectOption("INFORMATION_INCOMPLETE");
  await page.getByRole("button", { name: "Confirm rejection" }).click(); await page.getByText(/Rejected registration/).waitFor();
  await audit("desktop-rejected");

  await fresh(375, 812); await audit("mobile-queue"); await selectFirst(); await audit("mobile-detail");
  await page.getByRole("button", { name: "Reject registration", exact: true }).click(); await audit("mobile-rejection");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  if (!(await page.getByRole("button", { name: "Reject registration", exact: true }).evaluate(node => node === document.activeElement))) throw new Error("Cancel failed to restore focus");
  checks.push({ step: "mobile-dialog-focus-return", pass: true });

  // CSS zoom is an explicit reflow simulation, not evidence of native browser toolbar zoom.
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; }); await audit("css-zoom-200-reflow");
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  await page.setViewportSize({ width: 812, height: 375 }); await page.emulateMedia({ reducedMotion: "reduce" }); await audit("landscape-reduced-motion");

  await fresh(375, 812); await selectFirst(); await page.evaluate(() => window.__m04Fixture.setFault("queue-offline"));
  await page.getByRole("button", { name: "Refresh queue" }).click(); await page.getByText(/Queue data may be stale/).waitFor(); await audit("mobile-stale-queue");
  await page.evaluate(() => window.__m04Fixture.setFault("forbidden")); await page.getByRole("button", { name: "Refresh queue" }).click();
  await page.getByRole("heading", { name: "Review access is no longer available" }).waitFor();
  if (await page.getByText("DEMO-****0021", { exact: true }).count()) throw new Error("Access loss retained operational details");
  await audit("mobile-access-revoked");
  if (errors.length) throw new Error("Unexpected page exception: " + errors.join(","));
  return { scope: "synthetic UI/client only; no M03/MySQL review E2E", checks, pageErrors: errors, nativeToolbarZoom: "NOT_RUN" };
}
