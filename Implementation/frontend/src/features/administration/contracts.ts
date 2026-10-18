import { z } from "zod";

/** Feature-local schemas validate every backend projection without modifying generated/shared contracts. */
export const id = z.string().regex(/^[1-9][0-9]{0,18}$/);
export const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const referenceSchema = z.object({ id, code: z.string(), name: z.string(), active: z.boolean(), version });
export const referencesSchema = z.array(referenceSchema);
export type Reference = z.infer<typeof referenceSchema>;
export const usersSchema = z.array(z.object({ id, login: z.string(), role: z.enum(["ADMIN", "COUNTER_STAFF"]), active: z.boolean(), version, permissions: z.array(z.object({ counterId: id, active: z.boolean(), version })) }));
export type User = z.infer<typeof usersSchema>[number];
export const settingsSchema = z.array(z.object({ id, key: z.string(), value: z.number().int(), version }));
export const savedSchema = z.object({ saved: z.literal(true) });
export const capabilitiesSchema = z.object({ environment: z.string(), readerMode: z.string(), mrnMode: z.string(), notificationStatus: z.literal("NOT_ENABLED"), blockchainStatus: z.literal("NOT_ENABLED"), auditStatus: z.literal("LOCAL_ONLY") });
export const reportSchema = z.object({ from: z.string(), to: z.string(), serverUpdatedAt: z.iso.datetime(), timezone: z.literal("Asia/Kuala_Lumpur"), origin: z.string(), metrics: z.array(z.object({ metric: z.string(), label: z.string(), amount: z.number().int().nonnegative() })), preview: z.array(z.object({ reference: z.string(), visitor: z.string(), category: z.string(), destination: z.string(), status: z.string(), submittedAt: z.iso.datetime() })) });
export type Report = z.infer<typeof reportSchema>;
export const exportSchema = z.object({ id: z.uuid(), filename: z.string().regex(/^hsaas-masked-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/), csv: z.string(), rowCount: z.number().int().nonnegative(), serverUpdatedAt: z.iso.datetime() });
export const auditSchema = z.object({ serverUpdatedAt: z.iso.datetime(), auditStatus: z.literal("LOCAL_ONLY"), moreEvents: z.boolean(), moreHistory: z.boolean(), events: z.array(z.object({ id: z.uuid(), action: z.string(), target: z.string(), actorId: id.nullable(), snapshot: z.string(), occurredAt: z.iso.datetime() })), changes: z.array(z.object({ id, kind: z.string(), target: z.string(), previousVersion: version.nullable(), version, previousValue: z.string().nullable(), currentValue: z.string().nullable(), reason: z.string(), actorId: id, occurredAt: z.iso.datetime() })) });
export const reasons = ["POLICY_UPDATE", "STAFF_ONBOARDING", "ACCESS_REVIEW", "REFERENCE_CORRECTION", "OPERATIONS_CHANGE"] as const;
export type Reason = typeof reasons[number];
