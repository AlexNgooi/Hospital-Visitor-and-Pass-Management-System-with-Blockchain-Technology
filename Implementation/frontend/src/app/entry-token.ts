/** Ephemeral entry vault. Capture before render; never persist, log or expose it in UI. */
export function createEntryVault(
  location: Pick<Location, "pathname" | "hash" | "search">,
  history: Pick<History, "replaceState"> & { state?: unknown },
) {
  let token: string | null = null;
  const listeners = new Set<() => void>();
  /** Same-document QR navigation must be sanitized too; native hash navigation does not reload. */
  function capture() {
    if (location.pathname !== "/register" || !location.hash) return;
    const value = new URLSearchParams(location.hash.slice(1)).get("entry");
    token = value && value.length <= 8192 ? value : null;
    // Clear even malformed fragments; no subsequent route/module sees token-bearing URLs.
    // Preserve Router history metadata rather than breaking subsequent back/forward navigation.
    history.replaceState(
      history.state ?? null,
      "",
      location.pathname + location.search,
    );
    listeners.forEach((listener) => listener());
  }
  capture();
  return Object.freeze({
    read: () => token,
    capture,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear: (expectedToken?: string) => {
      // A slow old exchange must not erase a newer pending entry; M02 can fence its clear.
      if (expectedToken !== undefined && expectedToken !== token) return;
      token = null;
      listeners.forEach((listener) => listener());
    },
  });
}
export type EntryVault = ReturnType<typeof createEntryVault>;
