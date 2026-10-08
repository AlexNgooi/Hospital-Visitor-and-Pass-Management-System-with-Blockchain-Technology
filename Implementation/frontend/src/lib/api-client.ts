import { z } from "zod";
import { csrfSchema, errorSchema } from "./contracts";
import { ClientError } from "./errors";
import { restartDetailsSchema } from "./restart-details";

interface Options {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: string;
  signal?: AbortSignal;
  authRequired?: boolean;
  idempotencyKey?: string;
  csrf?: boolean;
}
const keyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A replay handle preserves the exact serialized body, context/version and key in memory. */
export interface Command<T> {
  readonly key: string;
  execute(signal?: AbortSignal): Promise<T>;
}

/** Same-origin JSON transport. Never retries writes, logs bodies or reads cookies. */
export class ApiClient {
  private csrfValue?: z.infer<typeof csrfSchema>;
  private csrfPending?: Promise<z.infer<typeof csrfSchema>>;
  private csrfGeneration = 0;
  private readonly expiredListeners = new Set<() => void>();
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  constructor(
    fetcher: typeof fetch = (...args) => fetch(...args),
    timeoutMs = 15000,
  ) {
    this.fetcher = fetcher;
    this.timeoutMs = timeoutMs;
  }

  /** Consumers opt in only for staff requests; public grant 403s never trigger login. */
  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => {
      this.expiredListeners.delete(listener);
    };
  }

  /** Session rotation invalidates cached CSRF; an old inflight bootstrap cannot restore it. */
  invalidateCsrf(): void {
    this.csrfGeneration++;
    this.csrfValue = undefined;
    this.csrfPending = undefined;
  }

  async bootstrapCsrf(): Promise<void> {
    await this.getCsrf();
  }

  private async getCsrf(): Promise<z.infer<typeof csrfSchema>> {
    if (this.csrfValue) return this.csrfValue;
    if (this.csrfPending) return this.csrfPending;
    const generation = this.csrfGeneration;
    const pending = this.request("/api/public/csrf", csrfSchema, {
      csrf: false,
    })
      .then(async (value) => {
        if (generation !== this.csrfGeneration) return this.getCsrf();
        this.csrfValue = value;
        return value;
      })
      .finally(() => {
        if (this.csrfPending === pending) this.csrfPending = undefined;
      });
    this.csrfPending = pending;
    return pending;
  }

  get<T>(
    path: string,
    schema: z.ZodType<T>,
    options: Pick<Options, "signal" | "authRequired"> = {},
  ): Promise<T> {
    return this.request(path, schema, options);
  }

  post<T>(
    path: string,
    body: unknown,
    schema?: z.ZodType<T>,
    options: Pick<Options, "signal" | "authRequired"> = {},
  ): Promise<T> {
    return this.request(path, schema, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** Create once per user command; callers retain this handle for UNKNOWN/manual retries. */
  command<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    options: {
      authRequired?: boolean;
      key?: string;
      method?: "POST" | "PATCH" | "DELETE";
    } = {},
  ): Command<T> {
    const key = options.key ?? crypto.randomUUID();
    if (!keyPattern.test(key))
      throw new Error("Idempotency key must be a canonical UUIDv4.");
    const serialized = JSON.stringify(body);
    return Object.freeze({
      key,
      execute: (signal?: AbortSignal) =>
        this.request(path, schema, {
          method: options.method ?? "POST",
          body: serialized,
          signal,
          authRequired: options.authRequired,
          idempotencyKey: key,
        }),
    });
  }

  private async request<T>(
    path: string,
    schema?: z.ZodType<T>,
    options: Options = {},
  ): Promise<T> {
    // Relative API paths only: no credential-bearing cross-origin fetch or redirects.
    if (
      !/^\/api\/[a-zA-Z0-9/_?=&%.,:-]+$/.test(path) ||
      path.includes("..") ||
      /%2f|%5c|%2e/i.test(path)
    ) {
      throw new Error("Only same-origin /api paths are allowed.");
    }
    const headers = new Headers({ Accept: "application/json" });
    const method = options.method ?? "GET";
    if (options.body !== undefined)
      headers.set("Content-Type", "application/json");
    if (options.idempotencyKey)
      headers.set("Idempotency-Key", options.idempotencyKey);
    if (method !== "GET" && options.csrf !== false) {
      const csrf = await this.getCsrf();
      headers.set(csrf.headerName, csrf.token);
    }
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;
    try {
      const response = await this.fetcher(path, {
        method,
        headers,
        body: options.body,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal,
      });
      // Fail closed on any protected HTTP 401, including malformed proxy/error responses.
      if (response.status === 401 && options.authRequired) {
        this.invalidateCsrf();
        this.expiredListeners.forEach((listener) => listener());
      }
      if (response.status === 204 && response.ok && !schema)
        return undefined as T;
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new ClientError("invalid-response");
      const text = await response.text();
      if (text.length > 1048576) throw new ClientError("invalid-response");
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new ClientError("invalid-response");
      }
      if (!response.ok) {
        const parsed = errorSchema.safeParse(data);
        if (!parsed.success || parsed.data.status !== response.status)
          throw new ClientError("invalid-response");
        const details =
          parsed.data.code === "REGISTRATION_ENTRY_RESTART_REQUIRED"
            ? restartDetailsSchema.safeParse(
                (data as Record<string, unknown>).details,
              )
            : undefined;
        const error = new ClientError(
          "api",
          parsed.data,
          details?.success ? details.data : undefined,
        );
        if (error.code === "CSRF_INVALID") this.invalidateCsrf();
        throw error;
      }
      if (!schema) return undefined as T;
      const parsed = schema.safeParse(data);
      if (!parsed.success) throw new ClientError("invalid-response");
      return parsed.data;
    } catch (error) {
      if (options.signal?.aborted)
        throw new DOMException("Request cancelled.", "AbortError");
      if (error instanceof ClientError) throw error;
      throw new ClientError(timeout.aborted ? "timeout" : "network");
    }
  }
}
export const apiClient = new ApiClient();
