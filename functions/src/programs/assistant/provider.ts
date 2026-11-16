/* eslint-disable max-len */
// The wedding assistant's model provider: the Anthropic Messages API over
// fetch, with a pinned model, a per-request timeout and one retry on rate
// limits and server errors. It holds no long-lived key: the Functions
// runtime service account proves itself with a Google ID token, which
// Anthropic Workload Identity Federation exchanges for a short-lived access
// token. The kill switch is PROGRAM_ASSISTANT_ENABLED; a blank
// PROGRAM_ASSISTANT_FEDERATION_RULE_ID or ANTHROPIC_ORGANIZATION_ID also
// keeps it off, so a deploy never needs the federation rule to exist.

import {defineBoolean, defineString} from "firebase-functions/params";
import type {AssistantRequestBody} from "./prompt";

export const programAssistantEnabled = defineBoolean(
  "PROGRAM_ASSISTANT_ENABLED", {default: false});
/** fdrl_...: this project's Anthropic federation rule; blank = off. */
export const programAssistantFederationRuleId = defineString(
  "PROGRAM_ASSISTANT_FEDERATION_RULE_ID", {default: ""});
/** The Anthropic organization UUID; blank = off. */
export const anthropicOrganizationId = defineString(
  "ANTHROPIC_ORGANIZATION_ID", {default: ""});

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";
export const ANTHROPIC_VERSION = "2023-06-01";
/** Sent with every bearer-token Messages call, as the official SDKs do. */
export const ANTHROPIC_OAUTH_BETA = "oauth-2025-04-20";
export const ANTHROPIC_AUDIENCE = "https://api.anthropic.com";
/** The runtime identity's Google ID token; format=full adds the email claim. */
export const GOOGLE_IDENTITY_URL = "http://metadata.google.internal/computeMetadata/v1/" +
  `instance/service-accounts/default/identity?audience=${ANTHROPIC_AUDIENCE}&format=full`;
const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const FEDERATION_RULE_ID = /^fdrl_[A-Za-z0-9]{1,128}$/u;
const ORGANIZATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DEFAULT_TIMEOUT_MS = 20_000;
const TOKEN_TIMEOUT_MS = 10_000;
const MAX_RETRY_DELAY_MS = 5_000;
/** Re-exchange this long before the access token expires. */
export const TOKEN_REFRESH_MARGIN_MS = 60_000;

export type ProviderFailure =
  /** 429 or 5xx/529 twice: nothing billed. */
  | "unavailable"
  /** No response in time: the request may have been billed. */
  | "timeout"
  /** 4xx other than 429 (bad token, bad request): nothing billed. */
  | "rejected"
  /** The model declined (stop_reason refusal). */
  | "refused"
  /** A 200 without a text block or usage. */
  | "malformed";

export type ProviderResult = {
  ok: true; text: string; inputTokens: number; outputTokens: number;
  attempts: number; status: number;
} | {
  ok: false; failure: ProviderFailure; attempts: number; status: number | null;
  /** Tokens to count against the budget: the reservation when uncertain. */
  billedUncertain: boolean; inputTokens: number; outputTokens: number;
};

export interface AssistantProvider {
  complete(body: AssistantRequestBody): Promise<ProviderResult>;
}

export interface AnthropicProviderOptions {
  /** A short-lived WIF access token (sk-ant-oat01-...). */
  accessToken: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  sleep?: (millis: number) => Promise<void>;
}

const retryable = (status: number) => status === 429 || status >= 500;

function retryDelay(response: Response): number {
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header >= 0 ?
    Math.min(header * 1000, MAX_RETRY_DELAY_MS) : 1_000;
}

interface MessagesResponse {
  content?: Array<{type?: string; text?: string}>;
  stop_reason?: string;
  usage?: {input_tokens?: number; output_tokens?: number;
    cache_creation_input_tokens?: number; cache_read_input_tokens?: number};
}

const tokens = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;

