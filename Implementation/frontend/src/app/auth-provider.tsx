import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authPort, type AuthPort } from "../lib/auth";
import { ClientError, safeError } from "../lib/errors";
import { AuthContext, type AuthState, type LogoutState } from "./auth-context";

/** Cancel stale bootstrap and fence pending results so logout/expiry cannot restore identity. */
export function AuthProvider({
  children,
  port = authPort,
}: {
  children: ReactNode;
  port?: AuthPort;
}) {
  const [state, setState] = useState<AuthState>({ kind: "loading" });
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const pendingLogin = useRef(false);
  const pendingLogout = useRef(false);
  const logoutIntent = useRef(false);
  const logoutConfirmed = useRef(false);
  const [logoutState, setLogoutState] = useState<LogoutState>({ kind: "idle" });
  const [mutationPending, setMutationPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const epoch = ++generation.current;
    port
      .me(controller.signal)
      .then((user) => {
        if (generation.current !== epoch || controller.signal.aborted) return;
        if (logoutIntent.current) {
          // An explicit read may discover a still-active server session; keep local access cleared.
          logoutConfirmed.current = false;
          setState({ kind: "anonymous", expired: false });
          setLogoutState({
            kind: "unknown",
            message: "The server session is still active. Retry sign out.",
          });
        } else setState({ kind: "authenticated", user });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation.current !== epoch) return;
        const anonymous =
          error instanceof ClientError &&
          error.status === 401 &&
          error.code === "AUTHENTICATION_REQUIRED";
        if (logoutIntent.current) {
          setState({ kind: "anonymous", expired: false });
          logoutConfirmed.current = anonymous;
          setLogoutState(
            anonymous
              ? { kind: "confirmed" }
              : { kind: "unknown", message: safeError(error) },
          );
        } else
          setState(
            anonymous
              ? { kind: "anonymous", expired: false }
              : { kind: "error", error },
          );
      });
    return () => {
      controller.abort();
    };
  }, [port, revision]);
  useEffect(
    () =>
      port.onExpired(() => {
        generation.current++;
        setState({ kind: "anonymous", expired: true });
      }),
    [port],
  );
  const login = useCallback(
    async (account: string, password: string) => {
      if (
        pendingLogin.current ||
        pendingLogout.current ||
        (logoutIntent.current && !logoutConfirmed.current)
      )
        throw new Error("Authentication is already pending.");
      pendingLogin.current = true;
      setMutationPending(true);
      const epoch = ++generation.current;
      try {
        const user = await port.login(account, password);
        if (epoch !== generation.current)
          throw new Error("Authentication state changed.");
        // Only a new explicit login may end the sign-out intent; reads cannot silently undo it.
        logoutIntent.current = false;
        logoutConfirmed.current = false;
        setLogoutState({ kind: "idle" });
        setState({ kind: "authenticated", user });
        return user;
      } finally {
        pendingLogin.current = false;
        if (!pendingLogout.current) setMutationPending(false);
      }
    },
    [port],
  );
  const logout = useCallback(async () => {
    if (pendingLogout.current) return;
    pendingLogout.current = true;
    logoutIntent.current = true;
    logoutConfirmed.current = false;
    // Fence pending me/login results and unmount protected pages before the network call settles.
    generation.current++;
    setState({ kind: "anonymous", expired: false });
    setLogoutState({ kind: "pending" });
    setMutationPending(true);
    try {
      await port.logout();
      if (pendingLogin.current)
        setLogoutState({
          kind: "unknown",
          message:
            "An earlier sign-in request is still pending. Check sign-out status after it finishes.",
        });
      else {
        logoutConfirmed.current = true;
        setLogoutState({ kind: "confirmed" });
      }
    } catch (error) {
      // A timeout/503 may follow committed revocation; never infer success or reuse the old user.
      setLogoutState({ kind: "unknown", message: safeError(error) });
      throw error;
    } finally {
      pendingLogout.current = false;
      if (!pendingLogin.current) setMutationPending(false);
    }
  }, [port]);
  return (
    <AuthContext.Provider
      value={{
        state,
        logoutState,
        mutationPending,
        login,
        logout,
        refresh: () => {
          // Session reads are explicit recovery, never an automatic replay of either auth POST.
          if (pendingLogin.current || pendingLogout.current) return;
          generation.current++;
          setState({ kind: "loading" });
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
