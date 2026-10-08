import { createEntryVault } from "./entry-token";

// M02 reads this memory-only vault; importing it never imports or re-renders the app root.
export const entryVault = createEntryVault(window.location, window.history);
