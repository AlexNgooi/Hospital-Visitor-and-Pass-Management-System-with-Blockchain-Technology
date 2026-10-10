import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button, InputField, StatusPanel } from "../../components/ui/primitives";
import { ClientError, safeError } from "../../lib/errors";
import type { Command } from "../../lib/api-client";
import { RegistrationEntry } from "../registration-qr/entry";
import type { EntryGrant, QrPort } from "../registration-qr/contracts";
import type { EntryVault } from "../../app/entry-token";
import { registrationPort, type RegistrationPort, type RegistrationSchema, type FieldName, type FieldSpec,
  type Feedback, type Receipt, type Submission } from "./contracts";
import "./registration.css";

interface Draft {
  readonly context: string; readonly category: string; readonly values: Partial<Record<FieldName, string>>;
  readonly step: number; readonly acknowledged: boolean; readonly feedback: Feedback | null;
}
interface Pending { readonly command: Command<Receipt>; readonly counter: string; readonly original: Draft }
const common = new Set<FieldName>(["fullName", "identificationType", "identificationNumber", "phone"]);
const contextKey = (entry: EntryGrant) => entry.formContext.grantReference + ":" + entry.formContext.bindingVersion;

/** Transport, parse and server failures may have committed; UNKNOWN requires an explicit same-command retry. */
function uncertain(error: unknown) {
  return !(error instanceof ClientError) || error.kind !== "api" || error.status === undefined || error.status >= 500;
}
/** Recovery is outside M02's disabled fieldset; dispatch unmounts grant polling and completion clears sensitive draft memory. */
export function RegistrationPage({ port = registrationPort, entryPort, vault }: {
  port?: RegistrationPort; entryPort?: QrPort; vault?: EntryVault;
}) {
  const [draft, setDraft] = useState<Draft | null>(null), [pending, setPending] = useState<Pending | null>(null);
  const [receipt, setReceipt] = useState<{ value: Receipt; counter: string } | null>(null);
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [message, setMessage] = useState("");
  const dispatching = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (pending || receipt) heading.current?.focus(); }, [pending, receipt]);
  /** Later errors never discard an uncertain command or adopt another tab's new form/body/key. */
  const execute = async (operation: Pending, recovery: boolean) => {
    if (dispatching.current) return;
    dispatching.current = true;setBusy(true);setMessage("");
    try {
      const value = await operation.command.execute();
      setReceipt({ value, counter: operation.counter });setPending(null);setDraft(null);setUnknown(false);
    } catch (error) {
      if (recovery || uncertain(error)) {
        setUnknown(true);setMessage("Hasil belum dapat disahkan. Cuba semula permohonan asal atau dapatkan bantuan di kaunter.");
      } else {
        // A known rejection made no root write; retain the draft only for the same original context.
        const expiredFeedback = error instanceof ClientError && ["MRN_VALIDATION_EXPIRED", "MRN_VALIDATION_CHANGED"].includes(error.code ?? "");
        setDraft(expiredFeedback ? { ...operation.original, feedback: null } : operation.original);
        setPending(null);setUnknown(false);
        setMessage(expiredFeedback ? "Semakan MRN tamat. Semak semula atau teruskan untuk pengesahan manual." : safeError(error, "ms"));
      }
    } finally { dispatching.current = false;setBusy(false); }
  };
  const submit = (body: Submission, original: Draft, counter: string) => {
    if (dispatching.current) return;
    const operation: Pending = Object.freeze({ command: port.submission(body), counter, original });
    setPending(operation);setUnknown(false);setMessage("");void execute(operation, false);
  };
  return <div className="registration-page">
    {receipt ? <section className="registration-result" aria-live="polite">
      <CheckCircle2 size={40} aria-hidden="true" /><span className="eyebrow">DEMO · DATA SINTETIK</span>
      <h1 ref={heading} tabIndex={-1}>Pendaftaran diterima</h1>
      <p>Tunjukkan rujukan ini di kaunter {receipt.counter} untuk pengesahan.</p>
      <p className="registration-reference">{receipt.value.publicReference}</p>
      <p className="muted">Pengesahan kakitangan masih diperlukan. WhatsApp belum diaktifkan.</p>
    </section> : pending ? <section className="registration-result" aria-live="polite">
      <span className="eyebrow">HSAAS · PENDAFTARAN</span>
      <h1 ref={heading} tabIndex={-1}>{unknown ? "Hasil belum disahkan" : "Menghantar pendaftaran"}</h1>
      <p>{message || "Sila tunggu sehingga rujukan pendaftaran diterima."}</p>
      {unknown && <><Button busy={busy} onClick={() => void execute(pending, true)}>Cuba semula permohonan asal</Button>
        <p className="muted">Jangan mulakan pendaftaran baharu. Percubaan ini menggunakan permohonan asal yang sama.</p></>}
      {busy && <p role="status">Sedang menyemak hasil…</p>}
    </section> : <>
      {message && <p className="registration-notice" role="alert">{message}</p>}
      <RegistrationEntry compact port={entryPort} vault={vault}>{entry => <RegistrationForm key={contextKey(entry)} entry={entry} port={port}
        initial={draft?.context === contextKey(entry) ? draft : null} onDraft={setDraft} onSubmit={submit} />}</RegistrationEntry>
    </>}
  </div>;
}

