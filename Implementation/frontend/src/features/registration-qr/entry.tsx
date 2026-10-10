import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { entryVault } from "../../app/entry";
import type { EntryVault } from "../../app/entry-token";
import { Button, RestartConfirmation, StatusPanel } from "../../components/ui/primitives";
import { ClientError, safeError } from "../../lib/errors";
import type { RestartDetails } from "../../lib/restart-details";
import { qrPort, type EntryGrant, type QrPort } from "./contracts";
import { anchor, serverTime, type ServerAnchor } from "./time";
import "./registration-qr.css";

/** Scope and absolute expiry are immutable for one context; a read must never renew a captured form. */
function sameAuthority(left: EntryGrant, right: EntryGrant) {
  return left.formContext.grantReference === right.formContext.grantReference
    && left.formContext.bindingVersion === right.formContext.bindingVersion
    && left.scope.environment === right.scope.environment && left.scope.counterId === right.scope.counterId
    && left.scope.categoryScope === right.scope.categoryScope && left.grantExpiresAt === right.grantExpiresAt;
}

/** Availability is sampled after each response; a request dispatched online may finish after interruption. */
function entryAvailable() { return navigator.onLine && document.visibilityState !== "hidden"; }

/** Optional form renderer captures this exact context; M03 must never silently adopt another tab's new grant. */
export function RegistrationEntry({ port = qrPort, vault = entryVault, children, compact = false }: {
  port?: QrPort; vault?: EntryVault; children?: (entry: EntryGrant) => ReactNode; compact?: boolean;
}) {
  const token = useSyncExternalStore(vault.subscribe, vault.read);
  const [entry, setEntry] = useState<EntryGrant | null>(null);
  const [restart, setRestart] = useState<RestartDetails | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [expired, setExpired] = useState(false);
  const [validated, setValidated] = useState(true);
  const [recovered, setRecovered] = useState<EntryGrant | null>(null);
  const sequence = useRef(0), settled = useRef(false);
  const timing = useRef<ServerAnchor | null>(null);
  const activeEntry = useRef<EntryGrant | null>(null);
  const availabilityEpoch = useRef(0), validationNeeded = useRef(false);

  useEffect(() => {
    const invalidate = () => { availabilityEpoch.current++; validationNeeded.current = true; setValidated(false); };
    // Install before an entry exists so initial exchange/bootstrap interruptions cannot evade the fence.
    window.addEventListener("offline", invalidate); window.addEventListener("online", invalidate);
    window.addEventListener("pageshow", invalidate); document.addEventListener("visibilitychange", invalidate);
    return () => {
      window.removeEventListener("offline", invalidate); window.removeEventListener("online", invalidate);
      window.removeEventListener("pageshow", invalidate); document.removeEventListener("visibilitychange", invalidate);
    };
  }, []);

  /** Accepted exchange changes the form only after server confirmation; token cleanup is fenced by exact value. */
  const accept = useCallback((value: EntryGrant, usedToken: string | undefined, elapsed: number, requestEpoch: number) => {
    timing.current = anchor(value.serverNow, performance.now(), elapsed); activeEntry.current = value;
    const available = entryAvailable() && requestEpoch === availabilityEpoch.current;
    // Preserve a confirmed server context, but only a fresh visible/online response may enable its inputs.
    validationNeeded.current = !available;
    setEntry(value); setExpired(false); setValidated(available); setRestart(null); setRecovered(null);
    setMessage(available ? "" : "Maklumat borang dikekalkan. Semak akses selepas sambungan atau paparan dipulihkan.");
    if (usedToken) vault.clear(usedToken);
  }, [vault]);
  useEffect(() => {
    if (!token && settled.current) return;
    const current = ++sequence.current; let alive = true; setBusy(true); setMessage("");
    const start = async () => {
      try {
        const capability = await port.capabilities();
        if (!alive || current !== sequence.current) return;
        if (!capability.enabled) { setDisabled(true); return; }
        // An explicit new scan can observe enabled capability after an earlier disabled response.
        setDisabled(false);
        await port.bootstrap();
        const started = performance.now(), requestEpoch = availabilityEpoch.current;
        const value = token ? await port.exchange(token) : await port.entry();
        if (alive && current === sequence.current) accept(value, token ?? undefined, performance.now() - started, requestEpoch);
      } catch (error) {
        if (!alive || current !== sequence.current) return;
        if (error instanceof ClientError && error.restartDetails) setRestart(error.restartDetails);
        else setMessage(safeError(error, "ms"));
      } finally { if (alive && current === sequence.current) { settled.current = true; setBusy(false); } }
    };
    void start();
    return () => { alive = false; };
    // The vault is an external memory store; feature props are stable ports, not shared app state.
  }, [token, port, vault, accept]);

  useEffect(() => {
    const fence = sequence;
    return () => { fence.current++; };
  }, []);

  useEffect(() => {
    if (!entry) return;
    let alive = true, checking = false;
    const original = entry;
    const check = async () => {
      if (!alive || checking || busy || !entryAvailable()) return;
      checking = true; const operation = sequence.current, started = performance.now(), requestEpoch = availabilityEpoch.current;
      try {
        const value = await port.entry();
        if (!alive || operation !== sequence.current) return;
        if (!entryAvailable() || requestEpoch !== availabilityEpoch.current) { validationNeeded.current = true; setValidated(false); return; }
        const same = value.formContext.grantReference === original.formContext.grantReference
          && value.formContext.bindingVersion === original.formContext.bindingVersion;
        if (!same) {
          // Preserve old input and disable submission; adopting another tab's current form requires an explicit gesture.
          setValidated(false); setRecovered(value);
          setMessage("Borang ini telah berubah. Buka borang semasa hanya jika anda mahu memulakan semula.");
        } else if (!sameAuthority(value, original)) {
          setValidated(false); setMessage("Semakan borang tidak dapat disahkan. Sila ke kaunter untuk bantuan.");
        } else {
          timing.current = anchor(value.serverNow, performance.now(), performance.now() - started);
          validationNeeded.current = false; setValidated(true); setRecovered(null); setMessage("");
        }
      } catch (error) {
        if (alive && operation === sequence.current) { setValidated(false); setMessage(safeError(error, "ms")); }
      } finally { checking = false; }
    };
    const offline = () => { setValidated(false); setMessage("Sambungan terputus. Maklumat borang dikekalkan; semak akses sebelum menghantar."); };
    const resume = () => { setValidated(false); void check(); };
    const timer = window.setInterval(() => void check(), 5000);
    window.addEventListener("offline", offline); window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume); document.addEventListener("visibilitychange", resume);
    // A resume during an in-flight command is read back once its confirmed context and busy state settle.
    if (validationNeeded.current) void check();
    return () => {
      alive = false; window.clearInterval(timer); window.removeEventListener("offline", offline);
      window.removeEventListener("online", resume); window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [entry, busy, port]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const value = activeEntry.current, time = timing.current;
      if (value && time && serverTime(time, performance.now()) >= Date.parse(value.grantExpiresAt)) setExpired(true);
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  /** Unknown results are read back; a different current context needs explicit adoption, never old-input rebinding. */
  const recover = async (cancelledToken?: string) => {
    const current = ++sequence.current; setBusy(true); setValidated(false);
    try {
      const started = performance.now(), requestEpoch = availabilityEpoch.current;
      const value = await port.entry();
      if (current !== sequence.current) return;
      if (activeEntry.current && JSON.stringify(value.formContext) !== JSON.stringify(activeEntry.current.formContext)) {
        setRecovered(value); setMessage("Status borang telah berubah. Buka borang semasa hanya jika anda mahu memulakan semula.");
      } else if (activeEntry.current && !sameAuthority(value, activeEntry.current)) {
        setMessage("Semakan borang tidak dapat disahkan. Sila ke kaunter untuk bantuan.");
      } else accept(value, cancelledToken, performance.now() - started, requestEpoch);
    } catch (error) { if (current === sequence.current) setMessage(safeError(error, "ms")); }
    finally { if (current === sequence.current) setBusy(false); }
  };
  /** An explicit adoption refreshes the proposed context first, so time spent deciding cannot extend its expiry. */
  const adopt = async () => {
    if (!recovered || busy) return;
    const proposed = recovered, current = ++sequence.current; setBusy(true); setValidated(false);
    try {
      const started = performance.now(), requestEpoch = availabilityEpoch.current, value = await port.entry();
      if (current !== sequence.current) return;
      if (!sameAuthority(value, proposed)) {
        setRecovered(value); setMessage("Status borang berubah lagi. Semak borang semasa sebelum membukanya.");
      } else accept(value, token ?? undefined, performance.now() - started, requestEpoch);
    } catch (error) { if (current === sequence.current) setMessage(safeError(error, "ms")); }
    finally { if (current === sequence.current) setBusy(false); }
  };
  /** Only this explicit gesture carries expected old context; a failed replacement leaves the original form intact. */
  const confirm = async () => {
    if (!restart || !token) return;
    const current = ++sequence.current; setBusy(true);
    try {
      const started = performance.now(), requestEpoch = availabilityEpoch.current;
      const value = await port.exchange(token, restart.currentFormContext);
      if (current === sequence.current) accept(value, token, performance.now() - started, requestEpoch);
    } catch (error) { if (current === sequence.current) setMessage(safeError(error, "ms")); }
    finally { if (current === sequence.current) setBusy(false); }
  };
  const cancel = () => {
    setRestart(null); setMessage("");
    // On a fresh page, recover the existing form before clearing the vault; clearing first fences this request.
    if (!entry) void recover(token ?? undefined);
    else if (token) vault.clear(token);
  };
  const label = (scope: EntryGrant["scope"]) => `Kaunter ${scope.counterId} · ${scope.categoryScope === null ? "semua kategori" : `kategori ${scope.categoryScope}`}`;

  // C16 is presentation-only: default M02 markup stays intact; no authority, polling or fieldset logic changes.
  return <div className={"qr-feature qr-entry" + (compact ? " qr-entry-compact" : "")}>
    {compact ? <div className="qr-entry-top"><h1>Pendaftaran pelawat</h1>
      <details className="qr-entry-help"><summary>Panduan</summary>
        <p>Tiada akaun diperlukan.</p>
        <p>Hantar borang sebelum tempoh 20 minit tamat. QR di kaunter boleh berubah tanpa menutup borang ini.</p>
        <p>Maklumat peribadi tidak disimpan dalam QR. Pengesahan di kaunter masih diperlukan.</p>
      </details></div> : <><span className="eyebrow">HSAAS · PENDAFTARAN</span><h1>Pendaftaran pelawat</h1><p className="muted">Tiada akaun diperlukan.</p></>}
    {disabled ? <StatusPanel kind="empty" title="Pendaftaran belum diaktifkan">Sila ke kaunter untuk bantuan.</StatusPanel> : <>
      {busy && <StatusPanel kind="loading" title="Menyemak akses pendaftaran">Sila tunggu.</StatusPanel>}
      {entry && <section className="qr-entry-card"><span className="qr-live">{validated && !expired ? "Akses borang aktif" : "Akses perlu disahkan"}</span><h2>{label(entry.scope)}</h2>
        {!compact && <p>Hantar borang sebelum tempoh 20 minit tamat. QR di kaunter boleh berubah tanpa menutup borang ini.</p>}
        {children ? <fieldset className="qr-bound-form" disabled={busy || !validated || expired} key={`${entry.formContext.grantReference}:${entry.formContext.bindingVersion}`}>{children(entry)}</fieldset> : <p className="qr-notice">Borang maklumat pelawat belum tersedia. Sila dapatkan bantuan di kaunter. Tiada permohonan dihantar.</p>}
      </section>}
      {expired && <StatusPanel kind="error" title="Tempoh borang telah tamat">Sila imbas QR semasa di kaunter.</StatusPanel>}
      {message && <StatusPanel kind="error" title="Semak akses pendaftaran" action={<Button variant="secondary" busy={busy} onClick={() => void recover()}>Semak status semasa</Button>}>{message}</StatusPanel>}
      {recovered && <Button busy={busy} onClick={() => void adopt()}>Buka borang semasa</Button>}
      {!entry && !busy && !message && !restart && <StatusPanel kind="empty" title="Imbas QR di kaunter">Gunakan QR semasa untuk membuka borang.</StatusPanel>}
      <RestartConfirmation open={Boolean(restart)} currentLabel={restart ? label(restart.currentScope) : ""} requestedLabel={restart ? label(restart.requestedScope) : ""}
        busy={busy} error={message || undefined} onCancel={cancel} onConfirm={() => void confirm()} />
      {!compact && <p className="qr-privacy">Maklumat peribadi tidak disimpan dalam QR. Pengesahan di kaunter masih diperlukan.</p>}
    </>}
  </div>;
}
