import { Children, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import "./toast.css";

type Tone = "success" | "error" | "info";
const ToastContainer = createContext<HTMLDivElement | null>(null);

/** One live region keeps feedback above page/dialog layers without moving keyboard focus. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [validation, setValidation] = useState<{ message: string; revision: number } | null>(null);
  useEffect(() => {
    // Native required/pattern/range checks use the same feedback channel as API failures.
    const invalidFields = new Set<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>();
    let queued = false, alive = true;
    const invalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) || !field.form) return;
      event.preventDefault(); invalidFields.add(field);
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        if (!alive) return;
        const fields = [...invalidFields]; invalidFields.clear(); queued = false;
        fields[0]?.focus();
        // Read label text only; nested select options and entered values never enter feedback.
        const labels = fields.map(item => Array.from(item.labels?.[0]?.childNodes ?? []).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim() || item.getAttribute("aria-label") || "Required field");
        setValidation(previous => ({ message: `Please check: ${labels.join(", ")}. Complete required fields and follow the displayed format or limits.`, revision: (previous?.revision ?? 0) + 1 }));
      });
    };
    const clear = () => setValidation(null);
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", clear, true);
    document.addEventListener("change", clear, true);
    return () => { alive = false; document.removeEventListener("invalid", invalid, true); document.removeEventListener("input", clear, true); document.removeEventListener("change", clear, true); };
  }, []);
  return <ToastContainer.Provider value={container}>
    {children}
    {validation && <ToastNotice revision={validation.revision}>{validation.message}</ToastNotice>}
    {createPortal(<div ref={setContainer} className="toast-viewport" aria-label="Notifications" aria-live="polite" aria-relevant="additions text" />, document.body)}
  </ToastContainer.Provider>;
}

/** Compare visible copy rather than JSX identity so polling/rerenders do not repeat a toast. */
function notificationText(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child)
    ? notificationText(child.props.children) : String(child)).join(" ");
}

/** Feedback expires locally; recovery actions stay in the page even after dismissal. */
export function ToastNotice({ children, tone = "error", title, action, revision = 0 }: {
  children?: ReactNode; tone?: Tone; title?: string; action?: ReactNode; revision?: number;
}) {
  const container = useContext(ToastContainer);
  const identity = `${tone}:${title ?? ""}:${notificationText(children)}:${revision}`;
  return <>{container && createPortal(<ToastCard key={identity} tone={tone} title={title}>{children}</ToastCard>, container)}{action}</>;
}

/** Pause dismissal while reading, hovering, focusing, or returning from a background tab. */
function ToastCard({ children, tone, title }: { children?: ReactNode; tone: Tone; title?: string }) {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [background, setBackground] = useState(() => document.hidden);
  useEffect(() => {
    const update = () => setBackground(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!visible || hovered || focused || background) return;
    const timer = window.setTimeout(() => setVisible(false), tone === "success" ? 5000 : 9000);
    return () => window.clearTimeout(timer);
  }, [visible, hovered, focused, background, tone]);
  if (!visible) return null;
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  return <section className={`toast toast-${tone}`} role={tone === "error" ? "alert" : "status"}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <Icon className="toast-icon" size={21} aria-hidden="true" />
    <div className="toast-copy">{title && <strong>{title}</strong>}{children && <div>{children}</div>}</div>
    <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setVisible(false)}><X size={18} aria-hidden="true" /></button>
  </section>;
}
