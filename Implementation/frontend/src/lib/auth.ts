import { apiClient, type ApiClient } from "./api-client";
import { canonicalLogin, sessionSchema, type SessionUser } from "./contracts";
import { ClientError } from "./errors";

/** Injectable auth boundary for component tests; production always uses the real transport. */
export interface AuthPort {
  me(signal?: AbortSignal): Promise<SessionUser>;
  login(login: string, password: string): Promise<SessionUser>;
  logout(): Promise<void>;
  onExpired(listener: () => void): () => void;
}

/** Auth/CSRF deliberately use no business idempotency key and never auto-replay. */
export function createAuthPort(client: ApiClient): AuthPort {
  return {
    async me(signal) {
      try {
        return await client.get("/api/auth/me", sessionSchema, { signal });
      } catch (error) {
        // A confirmed absent/revoked session cannot keep CSRF from its previous framework identity.
        if (error instanceof ClientError && error.status === 401)
          client.invalidateCsrf();
        throw error;
      }
    },
    async login(input, password) {
      const login = canonicalLogin(input);
      if (!login || !password) throw new Error("Invalid login input.");
      await client.bootstrapCsrf();
      let user: SessionUser;
      try {
        user = await client.post(
          "/api/auth/login",
          { login, password },
          sessionSchema,
        );
      } finally {
        // Even UNKNOWN may have rotated the server session; only a later explicit action reboots CSRF.
        client.invalidateCsrf();
      }
      // Bootstrap failure does not replay login. A later me retry checks committed identity.
      await client.bootstrapCsrf();
      return user;
    },
    async logout() {
      try {
        await client.post("/api/auth/logout", {});
      } finally {
        // Revocation can commit before a 503/delete failure: never reuse pre-logout CSRF afterwards.
        client.invalidateCsrf();
      }
      // Logout has committed; CSRF unavailability must not resurrect the signed-out UI.
      try {
        await client.bootstrapCsrf();
      } catch (error) {
        if (!(error instanceof ClientError)) throw error;
      }
    },
    onExpired: (listener) => client.onSessionExpired(listener),
  };
}
export const authPort = createAuthPort(apiClient);
