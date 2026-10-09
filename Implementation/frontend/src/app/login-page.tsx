import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, InputField } from "../components/ui/primitives";
import { canonicalLogin } from "../lib/contracts";
import { ClientError, safeError } from "../lib/errors";
import { useAuth } from "./auth-context";

/** Staff-only login; role and counters come exclusively from the server response. */
export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [checkedSession, setCheckedSession] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const checking = auth.state.kind === "loading";
  const logoutUnresolved =
    auth.logoutState.kind === "pending" || auth.logoutState.kind === "unknown";
  const disabled = busy || checking || auth.mutationPending || logoutUnresolved;
  useEffect(() => {
    if (attempt && (message || Object.keys(errors).length))
      summary.current?.focus();
  }, [attempt, errors, message]);
  if (auth.state.kind === "authenticated")
    return (
      <Navigate
        to={auth.state.user.role === "ADMIN" ? "/admin" : "/staff"}
        replace
      />
    );

  /** Never trim passwords or preserve them after a request, including unknown outcomes. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setMessage("");
    setCheckedSession(false);
    const nextErrors: Record<string, string> = {};
    const login = canonicalLogin(account);
    if (!login)
      nextErrors.login =
        "Use 3–64 letters, numbers, dots, underscores or hyphens. Start with a letter or number.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setAttempt((value) => value + 1);
    if (Object.keys(nextErrors).length || !login) return;
    setBusy(true);
    try {
      const user = await auth.login(login, password);
      navigate(user.role === "ADMIN" ? "/admin" : "/staff", { replace: true });
    } catch (error) {
      setMessage(safeError(error));
      if (error instanceof ClientError && error.code === "VALIDATION_FAILED") {
        setErrors(
          Object.fromEntries(
            error.fields
              .filter((name) => ["login", "password"].includes(name))
              .map((name) => [name, "Please check this field."]),
          ),
        );
      }
    } finally {
      setPassword("");
      setVisible(false);
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <aside className="brand-panel" aria-label="HSAAS">
        <a className="wordmark" href="/login">
          <span className="brand-symbol" aria-hidden="true">
            H
          </span>
          <span>
            HSAAS<small>Visitor & Pass Management</small>
          </span>
        </a>
        <div className="brand-copy">
          <span className="eyebrow">HOSPITAL OPERATIONS</span>
          <h1>
            A thoughtful welcome.
            <br />A trusted workflow.
          </h1>
          <p>
            A shared workspace for visitor registration, counter review and pass
            management.
          </p>
          <div className="brand-rule" />
          <div className="brand-detail">
            <ShieldCheck size={22} aria-hidden="true" />
            <span>
              Authorised staff access
              <br />
              <small>Your role defines your workspace.</small>
            </span>
          </div>
        </div>
        <p className="brand-footer">Hospital Sultan Abdul Aziz Shah · UPM</p>
      </aside>
      <main className="login-main" id="main-content">
        <div className="login-card">
          <span className="label-chip">
            <LockKeyhole size={14} aria-hidden="true" /> STAFF PORTAL
          </span>
          <h2>Welcome back</h2>
          <p className="login-intro">Sign in to your HSAAS workspace.</p>
          {/* Keep concurrent session and form feedback together; field rules appear only beside their input. */}
          <div className="login-feedback">
            {auth.state.kind === "anonymous" && auth.state.expired && (
              <p className="notice" role="status">
                Your session has ended. Sign in again.
              </p>
            )}
            {auth.state.kind === "error" && (
              <div className="notice">
                <p role="status">Unable to check your current session.</p>
              </div>
            )}
            {checkedSession &&
              auth.state.kind === "anonymous" &&
              auth.logoutState.kind === "idle" && (
                <p className="notice" role="status">
                  No authorised staff session was found. You can sign in.
                </p>
              )}
            {auth.logoutState.kind === "pending" && (
              <p className="notice" role="status">
                Signing out… Local staff access has been cleared.
              </p>
            )}
            {auth.logoutState.kind === "unknown" && (
              <div className="error-summary" role="alert">
                <strong>Server sign-out could not be confirmed.</strong>
                <p>
                  Local staff access remains cleared. {auth.logoutState.message}
                </p>
                <Button
                  variant="secondary"
                  disabled={auth.mutationPending || checking}
                  onClick={() => {
                    void auth.logout().catch(() => {});
                  }}
                >
                  Retry sign out
                </Button>
              </div>
            )}
            {auth.logoutState.kind === "confirmed" && (
              <p className="notice" role="status">
                Local staff access is cleared. Your staff session is no longer
                authorised.
              </p>
            )}
            {(message || Object.keys(errors).length > 0) && (
              <div
                className="error-summary"
                role="alert"
                aria-label="Please check your sign-in details"
                tabIndex={-1}
                ref={summary}
              >
                <strong>
                  {message
                    ? "Sign-in could not be completed"
                    : "Check details:"}
                </strong>
                {message && <p>{message}</p>}
                <ul>
                  {Object.keys(errors).map((field) => (
                    <li key={field}>
                      <a
                        href={`#${field}`}
                        onClick={(event) => {
                          event.preventDefault();
                          document.getElementById(field)?.focus();
                        }}
                      >
                        {field === "login" ? "Username" : "Password"}
                      </a>
                    </li>
                  ))}
                </ul>
                {message && (
                  <p className="field-hint">
                    Check your current session before trying again.
                  </p>
                )}
              </div>
            )}
          </div>
          <form onSubmit={submit} noValidate aria-busy={busy}>
            <InputField
              id="login"
              label="Username / Staff account"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              error={errors.login}
              disabled={disabled}
            />
            <div className="password-field">
              <InputField
                id="password"
                label="Password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                disabled={disabled}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
                disabled={disabled}
              >
                {visible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            {/* Both explicit actions share a row without shrinking their touch targets or changing auth behavior. */}
            <div className="login-actions">
              <Button
                type="submit"
                busy={busy}
                disabled={disabled}
                className="sign-in"
              >
                {busy ? "Signing in…" : "Sign in"}
                {!busy && <ArrowRight size={18} aria-hidden="true" />}
              </Button>
              {/* Always available for ambiguous login and post-login CSRF failures; never replays login. */}
              <Button
                variant="ghost"
                onClick={() => {
                  // A read resolves the ambiguous result without resubmitting credentials or retaining stale copy.
                  setCheckedSession(true);
                  setMessage("");
                  auth.refresh();
                }}
                disabled={auth.mutationPending}
                busy={checking}
              >
                {logoutUnresolved
                  ? "Check sign-out status"
                  : "Check current session"}
              </Button>
            </div>
          </form>
          <p className="login-help">
            Need an account? <strong>Contact your administrator.</strong>
          </p>
          <div className="login-security">
            <ShieldCheck size={16} aria-hidden="true" /> Access is restricted to
            authorised hospital staff.
          </div>
        </div>
        <p className="login-footer">HSAAS Visitor & Pass Management</p>
      </main>
    </div>
  );
}
