import { z } from "zod";
import type { components } from "../generated/api";

/** Frozen C01 wire IDs stay opaque strings; generated-shape checks never replace runtime validation. */
export const roleSchema = z.enum(["COUNTER_STAFF", "ADMIN"]);
export type Role = z.infer<typeof roleSchema>;
export const sessionSchema = z.object({
  id: z.string().min(1).max(64),
  login: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,63}$/),
  role: roleSchema,
  counterIds: z.array(z.string().min(1).max(64)),
}) satisfies z.ZodType<components["schemas"]["Me"]>;
export type SessionUser = z.infer<typeof sessionSchema>;
export const csrfSchema = z.object({
  // Restrict token metadata to a dedicated header, never Cookie/Authorization.
  headerName: z.literal("X-CSRF-TOKEN"),
  token: z.string().min(1).max(4096),
}) satisfies z.ZodType<components["schemas"]["CsrfBootstrap"]>;

/** Only known structural fields survive parsing; raw inputs/details are discarded. */
export const errorSchema = z.object({
  timestamp: z.string(),
  status: z.number().int().min(400).max(599),
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
  message: z.string(),
  correlationId: z.string().regex(/^[a-zA-Z0-9._-]{1,128}$/),
  fieldErrors: z
    .array(
      z.object({
        field: z.string().max(80),
        code: z.string().max(80),
        message: z.string(),
      }),
    )
    .max(100),
}) satisfies z.ZodType<components["schemas"]["Error"]>;
export interface FormContext {
  grantReference: string;
  bindingVersion: number;
}
export const formContextSchema = z.object({
  grantReference: z.string().min(1).max(128),
  bindingVersion: z.number().int().nonnegative().safe(),
});

/** C10 wire scope uses database IDs, not UI category codes; null means four-category entry. */
export const registrationScopeSchema = z
  .object({
    environment: z.string().min(1).max(64),
    counterId: z
      .string()
      .regex(/^[0-9]+$/)
      .max(64),
    categoryScope: z
      .string()
      .regex(/^[0-9]+$/)
      .max(64)
      .nullable(),
  })
  .strict();
export type RegistrationScope = z.infer<typeof registrationScopeSchema>;

/** Match C11 exactly: trim ASCII space only; passwords are never normalized. */
export function canonicalLogin(value: string): string | null {
  if (/[^a-zA-Z0-9._\- ]/.test(value)) return null;
  const login = value.replace(/^ +| +$/g, "").toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(login) ? login : null;
}
