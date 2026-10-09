import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { entryVault } from "../../app/entry";
import type { EntryVault } from "../../app/entry-token";
import { Button, RestartConfirmation, StatusPanel } from "../../components/ui/primitives";
import { ClientError, safeError } from "../../lib/errors";
import type { RestartDetails } from "../../lib/restart-details";
import { qrPort, type EntryGrant, type QrPort } from "./contracts";
import { anchor, serverTime, type ServerAnchor } from "./time";
import "./registration-qr.css";

/** Optional form renderer captures this exact context; M03 must never silently adopt another tab's new grant. */
export function RegistrationEntry({ port = qrPort, vault = entryVault, children }: {
  port?: QrPort; vault?: EntryVault; children?: (entry: EntryGrant) => ReactNode;
}) {
  const token = useSyncExternalStore(vault.subscribe, vault.read);
  const [entry, setEntry] = useState<EntryGrant | null>(null);
  const [restart, setRestart] = useState<RestartDetails | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [expired, setExpired] = useState(false);
  const [recovered, setRecovered] = useState<EntryGrant | null>(null);
  const sequence = useRef(0), settled = useRef(false);
  const timing = useRef<ServerAnchor | null>(null);
  const activeEntry = useRef<EntryGrant | null>(null);

  /** Accepted exchange changes the form only after server confirmation; token cleanup is fenced by exact value. */
  const accept = useCallback((value: EntryGrant, usedToken?: string, elapsed = 0) => {
    timing.current = anchor(value.serverNow, performance.now(), elapsed); activeEntry.current = value;
    setEntry(value); setExpired(false); setRestart(null); setRecovered(null); setMessage("");
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
        await port.bootstrap();
        const started = performance.now();
        const value = token ? await port.exchange(token) : await port.entry();
        if (alive && current === sequence.current) accept(value, token ?? undefined, performance.now() - started);
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
    const tick = window.setInterval(() => {
      const value = activeEntry.current, time = timing.current;
      if (value && time && serverTime(time, performance.now()) >= Date.parse(value.grantExpiresAt)) setExpired(true);
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  /** Unknown results are read back; a different current context needs explicit adoption, never old-input rebinding. */
  const recover = async (cancelledToken?: string) => {
    const current = ++sequence.current; setBusy(true);
    try {
      const started = performance.now();
      const value = await port.entry();
      if (current !== sequence.current) return;
      if (activeEntry.current && JSON.stringify(value.formContext) !== JSON.stringify(activeEntry.current.formContext)) {
        setRecovered(value); setMessage("Status borang telah berubah. Buka borang semasa hanya jika anda mahu memulakan semula.");
      } else accept(value, cancelledToken, performance.now() - started);
    } catch (error) { if (current === sequence.current) setMessage(safeError(error, "ms")); }
    finally { if (current === sequence.current) setBusy(false); }
  };
  /** Only this explicit gesture carries expected old context; a failed replacement leaves the original form intact. */
  const confirm = async () => {
    if (!restart || !token) return;
    const current = ++sequence.current; setBusy(true);
    try {
      const started = performance.now();
      const value = await port.exchange(token, restart.currentFormContext);
      if (current === sequence.current) accept(value, token, performance.now() - started);
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

  return <div className="qr-feature qr-entry">
    <span className="eyebrow">HSAAS · PENDAFTARAN</span><h1>Pendaftaran pelawat</h1><p className="muted">Tiada akaun diperlukan.</p>
    {disabled ? <StatusPanel kind="empty" title="Pendaftaran belum diaktifkan">Sila ke kaunter untuk bantuan.</StatusPanel> : <>
      {busy && <StatusPanel kind="loading" title="Menyemak akses pendaftaran">Sila tunggu.</StatusPanel>}
      {entry && !expired && <section className="qr-entry-card"><span className="qr-live">Akses borang aktif</span><h2>{label(entry.scope)}</h2>
        <p>Hantar borang sebelum tempoh 20 minit tamat. QR di kaunter boleh berubah tanpa menutup borang ini.</p>
        {children ? children(entry) : <p className="qr-notice">Borang maklumat pelawat belum tersedia. Sila dapatkan bantuan di kaunter. Tiada permohonan dihantar.</p>}
      </section>}
      {expired && <StatusPanel kind="error" title="Tempoh borang telah tamat">Sila imbas QR semasa di kaunter.</StatusPanel>}
      {message && <StatusPanel kind="error" title="Semak akses pendaftaran" action={<Button variant="secondary" busy={busy} onClick={() => void recover()}>Semak status semasa</Button>}>{message}</StatusPanel>}
      {recovered && <Button onClick={() => { accept(recovered); if (token) vault.clear(token); }}>Buka borang semasa</Button>}
      {!entry && !busy && !message && !restart && <StatusPanel kind="empty" title="Imbas QR di kaunter">Gunakan QR semasa untuk membuka borang.</StatusPanel>}
      <RestartConfirmation open={Boolean(restart)} currentLabel={restart ? label(restart.currentScope) : ""} requestedLabel={restart ? label(restart.requestedScope) : ""}
        busy={busy} error={message || undefined} onCancel={cancel} onConfirm={() => void confirm()} />
      <p className="qr-privacy">Maklumat peribadi tidak disimpan dalam QR. Pengesahan di kaunter masih diperlukan.</p>
    </>}
  </div>;
}
