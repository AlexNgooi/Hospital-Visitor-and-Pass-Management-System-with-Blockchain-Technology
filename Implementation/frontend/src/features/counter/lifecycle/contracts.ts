import { z } from "zod";

/** Domain-local runtime contracts reject accidental raw UID, form JSON, actor or integration payloads. */
const uuid = z.string().uuid();
const decimal = z.string().regex(/^[1-9][0-9]{0,18}$/);
const version = z.number().int().nonnegative().safe();
const utc = z.iso.datetime({ offset: false });
const category = z.enum(["EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR"]);
const source = z.literal("SIMULATED");
const environment = z.enum(["synthetic", "test"]);
const label = z.string().min(1).max(120).refine(value => !/[\p{C}]/u.test(value));
export const safeResultSchema = z.object({
  id: z.union([uuid, decimal]), reference: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).nullable(),
  status: z.enum(["AVAILABLE", "CLAIMED", "SUCCEEDED", "CONSUMED", "CANCELLED", "EXPIRED", "ISSUED", "RETURNED", "LOST", "DISABLED", "RESTORED", "OVERDUE", "FOLLOWUP_RECORDED"]), version,
}).strict();
export const cardSchema = z.object({
  id: uuid, cardCode: label, maskedUid: z.string().regex(/^\*{3}[0-9A-F]{4}$/), categoryCode: category,
  status: z.enum(["AVAILABLE", "ISSUED", "OVERDUE", "LOST", "DISABLED"]), version, source, environment,
}).strict();
export const assignmentSchema = z.object({
  id: uuid, passReference: z.string().regex(/^P-DEMO-[a-f0-9]{32}$/), cardId: uuid, cardCode: label,
  registrationId: decimal, counterId: decimal, status: z.enum(["ISSUED", "OVERDUE", "RETURNED", "LOST"]),
  issuedAt: utc, dueAt: utc, returnRuleKey: z.string().regex(/^return_hours_(EXECUTIVE|PENJAGA|VENDOR|CONTRACTOR)$/),
  returnRuleVersion: version, returnedAt: utc.nullable(), closedAt: utc.nullable(), closureReason: z.enum(["RETURNED", "LOST"]).nullable(),
  version, operationOrigin: source, environment,
}).strict();
export const pageSchema = <T extends z.ZodType>(item: T) => z.object({
  items: z.array(item).max(25), total: version, page: version, pageSize: z.literal(25), serverNow: utc,
}).strict();
export const sampleSchema = z.object({ sampleCode: label, categoryCode: category, label }).strict();
export const counterSchema = z.object({ id: decimal, code: label, name: label }).strict();
export const jobSchema = z.object({
  id: uuid, deviceId: uuid, counterId: decimal, purpose: z.enum(["ENROLL", "ISSUE", "RETURN", "RESTORE"]), targetId: z.union([decimal, uuid, z.literal("REGISTER")]),
  status: z.enum(["CLAIMED", "SUCCEEDED", "CONSUMED", "CANCELLED", "EXPIRED"]), expiresAt: utc,
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/).nullable(), leaseToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).nullable(),
  scanResultId: uuid.nullable(), sampleCode: label.nullable(), source, serverNow: utc,
}).strict();
export const historySchema = z.array(z.object({
  id: uuid, assignmentId: uuid.nullable(), eventType: z.enum(["CARD_REGISTERED", "ISSUED", "RETURNED", "OVERDUE", "MARKED_LOST", "DISABLED", "RESTORED", "CONTACT_REVEALED", "FOLLOWUP_RECORDED"]),
  actorId: z.union([decimal, z.literal("SYSTEM")]), occurredAt: utc, reasonCode: z.string().regex(/^[A-Z_]{1,64}$/).nullable(),
}).strict()).max(100);
export const revealSchema = z.object({ assignmentId: uuid, phone: z.string().regex(/^\+[0-9]{8,15}$/), expiresAt: utc, source }).strict();
export type Card = z.infer<typeof cardSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Job = z.infer<typeof jobSchema>;
export type Sample = z.infer<typeof sampleSchema>;
export type Counter = z.infer<typeof counterSchema>;
export type SafeResult = z.infer<typeof safeResultSchema>;
export type History = z.infer<typeof historySchema>;
export type Reveal = z.infer<typeof revealSchema>;
export type CardPage = z.infer<ReturnType<typeof pageSchema<typeof cardSchema>>>;
export type AssignmentPage = z.infer<ReturnType<typeof pageSchema<typeof assignmentSchema>>>;
