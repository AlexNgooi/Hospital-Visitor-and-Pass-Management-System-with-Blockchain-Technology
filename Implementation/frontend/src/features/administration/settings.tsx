import { useState } from "react";
import { Button, InputField } from "../../components/ui/primitives";
import { apiClient } from "../../lib/api-client";
import { capabilitiesSchema, referencesSchema, savedSchema, settingsSchema, type Reason, type Reference } from "./contracts";
import { LoadNotice, ReasonSelect } from "./data";
import { useRemote, useSave } from "./hooks";

/** Reference and return-rule editors preserve historical records and do not expose unapproved integration/security switches. */
export function SettingsPage() {
  const [kind, setKind] = useState("destinations");
  const settings = useRemote("/api/admin/settings", settingsSchema);
  const capabilities = useRemote("/api/admin/integrations", capabilitiesSchema);
  return <div className="admin-page"><header className="admin-heading"><div><span className="eyebrow">GOVERNANCE</span><h1>Operational settings</h1><p>Versioned changes with a reason and local audit history.</p></div></header>
    <section className="admin-card"><h2>Demonstration return rules</h2><p>Hours apply to future issues. Existing due times and history remain unchanged. These defaults are demonstration policy.</p><LoadNotice busy={settings.busy} error={settings.error} reload={settings.reload} />{settings.data?.map((setting) => <SettingEditor key={`${setting.id}:${setting.version}`} setting={setting} reload={settings.reload} disabled={Boolean(settings.error)} />)}</section>
    <section className="admin-card"><h2>Reference catalogue</h2><label className="admin-field">Catalogue<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="destinations">Wards / destinations</option><option value="categories">Visitor categories</option><option value="counters">Counters</option></select></label><p>Codes are immutable. Deactivation preserves historical references. The four category form schemas are fixed.</p><ReferenceCatalogue key={kind} kind={kind} /></section>
    <section className="admin-card"><h2>Integration capabilities</h2><LoadNotice busy={capabilities.busy} error={capabilities.error} reload={capabilities.reload} />{capabilities.data && <dl className="admin-capabilities"><dt>Environment</dt><dd>{capabilities.data.environment}</dd><dt>Reader</dt><dd>{capabilities.data.readerMode === "mock" ? "SIMULATED · no physical reader" : "NOT_ENABLED"}</dd><dt>MRN</dt><dd>{capabilities.data.mrnMode} · live patient API NOT_ENABLED</dd><dt>WhatsApp</dt><dd>NOT_ENABLED · no jobs or sends</dd><dt>Blockchain</dt><dd>NOT_ENABLED · no proof or retry</dd><dt>Audit</dt><dd>LOCAL_ONLY</dd></dl>}<p className="muted">Session security, retention and live integrations remain controlled release configuration; this page cannot enable them.</p></section>
  </div>;
}

/** Each setting form retains its loaded version; stale writes receive a conflict and require a refreshed value. */
function SettingEditor({ setting, reload, disabled }: { setting: { id: string; key: string; value: number; version: number }; reload: () => void; disabled: boolean }) {
  const [value, setValue] = useState(setting.value), [reason, setReason] = useState<Reason>("POLICY_UPDATE");
  const save = useSave(reload);
  return <form className="admin-inline-form" onSubmit={(event) => { event.preventDefault(); void save.run(() => apiClient.command(`/api/admin/settings/${setting.id}`, { version: setting.version, value, reason }, savedSchema, { method: "PATCH", authRequired: true }).execute()); }}><InputField id={`hours-${setting.id}`} label={`${setting.key.replace("return_hours_", "")} · hours`} type="number" min={1} max={720} required value={value} onChange={(event) => setValue(Number(event.target.value))} /><ReasonSelect value={reason} onChange={setReason} /><Button type="submit" busy={save.busy} disabled={disabled || value === setting.value}>Save rule</Button><span className="muted">Version {setting.version}</span>{save.message && <p role="status">{save.message}</p>}</form>;
}

/** The same feature component covers the three approved whitelisted reference kinds. */
function ReferenceCatalogue({ kind }: { kind: string }) {
  const data = useRemote(`/api/admin/${kind}`, referencesSchema);
  const [editing, setEditing] = useState<Reference | "new" | null>(null);
  const save = useSave(data.reload);
  return <><LoadNotice busy={data.busy} error={data.error} reload={data.reload} />{save.message && <p role="status">{save.message}</p>}{kind !== "categories" && <Button variant="secondary" disabled={save.busy || Boolean(data.error)} onClick={() => setEditing("new")}>Add {kind === "counters" ? "counter" : "ward / destination"}</Button>}
    {editing && <ReferenceForm key={editing === "new" ? "new" : `${editing.id}:${editing.version}`} reference={editing === "new" ? null : editing} busy={save.busy} onCancel={() => setEditing(null)} onSave={(body) => { void save.run(() => apiClient.command(`/api/admin/${kind}${editing === "new" ? "" : `/${editing.id}`}`, body, savedSchema, { method: editing === "new" ? "POST" : "PATCH", authRequired: true }).execute(), () => setEditing(null)); }} />}
    {data.data && <div className="admin-table-scroll"><table><caption>{kind} · current versions</caption><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Version</th><th>Action</th></tr></thead><tbody>{data.data.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{row.active ? "Active" : "Inactive"}</td><td>{row.version}</td><td><Button variant="secondary" disabled={save.busy || Boolean(data.error)} onClick={() => setEditing(row)}>Edit</Button></td></tr>)}</tbody></table></div>}
  </>;
}

/** Deactivation is explicit and confirmed; reference rows are never deleted from the browser. */
function ReferenceForm({ reference, busy, onCancel, onSave }: { reference: Reference | null; busy: boolean; onCancel: () => void; onSave: (value: unknown) => void }) {
  const [code, setCode] = useState(""), [name, setName] = useState(reference?.name ?? "");
  const [active, setActive] = useState(reference?.active ?? true), [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState<Reason>("REFERENCE_CORRECTION");
  return <form className="admin-edit-form" onSubmit={(event) => { event.preventDefault(); onSave(reference ? { version: reference.version, name, active, reason } : { code, name, reason }); }}><h3>{reference ? `Edit ${reference.code}` : "New reference"}</h3>{!reference && <InputField id="reference-code" label="Code" required maxLength={64} pattern="[A-Z][A-Z0-9_-]{0,63}" value={code} onChange={(event) => setCode(event.target.value)} />}<InputField id="reference-name" label="Display name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />{reference && <label className="admin-check"><input type="checkbox" checked={active} onChange={(event) => { setActive(event.target.checked); setConfirmed(false); }} />Active reference</label>}<ReasonSelect value={reason} onChange={setReason} />{reference?.active && !active && <label className="admin-check"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Confirm deactivation for future operations.</label>}<div className="admin-actions"><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" busy={busy}>Save reference</Button></div></form>;
}
