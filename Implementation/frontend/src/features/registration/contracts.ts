import { z } from "zod";
import { apiClient, type ApiClient } from "../../lib/api-client";
import { formContextSchema } from "../../lib/contracts";
import type { EntryGrant } from "../registration-qr/contracts";

/** Only approved demo metadata can drive the form; unknown fields and variants fail closed. */
export const fieldNames = ["fullName", "identificationType", "identificationNumber", "phone", "mrn", "wardCode", "relationship",
  "organisation", "company", "contactPerson", "destinationCode", "visitPurpose", "deliveryPurpose", "workPurpose"] as const;
export type FieldName = typeof fieldNames[number];
const option = z.object({ value: z.string().max(32), label: z.string().max(120) }).strict();
const field = z.object({
  name: z.enum(fieldNames), label: z.string().min(1).max(100), kind: z.enum(["TEXT", "PHONE", "SELECT", "DESTINATION"]),
  maxLength: z.number().int().min(1).max(500), rule: z.enum(["TEXT", "PHONE", "DEMO_ID", "DEMO_MRN", "REFERENCE", "ENUM"]),
  hint: z.string().max(300), options: z.array(option).max(10),
}).strict();
export const schemaReply = z.object({
  formContext: formContextSchema, fieldSchemaVersion: z.literal("synthetic-registration-v1"), source: z.literal("SYNTHETIC"),
  notificationStatus: z.literal("NOT_ENABLED"),
  privacy: z.object({ policyVersion: z.literal("synthetic-privacy-v1"), text: z.string().min(1).max(1000) }).strict(),
  categories: z.array(z.object({ id: z.string().regex(/^[1-9][0-9]*$/), code: z.enum(["PENJAGA", "EXECUTIVE", "VENDOR", "CONTRACTOR"]),
    label: z.string().min(1).max(120), fields: z.array(field).min(7).max(8) }).strict()).min(1).max(4),
  destinations: z.array(z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/), label: z.string().min(1).max(120) }).strict()).max(10000),
}).strict().superRefine((value, context) => {
  // Duplicate names must not silently collapse fields or catalogue values into an ambiguous command.
  if (new Set(value.categories.map(category => category.code)).size !== value.categories.length
      || value.categories.some(category => new Set(category.fields.map(item => item.name)).size !== category.fields.length)
      || new Set(value.destinations.map(destination => destination.code)).size !== value.destinations.length) {
    context.addIssue({ code: "custom", message: "Invalid registration metadata" });
  }
});
export const receiptSchema = z.object({ publicReference: z.string().regex(/^R-[A-Za-z0-9_-]{22}$/) }).strict();
export const feedbackSchema = z.object({
  feedback: z.enum(["MATCH", "NO_MATCH", "TIMEOUT", "UNAVAILABLE"]), mode: z.enum(["mock", "manual"]), source: z.literal("SYNTHETIC"),
  validationToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).nullable(), expiresAt: z.iso.datetime({ precision: 6 }).nullable(),
}).strict().refine(value => value.mode === "manual"
  ? value.validationToken === null && value.expiresAt === null
  : value.validationToken !== null && value.expiresAt !== null);
export type RegistrationSchema = z.infer<typeof schemaReply>;
export type FieldSpec = z.infer<typeof field>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export interface Submission {
  readonly formContext: EntryGrant["formContext"];
  readonly categoryCode: RegistrationSchema["categories"][number]["code"];
  readonly fieldSchemaVersion: RegistrationSchema["fieldSchemaVersion"];
  readonly formData: Readonly<Partial<Record<FieldName, string>>>;
  readonly privacyAcknowledgement: { readonly acknowledged: true; readonly policyVersion: "synthetic-privacy-v1" };
  readonly mrnValidationToken?: string;
}
/** Public CSRF transport never retries writes; one immutable command owns the original serialized body/key. */
export function createRegistrationPort(client: ApiClient = apiClient) {
  return {
    schema: (formContext: EntryGrant["formContext"], signal?: AbortSignal) =>
      client.post("/api/public/registration-schema", { formContext }, schemaReply, { signal }),
    feedback: (formContext: EntryGrant["formContext"], mrn: string, wardCode: string) =>
      client.post("/api/public/mrn-validations", { formContext, mrn, wardCode }, feedbackSchema),
    submission: (body: Submission) => client.command("/api/public/registrations", body, receiptSchema),
  };
}
export type RegistrationPort = ReturnType<typeof createRegistrationPort>;
export const registrationPort = createRegistrationPort();
