import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, ShieldCheck, WifiOff } from "lucide-react";
import { useCounterScope } from "../../app/counter-context";
import { Button, StatusPanel } from "../../components/ui/primitives";
import { safeError } from "../../lib/errors";
import { qrPort, type CurrentQr, type QrPort } from "./contracts";
import { anchor, displayFresh, safeEntryUrl, serverTime, type ServerAnchor } from "./time";
import "./registration-qr.css";

interface DisplayValue { current: CurrentQr; anchor: ServerAnchor; image: string }

/** Staff display fences stale async results and hides authority before any offline/resume recovery begins. */
export function RegistrationQrDisplay({ port = qrPort }: { port?: QrPort }) {
  const counter = useCounterScope();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [display, setDisplay] = useState<{ id: string; counter: string } | null>(null);
  const [value, setValue] = useState<DisplayValue | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [capabilityAttempt, setCapabilityAttempt] = useState(0);
  const generation = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

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
    if (!display || display.counter !== counter) return;
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
  }, [display, counter, port]);

  /** Creating and revoking are explicit commands; failed/unknown mutations never claim success or restore a code. */
  const create = async () => {
    if (!counter || busy) return;
    const sequence = ++generation.current; setBusy(true); setValue(null); setMessage("");
    try {
      const result = await port.create(counter);
      if (sequence === generation.current) setDisplay({ id: result.displaySessionId, counter });
    } catch (error) { if (sequence === generation.current) setMessage(safeError(error)); }
    finally { if (sequence === generation.current) setBusy(false); }
  };
  const revoke = async () => {
    if (!display || busy) return;
    const sequence = ++generation.current; setBusy(true); setValue(null);
    const old = display; setDisplay(null);
    try { await port.revoke(old.id); if (sequence === generation.current) setMessage("This display was revoked. Unsubmitted forms from it are no longer valid."); }
    catch (error) { if (sequence === generation.current) setMessage(`${safeError(error)} Revocation is unconfirmed; the code remains hidden.`); }
    finally { if (sequence === generation.current) setBusy(false); }
  };
  useEffect(() => () => { generation.current++; }, []);
  const visible = value && display?.counter === counter;

  return <div className="qr-feature">
    <span className="eyebrow">COUNTER REGISTRATION</span><h1>Visitor registration QR</h1>
    <p className="muted">A live entry for visitors. No visitor account is required.</p>
    {enabled === false ? <StatusPanel kind="empty" title="Registration QR is not enabled">Contact the administrator to enable the controlled registration entry.</StatusPanel> : <>
      <div className="qr-toolbar"><span className="qr-counter">Counter {counter ?? "not selected"}</span><span className="qr-category">All categories</span>
        <Button busy={busy} disabled={!enabled || !counter || Boolean(display)} onClick={() => void create()}>Display registration QR</Button>
        {display && <Button variant="secondary" busy={busy} onClick={() => void revoke()}>Revoke display</Button>}
      </div>
      <div className="qr-display-layout">
        <div className="qr-display-card" ref={panel}>
          <div className="qr-display-heading"><QrCode size={24} aria-hidden="true" /><strong>HSAAS · Counter {counter ?? "—"}</strong></div>
          <div className="qr-scan-area" aria-label="Current registration code">
            {visible ? <img src={value.image} alt="Scan this current QR with your phone camera to register" width={400} height={400} /> : <div className="qr-hidden"><WifiOff size={40} aria-hidden="true" /><strong>{busy ? "Preparing entry…" : display ? "Current code unavailable" : "Start a live display"}</strong><span>No scannable code is shown.</span></div>}
          </div>
          <h2>Scan to register</h2><p>Gunakan kamera telefon anda untuk mengimbas QR semasa.</p>
          {visible && <><span className="qr-live">Live · changes in {remaining} seconds</span><Button variant="ghost" onClick={() => void panel.current?.requestFullscreen?.()}>Full screen</Button></>}
          {message && <p role="status" className="qr-notice">{message}</p>}
          {enabled === null && message && <Button variant="secondary" onClick={() => {
            // Retry only the read-only availability probe; never replay an uncertain create or revoke command.
            setMessage(""); setCapabilityAttempt(value => value + 1);
          }}>Check QR availability</Button>}
        </div>
        <aside className="qr-guidance" aria-label="Registration entry guidance"><ShieldCheck aria-hidden="true" /><h2>A limited registration entry</h2>
          <p>The server changes this QR every 30 seconds. Each code expires after 45 seconds.</p>
          <p>Visitors who already opened a valid form have 20 minutes to submit it. Several visitors can scan the same current code.</p>
          <p>Keep this display connected. After a connection loss or sleep, the code stays hidden until revalidated.</p>
          <p className="muted">QR entry does not verify identity or physical presence. Staff verification remains required.</p>
        </aside>
      </div>
    </>}
  </div>;
}
