// Read geometry only; never inspect image URLs, cookie values or personal input during layout diagnostics.
/* eslint-disable no-unused-expressions -- Playwright CLI function expression. */
async (page) => page.evaluate(() => ({
  width: innerWidth, scroll: document.documentElement.scrollWidth,
  items: Array.from(document.querySelectorAll("body *"))
    .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
    .map(element => ({ tag: element.tagName, classes: String(element.className), width: element.getBoundingClientRect().width, right: element.getBoundingClientRect().right }))
    .slice(0, 20),
}))
