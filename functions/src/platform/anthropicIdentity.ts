/* eslint-disable max-len */
// This project's identity at Anthropic, shared by every server feature that
// calls the Messages API (the programme assistant, the try-it AI fallback).
// It holds no long-lived key: the Functions runtime service account proves
// itself with a Google ID token, which Anthropic Workload Identity
// Federation exchanges for a short-lived access token. A blank
// PROGRAM_ASSISTANT_FEDERATION_RULE_ID (a historical name: the rule serves
// every caller) or ANTHROPIC_ORGANIZATION_ID keeps federation off, so a
// deploy never needs the federation rule to exist.

import {defineString} from "firebase-functions/params";

/** fdrl_...: this project's Anthropic federation rule; blank = off. */
export const programAssistantFederationRuleId = defineString(
  "PROGRAM_ASSISTANT_FEDERATION_RULE_ID", {default: ""});
/** The Anthropic organization UUID; blank = off. */
export const anthropicOrganizationId = defineString(
  "ANTHROPIC_ORGANIZATION_ID", {default: ""});

export const ANTHROPIC_TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";
export const ANTHROPIC_AUDIENCE = "https://api.anthropic.com";
/** The runtime identity's Google ID token; format=full adds the email claim. */
export const GOOGLE_IDENTITY_URL = "http://metadata.google.internal/computeMetadata/v1/" +
  `instance/service-accounts/default/identity?audience=${ANTHROPIC_AUDIENCE}&format=full`;
const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const FEDERATION_RULE_ID = /^fdrl_[A-Za-z0-9]{1,128}$/u;
const ORGANIZATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const TOKEN_TIMEOUT_MS = 10_000;
/** Re-exchange this long before the access token expires. */
export const TOKEN_REFRESH_MARGIN_MS = 60_000;

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

let sharedTokenSource: {key: string; source: AnthropicTokenSource} | null = null;

/**
 * The module-scope token source for this federation config. Other server
 * features that call Anthropic (the try-it import fallback) share it, so one
 * runtime identity and one cached access token serve every caller.
 */
export function tokenSourceFor(config: FederationConfig): AnthropicTokenSource {
  const key = `${config.federationRuleId}:${config.organizationId}`;
  if (sharedTokenSource?.key !== key) {
    sharedTokenSource = {key, source: createAnthropicTokenSource(config)};
  }
  return sharedTokenSource.source;
}

/** This project's federation params, or null while either is blank. */
export function anthropicFederationConfig(): FederationConfig | null {
  return parseFederationConfig(programAssistantFederationRuleId.value(),
    anthropicOrganizationId.value());
}
