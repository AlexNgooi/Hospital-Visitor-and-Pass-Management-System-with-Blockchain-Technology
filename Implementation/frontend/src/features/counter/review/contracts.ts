import { z } from "zod";
import type { Command } from "../../../lib/api-client";

/** Current synthetic categories are canonical codes; database IDs stay decimal strings. */
export const categorySchema = z.enum(["EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR"]);
export const statusSchema = z.enum(["SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"]);
export const reasonSchema = z.enum([
  "INFORMATION_INCOMPLETE", "IDENTITY_NOT_CONFIRMED", "MRN_WARD_NOT_CONFIRMED", "INFORMATION_NOT_CONFIRMED",
]);
export const basisSchema = z.enum(["IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"]);
const idSchema = z.string().regex(/^[1-9][0-9]{0,18}$/).refine((value) => BigInt(value) <= 9223372036854775807n);
const versionSchema = z.number().int().nonnegative().safe();
const utcSchema = z.iso.datetime({ offset: false });
// Controlled labels still reject invisible control characters; do not normalize returned text globally.
const labelSchema = z.string().min(1).max(120).refine((value) => !Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127));
const masking = (value: string) => (value.match(/\*/g)?.length ?? 0) >= 3;

/** Strict operational schemas reject raw identifiers and accidental persistence/entity fields before rendering. */
export const queueItemSchema = z.object({
  id: idSchema,
  publicReference: z.string().regex(/^R-[A-Za-z0-9_-]{1,126}$/),
  counterId: idSchema,
  categoryCode: categorySchema,
  maskedVisitorName: z.string().min(3).max(120).regex(/^[\p{L}\p{M}* .'-]+$/u).refine(masking),
  destinationLabel: labelSchema,
  status: statusSchema,
  version: versionSchema,
  submittedAt: utcSchema,
}).strict();
export const queueSchema = z.object({
  items: z.array(queueItemSchema).max(50),
  total: z.number().int().nonnegative().safe(),
  page: z.number().int().nonnegative().safe(),
  pageSize: z.number().int().min(1).max(50),
  serverNow: utcSchema,
}).strict();
const maskedIdSchema = z.string().min(3).max(80).regex(/^[A-Za-z0-9* -]+$/).refine(masking);

/** MRN feedback never becomes staff confirmation; only review metadata can represent completed review. */
export const detailSchema = queueItemSchema.extend({
  maskedIdentification: maskedIdSchema,
  maskedPhone: z.string().min(3).max(40).regex(/^[+0-9* ()-]+$/).refine(masking),
  maskedMrn: maskedIdSchema.nullable(),
  mrnMode: z.enum(["mock", "manual"]).nullable(),
  mrnFeedback: z.enum(["NOT_CHECKED", "MATCH", "NO_MATCH", "TIMEOUT", "UNAVAILABLE"]).nullable(),
  environment: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  source: z.enum(["SYNTHETIC", "REAL"]),
  review: z.object({
    actorId: idSchema,
    reviewedAt: utcSchema,
    source: z.enum(["SYNTHETIC_MANUAL", "LOCAL"]),
    methodCode: z.literal("SYNTHETIC_RECORD_COMPARISON").nullable(),
    basisCodes: z.array(basisSchema).max(3),
    reasonCode: reasonSchema.nullable(),
  }).strict().nullable(),
}).strict();
export const resultSchema = z.object({
  id: idSchema,
  reference: z.string().regex(/^R-[A-Za-z0-9_-]{1,126}$/),
  status: z.enum(["VERIFIED", "REJECTED"]),
  version: versionSchema,
}).strict();

/** The client submits C09 confirmations/evidence only; actor/time/source are absent from this shape. */
export const verifySchema = z.object({
  expectedVersion: versionSchema,
  identityConfirmed: z.literal(true),
  mrnConfirmed: z.literal(true).optional(),
  wardConfirmed: z.literal(true).optional(),
  manualEvidence: z.object({
    methodCode: z.literal("SYNTHETIC_RECORD_COMPARISON"),
    basisCodes: z.array(basisSchema).min(1).max(3).refine((values) => new Set(values).size === values.length),
  }).strict(),
}).strict();
export const rejectSchema = z.object({ expectedVersion: versionSchema, reasonCode: reasonSchema }).strict();
export type Category = z.infer<typeof categorySchema>;
export type Status = z.infer<typeof statusSchema>;
export type Reason = z.infer<typeof reasonSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type Queue = z.infer<typeof queueSchema>;
export type Detail = z.infer<typeof detailSchema>;
export type ReviewResult = z.infer<typeof resultSchema>;
export type Verify = z.infer<typeof verifySchema>;
export type Reject = z.infer<typeof rejectSchema>;
export interface QueueQuery { counterId: string; category: Category | "ALL"; status: Status | "ALL"; page: number; pageSize: number; }

/** Production always calls the real transport; tests inject a separate explicit synthetic port. */
export interface ReviewPort {
  list(query: QueueQuery, signal?: AbortSignal): Promise<Queue>;
  detail(id: string, signal?: AbortSignal): Promise<Detail>;
  verify(id: string, input: Verify): Command<ReviewResult>;
  reject(id: string, input: Reject): Command<ReviewResult>;
}

export const categoryLabels: Record<Category, string> = { EXECUTIVE: "Executive Visitor", PENJAGA: "Penjaga", VENDOR: "Vendor", CONTRACTOR: "Contractor" };
export const statusLabels: Record<Status, string> = { SUBMITTED: "Awaiting review", VERIFIED: "Approved", REJECTED: "Rejected", CANCELLED: "Cancelled" };
export const reasonLabels: Record<Reason, string> = {
  INFORMATION_INCOMPLETE: "Required information is incomplete",
  IDENTITY_NOT_CONFIRMED: "Identity could not be confirmed",
  MRN_WARD_NOT_CONFIRMED: "MRN or ward could not be confirmed",
  INFORMATION_NOT_CONFIRMED: "Visit information could not be confirmed",
};