/** One Messages API call with one retry on 429/5xx. Never throws. */
export function createAnthropicProvider(options: AnthropicProviderOptions): AssistantProvider {
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sleep = options.sleep ?? ((millis: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, millis)));
  return {async complete(body) {
    let attempts = 0;
    let status: number | null = null;
    while (attempts < 2) {
      attempts++;
      let response: Response;
      try {
        response = await send(ANTHROPIC_MESSAGES_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${options.accessToken}`,
            "anthropic-version": ANTHROPIC_VERSION,
            "anthropic-beta": ANTHROPIC_OAUTH_BETA,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        // A timeout or dropped connection may still have been billed, and a
        // resubmission could answer twice: never retry it.
        return {ok: false, failure: "timeout", attempts, status, billedUncertain: true,
          inputTokens: 0, outputTokens: 0};
      }
      status = response.status;
      if (retryable(response.status) && attempts < 2) {
        await sleep(retryDelay(response));
        continue;
      }
      if (!response.ok) {
        return {ok: false, failure: retryable(response.status) ? "unavailable" : "rejected",
          attempts, status, billedUncertain: false, inputTokens: 0, outputTokens: 0};
      }
      let parsed: MessagesResponse;
      try {
        parsed = await response.json() as MessagesResponse;
      } catch {
        return {ok: false, failure: "malformed", attempts, status, billedUncertain: true,
          inputTokens: 0, outputTokens: 0};
      }
      const usage = parsed.usage ?? {};
      const inputTokens = tokens(usage.input_tokens) +
        tokens(usage.cache_creation_input_tokens) + tokens(usage.cache_read_input_tokens);
      const outputTokens = tokens(usage.output_tokens);
      if (parsed.stop_reason === "refusal") {
        return {ok: false, failure: "refused", attempts, status, billedUncertain: false,
          inputTokens, outputTokens};
      }
      // Read by block type: a response may start with a thinking block.
      const text = (parsed.content ?? []).find((block) =>
        block.type === "text" && typeof block.text === "string")?.text;
      if (!text || parsed.stop_reason === "max_tokens" || !parsed.usage) {
        return {ok: false, failure: "malformed", attempts, status,
          billedUncertain: !parsed.usage, inputTokens, outputTokens};
      }
      return {ok: true, text, inputTokens, outputTokens, attempts, status};
    }
    return {ok: false, failure: "unavailable", attempts, status, billedUncertain: false,
      inputTokens: 0, outputTokens: 0};
  }};
}

export interface FederationConfig {
  federationRuleId: string;
  organizationId: string;
}

/** Both federation params in their expected formats, or null (off). */
export function parseFederationConfig(federationRuleId: string,
  organizationId: string): FederationConfig | null {
  const rule = federationRuleId.trim();
  const organization = organizationId.trim();
  return FEDERATION_RULE_ID.test(rule) && ORGANIZATION_ID.test(organization) ?
    {federationRuleId: rule, organizationId: organization} : null;
}

export interface AnthropicTokenSourceOptions extends FederationConfig {
  fetch?: typeof fetch;
  /** Epoch milliseconds. */
  now?: () => number;
  timeoutMs?: number;
}

export interface AnthropicTokenSource {
  /** A cached or freshly exchanged access token. Throws when neither is available. */
  accessToken(): Promise<string>;
}

interface TokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
}

/** A failure that names the step and status, never the JWT or the token. */
function tokenFailure(step: string, detail?: string): Error {
  return new Error(`Assistant ${step} failed${detail ? ` (${detail})` : ""}`);
}

async function errorType(response: Response): Promise<string | null> {
  try {
    const parsed = await response.json() as {error?: {type?: unknown}};
    const type = parsed?.error?.type;
    return typeof type === "string" && /^[a-z_]{1,64}$/u.test(type) ? type : null;
  } catch {
    return null;
  }
}

/**
 * Exchanges the runtime identity's Google ID token for an Anthropic access
 * token and keeps it until TOKEN_REFRESH_MARGIN_MS before it expires. Every
 * exchange mints a fresh ID token: an assertion with a jti is single-use.
 */
export function createAnthropicTokenSource(options: AnthropicTokenSourceOptions): AnthropicTokenSource {
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? TOKEN_TIMEOUT_MS;
  let cached: {token: string; refreshAtMillis: number} | null = null;
  let pending: Promise<string> | null = null;

  async function exchange(): Promise<string> {
    let identity: Response;
    try {
      identity = await send(GOOGLE_IDENTITY_URL, {headers: {"Metadata-Flavor": "Google"},
        signal: AbortSignal.timeout(timeoutMs)});
    } catch {
      throw tokenFailure("identity token request", "unreachable");
    }
    if (!identity.ok) throw tokenFailure("identity token request", `status ${identity.status}`);
    const assertion = (await identity.text().catch(() => "")).trim();
    if (!assertion) throw tokenFailure("identity token request", "empty");
    let response: Response;
    try {
      response = await send(ANTHROPIC_TOKEN_URL, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({grant_type: JWT_BEARER_GRANT, assertion,
          federation_rule_id: options.federationRuleId, organization_id: options.organizationId}),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw tokenFailure("token exchange", "unreachable");
    }
    if (!response.ok) {
      const type = await errorType(response);
      throw tokenFailure("token exchange", `status ${response.status}${type ? `, ${type}` : ""}`);
    }
    let parsed: TokenResponse;
    try {
      parsed = await response.json() as TokenResponse;
    } catch {
      throw tokenFailure("token exchange", "malformed response");
    }
    const token = parsed.access_token;
    const expiresIn = parsed.expires_in;
    if (typeof token !== "string" || !token || token.trim() !== token ||
        typeof parsed.token_type !== "string" || parsed.token_type.toLowerCase() !== "bearer" ||
        typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw tokenFailure("token exchange", "malformed response");
    }
    cached = {token, refreshAtMillis: now() + expiresIn * 1000 - TOKEN_REFRESH_MARGIN_MS};
    return token;
  }

  return {accessToken() {
    if (cached && now() < cached.refreshAtMillis) return Promise.resolve(cached.token);
    // Concurrent callers share one exchange.
    pending ??= exchange().finally(() => {
      pending = null;
    });
    return pending;
  }};
}

export interface AssistantRuntime {
  /** False when the kill switch is off or a federation param is blank. */
  enabled: boolean;
  provider: () => Promise<AssistantProvider>;
}

let sharedTokenSource: {key: string; source: AnthropicTokenSource} | null = null;

/** The module-scope token source for this federation config. */
function tokenSourceFor(config: FederationConfig): AnthropicTokenSource {
  const key = `${config.federationRuleId}:${config.organizationId}`;
  if (sharedTokenSource?.key !== key) {
    sharedTokenSource = {key, source: createAnthropicTokenSource(config)};
  }
  return sharedTokenSource.source;
}

/**
 * The deployed runtime: the param kill switch and the federation params.
 * provider() throws when the exchange fails, which callers record as a
 * provider error with nothing billed.
 */
export function defaultAssistantRuntime(): AssistantRuntime {
  const config = parseFederationConfig(programAssistantFederationRuleId.value(),
    anthropicOrganizationId.value());
  return {
    enabled: programAssistantEnabled.value() === true && config !== null,
    provider: async () => {
      if (!config) throw new Error("Assistant federation is not configured");
      return createAnthropicProvider({accessToken: await tokenSourceFor(config).accessToken()});
    },
  };
}
