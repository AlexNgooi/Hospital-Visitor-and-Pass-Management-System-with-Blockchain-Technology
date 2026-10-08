import { createEntryVault } from "./entry-token";

// M02 reads this memory-only vault; importing it never imports or re-renders the app root.
export const entryVault = createEntryVault(window.location, window.history);

// Re-scanning the same /register document may only change the hash; capture before module work.
const captureEntry = () => entryVault.capture();
window.addEventListener("hashchange", captureEntry);
window.addEventListener("popstate", captureEntry);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener("hashchange", captureEntry);
    window.removeEventListener("popstate", captureEntry);
    entryVault.clear();
  });
