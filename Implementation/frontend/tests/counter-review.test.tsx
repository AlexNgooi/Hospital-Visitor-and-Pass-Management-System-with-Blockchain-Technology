import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { AuthContext, type AuthContextValue } from "../src/app/auth-context";
import { CounterContext } from "../src/app/counter-context";
import type { AuthPort } from "../src/lib/auth";
import { ApiClient } from "../src/lib/api-client";
import { ClientError } from "../src/lib/errors";
import { RegistrationReview } from "../src/features/counter/review/page";
import { createReviewPort } from "../src/features/counter/review/client";
import { detailSchema, queueSchema, type Detail, type Queue, type ReviewPort, type ReviewResult } from "../src/features/counter/review/contracts";

const TIME = "2026-10-09T10:00:00.000000Z";
const KEY = "09fbd5b9-6312-478e-ba27-f85056c9875d";
/** Every fixture is masked and synthetic; no mock implementation is imported by the production feature. */
function record(id = "1", counterId = "1"): Detail {
  return { id, publicReference: `R-TEST-00${id}`, counterId, categoryCode: "PENJAGA", maskedVisitorName: "S*** V***",
    destinationLabel: "Test Ward A", status: "SUBMITTED", version: 0, submittedAt: TIME,
    maskedIdentification: "DEMO-****0021", maskedPhone: "+60 **** 0021", maskedMrn: "MRN-****0021",
    mrnMode: "mock", mrnFeedback: "MATCH", environment: "test", source: "SYNTHETIC", review: null };
}
function queueFor(items: Detail[], query: { page: number; pageSize: number }): Queue {
  return { items: items.map(({ id, publicReference, counterId, categoryCode, maskedVisitorName, destinationLabel, status, version, submittedAt }) =>
    ({ id, publicReference, counterId, categoryCode, maskedVisitorName, destinationLabel, status, version, submittedAt })), total: items.length, page: query.page, pageSize: query.pageSize, serverNow: TIME };
}
function failure(status: number, code: string): ClientError {
  return new ClientError("api", { timestamp: TIME, status, code, message: "unsafe backend message must stay hidden", correlationId: "synthetic-review", fieldErrors: [] });
}
function result(item = record(), status: ReviewResult["status"] = "VERIFIED"): ReviewResult {
  return { id: item.id, reference: item.publicReference, status, version: item.version + 1 };
}
/** Pure test transport allows adversarial delays without manufacturing a real transaction success. */
function fixture(items = [record()]) {
  const port: ReviewPort = {
    list: vi.fn(async (query) => queueFor(items.filter((item) => item.counterId === query.counterId && (query.status === "ALL" || item.status === query.status)
      && (query.category === "ALL" || item.categoryCode === query.category)), query)),
    detail: vi.fn(async (id) => structuredClone(items.find((item) => item.id === id)!)),
    verify: vi.fn((id) => ({ key: KEY, execute: vi.fn(async () => result(items.find((item) => item.id === id)!)) })),
    reject: vi.fn((id) => ({ key: KEY, execute: vi.fn(async () => result(items.find((item) => item.id === id)!, "REJECTED")) })),
  };
  return { port, items };
}
function auth(role: "COUNTER_STAFF" | "ADMIN" = "COUNTER_STAFF"): AuthContextValue {
  return { state: { kind: "authenticated", user: { id: "7", login: "synthetic_staff", role, counterIds: role === "ADMIN" ? [] : ["1", "2"] } },
    logoutState: { kind: "idle" }, mutationPending: false, refresh: vi.fn(), login: vi.fn(), logout: vi.fn() };
}
function element(port: ReviewPort, counter = "1", value = auth()) {
  return <AuthContext.Provider value={value}><CounterContext.Provider value={counter}><RegistrationReview port={port} /></CounterContext.Provider></AuthContext.Provider>;
}
async function select(id = "1") {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`R-TEST-00${id}`) }));
  await screen.findByRole("heading", { name: `R-TEST-00${id}` });
}
function confirmPenjaga() {
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
}
/** Deferred responses deliberately ignore AbortSignal to verify generation fencing as well as cancellation. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

describe("masked counter review and explicit staff evidence", () => {
  it("starts with a masked queue and no invented pass or patient verification", async () => {
    const { port } = fixture(); render(element(port));
    await screen.findByRole("button", { name: /R-TEST-001/ });
    expect(screen.getByText("Select a registration")).toBeTruthy();
    await select();
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Mock · Match in test data")).toBeTruthy();
    expect(screen.getByText(/MRN feedback is not patient verification/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("unsafe backend message");
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("requires all Penjaga confirmations and submits only C09 fields", async () => {
    const { port } = fixture(); render(element(port)); await select();
    fireEvent.click(screen.getByRole("checkbox", { name: /identity/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /MRN record/ }));
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /ward matches/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
    await waitFor(() => expect(port.verify).toHaveBeenCalledTimes(1));
    expect(port.verify).toHaveBeenCalledWith("1", { expectedVersion: 0, identityConfirmed: true, mrnConfirmed: true, wardConfirmed: true,
      manualEvidence: { methodCode: "SYNTHETIC_RECORD_COMPARISON", basisCodes: ["IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"] } });
    expect(await screen.findByText(/Approved registration R-TEST-001/)).toBeTruthy();
  });
  it("non-Penjaga only supplies identity evidence and omits patient fields", async () => {
    const item = { ...record(), categoryCode: "VENDOR" as const, maskedMrn: null, mrnMode: null, mrnFeedback: null };
    const { port } = fixture([item]); render(element(port)); await select();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
    await waitFor(() => expect(port.verify).toHaveBeenCalledTimes(1));
    expect(vi.mocked(port.verify).mock.calls[0]?.[1]).toEqual({ expectedVersion: 0, identityConfirmed: true,
      manualEvidence: { methodCode: "SYNTHETIC_RECORD_COMPARISON", basisCodes: ["IDENTITY_MATCH_CONFIRMED"] } });
  });
  it("synthetic evidence cannot approve a real registration", async () => {
    const { port } = fixture([{ ...record(), source: "REAL" }]); render(element(port)); await select();
    expect(screen.getByText(/Real hospital verification is not enabled/)).toBeTruthy();
    expect(screen.getAllByRole("checkbox").every((item) => item.matches(":disabled"))).toBe(true);
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
    expect(port.verify).not.toHaveBeenCalled();
  });
  it("a rejection requires a readable safe reason and restores trigger focus on cancel", async () => {
    const user = userEvent.setup(); const { port } = fixture(); render(element(port)); await select();
    const trigger = screen.getByRole("button", { name: "Reject registration" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirm rejection" }));
    expect(port.reject).not.toHaveBeenCalled(); await waitFor(() => expect(document.activeElement?.textContent).toContain("Choose a rejection reason"));
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    fireEvent.change(screen.getByLabelText("Rejection reason"), { target: { value: "INFORMATION_INCOMPLETE" } });
    await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
    await waitFor(() => expect(port.reject).toHaveBeenCalledWith("1", { expectedVersion: 0, reasonCode: "INFORMATION_INCOMPLETE" }));
    expect(await screen.findByText(/Rejected registration/)).toBeTruthy();
  });
  it("omits the MRN-specific rejection reason for Vendor", async () => {
    const { port } = fixture([{ ...record(), categoryCode: "VENDOR" }]); render(element(port)); await select();
    fireEvent.click(screen.getByRole("button", { name: "Reject registration" }));
    expect(screen.queryByRole("option", { name: "MRN or ward could not be confirmed" })).toBeNull();
  });
  it("a version conflict clears confirmations and requires a fresh detail", async () => {
    const { port, items } = fixture();
    vi.mocked(port.verify).mockReturnValue({ key: KEY, execute: vi.fn(async () => { throw failure(409, "VERSION_CONFLICT"); }) });
    render(element(port)); await select(); confirmPenjaga(); fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
    expect(await screen.findByText(/This review conflicts/)).toBeTruthy();
    expect(screen.getAllByRole("checkbox").every((item) => !(item as HTMLInputElement).checked)).toBe(true);
    items[0]!.version = 1;
    fireEvent.click(screen.getByRole("button", { name: "Refresh detail" }));
    await waitFor(() => expect(screen.getByText("1", { selector: ".review-facts dd" })).toBeTruthy());
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("an unknown response keeps the original command and never auto-replays on queue refresh", async () => {
    const { port } = fixture(); const execute = vi.fn().mockRejectedValueOnce(new ClientError("timeout")).mockResolvedValue(result());
    vi.mocked(port.verify).mockReturnValue({ key: KEY, execute }); render(element(port)); await select(); confirmPenjaga();
    fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
    await screen.findByRole("button", { name: "Retry original command" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
    fireEvent.click(screen.getByRole("button", { name: "Check current status" }));
    await waitFor(() => expect(port.detail).toHaveBeenCalledTimes(2));
    expect(execute).toHaveBeenCalledTimes(1); expect(port.verify).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry original command" }));
    await screen.findByText(/Approved registration/);
    expect(execute).toHaveBeenCalledTimes(2); expect(port.verify).toHaveBeenCalledTimes(1);
  });
  it("a valid-looking result for another registration remains unconfirmed", async () => {
    const { port } = fixture(); vi.mocked(port.verify).mockReturnValue({ key: KEY, execute: vi.fn(async () => result(record("2"))) });
    render(element(port)); await select(); confirmPenjaga(); fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
    await screen.findByRole("button", { name: "Retry original command" });
    expect(screen.queryByText(/Approved registration/)).toBeNull();
  });
  it("generic detail refresh cannot hide unresolved command recovery", async () => {
    const { port } = fixture(); const execute = vi.fn().mockRejectedValueOnce(new ClientError("timeout")).mockResolvedValue(result());
    vi.mocked(port.verify).mockReturnValue({ key: KEY, execute }); render(element(port)); await select(); confirmPenjaga();
    fireEvent.click(screen.getByRole("button", { name: "Approve registration" })); await screen.findByRole("button", { name: "Retry original command" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh detail" })); await screen.findByRole("heading", { name: "R-TEST-001" });
    expect(screen.getByRole("button", { name: "Retry original command" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry original command" })); await screen.findByText(/Approved registration/);
    expect(port.verify).toHaveBeenCalledTimes(1); expect(execute).toHaveBeenCalledTimes(2);
  });
  /** A failed recovery attempt cannot manufacture proof that the earlier committed-but-unacknowledged command failed. */
  it.each([[403, "CSRF_INVALID"], [409, "IDEMPOTENCY_CONFLICT"], [400, "VALIDATION_FAILED"]] as const)(
    "committed UNKNOWN retains its original handle after recovery %i %s and generic GET refresh", async (status, code) => {
      const { port, items } = fixture(); const original = result(record());
      const execute = vi.fn().mockImplementationOnce(async () => {
        items[0]!.status = "VERIFIED"; items[0]!.version = 1;
        items[0]!.review = { actorId: "7", reviewedAt: TIME, source: "SYNTHETIC_MANUAL", methodCode: "SYNTHETIC_RECORD_COMPARISON",
          basisCodes: ["IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"], reasonCode: null };
        throw new ClientError("timeout");
      }).mockRejectedValueOnce(failure(status, code)).mockResolvedValue(original);
      vi.mocked(port.verify).mockReturnValue(Object.freeze({ key: KEY, execute }));
      render(element(port)); await select(); confirmPenjaga(); fireEvent.click(screen.getByRole("button", { name: "Approve registration" }));
      await screen.findByRole("button", { name: "Retry original command" });
      fireEvent.click(screen.getByRole("button", { name: "Retry original command" }));
      await screen.findByText("The original review is still unconfirmed. Check its current status or retry the original command.");
      expect(execute).toHaveBeenCalledTimes(2); expect(port.verify).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole("button", { name: "Refresh detail" })); await screen.findByText("Synthetic staff verification");
      expect(screen.getByRole("button", { name: "Retry original command" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Approve registration" })).toBeNull();
      expect(execute).toHaveBeenCalledTimes(2); expect(port.verify).toHaveBeenCalledWith("1", expect.objectContaining({ expectedVersion: 0 }));
      fireEvent.click(screen.getByRole("button", { name: "Retry original command" })); await screen.findByText(/Approved registration/);
      expect(execute).toHaveBeenCalledTimes(3); expect(port.verify).toHaveBeenCalledTimes(1);
    },
  );
  it("UNKNOWN recovery access loss hides cached data and a new counter cannot execute its old handle", async () => {
    const { port } = fixture([record(), record("2", "2")]);
    const execute = vi.fn().mockRejectedValueOnce(new ClientError("timeout")).mockRejectedValue(failure(403, "ACCESS_DENIED"));
    vi.mocked(port.verify).mockReturnValue({ key: KEY, execute }); const mounted = render(element(port)); await select(); confirmPenjaga();
    fireEvent.click(screen.getByRole("button", { name: "Approve registration" })); await screen.findByRole("button", { name: "Retry original command" });
    fireEvent.click(screen.getByRole("button", { name: "Retry original command" })); await screen.findByText("Review access is no longer available");
    expect(screen.queryByText("DEMO-****0021")).toBeNull(); expect(screen.queryByRole("button", { name: "Retry original command" })).toBeNull();
    mounted.rerender(element(port, "2")); await screen.findByRole("button", { name: /R-TEST-002/ });
    expect(screen.queryByRole("button", { name: "Retry original command" })).toBeNull(); expect(execute).toHaveBeenCalledTimes(2);
    expect(port.verify).toHaveBeenCalledTimes(1);
  });
  it("duplicate click cannot dispatch two pending commands", async () => {
    const { port } = fixture(); const request = deferred<ReviewResult>(); const execute = vi.fn(() => request.promise);
    vi.mocked(port.verify).mockReturnValue({ key: KEY, execute }); render(element(port)); await select(); confirmPenjaga();
    const button = screen.getByRole("button", { name: "Approve registration" }); fireEvent.click(button); fireEvent.click(button);
    expect(port.verify).toHaveBeenCalledTimes(1); expect(execute).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve(result()));
  });
  it("reading a committed rejection keeps the unknown original handle visible after its dialog closes", async () => {
    const { port, items } = fixture(); const execute = vi.fn().mockImplementationOnce(async () => {
      items[0]!.status = "REJECTED"; items[0]!.version = 1;
      items[0]!.review = { actorId: "7", reviewedAt: TIME, source: "LOCAL", methodCode: null, basisCodes: [], reasonCode: "INFORMATION_INCOMPLETE" };
      throw new ClientError("timeout");
    }).mockResolvedValue(result(record(), "REJECTED"));
    vi.mocked(port.reject).mockReturnValue({ key: KEY, execute }); render(element(port)); await select();
    fireEvent.click(screen.getByRole("button", { name: "Reject registration" }));
    fireEvent.change(screen.getByLabelText("Rejection reason"), { target: { value: "INFORMATION_INCOMPLETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" })); await screen.findByRole("button", { name: "Check current status" });
    fireEvent.click(screen.getByRole("button", { name: "Check current status" })); await screen.findByText("Local review");
    expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.getByRole("button", { name: "Retry original command" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry original command" })); await screen.findByText(/Rejected registration/);
    expect(port.reject).toHaveBeenCalledTimes(1); expect(execute).toHaveBeenCalledTimes(2);
  });
  it("background queue changes disable checks without silently replacing selected version", async () => {
    const { port, items } = fixture(); render(element(port)); await select(); confirmPenjaga();
    items[0]!.version = 1; fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
    await screen.findByText(/This record changed/);
    expect(screen.getByText("0", { selector: ".review-facts dd" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("read failure retains explicitly stale queue and does not turn failure into an empty count", async () => {
    const { port } = fixture(); render(element(port)); await select(); confirmPenjaga();
    vi.mocked(port.list).mockRejectedValue(new ClientError("network")); fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
    await screen.findByText(/Queue data may be stale/);
    expect(screen.getByRole("button", { name: /R-TEST-001/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Approve registration" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it.each([401, 403, 404])("a protected %i removes cached operational details", async (status) => {
    const { port } = fixture(); render(element(port)); await select();
    vi.mocked(port.list).mockRejectedValue(failure(status, status === 401 ? "AUTHENTICATION_REQUIRED" : "ACCESS_DENIED"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh queue" })); await screen.findByText("Review access is no longer available");
    expect(screen.queryByText("S*** V***")).toBeNull(); expect(screen.queryByText("DEMO-****0021")).toBeNull();
  });
  it("late detail from another selection is discarded even if transport ignores abort", async () => {
    const { port } = fixture([record(), record("2")]); const old = deferred<Detail>();
    vi.mocked(port.detail).mockImplementation(async (id) => id === "1" ? old.promise : record("2"));
    render(element(port)); fireEvent.click(await screen.findByRole("button", { name: /R-TEST-001/ }));
    fireEvent.click(screen.getByRole("button", { name: /R-TEST-002/ })); await screen.findByRole("heading", { name: "R-TEST-002" });
    await act(async () => old.resolve(record()));
    expect(screen.queryByRole("heading", { name: "R-TEST-001" })).toBeNull();
  });
  it("access loss stops automatic reads and exposes an explicit session refresh", async () => {
    const { port } = fixture(); const identity = auth(); render(element(port, "1", identity)); await select();
    vi.mocked(port.list).mockRejectedValue(failure(403, "ACCESS_DENIED")); fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));
    await screen.findByText("Review access is no longer available"); const count = vi.mocked(port.list).mock.calls.length;
    fireEvent(document, new Event("visibilitychange")); fireEvent(window, new Event("online"));
    await act(async () => {}); expect(port.list).toHaveBeenCalledTimes(count);
    fireEvent.click(screen.getByRole("button", { name: "Refresh staff session" })); expect(identity.refresh).toHaveBeenCalledTimes(1);
  });
  it("counter switching clears evidence and blocks late cross-counter data", async () => {
    const { port } = fixture([record(), record("2", "2")]); const mounted = render(element(port)); await select(); confirmPenjaga();
    mounted.rerender(element(port, "2")); await screen.findByRole("button", { name: /R-TEST-002/ });
    expect(screen.queryByRole("heading", { name: "R-TEST-001" })).toBeNull(); expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await select("2"); expect(screen.getAllByRole("checkbox").every((item) => !(item as HTMLInputElement).checked)).toBe(true);
  });
  it("Admin cannot acquire review access through client feature injection", async () => {
    const { port } = fixture(); render(element(port, "1", auth("ADMIN"))); await screen.findByText("Counter Staff access required");
    expect(port.list).not.toHaveBeenCalled(); expect(port.detail).not.toHaveBeenCalled();
  });
  it("FeatureSlot injection works without changing shared routing", async () => {
    const { port } = fixture(); const user = auth().state;
    if (user.kind !== "authenticated") throw new Error("Invalid synthetic fixture");
    const authPort: AuthPort = { me: async () => user.user, login: async () => user.user, logout: async () => {}, onExpired: () => () => {} };
    render(<MemoryRouter initialEntries={["/staff/registrations"]}><App auth={authPort} features={[{ path: "/staff/registrations", label: "Registration review", role: "COUNTER_STAFF", element: <RegistrationReview port={port} /> }]} /></MemoryRouter>);
    await screen.findByRole("button", { name: /R-TEST-001/ }); expect(screen.getByRole("heading", { level: 1, name: "Registration review" })).toBeTruthy();
  });
  it("queue/detail and rejection dialog have no serious axe violations", async () => {
    const { port } = fixture(); render(<main>{element(port)}</main>); await select();
    const page = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(page.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Reject registration" }));
    const dialog = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(dialog.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
});

describe("review transport and masked DTO boundaries", () => {
  it("rejects unmasked name, identity, phone, MRN and extra entity fields", () => {
    for (const value of [{ ...record(), maskedVisitorName: "Synthetic Full Name" }, { ...record(), maskedIdentification: "DEMO-0021" },
      { ...record(), maskedPhone: "+6000000021" }, { ...record(), maskedMrn: "MRN-0021" }, { ...record(), formData: { raw: "synthetic-input" } }]) {
      expect(detailSchema.safeParse(value).success).toBe(false);
    }
    expect(detailSchema.safeParse(record()).success).toBe(true);
  });
  it("rejects unsafe version, excess page size and invalid timestamps", () => {
    expect(detailSchema.safeParse({ ...record(), version: Number.MAX_SAFE_INTEGER + 1 }).success).toBe(false);
    expect(detailSchema.safeParse({ ...record(), submittedAt: "invalid" }).success).toBe(false);
    expect(queueSchema.safeParse({ ...queueFor([record()], { page: 0, pageSize: 10 }), pageSize: 51 }).success).toBe(false);
  });
  it("protected command retry retains exact serialized body and UUID key", async () => {
    const calls: { path: string; options?: RequestInit }[] = [];
    let writes = 0;
    const fetcher = vi.fn(async (path: RequestInfo | URL, options?: RequestInit) => {
      calls.push({ path: String(path), options });
      if (String(path) === "/api/public/csrf") return Response.json({ headerName: "X-CSRF-TOKEN", token: "synthetic-csrf" });
      if (++writes === 1) throw new TypeError("synthetic-network-fault");
      return Response.json(result());
    });
    const port = createReviewPort(new ApiClient(fetcher as typeof fetch));
    const input = { expectedVersion: 0, identityConfirmed: true as const, mrnConfirmed: true as const, wardConfirmed: true as const,
      manualEvidence: { methodCode: "SYNTHETIC_RECORD_COMPARISON" as const, basisCodes: ["IDENTITY_MATCH_CONFIRMED" as const, "MRN_MATCH_CONFIRMED" as const, "WARD_MATCH_CONFIRMED" as const] } };
    const command = port.verify("1", input); await expect(command.execute()).rejects.toMatchObject({ kind: "network" });
    input.expectedVersion = 9; input.manualEvidence.basisCodes.pop(); await expect(command.execute()).resolves.toEqual(result());
    const sent = calls.filter((call) => call.path.endsWith("/verify"));
    expect(sent).toHaveLength(2); expect(sent[0]?.options?.body).toEqual(sent[1]?.options?.body);
    expect(new Headers(sent[0]?.options?.headers).get("Idempotency-Key")).toEqual(new Headers(sent[1]?.options?.headers).get("Idempotency-Key"));
    expect(new Headers(sent[0]?.options?.headers).get("X-CSRF-TOKEN")).toBe("synthetic-csrf");
    expect(sent[0]?.options?.credentials).toBe("same-origin");
  });
  it("HTTP 401 expires the shared session and raw backend error text stays hidden", async () => {
    const client = new ApiClient(vi.fn(async () => Response.json({ timestamp: TIME, status: 401, code: "AUTHENTICATION_REQUIRED", message: "synthetic-raw-input", correlationId: "fixture", fieldErrors: [] }, { status: 401 })) as typeof fetch);
    const expired = vi.fn(); client.onSessionExpired(expired);
    await expect(createReviewPort(client).detail("1")).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" }); expect(expired).toHaveBeenCalledTimes(1);
  });
});
