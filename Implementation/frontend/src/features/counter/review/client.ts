import { ApiClient, apiClient } from "../../../lib/api-client";
import { ClientError } from "../../../lib/errors";
import { detailSchema, queueSchema, rejectSchema, resultSchema, verifySchema, type ReviewPort } from "./contracts";

/** Candidate read DTO v1 is kept inside M04 until M03/coordinator freeze the root adapter contract. */
export function createReviewPort(client: ApiClient = apiClient): ReviewPort {
  return {
    list(query, signal) {
      // Counter selection narrows a view; the backend still intersects current authorized scope.
      const search = new URLSearchParams({ counterId: query.counterId, page: String(query.page), pageSize: String(query.pageSize) });
      if (query.category !== "ALL") search.set("category", query.category);
      if (query.status !== "ALL") search.set("status", query.status);
      return client.get(`/api/staff/registrations?${search}`, queueSchema, { signal, authRequired: true });
    },
    detail(id, signal) {
      return client.get(`/api/staff/registrations/${safeId(id)}`, detailSchema, { signal, authRequired: true });
    },
    verify(id, input) {
      return client.command(`/api/staff/registrations/${safeId(id)}/verify`, verifySchema.parse(input), resultSchema, { authRequired: true });
    },
    reject(id, input) {
      return client.command(`/api/staff/registrations/${safeId(id)}/reject`, rejectSchema.parse(input), resultSchema, { authRequired: true });
    },
  };
}

/** IDs cannot smuggle query/path components; all action metadata is carried in the typed body. */
function safeId(id: string): string {
  if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) throw new ClientError("invalid-response");
  return id;
}
export const reviewPort = createReviewPort();
