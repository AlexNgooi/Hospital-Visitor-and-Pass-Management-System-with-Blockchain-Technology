import { z } from "zod";
import { apiClient } from "../../../lib/api-client";
import { assignmentSchema, cardSchema, counterSchema, historySchema, jobSchema, pageSchema, revealSchema, safeResultSchema, sampleSchema } from "./contracts";

/** All commands snapshot exact bodies/keys in the shared memory-only transport; writes are never retried automatically. */
export const lifecycleApi = {
  samples: (admin: boolean, signal?: AbortSignal) => apiClient.get(`/api/${admin ? "admin" : "staff"}/lifecycle/samples`, z.array(sampleSchema).max(48), { signal, authRequired: true }),
  counters: (signal?: AbortSignal) => apiClient.get("/api/admin/lifecycle/counters", z.array(counterSchema), { signal, authRequired: true }),
  cards: (page: number, signal?: AbortSignal) => apiClient.get(`/api/admin/cards?page=${page}`, pageSchema(cardSchema), { signal, authRequired: true }),
  assignments: (counter: string, page: number, overdue: boolean, signal?: AbortSignal) => apiClient.get(`/api/staff/${overdue ? "overdue" : "card-assignments"}?counterId=${encodeURIComponent(counter)}&page=${page}`, pageSchema(assignmentSchema), { signal, authRequired: true }),
  assignment: (id: string) => apiClient.get(`/api/staff/card-assignments/${id}`, assignmentSchema, { authRequired: true }),
  job: (admin: boolean, id: string) => apiClient.get(`/api/${admin ? "admin" : "staff"}/scan-jobs/${id}`, jobSchema, { authRequired: true }),
  start: (admin: boolean, counterId: string, purpose: string, targetId: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs`, { counterId, purpose, targetId }, safeResultSchema, { authRequired: true }),
  simulate: (admin: boolean, job: { id: string; nonce: string | null; leaseToken: string | null }, sampleCode: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs/${job.id}/simulate`, { nonce: job.nonce, leaseToken: job.leaseToken, sampleCode }, safeResultSchema, { authRequired: true }),
  cancel: (admin: boolean, id: string) => apiClient.command(`/api/${admin ? "admin" : "staff"}/scan-jobs/${id}/cancel`, {}, safeResultSchema, { authRequired: true }),
  enroll: (scanResultId: string) => apiClient.command("/api/admin/cards", { scanResultId }, safeResultSchema, { authRequired: true }),
  issue: (registrationId: string, expectedVersion: number, scanResultId: string) => apiClient.command("/api/staff/card-assignments", { registrationId, expectedVersion, scanResultId, handoverConfirmed: true }, safeResultSchema, { authRequired: true }),
  returned: (id: string, expectedVersion: number, scanResultId: string) => apiClient.command(`/api/staff/card-assignments/${id}/return`, { expectedVersion, scanResultId, physicalReceived: true }, safeResultSchema, { authRequired: true }),
  inventoryAction: (id: string, action: "mark-lost" | "disable" | "restore", body: unknown) => apiClient.command(`/api/admin/cards/${id}/${action}`, body, safeResultSchema, { authRequired: true }),
  followup: (id: string, reasonCode: string) => apiClient.command(`/api/staff/assignments/${id}/followups`, { reasonCode }, safeResultSchema, { authRequired: true }),
  reveal: (id: string) => apiClient.command(`/api/staff/assignments/${id}/contact-reveal`, { reasonCode: "OVERDUE_RETURN_FOLLOWUP" }, revealSchema, { authRequired: true }),
  history: (admin: boolean, id: string, signal?: AbortSignal) => apiClient.get(`/api/${admin ? `admin/cards/${id}` : `staff/card-assignments/${id}`}/history`, historySchema, { signal, authRequired: true }),
};
