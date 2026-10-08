import type { z } from "zod";
import type { errorSchema } from "./contracts";
import type { RestartDetails } from "./restart-details";

/** UI messages are allowlisted so proxy pages, backend input echoes and secrets stay hidden. */
const messages: Record<string, string> = {
  VALIDATION_FAILED: "Please check the highlighted fields.",
  INVALID_CREDENTIALS: "The staff account or password is incorrect.",
  AUTHENTICATION_REQUIRED: "Your session has ended. Sign in again.",
  ACCESS_DENIED: "Your account does not have access to this area.",
  CSRF_INVALID: "The security check expired. Please try again.",
  INTEGRATION_DISABLED: "This integration is not enabled.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again.",
  REGISTRATION_ENTRY_RESTART_REQUIRED:
    "Confirm before starting a new registration.",
  REGISTRATION_ENTRY_CONTEXT_CHANGED:
    "This registration form has changed. Please check its current status.",
  QR_ENTRY_EXPIRED:
    "This entry has expired. Please scan a new registration QR.",
  QR_ENTRY_REVOKED: "This entry is no longer available. Please scan again.",
  REGISTRATION_ENTRY_EXPIRED:
    "The registration form has expired. Please scan again.",
  REGISTRATION_ENTRY_REVOKED:
    "The registration form is no longer available. Please scan again.",
  REGISTRATION_ENTRY_REQUIRED: "Scan a current registration QR to continue.",
  VERSION_CONFLICT: "This record changed. Refresh it before continuing.",
  IDEMPOTENCY_CONFLICT:
    "This request could not be repeated. Check the original result.",
};

/** Visitor-facing copy stays BM-first; unknown codes still use fixed, non-sensitive wording. */
const visitorMessages: Record<string, string> = {
  VALIDATION_FAILED: "Sila semak maklumat yang ditandakan.",
  ACCESS_DENIED: "Anda tidak mempunyai akses kepada halaman ini.",
  CSRF_INVALID: "Semakan keselamatan telah tamat. Sila cuba lagi.",
  SERVICE_UNAVAILABLE:
    "Perkhidmatan tidak tersedia buat sementara waktu. Sila cuba lagi.",
  REGISTRATION_ENTRY_RESTART_REQUIRED:
    "Sahkan sebelum memulakan pendaftaran baharu.",
  REGISTRATION_ENTRY_CONTEXT_CHANGED:
    "Borang ini telah berubah. Sila semak status semasa.",
  QR_ENTRY_INVALID: "QR ini tidak sah. Sila imbas QR pendaftaran semasa.",
  QR_ENTRY_EXPIRED: "QR ini telah tamat tempoh. Sila imbas QR baharu.",
  QR_ENTRY_REVOKED: "QR ini tidak lagi tersedia. Sila imbas semula.",
  REGISTRATION_ENTRY_REQUIRED:
    "Sila imbas QR pendaftaran semasa untuk meneruskan.",
  REGISTRATION_ENTRY_EXPIRED:
    "Borang ini telah tamat tempoh. Sila imbas semula.",
  REGISTRATION_ENTRY_REVOKED:
    "Borang ini tidak lagi tersedia. Sila imbas semula.",
  REGISTRATION_ENTRY_USED:
    "Pendaftaran ini telah dihantar. Sila semak hasil asal.",
};

/** Separate transport failures from real backend errors; never invent a backend status. */
export class ClientError extends Error {
  readonly kind: "api" | "network" | "timeout" | "invalid-response";
  readonly status?: number;
  readonly code?: string;
  readonly correlationId?: string;
  readonly fields: readonly string[];
  readonly restartDetails?: RestartDetails;
  constructor(
    kind: ClientError["kind"],
    api?: z.infer<typeof errorSchema>,
    restart?: RestartDetails,
  ) {
    super(
      api
        ? (messages[api.code] ?? "The request could not be completed.")
        : kind === "network"
          ? "Unable to connect. Check your connection and try again."
          : kind === "timeout"
            ? "The request timed out. Its result may be unknown."
            : "The service returned an unexpected response.",
    );
    this.name = "ClientError";
    this.kind = kind;
    this.status = api?.status;
    this.code = api?.code;
    this.correlationId = api?.correlationId;
    // Only field names are retained; backend message/rejectedValue/details never reach UI.
    this.fields = api?.fieldErrors.map((field) => field.field) ?? [];
    // Only an explicit reviewed schema may populate restart details; never raw backend objects.
    this.restartDetails = restart;
  }
}

/** Unknown runtime exceptions also get a fixed message, never stack/raw body output. */
export function safeError(error: unknown, locale: "en" | "ms" = "en"): string {
  if (locale === "ms") {
    if (!(error instanceof ClientError))
      return "Ralat berlaku. Sila cuba lagi.";
    if (error.kind === "api")
      return (
        visitorMessages[error.code ?? ""] ??
        "Permintaan tidak dapat diselesaikan."
      );
    if (error.kind === "network")
      return "Tidak dapat disambungkan. Semak sambungan anda dan cuba lagi.";
    if (error.kind === "timeout")
      return "Permintaan telah tamat masa. Hasilnya mungkin belum diketahui.";
    return "Perkhidmatan memberikan respons yang tidak dijangka.";
  }
  return error instanceof ClientError
    ? error.message
    : "Something went wrong. Please try again.";
}