/** Three steps keep fields in memory, with inline validation and a focusable linked error summary. */
function RegistrationForm({ entry, port, initial, onDraft, onSubmit }: {
  entry: EntryGrant; port: RegistrationPort; initial: Draft | null;
  onDraft: (draft: Draft) => void; onSubmit: (body: Submission, draft: Draft, counter: string) => void;
}) {
  const [schema, setSchema] = useState<RegistrationSchema | null>(null), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [category, setCategory] = useState(initial?.category ?? ""), [values, setValues] = useState(initial?.values ?? {});
  const [step, setStep] = useState(initial?.step ?? 0), [acknowledged, setAcknowledged] = useState(initial?.acknowledged ?? false);
  const [feedback, setFeedback] = useState<Feedback | null>(initial?.feedback ?? null), [checking, setChecking] = useState(false), [feedbackError, setFeedbackError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName | "privacyAcknowledgement", string>>>({});
  const [errorRevision,setErrorRevision] = useState(0);
  const summary = useRef<HTMLElement>(null), stage = useRef<HTMLHeadingElement>(null), revision = useRef(0), focusedErrorRevision=useRef(0);
  useEffect(() => {
    let alive = true;const abort = new AbortController();
    void port.schema(entry.formContext, abort.signal).then(value => {
      if (!alive) return;
      if (value.formContext.grantReference !== entry.formContext.grantReference
          || value.formContext.bindingVersion !== entry.formContext.bindingVersion) throw new ClientError("invalid-response");
      setSchema(value);setCategory(current => value.categories.some(item => item.code === current) ? current : value.categories[0].code);
    }).catch(error => { if (alive) setLoadError(safeError(error, "ms")); }).finally(() => { if (alive) setLoading(false); });
    // This ref is a non-DOM request fence shared by the effect and event callbacks.
    const fence = revision;
    return () => { alive = false;abort.abort();fence.current++; };
  }, [entry, port, loadAttempt]);
  const current = schema?.categories.find(item => item.code === category);
  useEffect(() => { onDraft({ context: contextKey(entry), category, values, step, acknowledged, feedback }); },
    [entry, category, values, step, acknowledged, feedback, onDraft]);
  useEffect(() => { stage.current?.focus(); }, [step]);
  useEffect(() => {
    // Focus only after a validation gesture; clearing one field must not steal focus while other errors remain.
    if(focusedErrorRevision.current!==errorRevision) {
      focusedErrorRevision.current=errorRevision;
      if(Object.values(errors).some(Boolean)) summary.current?.focus();
    }
  }, [errors,errorRevision]);
  if (loading) return <p role="status">Memuatkan borang…</p>;
  if (!schema || !current) return <StatusPanel kind="error" title="Borang tidak tersedia"
    action={<Button variant="secondary" onClick={() => {
      // Retry metadata explicitly under the original context, with the effect's abort fence; the parent still guards availability.
      setLoading(true);setLoadError("");setLoadAttempt(attempt => attempt + 1);
    }}>Cuba semula borang</Button>}>{loadError || "Sila dapatkan bantuan di kaunter."}</StatusPanel>;
  const definitions = current.fields, visible = definitions.filter(field => step === 0 ? common.has(field.name) : step === 1 && !common.has(field.name));
  const update = (name: FieldName, value: string) => {
    setValues(previous => ({ ...previous, [name]: value }));setErrors(previous => ({ ...previous, [name]: undefined }));
    if (name === "mrn" || name === "wardCode") { revision.current++;setFeedback(null);setFeedbackError(""); }
  };
  const validation = (fields: FieldSpec[]) => {
    const next: typeof errors = {};
    for (const field of fields) {
      const raw = values[field.name] ?? (field.name === "identificationType" ? "TEST_ID" : "");
      // Mirror the server's printable Character.isWhitespace/isSpaceChar union after rejecting original controls.
      const normalized = raw.normalize("NFC").replace(/^[\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu,"");
      const valid = normalized.length > 0 && Array.from(normalized).length <= field.maxLength && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(raw)
        && (field.rule !== "DEMO_ID" || /^DEMO-[A-Z0-9]{4,24}$/.test(normalized))
        && (field.rule !== "DEMO_MRN" || /^DEMO-MRN-[A-Z0-9]{4,16}$/.test(normalized))
        && (field.rule !== "PHONE" || /^\+[0-9]{8,15}$/.test(normalized))
        && (field.rule !== "ENUM" || field.options.some(option => option.value === normalized))
        && (field.kind !== "DESTINATION" || schema.destinations.some(option => option.code === normalized));
      if (!valid) next[field.name] = "Semak maklumat ini.";
    }
    return next;
  };
  const reportErrors = (invalid: typeof errors) => { setErrors(invalid);setErrorRevision(value => value + 1); };
  const next = () => { const invalid = validation(visible);reportErrors(invalid);if (!Object.keys(invalid).length) setStep(step + 1); };
  const checkMrn = async () => {
    const invalid = validation(definitions.filter(field => field.name === "mrn" || field.name === "wardCode"));
    reportErrors(invalid);if (Object.keys(invalid).length) return;
    const captured = ++revision.current;setChecking(true);setFeedback(null);setFeedbackError("");
    try { const result = await port.feedback(entry.formContext, values.mrn!, values.wardCode!);if (revision.current === captured) setFeedback(result); }
    catch { if (revision.current === captured) setFeedbackError("Semakan tidak tersedia. Pengesahan manual di kaunter masih boleh diteruskan."); }
    finally { setChecking(false); }
  };
  const send = () => {
    const invalid = validation(definitions);if (!acknowledged) invalid.privacyAcknowledgement = "Baca dan akui notis demo sebelum menghantar.";
    reportErrors(invalid);
    if (Object.keys(invalid).length) {
      if (definitions.some(field => invalid[field.name])) setStep(definitions.some(field => common.has(field.name) && invalid[field.name]) ? 0 : 1);
      return;
    }
    // Whitelist the selected category and preserve raw input for the server's original-value HMAC.
    const formData = Object.fromEntries(definitions.map(field => [field.name, values[field.name] ?? (field.name === "identificationType" ? "TEST_ID" : "")]));
    const body: Submission = { formContext: entry.formContext, categoryCode: current.code, fieldSchemaVersion: schema.fieldSchemaVersion,
      formData, privacyAcknowledgement: { acknowledged: true, policyVersion: schema.privacy.policyVersion },
      ...(current.code === "PENJAGA" && feedback?.validationToken ? { mrnValidationToken: feedback.validationToken } : {}) };
    onSubmit(body, { context: contextKey(entry), category, values, step, acknowledged, feedback }, entry.scope.counterId);
  };
  const changeCategory = (value: string) => {
    revision.current++;setCategory(value);setFeedback(null);setFeedbackError("");setAcknowledged(false);setErrors({});
    // Retain common fields only: another category cannot inherit hidden MRN/company/purpose properties.
    setValues(previous => Object.fromEntries(Object.entries(previous).filter(([name]) => common.has(name as FieldName))));
  };
  const feedbackText = feedback?.feedback === "MATCH" ? "Padanan demo. Pengesahan manual kakitangan masih diperlukan."
    : feedback?.feedback === "NO_MATCH" ? "Tiada padanan demo. Semak input atau teruskan untuk pengesahan manual."
    : feedback ? "Semakan demo tidak tersedia. Teruskan untuk pengesahan manual." : feedbackError;
  return <div className="registration-form">
    {Object.values(errors).some(Boolean) ? <details className="registration-errors" aria-live="polite">
      <summary ref={summary}>DEMO · Data sintetik · {Object.values(errors).filter(Boolean).length} perlu disemak</summary>
      <p>Gunakan data sintetik sahaja. Pilih maklumat di bawah untuk membetulkannya.</p>
      <div>{Object.entries(errors).filter(([, error]) => error).map(([name]) =>
        <a key={name} href={"#registration-" + name} onClick={event => {event.preventDefault();document.getElementById("registration-" + name)?.focus();}}>
          {name === "privacyAcknowledgement" ? "Notis demo" : definitions.find(field => field.name === name)?.label}</a>)}</div>
    </details> : <p className="registration-demo"><ShieldCheck size={16} aria-hidden="true" />DEMO sahaja · Gunakan data sintetik.</p>}
    <div className="registration-step"><span>Langkah {step + 1} / 3</span>
      <h3 ref={stage} tabIndex={-1}>{step === 0 ? "Maklumat pelawat" : step === 1 ? "Butiran lawatan" : "Semak pendaftaran"}</h3></div>
    {step === 0 && <div className="field"><label htmlFor="registration-category">Kategori pelawat</label>
      <select id="registration-category" value={category} onChange={event => changeCategory(event.target.value)}>
        {schema.categories.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></div>}
    <div className="registration-fields">{visible.map(field => field.name === "identificationType"
      ? <p className="registration-fixed-field" key={field.name}>{field.label}: <strong>ID demo (TEST_ID)</strong></p>
      : field.kind === "SELECT" || field.kind === "DESTINATION"
      ? <div className="field" key={field.name}><label htmlFor={"registration-" + field.name}>{field.label}</label>
        <select id={"registration-" + field.name} value={values[field.name] ?? ""}
          aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? "registration-" + field.name + "-error" : undefined}
          onChange={event => update(field.name, event.target.value)}>
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {(field.kind === "DESTINATION" ? schema.destinations.map(item => ({value:item.code,label:item.label})) : field.options)
            .map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        {errors[field.name] && <span className="field-error" id={"registration-" + field.name + "-error"}>{errors[field.name]}</span>}</div>
      : <InputField key={field.name} id={"registration-" + field.name} label={field.label} value={values[field.name] ?? ""}
        type={field.kind === "PHONE" ? "tel" : "text"} autoComplete="off"
        hint={errors[field.name] ? undefined : field.rule === "DEMO_ID" ? "Contoh: DEMO-ABCD" : field.rule === "DEMO_MRN" ? "Contoh: DEMO-MRN-4821"
          : field.rule === "PHONE" ? "Contoh sintetik: +999123456789" : field.hint || undefined}
        error={errors[field.name]} onChange={event => update(field.name, event.target.value)} />)}</div>
    {step === 1 && category === "PENJAGA" && <div className="registration-mrn">
      <Button variant="secondary" busy={checking} onClick={() => void checkMrn()}>Semak MRN demo</Button>
      <p className="muted">Pilihan sahaja; anda boleh teruskan untuk pengesahan manual.</p>{feedbackText && <p role="status">{feedbackText}</p>}</div>}
    {step === 2 && <><div className="registration-review-region" tabIndex={0} role="region" aria-label="Ringkasan pendaftaran, tatal untuk butiran">
      <dl className="registration-review">{definitions.map(field => <div key={field.name}>
      <dt>{field.name === "identificationNumber" ? "No. demo" : field.name === "relationship" ? "Hubungan"
        : field.name.endsWith("Purpose") ? "Tujuan" : field.label}</dt>
      <dd>{field.name === "identificationType" ? "TEST_ID" : field.kind === "DESTINATION"
        ? schema.destinations.find(destination => destination.code === values[field.name])?.label : values[field.name]}</dd></div>)}</dl></div>
      <p className="registration-policy">{schema.privacy.text}</p>
      <div className="registration-ack"><input id="registration-privacyAcknowledgement" type="checkbox" checked={acknowledged}
        aria-invalid={Boolean(errors.privacyAcknowledgement)} aria-describedby={errors.privacyAcknowledgement ? "registration-privacy-error" : undefined}
        onChange={event => {setAcknowledged(event.target.checked);setErrors(previous => ({...previous,privacyAcknowledgement:undefined}));}} />
        <label htmlFor="registration-privacyAcknowledgement">Saya telah membaca dan mengakui notis demo ini.</label></div>
      {errors.privacyAcknowledgement && <p id="registration-privacy-error" className="field-error">{errors.privacyAcknowledgement}</p>}</>}
    <div className="registration-actions">{step > 0 && <Button variant="secondary" onClick={() => {setErrors({});setStep(step - 1);}}>Kembali</Button>}
      <Button disabled={checking} onClick={step === 2 ? send : next}>{step === 2 ? "Hantar pendaftaran" : "Seterusnya"}</Button></div>
  </div>;
}
