import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ClientError } from "../../../lib/errors";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError } from "./commands";
import type { PassFeed, PassFilters } from "./contracts";

/** Keyset pages are fetched on demand; filters fence late responses and repeated scroll notifications. */
export function usePassFeed(filters: PassFilters, deny: () => void, enabled = true) {
  const key = JSON.stringify(filters);
  const [data, setData] = useState<(PassFeed & { key: string }) | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const epoch = useRef(0), inFlight = useRef(false), alive = useRef(true);
  const request = useRef<AbortController | null>(null);
  const current = enabled && data?.key === key ? data : null;
  const nextCursor = current?.nextCursor ?? null;
  const read = useCallback(async (cursor?: string) => {
    if (!enabled || inFlight.current) return;
    const generation = epoch.current;
    inFlight.current = true; setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      const result = await lifecycleApi.passes(filters, cursor, controller.signal);
      if (!alive.current || generation !== epoch.current) return;
      if (result.nextCursor === cursor || result.items.some(row => filters.history ? row.assignment.status !== "RETURNED" || !row.assignment.returnedAt : row.assignment.closedAt !== null)) throw new ClientError("invalid-response");
      setData(previous => {
        const retained = cursor && previous?.key === key ? previous.items : [];
        const ids = new Set(retained.map(row => row.assignment.id));
        return { ...result, key, items: [...retained, ...result.items.filter(row => !ids.has(row.assignment.id))] };
      });
    } catch (error) {
      if (!alive.current || generation !== epoch.current || controller.signal.aborted) return;
      setError(lifecycleError(error));
      if (lifecycleAccessLost(error)) { setData(null); deny(); }
    } finally {
      if (alive.current && generation === epoch.current) { inFlight.current = false; setBusy(false); }
    }
  }, [filters, key, deny, enabled]);
  const cancel = useCallback(() => { epoch.current++; request.current?.abort(); inFlight.current = false; }, []);
  useEffect(() => {
    alive.current = true; let active = true;
    cancel();
    queueMicrotask(() => { if (active) { setData(null); if (enabled) void read(); else setBusy(false); } });
    return () => { active = false; alive.current = false; cancel(); };
  }, [read, cancel, enabled]);
  const refresh = useCallback(() => { cancel(); void read(); }, [cancel, read]);
  const more = useCallback(() => { if (nextCursor) void read(nextCursor); }, [nextCursor, read]);
  // Remove only after the server confirms return, so an unavailable refresh cannot resurrect a completed row.
  const remove = useCallback((id: string) => setData(previous => previous ? { ...previous, items: previous.items.filter(row => row.assignment.id !== id) } : previous), []);
  return { items: current?.items ?? [], nextCursor: current?.nextCursor ?? null, serverNow: current?.serverNow,
    busy, error, refresh, more, remove, ready: current !== null };
}

/** Observe the bottom of the scroll region; failures require an explicit read retry rather than a retry loop. */
export function usePassScroll(root: RefObject<HTMLDivElement | null>, sentinel: RefObject<HTMLDivElement | null>,
  feed: ReturnType<typeof usePassFeed>) {
  const { nextCursor, busy, error, more } = feed;
  useEffect(() => {
    if (!root.current || !sentinel.current || !nextCursor || busy || error) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) more();
    }, { root: root.current, rootMargin: "0px 0px 160px 0px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [root, sentinel, nextCursor, busy, error, more]);
}

/** Search remains memory-only and is debounced to avoid issuing a request for every keystroke. */
export function usePassSearch() {
  const [input, setInput] = useState(""), [search, setSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [input]);
  return { input, setInput, search };
}
