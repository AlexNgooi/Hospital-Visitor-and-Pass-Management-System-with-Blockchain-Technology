import { z } from "zod";

/** Domain-local runtime contracts reject accidental raw UID, form JSON, actor or integration payloads. */
const uuid = z.string().uuid();
const decimal = z.string().regex(/^[1-9][0-9]{0,18}$/);
const version = z.number().int().nonnegative().safe();
const utc = z.iso.datetime({ offset: false });
const category = z.enum(["EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR"]);
const source = z.enum(["SIMULATED", "SYNTHETIC"]);
const environment = z.enum(["synthetic", "test"]);
const label = z.string().min(1).max(120).refine(value => !/[\p{C}]/u.test(value));
export const safeResultSchema = z.object({
  id: z.union([uuid, decimal]), reference: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).nullable(),
  status: z.enum(["AVAILABLE", "CLAIMED", "SUCCEEDED", "CONSUMED", "CANCELLED", "EXPIRED", "ISSUED", "RETURNED", "LOST", "DISABLED", "RESTORED", "OVERDUE", "FOLLOWUP_RECORDED"]), version,
}).strict();
export const cardSchema = z.object({
  id: uuid, cardCode: label, maskedUid: z.string().regex(/^\*{3}[0-9A-F]{4}$/).nullable(), categoryCode: category,
  status: z.enum(["AVAILABLE", "ISSUED", "OVERDUE", "LOST", "DISABLED"]), version, source, environment,
  destinationId: decimal.nullable(), destinationLabel: label.nullable(), enrollmentMethod: z.enum(["SCAN", "MANUAL"]),
}).strict().refine(card => card.enrollmentMethod === "MANUAL"
  ? card.source === "SYNTHETIC" && card.maskedUid === null && card.destinationId !== null && card.destinationLabel !== null
  : card.source === "SIMULATED" && card.maskedUid !== null, "Inventory method and provenance must agree");
export const assignmentSchema = z.object({
  id: uuid, passReference: z.string().regex(/^P-DEMO-[a-f0-9]{32}$/), cardId: uuid, cardCode: label,
  registrationId: decimal, counterId: decimal, status: z.enum(["ISSUED", "OVERDUE", "RETURNED", "LOST"]),
  issuedAt: utc, dueAt: utc.nullable(), returnRuleKey: z.string().regex(/^return_hours_(EXECUTIVE|PENJAGA|VENDOR|CONTRACTOR)$/),
  returnRuleVersion: version, returnedAt: utc.nullable(), closedAt: utc.nullable(), closureReason: z.enum(["RETURNED", "LOST"]).nullable(),
  version, operationOrigin: z.enum(["SIMULATED", "MANUAL"]), environment, dataSource: source,
  destinationId: decimal.nullable(), destinationCode: label.nullable(), destinationLabel: label.nullable(),
  issuedBy: decimal, returnedBy: decimal.nullable(), closedBy: decimal.nullable(),
}).strict().refine(pass => (pass.operationOrigin === "MANUAL"
  ? pass.dataSource === "SYNTHETIC" && pass.destinationId !== null && pass.destinationCode !== null && pass.destinationLabel !== null
  : pass.dataSource === "SIMULATED") && (pass.status !== "OVERDUE" || pass.dueAt !== null), "Pass method, provenance and deadline must agree");
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

/** Reference and issue-context contracts contain no registration form or patient information. */
export const referenceSchema = z.object({ id: decimal, code: label, label }).strict();
export const inventoryReferencesSchema = z.object({ categories: z.array(referenceSchema).max(4), destinations: z.array(referenceSchema).max(500) }).strict();
export const issueContextSchema = z.object({
  registrationId: decimal, publicReference: label, categoryCode: category, version, multipleActivePassesAllowed: z.boolean(), activePassCount: version,
  destinations: z.array(referenceSchema), defaultReturnHours: z.number().int().min(1).max(720).nullable(), returnRuleVersion: version,
  cards: pageSchema(cardSchema),
}).strict();
export type IssueContext = z.infer<typeof issueContextSchema>;
export type InventoryReferences = z.infer<typeof inventoryReferencesSchema>;
export type PassSelection = { cardId: string; expectedVersion: number; destinationId: string; dueAt: string | null };
