import { createRequire } from "node:module";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { StrictMode } from "react";
import { CounterContext } from "../src/app/counter-context";
import { createEntryVault } from "../src/app/entry-token";
import { ClientError } from "../src/lib/errors";
import { RegistrationQrDisplay } from "../src/features/registration-qr/display";
import { RegistrationEntry } from "../src/features/registration-qr/entry";
import type { CurrentQr, EntryGrant, QrPort } from "../src/features/registration-qr/contracts";
import { anchor, displayFresh, safeEntryUrl, serverTime } from "../src/features/registration-qr/time";

// Load the same encoder's Node PNG output in jsdom; a mock canvas must not pretend QR decoding succeeded.
const nodeRequire = createRequire(import.meta.url);
const qrRequire = createRequire(nodeRequire.resolve("qrcode"));
const nodeQr = qrRequire("./index") as typeof QRCode;
const encodePng = nodeQr.toDataURL.bind(nodeQr);
const png = qrRequire("pngjs") as { PNG: { sync: { read(value: Buffer): { data: Uint8Array; width: number; height: number } } } };
const DISPLAY = "a064038e-85cc-432f-af75-023fa487f476";
const fixtureToken = "ZmFrZWhlYWRlcg.Zml4dHVyZXBheWxvYWQ.Zml4dHVyZXNpZ25hdHVyZQ";
const scope = { environment: "test", counterId: "1", categoryScope: null };
const date = (milliseconds: number) => new Date(milliseconds).toISOString().replace(/\.([0-9]{3})Z$/, ".$1000Z");
function current(): CurrentQr {
  const now = Date.now(); return { displaySessionId: DISPLAY, entryUrl: `${window.location.origin}/register#entry=${fixtureToken}`, scope,
    serverNow: date(now), rotateAt: date(now + 30000), expiresAt: date(now + 45000) };
}
function grant(counterId = "1", version = 1): EntryGrant {
  return { formContext: { grantReference: `synthetic_grant_${version}`, bindingVersion: version }, scope: { ...scope, counterId }, serverNow: date(Date.now()), grantExpiresAt: date(Date.now() + 1200000) };
}
function fixturePort(): QrPort {
  return { capabilities: vi.fn(async () => ({ enabled: true })), create: vi.fn(async () => ({ displaySessionId: DISPLAY })),
    current: vi.fn(async () => current()), revoke: vi.fn(async () => {}), bootstrap: vi.fn(async () => {}),
    exchange: vi.fn(async () => grant()), entry: vi.fn(async () => grant()) };
}
function vault(token: string | null = fixtureToken) {
  const location = { pathname: "/register", search: "", hash: token ? `#entry=${token}` : "" };
  return createEntryVault(location, { replaceState: () => { location.hash = ""; } });
}
function failure(code: string, status: number, details?: ClientError["restartDetails"]) {
  return new ClientError("api", { timestamp: date(Date.now()), status, code, message: "ignored raw message", correlationId: "synthetic-test", fieldErrors: [] }, details);
}
beforeEach(() => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  vi.spyOn(QRCode, "toDataURL").mockImplementation((...args: Parameters<typeof QRCode.toDataURL>) => encodePng(...args));
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("registration QR authority display", () => {
  /** Decode actual PNG pixels generated from the rendered image, not a fake illustrative QR block. */
  it("renders an actual decodable current QR", async () => {
    const port = fixturePort(); render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "Display registration QR" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Display registration QR" }));
    const image = await screen.findByRole("img", { name: /Scan this current QR/ }) as HTMLImageElement;
    const pixels = png.PNG.sync.read(Buffer.from(image.src.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height);
    expect(decoded?.data === `${window.location.origin}/register#entry=${fixtureToken}`).toBe(true);
    expect(screen.queryByText(fixtureToken)).toBeNull();
    expect(port.create).toHaveBeenCalledWith("1");
  });
  /** Disabled capability never renders or creates a display. */
  it("shows disabled state without creating authority", async () => {
    const port = fixturePort(); vi.mocked(port.capabilities).mockResolvedValue({ enabled: false });
    render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    expect(await screen.findByText("Registration QR is not enabled")).toBeTruthy();expect(port.create).not.toHaveBeenCalled();expect(screen.queryByRole("img")).toBeNull();
  });
  /** Availability failures can recover through a read without accidentally creating a display. */
  it("rechecks unavailable capabilities without replaying commands", async () => {
    const port = fixturePort(); vi.mocked(port.capabilities).mockRejectedValueOnce(new ClientError("timeout"));
    render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    fireEvent.click(await screen.findByRole("button", { name: "Check QR availability" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Display registration QR" }) as HTMLButtonElement).disabled).toBe(false));
    expect(port.capabilities).toHaveBeenCalledTimes(2); expect(port.create).not.toHaveBeenCalled();
  });
  /** Offline and visibility events hide the code synchronously and only a fresh response restores it. */
  it("hides offline and revalidates after tab sleep", async () => {
    const port = fixturePort();render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "Display registration QR" }) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole("button", { name: "Display registration QR" }));
    await screen.findByRole("img");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });fireEvent(window, new Event("offline"));expect(screen.queryByRole("img")).toBeNull();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });fireEvent(window, new Event("online"));await screen.findByRole("img");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });fireEvent(document, new Event("visibilitychange"));expect(screen.queryByRole("img")).toBeNull();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });fireEvent(document, new Event("visibilitychange"));await screen.findByRole("img");
    expect(vi.mocked(port.current).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
  /** An explicit failed revoke hides authority while accurately describing its unknown remote outcome. */
  it("never restores a code after revoke timeout", async () => {
    const port = fixturePort();vi.mocked(port.revoke).mockRejectedValue(new ClientError("timeout"));
    render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "Display registration QR" }) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole("button", { name: "Display registration QR" }));await screen.findByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Revoke display" }));await screen.findByText(/Revocation is unconfirmed/);expect(screen.queryByRole("img")).toBeNull();
  });
  /** A server/proxy returning another origin cannot make this display transport a token to that site. */
  it("rejects an untrusted entry URL", async () => {
    const port = fixturePort();vi.mocked(port.current).mockResolvedValue({ ...current(), entryUrl: `https://other.example.test/register#entry=${fixtureToken}` });
    render(<CounterContext.Provider value="1"><RegistrationQrDisplay port={port} /></CounterContext.Provider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "Display registration QR" }) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole("button", { name: "Display registration QR" }));
    await screen.findByText("Something went wrong. Please try again.");expect(screen.queryByRole("img")).toBeNull();
  });
});
describe("public grant entry", () => {
  /** StrictMode duplicate effects cannot lose the captured entry or prematurely clear a newer token. */
  it("exchanges memory-only entry and exposes the exact context to M03", async () => {
    const port = fixturePort(), store = vault();
    render(<StrictMode><RegistrationEntry port={port} vault={store}>{value => <p>Bound version {value.formContext.bindingVersion}</p>}</RegistrationEntry></StrictMode>);
    await screen.findByText("Bound version 1");expect(store.read()).toBeNull();expect(port.bootstrap).toHaveBeenCalled();expect(port.exchange).toHaveBeenCalledWith(fixtureToken);expect(screen.queryByText(fixtureToken)).toBeNull();
  });
  /** Cancel is not a replacement command and preserves the original form context. */
  it("asks before restarting and cancel keeps the old form", async () => {
    const port = fixturePort(), old = grant(), next = grant("2", 2), store = vault();
    vi.mocked(port.exchange).mockRejectedValue(failure("REGISTRATION_ENTRY_RESTART_REQUIRED", 409, { currentFormContext: old.formContext, currentScope: old.scope, requestedScope: next.scope }));
    vi.mocked(port.entry).mockResolvedValue(old);
    render(<RegistrationEntry port={port} vault={store} />);
    await screen.findByRole("dialog");fireEvent.click(screen.getByRole("button", { name: "Kekalkan borang" }));
    await screen.findByText("Akses borang aktif");expect(vi.mocked(port.exchange).mock.calls).toHaveLength(1);expect(store.read()).toBeNull();
  });
  /** Only explicit confirmation supplies expectedFormContext; no category or counter is caller-selected. */
  it("confirms with the captured old context", async () => {
    const port = fixturePort(), old = grant(), next = grant("2", 2), store = vault();
    vi.mocked(port.exchange).mockRejectedValueOnce(failure("REGISTRATION_ENTRY_RESTART_REQUIRED", 409, { currentFormContext: old.formContext, currentScope: old.scope, requestedScope: next.scope })).mockResolvedValueOnce(next);
    render(<RegistrationEntry port={port} vault={store} />);await screen.findByRole("dialog");fireEvent.click(screen.getByRole("button", { name: "Mulakan semula" }));
    await screen.findByText("Kaunter 2 · semua kategori");expect(port.exchange).toHaveBeenLastCalledWith(fixtureToken, old.formContext);expect(store.read()).toBeNull();
  });
  /** UNKNOWN does not replay the command or claim replacement failed; recovery uses GET and explicit form adoption. */
  it("recovers timeout through current entry without retrying a write", async () => {
    const port = fixturePort(), store = vault();vi.mocked(port.exchange).mockRejectedValue(new ClientError("timeout"));
    render(<RegistrationEntry port={port} vault={store} />);await screen.findByText(/Hasilnya mungkin belum diketahui/);
    fireEvent.click(screen.getByRole("button", { name: "Semak status semasa" }));await screen.findByText("Akses borang aktif");expect(port.entry).toHaveBeenCalledTimes(1);expect(port.exchange).toHaveBeenCalledTimes(1);
  });
  it("does not exchange when disabled", async () => {
    const port = fixturePort();vi.mocked(port.capabilities).mockResolvedValue({ enabled: false });render(<RegistrationEntry port={port} vault={vault()} />);
    await screen.findByText("Pendaftaran belum diaktifkan");expect(port.exchange).not.toHaveBeenCalled();expect(port.bootstrap).not.toHaveBeenCalled();
  });
  /** Losing authority preserves typed input; another tab's replacement cannot silently bind it to a new grant. */
  it("preserves disabled input offline and resets it only after explicit current-form adoption", async () => {
    const port = fixturePort(), old = grant(), next = grant("2", 2);
    vi.mocked(port.exchange).mockResolvedValue(old); vi.mocked(port.entry).mockResolvedValue(old);
    render(<RegistrationEntry port={port} vault={vault()}>{value => <label>Visitor note<input aria-label="Visitor note" defaultValue="" data-version={value.formContext.bindingVersion} /></label>}</RegistrationEntry>);
    const input = await screen.findByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Synthetic retained input" } });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); fireEvent(window, new Event("offline"));
    expect(input.closest("fieldset")?.disabled).toBe(true); expect(input.value).toBe("Synthetic retained input");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); fireEvent(window, new Event("online"));
    await waitFor(() => expect(input.closest("fieldset")?.disabled).toBe(false));
    expect(input.value).toBe("Synthetic retained input");
    vi.mocked(port.entry).mockResolvedValue(next); fireEvent(window, new Event("pageshow"));
    await screen.findByRole("button", { name: "Buka borang semasa" });
    expect(input.closest("fieldset")?.disabled).toBe(true); expect(input.dataset.version).toBe("1");
    expect(input.value).toBe("Synthetic retained input"); expect(port.exchange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Buka borang semasa" }));
    await screen.findByText("Kaunter 2 · semua kategori");
    const fresh = screen.getByRole("textbox") as HTMLInputElement;
    expect(fresh.dataset.version).toBe("2"); expect(fresh.value).toBe("");
    expect(port.entry).toHaveBeenCalledTimes(3); expect(port.exchange).toHaveBeenCalledTimes(1);
  });
  /** A stale adoption proposal and an altered expiry are rejected before enabling any existing input. */
  it("rechecks adoption and refuses same-context expiry renewal", async () => {
    const port = fixturePort(), old = grant(), next = grant("2", 2), latest = grant("3", 3);
    vi.mocked(port.exchange).mockResolvedValue(old); vi.mocked(port.entry).mockResolvedValue(next);
    render(<RegistrationEntry port={port} vault={vault()}>{() => <input aria-label="Preserved form" />}</RegistrationEntry>);
    const input = await screen.findByRole("textbox"); fireEvent(window, new Event("pageshow"));
    await screen.findByRole("button", { name: "Buka borang semasa" });
    vi.mocked(port.entry).mockResolvedValue(latest); fireEvent.click(screen.getByRole("button", { name: "Buka borang semasa" }));
    await screen.findByText("Status borang berubah lagi. Semak borang semasa sebelum membukanya.");
    expect(screen.queryByText("Kaunter 3 · semua kategori")).toBeNull(); expect(input.closest("fieldset")?.disabled).toBe(true);
    vi.mocked(port.entry).mockResolvedValue({ ...old, grantExpiresAt: date(Date.parse(old.grantExpiresAt) + 1000) });
    fireEvent.click(screen.getByRole("button", { name: "Semak status semasa" }));
    await screen.findByText("Semakan borang tidak dapat disahkan. Sila ke kaunter untuk bantuan.");
    expect(input.closest("fieldset")?.disabled).toBe(true); expect(port.exchange).toHaveBeenCalledTimes(1);
  });
});
describe("server time and URL boundaries", () => {
  /** Local wall-clock changes do not extend server authority; elapsed transport time reduces the visible window. */
  it("uses monotonic server time and exact rotation boundary", () => {
    const value = current(), time = anchor(value.serverNow, 1000, 100);
    expect(serverTime(time, 2000)).toBe(Date.parse(value.serverNow) + 1100);
    expect(displayFresh(value, time, 30899)).toBe(true);expect(displayFresh(value, time, 30900)).toBe(false);
    expect(serverTime(time, 900)).toBe(Date.parse(value.serverNow) + 100);
  });
  it("only accepts a local HTTPS or explicit loopback fragment entry", () => {
    expect(safeEntryUrl(`https://entry.example.test/register#entry=${fixtureToken}`, "https://entry.example.test")).toBe(true);
    expect(safeEntryUrl(`http://entry.example.test/register#entry=${fixtureToken}`, "http://entry.example.test")).toBe(false);
    for (const suffix of ["/register", "/register?entry=secret", "/other#entry=secret", "/register#entry=invalid"]) expect(safeEntryUrl(`https://entry.example.test${suffix}`, "https://entry.example.test")).toBe(false);
  });
});
