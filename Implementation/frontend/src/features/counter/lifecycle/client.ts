import { z } from "zod";
import type { PassSelection, PassFilters } from "./contracts";
import { apiClient } from "../../../lib/api-client";
import { assignmentSchema, inventoryReferencesSchema, issueContextSchema, historySchema, jobSchema, pageSchema, revealSchema, safeResultSchema, sampleSchema } from "./contracts";
import { inventoryPageSchema, passFeedSchema, passExportSchema } from "./contracts";

/** All commands snapshot exact bodies/keys in the shared memory-only transport; writes are never retried automatically. */
export const lifecycleApi = {
  samples: (admin: boolean, signal?: AbortSignal) => apiClient.get(`/api/${admin ? "admin" : "staff"}/lifecycle/samples`, z.array(sampleSchema).max(48), { signal, authRequired: true }),
  cards: (page: number, signal?: AbortSignal, filters = "") => apiClient.get(`/api/admin/cards?page=${page}${filters ? `&${filters}` : ""}`, inventoryPageSchema, { signal, authRequired: true }),
  assignments: (page: number, overdue: boolean, signal?: AbortSignal, registrationId?: string) => apiClient.get(`/api/staff/${overdue ? "overdue" : "card-assignments"}?page=${page}${registrationId ? `&registrationId=${encodeURIComponent(registrationId)}` : ""}`, pageSchema(assignmentSchema), { signal, authRequired: true }),
  assignment: (id: string, signal?: AbortSignal) => apiClient.get(`/api/staff/card-assignments/${id}`, assignmentSchema, { signal, authRequired: true }),
  passes: (filters: PassFilters, cursor?: string, signal?: AbortSignal) => {
    // Visitor searches stay out of URLs; this read is CSRF-protected and does not create an idempotency command.
    return apiClient.post("/api/staff/passes/search", { ...filters, ...(cursor ? { cursor } : {}) }, passFeedSchema, { signal, authRequired: true });
  },
  exportPasses: (filters: PassFilters, signal?: AbortSignal) => apiClient.post("/api/staff/passes/history-export",
    { category: filters.category, search: filters.search, from: filters.from, to: filters.to }, passExportSchema, { signal, authRequired: true }),
  job: (admin: boolean, id: string) => apiClient.get(`/api/${admin ? "admin" : "staff"}/scan-jobs/${id}`, jobSchema, { authRequired: true }),
  start: (admin: boolean, purpose: string, targetId: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs`, { purpose, targetId }, safeResultSchema, { authRequired: true }),
  simulate: (admin: boolean, job: { id: string; nonce: string | null; leaseToken: string | null }, sampleCode: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs/${job.id}/simulate`, { nonce: job.nonce, leaseToken: job.leaseToken, sampleCode }, safeResultSchema, { authRequired: true }),
  cancel: (admin: boolean, id: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs/${id}/cancel`, {}, safeResultSchema, { authRequired: true }),
  references: (signal?: AbortSignal) => apiClient.get("/api/admin/cards/references", inventoryReferencesSchema, { signal, authRequired: true }),
  issueContext: (id: string, page: number, signal?: AbortSignal) => apiClient.get(`/api/staff/registrations/${id}/issue-context?page=${page}`, issueContextSchema, { signal, authRequired: true }),
  enroll: (cardCode: string, categoryCode: string) => apiClient.command("/api/admin/cards", { cardCode, categoryCode }, safeResultSchema, { authRequired: true }),
  issue: (registrationId: string, expectedVersion: number, passes: PassSelection[]) => apiClient.command("/api/staff/card-assignments", { registrationId, expectedVersion, passes, handoverConfirmed: true }, safeResultSchema, { authRequired: true }),
  // The final modal action confirms both staff comparison and physical handover in one atomic command.
  approveAndIssue: (registrationId: string, expectedVersion: number, passes: PassSelection[]) => apiClient.command("/api/staff/card-assignments/approve-and-issue", { registrationId, expectedVersion, passes, reviewConfirmed: true, handoverConfirmed: true }, safeResultSchema, { authRequired: true }),
  // No-pass commands attest only the explicit disposition and review, never a physical handover.
  noPass: (registrationId: string, expectedVersion: number) => apiClient.command("/api/staff/card-assignments/no-pass", { registrationId, expectedVersion, noPassConfirmed: true }, safeResultSchema, { authRequired: true }),
  approveWithoutPass: (registrationId: string, expectedVersion: number) => apiClient.command("/api/staff/card-assignments/approve-without-pass", { registrationId, expectedVersion, reviewConfirmed: true, noPassConfirmed: true }, safeResultSchema, { authRequired: true }),
  returned: (id: string, expectedVersion: number) => apiClient.command(`/api/staff/card-assignments/${id}/return`, { expectedVersion, physicalReceived: true }, safeResultSchema, { authRequired: true }),
  inventoryAction: (id: string, action: "mark-lost" | "disable" | "restore", body: unknown) => apiClient.command(`/api/admin/cards/${id}/${action}`, body, safeResultSchema, { authRequired: true }),
  followup: (id: string, reasonCode: string) => apiClient.command(`/api/staff/assignments/${id}/followups`, { reasonCode }, safeResultSchema, { authRequired: true }),
  reveal: (id: string) => apiClient.command(`/api/staff/assignments/${id}/contact-reveal`, { reasonCode: "OVERDUE_RETURN_FOLLOWUP" }, revealSchema, { authRequired: true }),
  history: (admin: boolean, id: string, signal?: AbortSignal) => apiClient.get(`/api/${admin ? `admin/cards/${id}` : `staff/card-assignments/${id}`}/history`, historySchema, { signal, authRequired: true }),
};
