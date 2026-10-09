import type { CurrentQr } from "./contracts";

/** A monotonic anchor avoids trusting browser wall-clock changes; elapsed network time is conservatively included. */
export interface ServerAnchor { serverMs: number; monotonicMs: number }
export function anchor(serverNow: string, receivedAt: number, elapsed: number): ServerAnchor {
  return { serverMs: Date.parse(serverNow) + Math.max(0, elapsed), monotonicMs: receivedAt };
}
export function serverTime(value: ServerAnchor, monotonicNow: number): number {
  return value.serverMs + Math.max(0, monotonicNow - value.monotonicMs);
}
/** The displayed code must disappear at rotation while a new code is fetched, even during the scan overlap. */
export function displayFresh(value: CurrentQr, time: ServerAnchor, now: number): boolean {
  return serverTime(time, now) < Math.min(Date.parse(value.rotateAt), Date.parse(value.expiresAt));
}
/** Only a same-origin fragment entry URL is rendered; a malformed response never creates a clickable fallback. */
export function safeEntryUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.origin === origin && (url.protocol === "https:" || (local && url.protocol === "http:"))
      && url.pathname === "/register" && !url.search && !url.username && !url.password
      && /^#entry=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(url.hash)
      && url.hash.length <= 2055;
  } catch { return false; }
}
