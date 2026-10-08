// Playwright CLI snippet: audits the current page using locally installed axe, never a remote script.
/* eslint-disable no-unused-expressions -- The CLI evaluates this standalone function expression. */
async (page) => {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const result = await page.evaluate(async () => ({
    stylesLoaded:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() === "#ca0026",
    violations: (await window.axe.run(document.body)).violations.map(
      (violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      }),
    ),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  if (
    !result.stylesLoaded ||
    result.horizontalOverflow ||
    result.violations.length
  )
    throw new Error(
      "Browser layout/accessibility audit failed: " + JSON.stringify(result),
    );
  return result;
}
