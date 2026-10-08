/** Ephemeral entry vault. Capture before render; never persist, log or expose it in UI. */
export function createEntryVault(
  location: Pick<Location, "pathname" | "hash" | "search">,
  history: Pick<History, "replaceState">,
) {
  let token: string | null = null;
  if (location.pathname === "/register" && location.hash) {
    const value = new URLSearchParams(location.hash.slice(1)).get("entry");
    token = value && value.length <= 8192 ? value : null;
    // Clear even malformed fragments; no subsequent route/module sees token-bearing URLs.
    history.replaceState(null, "", location.pathname + location.search);
  }
  return Object.freeze({
    read: () => token,
    clear: () => {
      token = null;
    },
  });
}
export type EntryVault = ReturnType<typeof createEntryVault>;
