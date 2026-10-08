import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

/** Consistent touch/focus/loading behavior shared by later feature modules. */
export function Button({
  variant = "primary",
  busy = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`button button-${variant} ${props.className ?? ""}`}
    >
      {busy && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Labels and inline errors remain programmatically associated with their input. */
export function InputField({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const description = [hint && `${props.id}-hint`, error && `${props.id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="field">
      <label htmlFor={props.id}>{label}</label>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={description || undefined}
      />
      {hint && (
        <span className="field-hint" id={`${props.id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${props.id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Failure, loading and empty are explicit states; none invent a zero-valued result. */
export function StatusPanel({
  kind,
  title,
  children,
  action,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`status-panel status-${kind}`}
      role={kind === "error" ? "alert" : "status"}
      aria-busy={kind === "loading"}
    >
      <span className="status-icon">
        {kind === "loading" ? (
          <LoaderCircle className="spin" aria-hidden="true" />
        ) : (
          <AlertCircle aria-hidden="true" />
        )}
      </span>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {action && <div className="status-action">{action}</div>}
      {kind === "loading" && (
        <div className="skeleton-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}

/** C10 UI boundary only: M02 supplies safe scope labels and handles the CAS exchange. */
export function RestartConfirmation({
  open,
  currentLabel,
  requestedLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  currentLabel: string;
  requestedLabel: string;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <Dialog.Title>Mulakan pendaftaran baharu?</Dialog.Title>
          <Dialog.Description>
            Pendaftaran semasa ({currentLabel}) akan diganti dengan{" "}
            {requestedLabel}. Maklumat lama hanya dipadam selepas pertukaran
            disahkan.
          </Dialog.Description>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={busy}
              autoFocus
            >
              Kekalkan borang
            </Button>
            <Button onClick={onConfirm} busy={busy}>
              Mulakan semula
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
