import { ToastNotice } from "../../components/ui/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, QrCode, ShieldCheck, WifiOff, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../../app/auth-context";
import { Button, StatusPanel } from "../../components/ui/primitives";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { safeError } from "../../lib/errors";
import { qrPort, type CurrentQr, type QrPort } from "./contracts";
import { anchor, displayFresh, safeEntryUrl, serverTime, type ServerAnchor } from "./time";
import "./registration-qr.css";

interface DisplayValue { current: CurrentQr; anchor: ServerAnchor; image: string }
interface DisplayReference { id: string }

/** Staff display fences stale async results and hides authority before any offline/resume recovery begins. */
export function RegistrationQrDisplay({ port = qrPort, compact = false }: { port?: QrPort; compact?: boolean }) {
  const { state } = useAuth();
  if (state.kind !== "authenticated" || !state.user.staffAccessEnabled) {
    return <StatusPanel kind="empty" title="Staff access required">Ask the administrator to enable staff access.</StatusPanel>;
  }
  return <QrWorkspace key={state.user.id} port={port} compact={compact} />;
}

function QrWorkspace({ port, compact }: { port: QrPort; compact: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [display, setDisplay] = useState<DisplayReference | null>(null);
  const [revocation, setRevocation] = useState<(DisplayReference & { status: "pending" | "unknown" }) | null>(null);
  const [value, setValue] = useState<DisplayValue | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [capabilityAttempt, setCapabilityAttempt] = useState(0);
  const [copyResult, setCopyResult] = useState<{ source: DisplayValue; message: string } | null>(null);
  const [manualLink, setManualLink] = useState<DisplayValue | null>(null);
  const generation = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    port.capabilities(controller.signal).then(result => {
      if (!controller.signal.aborted) { setEnabled(result.enabled); setMessage(""); }
    }).catch(error => {
      if (!controller.signal.aborted) setMessage(safeError(error));
    });
    return () => controller.abort();
  }, [port, capabilityAttempt]);

  useEffect(() => {
    if (!display) return;
    let alive = true, fetching = false;
    let latest: DisplayValue | null = null;
    let controller: AbortController | null = null;
    let requestGeneration = 0;
    const pageVisible = () => document.visibilityState !== "hidden";
    const refresh = async () => {
      if (!alive || fetching || !navigator.onLine || !pageVisible()) return;
      fetching = true; const sequence = ++requestGeneration;
      controller = new AbortController(); const started = performance.now();
      try {
        const current = await port.current(display.id, controller.signal);
        const received = performance.now(); const timing = anchor(current.serverNow, received, received - started);
        if (!safeEntryUrl(current.entryUrl, window.location.origin)) throw new Error("Invalid entry origin");
        // Bundle the encoder locally. The token never enters a remote image URL or third-party service.
        const image = await QRCode.toDataURL(current.entryUrl, { errorCorrectionLevel: "M", margin: 4, width: 400 });
        if (!alive || sequence !== requestGeneration || !navigator.onLine || !pageVisible()) return;
        latest = { current, anchor: timing, image };
        if (!displayFresh(current, timing, performance.now())) { latest = null; setValue(null); setMessage("The QR expired while loading. Refresh the current code."); return; }
        // Update the countdown with the accepted payload, before the next tick can display a previous slot's zero.
        setRemaining(Math.max(0, Math.ceil((Date.parse(current.rotateAt) - serverTime(timing, performance.now())) / 1000)));
        setValue(latest); setMessage("");
      } catch (error) {
        if (alive && sequence === requestGeneration) { latest = null; setValue(null); setMessage(safeError(error)); }
      } finally { fetching = false; }
    };
    const hide = () => {
      requestGeneration++; controller?.abort(); latest = null; setValue(null);
      setMessage(navigator.onLine ? "Checking the current code before display…" : "Connection lost. The QR is hidden until the server is reachable.");
    };
    const resume = () => { hide(); if (pageVisible()) void refresh(); };
    const tick = window.setInterval(() => {
      if (!latest) return;
      const now = performance.now();
      setRemaining(Math.max(0, Math.ceil((Date.parse(latest.current.rotateAt) - serverTime(latest.anchor, now)) / 1000)));
      if (!displayFresh(latest.current, latest.anchor, now)) { latest = null; setValue(null); void refresh(); }
    }, 250);
    const poll = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("offline", hide); window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume); window.addEventListener("pageshow", resume);
    void refresh();
    return () => {
      alive = false; requestGeneration++; controller?.abort();
      window.clearInterval(tick); window.clearInterval(poll);
      window.removeEventListener("offline", hide); window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume); window.removeEventListener("pageshow", resume);
    };
  }, [display, port]);

  /** Setup runs once automatically; failed/unknown mutations require an explicit retry. */
  const create = useCallback(async () => {
    if (busy || display || revocation) return;
    const sequence = ++generation.current; setBusy(true); setValue(null); setMessage("");
    try {
      const result = await port.create();
      if (sequence === generation.current) setDisplay({ id: result.displaySessionId });
    } catch (error) { if (sequence === generation.current) setMessage(safeError(error)); }
    finally { if (sequence === generation.current) setBusy(false); }
  }, [busy, display, revocation, port]);
  useEffect(() => {
    let active = true;
    // Deferral prevents StrictMode's discarded effect from creating a second display session.
    queueMicrotask(() => {
      if (active && enabled && !display && !revocation && !autoStarted.current) {
        autoStarted.current = true; void create();
      }
    });
    return () => { active = false; };
  }, [enabled, display, revocation, create]);
  const revoke = async () => {
    const old = revocation ?? display;
    if (!old || busy) return;
    const sequence = ++generation.current; setBusy(true); setValue(null); setMessage("");
    // Stop polling/rendering immediately, while retaining the original source for an explicit uncertain-result retry.
    setRevocation({ id: old.id, status: "pending" }); setDisplay(null);
    try {
      await port.revoke(old.id);
      if (sequence === generation.current) { setRevocation(null); setMessage("This display was revoked. Unsubmitted forms from it are no longer valid."); }
    } catch (error) {
      if (sequence === generation.current) {
        setRevocation({ id: old.id, status: "unknown" });
        setMessage(`${safeError(error)} Revocation is unconfirmed; the code remains hidden.`);
      }
    }
    finally { if (sequence === generation.current) setBusy(false); }
  };
  useEffect(() => () => { generation.current++; }, []);
  const visible = value && display;

  /** Copy only the currently validated rotating capability, with a manual fallback for clipboard restrictions. */
  const copyLink = async () => {
    setCopyResult(null); setManualLink(null);
    if (!visible || !value || !navigator.onLine || document.visibilityState === "hidden"
        || !displayFresh(value.current, value.anchor, performance.now())) {
      if (value) setCopyResult({ source: value, message: "Wait for a current registration link, then copy again." }); return;
    }
    const copied = value;
    try {
      await navigator.clipboard.writeText(copied.current.entryUrl);
      setCopyResult({ source: copied, message: displayFresh(copied.current, copied.anchor, performance.now())
        ? "Link copied. Open it immediately; it expires with this QR code."
        : "That link has expired. Copy the current link again." });
    } catch {
      if (displayFresh(copied.current, copied.anchor, performance.now())) {
        setManualLink(copied); setCopyResult({ source: copied, message: "Select and copy the link below, then open it immediately." });
      } else setCopyResult({ source: copied, message: "That link has expired. Copy the current link again." });
    }
  };

  // Compact help opens over the workspace instead of increasing the dashboard's height.
  const guidance = <div className="qr-guidance-body">
    <p>The server changes this QR every 30 seconds. Each code expires after 45 seconds.</p>
    <p>Copy link opens the same registration form without scanning. Paste the whole link immediately, including the part after #. A copied link has the same expiry and revocation rules as the QR.</p>
    <p>For a visitor on this computer, use a separate browser profile or private window. Staff pages can share tabs in the signed-in profile. A localhost link works only on this computer.</p>
    <p>Visitors who already opened a valid form have 20 minutes to submit it. Several visitors can scan the same current code.</p>
    <p>Keep this display connected. After a connection loss or sleep, the code stays hidden until revalidated.</p>
    <p className="muted">QR entry does not verify identity or physical presence. Staff verification remains required.</p>
  </div>;
  return <div className={`qr-feature qr-display-feature${compact ? " qr-display-compact" : ""}`}>
    <header className="qr-intro">{compact ? <h2>Visitor registration QR</h2> : <h1>Visitor registration QR</h1>}<p className="muted">{compact ? "Multiple visitors · No account required" : "Scan to register · No account required"}</p></header>
    {enabled === false ? <StatusPanel kind="empty" title="Registration QR is not enabled">Contact the administrator to enable the controlled registration entry.</StatusPanel> : <>
      <div className="qr-toolbar"><span className="qr-category">All categories</span>
        {!display && !revocation && message && enabled && <Button busy={busy} onClick={() => void create()}>Retry QR setup</Button>}
      </div>
      <div className="qr-display-layout">
        {revocation ? <section className="qr-revocation" aria-label="Display revocation recovery" aria-busy={revocation.status === "pending"}>
          {/* Recovery replaces the empty QR card so its original-source action stays near the heading. */}
          <h2>{revocation.status === "pending" ? "Revoking the original display" : "Display revocation is unconfirmed"}</h2>
          <ToastNotice tone={revocation.status === "pending" ? "info" : "error"}>{message || "The original code remains hidden while the server confirms revocation."}</ToastNotice>
          {revocation.status === "unknown" && <Button variant="secondary" busy={busy} onClick={() => void revoke()}>Retry revoke</Button>}
        </section> : <div className="qr-display-card" ref={panel}>
          <div className="qr-display-heading"><QrCode size={20} aria-hidden="true" /><h2>Scan or copy link / Imbas atau salin pautan</h2></div>
          <div className="qr-scan-area" data-available={Boolean(visible)} aria-label="Current registration code">
            {visible ? <img src={value.image} alt="Scan this current QR with your phone camera to register" width={400} height={400} /> : <div className="qr-hidden"><WifiOff size={40} aria-hidden="true" /><strong>{busy ? "Preparing entry…" : display ? "Current code unavailable" : "Start a live display"}</strong><span>No scannable code is shown.</span></div>}
          </div>
          {visible && <div className="qr-display-meta"><span className="qr-live">Live · changes in {remaining} seconds</span></div>}
          {display && <div className="qr-controls">
            <Button ref={copyButton} variant="secondary" disabled={!visible} onClick={() => void copyLink()}><Copy size={16} aria-hidden="true" />Copy link</Button>
            {visible && <Button variant="ghost" onClick={() => void panel.current?.requestFullscreen?.()}>Full screen</Button>}
            <Button variant="secondary" busy={busy} onClick={() => void revoke()}>{compact ? "Revoke" : "Revoke display"}</Button>
          </div>}
          {visible && copyResult?.source === value && <ToastNotice tone="info">{copyResult.message}</ToastNotice>}
          {visible && manualLink === value && (compact ? <Dialog.Root open onOpenChange={open => { if (!open) setManualLink(null); }}>
            <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content qr-help-dialog" onInteractOutside={preserveToastInteraction}
              onCloseAutoFocus={event => { event.preventDefault(); copyButton.current?.focus(); }}>
              <div className="qr-help-heading"><Dialog.Title>Copy registration link</Dialog.Title><Dialog.Close asChild><Button variant="ghost" aria-label="Close registration link"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
              <Dialog.Description>Select and copy this link immediately. It expires with the current QR.</Dialog.Description>
              <label className="qr-manual-link">Current registration link<input readOnly value={value.current.entryUrl} onFocus={event => event.target.select()} /></label>
            </Dialog.Content></Dialog.Portal>
          </Dialog.Root> : <label className="qr-manual-link">Current registration link
            <input readOnly value={value.current.entryUrl} onFocus={event => event.target.select()} />
          </label>)}
          {message && !revocation && <ToastNotice>{message}</ToastNotice>}
          {enabled === null && message && <Button variant="secondary" onClick={() => {
            // Retry only the read-only availability probe; never replay an uncertain create or revoke command.
            setMessage(""); setCapabilityAttempt(value => value + 1);
          }}>Check QR availability</Button>}
        </div>}
        <aside className="qr-guidance" aria-label="Registration entry guidance">
          <p className="qr-limits">30s rotation · 45s expiry · 20min form</p>
          <p className="qr-safety">QR does not prove identity or presence. Staff checks still apply.</p>
          {compact ? <Dialog.Root>
            <Dialog.Trigger asChild><Button variant="ghost"><ShieldCheck size={18} aria-hidden="true" />Entry limits and help</Button></Dialog.Trigger>
            <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content qr-help-dialog" onInteractOutside={preserveToastInteraction}>
              <div className="qr-help-heading"><Dialog.Title>Registration entry help</Dialog.Title><Dialog.Close asChild><Button variant="ghost" aria-label="Close entry help"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
              <Dialog.Description>Entry limits and connection guidance for this display.</Dialog.Description>{guidance}
            </Dialog.Content></Dialog.Portal>
          </Dialog.Root> : <details><summary><ShieldCheck size={18} aria-hidden="true" />Entry limits and connection help</summary>{guidance}</details>}
        </aside>
      </div>
    </>}
  </div>;
}
