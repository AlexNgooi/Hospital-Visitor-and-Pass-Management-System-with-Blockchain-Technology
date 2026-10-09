import { z } from "zod";
import { formContextSchema, registrationScopeSchema } from "../../lib/contracts";
import { apiClient, type ApiClient } from "../../lib/api-client";

/** Feature schemas validate wire data before any QR or form capability can be presented. */
export const capabilitiesSchema = z.object({ enabled: z.boolean() }).strict();
const timestamp = z.iso.datetime({ precision: 6 });
export const currentSchema = z.object({
  displaySessionId: z.uuid(), entryUrl: z.string().url().max(2300),
  scope: registrationScopeSchema, serverNow: timestamp, rotateAt: timestamp, expiresAt: timestamp,
}).strict();
export const entrySchema = z.object({
  formContext: formContextSchema, scope: registrationScopeSchema,
  serverNow: timestamp, grantExpiresAt: timestamp,
}).strict();
export type CurrentQr = z.infer<typeof currentSchema>;
export type EntryGrant = z.infer<typeof entrySchema>;

/** No write retries occur automatically; UNKNOWN results are recovered through explicit GET. */
export function createQrPort(client: ApiClient = apiClient) {
  return {
    capabilities: (signal?: AbortSignal) => client.get("/api/public/registration-entry/capabilities", capabilitiesSchema, { signal }),
    create: (counterId: string) => client.post("/api/staff/registration-qr-sessions", { counterId, categoryScope: null }, z.object({ displaySessionId: z.uuid() }).strict(), { authRequired: true }),
    current: (id: string, signal?: AbortSignal) => client.get(`/api/staff/registration-qr-sessions/${id}/current`, currentSchema, { signal, authRequired: true }),
    revoke: (id: string) => client.post<void>(`/api/staff/registration-qr-sessions/${id}/revoke`, {}, undefined, { authRequired: true }),
    bootstrap: () => client.bootstrapCsrf(),
    exchange: (entryToken: string, expectedFormContext?: EntryGrant["formContext"]) => client.post("/api/public/registration-entry/exchange", {
      entryToken, ...(expectedFormContext ? { restartConfirmed: true, expectedFormContext } : {}),
    }, entrySchema),
    entry: () => client.get("/api/public/registration-entry", entrySchema),
  };
}
export type QrPort = ReturnType<typeof createQrPort>;
export const qrPort = createQrPort();
