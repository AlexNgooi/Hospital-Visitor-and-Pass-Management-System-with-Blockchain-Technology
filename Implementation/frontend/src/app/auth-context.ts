import { createContext, useContext } from "react";
import type { AuthPort } from "../lib/auth";
import type { SessionUser } from "../lib/contracts";

export type AuthState =
  | { kind: "loading" }
  | { kind: "anonymous"; expired: boolean }
  | { kind: "authenticated"; user: SessionUser }
  | { kind: "error"; error: unknown };
export interface AuthContextValue {
  state: AuthState;
  refresh: () => void;
  login: AuthPort["login"];
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);

/** Features share server identity, never construct local roles. Kept separate for Fast Refresh. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider.");
  return value;
}
