import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authPort, type AuthPort } from "../lib/auth";
import { ClientError } from "../lib/errors";
import { AuthContext, type AuthState } from "./auth-context";

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
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const epoch = ++generation.current;
    port
      .me(controller.signal)
      .then((user) => {
        if (generation.current === epoch && !controller.signal.aborted)
          setState({ kind: "authenticated", user });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation.current !== epoch) return;
        setState(
          error instanceof ClientError &&
            error.status === 401 &&
            error.code === "AUTHENTICATION_REQUIRED"
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
      if (pending.current)
        throw new Error("Authentication is already pending.");
      pending.current = true;
      const epoch = ++generation.current;
      try {
        const user = await port.login(account, password);
        if (epoch !== generation.current)
          throw new Error("Authentication state changed.");
        setState({ kind: "authenticated", user });
        return user;
      } finally {
        pending.current = false;
      }
    },
    [port],
  );
  const logout = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const epoch = ++generation.current;
    try {
      await port.logout();
      if (epoch === generation.current)
        setState({ kind: "anonymous", expired: false });
    } finally {
      pending.current = false;
    }
  }, [port]);
  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        refresh: () => {
          setState({ kind: "loading" });
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
