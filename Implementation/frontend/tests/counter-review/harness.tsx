import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "../../src/index.css";
import App from "../../src/App";
import { ClientError } from "../../src/lib/errors";
import type { AuthPort } from "../../src/lib/auth";
import { RegistrationReview } from "../../src/features/counter/review/page";
import { type Detail, type QueueItem, type Reason, type ReviewPort, type ReviewResult } from "../../src/features/counter/review/contracts";

type Fault = "none" | "unknown-once" | "conflict" | "forbidden" | "queue-offline";
let fault: Fault = "none";
let commandCount = 0;
let writeCount = 0;
const keys: string[] = [];
const now = () => new Date().toISOString();
/** All records are deliberately synthetic and masked, including metadata used in screenshots. */
const records: Detail[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1), publicReference: `R-TEST-${String(index + 1).padStart(3, "0")}`, counterId: "1",
  categoryCode: index % 2 === 0 ? "PENJAGA" : "VENDOR", maskedVisitorName: "S*** V***", destinationLabel: "Test Ward A",
  status: "SUBMITTED", version: 0, submittedAt: now(), maskedIdentification: "DEMO-****0021", maskedPhone: "+60 **** 0021",
  maskedMrn: index % 2 === 0 ? "MRN-****0021" : null, mrnMode: index % 2 === 0 ? "mock" : null,
  mrnFeedback: index % 2 === 0 ? "MATCH" : null, environment: "test", source: "SYNTHETIC", review: null,
}));
function denied(status: number, code: string) {
  return new ClientError("api", { timestamp: now(), status, code, message: "synthetic suppressed detail", correlationId: "m04-browser-fixture", fieldErrors: [] });
}
/** The browser script controls faults explicitly; this bridge is never imported by production bootstrap. */
declare global {
  interface Window { __m04Fixture: { setFault(value: Fault): void; counts(): { commandCount: number; writeCount: number; keys: string[] }; }; }
}
window.__m04Fixture = { setFault(value) { fault = value; }, counts() { return { commandCount, writeCount, keys: [...keys] }; } };

/** Reads copy records so the UI's selected version cannot change underneath its saved confirmations. */
const port: ReviewPort = {
  async list(query) {
    if (fault === "forbidden") throw denied(403, "ACCESS_DENIED");
    if (fault === "queue-offline") throw new ClientError("network");
    const filtered = records.filter((record) => record.counterId === query.counterId && (query.category === "ALL" || record.categoryCode === query.category)
      && (query.status === "ALL" || record.status === query.status));
    const items: QueueItem[] = filtered.slice(query.page * query.pageSize, (query.page + 1) * query.pageSize)
      .map(({ id, publicReference, counterId, categoryCode, maskedVisitorName, destinationLabel, status, version, submittedAt }) =>
        ({ id, publicReference, counterId, categoryCode, maskedVisitorName, destinationLabel, status, version, submittedAt }));
    return { items, total: filtered.length, page: query.page, pageSize: query.pageSize, serverNow: now() };
  },
  async detail(id) {
    const record = records.find((record) => record.id === id);
    if (!record) throw denied(404, "NOT_FOUND");
    return structuredClone(record);
  },
  verify(id, input) { return command(id, "VERIFIED", input.expectedVersion, null); },
  reject(id, input) { return command(id, "REJECTED", input.expectedVersion, input.reasonCode); },
};

/** One captured fixture handle replays one result; this models UI ambiguity rather than real MySQL durability. */
function command(id: string, status: ReviewResult["status"], expectedVersion: number, reason: Reason | null) {
  commandCount++; const key = crypto.randomUUID(); let saved: ReviewResult | null = null;
  return { key, async execute() {
    writeCount++; keys.push(key);
    if (saved) return structuredClone(saved);
    const record = records.find((record) => record.id === id)!;
    if (fault === "conflict") { fault = "none"; record.version++; throw denied(409, "VERSION_CONFLICT"); }
    if (record.version !== expectedVersion || record.status !== "SUBMITTED") throw denied(409, "REGISTRATION_STATE_CONFLICT");
    record.status = status; record.version++;
    record.review = { actorId: "7", reviewedAt: now(), source: status === "VERIFIED" ? "SYNTHETIC_MANUAL" : "LOCAL",
      methodCode: status === "VERIFIED" ? "SYNTHETIC_RECORD_COMPARISON" : null,
      basisCodes: status === "VERIFIED" ? (record.categoryCode === "PENJAGA" ? ["IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"] : ["IDENTITY_MATCH_CONFIRMED"]) : [],
      reasonCode: reason };
    saved = { id, reference: record.publicReference, status, version: record.version };
    if (fault === "unknown-once") { fault = "none"; throw new ClientError("timeout"); }
    return structuredClone(saved);
  } };
}
const identity = { id: "7", login: "synthetic_staff", role: "COUNTER_STAFF" as const, counterIds: ["1"] };
const auth: AuthPort = { me: async () => identity, login: async () => identity, logout: async () => {}, onExpired: () => () => {} };
// Test HTML is a dedicated opt-in route; the real main.tsx never imports these explicit fixtures.
createRoot(document.getElementById("root")!).render(<MemoryRouter initialEntries={["/staff/registrations"]}>
  <App auth={auth} features={[{ path: "/staff/registrations", label: "Registration review", role: "COUNTER_STAFF", element: <RegistrationReview port={port} /> }]} />
</MemoryRouter>);
