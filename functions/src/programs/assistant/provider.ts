/* eslint-disable max-len */
// The wedding assistant's model provider: the Anthropic Messages API over
// fetch, with a pinned model, a pinned API key version, a per-request
// timeout and one retry on rate limits and server errors. The kill switch
// is PROGRAM_ASSISTANT_ENABLED; a blank PROGRAM_ASSISTANT_KEY_VERSION also
// keeps it off, so a deploy never needs the secret to exist.

import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getApp} from "firebase-admin/app";
import {defineBoolean, defineString} from "firebase-functions/params";
import type {AssistantRequestBody} from "./prompt";

export const programAssistantEnabled = defineBoolean(
  "PROGRAM_ASSISTANT_ENABLED", {default: false});
/** projects/{project}/secrets/ANTHROPIC_API_KEY/versions/{n}; blank = off. */
export const programAssistantKeyVersion = defineString(
  "PROGRAM_ASSISTANT_KEY_VERSION", {default: ""});

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
export const ASSISTANT_SECRET_NAME = "ANTHROPIC_API_KEY";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRY_DELAY_MS = 5_000;

export type ProviderFailure =
  /** 429 or 5xx/529 twice: nothing billed. */
  | "unavailable"
  /** No response in time: the request may have been billed. */
  | "timeout"
  /** 4xx other than 429 (bad key, bad request): nothing billed. */
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
  apiKey: string;
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
            "x-api-key": options.apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
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

/** A pinned ANTHROPIC_API_KEY version in this project, or null. */
export function parseKeyVersion(version: string, projectId: string | undefined): string | null {
  const value = version.trim();
  if (!value || !projectId) return null;
  const prefix = `projects/${projectId}/secrets/${ASSISTANT_SECRET_NAME}/versions/`;
  return value.startsWith(prefix) && /^[1-9][0-9]*$/u.test(value.slice(prefix.length)) ?
    value : null;
}

export interface AssistantRuntime {
  /** False when the kill switch is off or no key version is pinned. */
  enabled: boolean;
  provider: () => Promise<AssistantProvider>;
}

function projectId(): string | undefined {
  try {
    return getApp().options.projectId || process.env.GCLOUD_PROJECT;
  } catch {
    return process.env.GCLOUD_PROJECT;
  }
}

let cachedKey: {version: string; value: string} | null = null;

async function readPinnedKey(version: string): Promise<string> {
  if (cachedKey?.version === version) return cachedKey.value;
  const [secret] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = secret.payload?.data;
  const value = (typeof data === "string" ? data :
    data ? Buffer.from(data).toString("utf8") : "").trim();
  if (!value) throw new Error("Assistant key unavailable");
  cachedKey = {version, value};
  return value;
}

/** The deployed runtime: the param kill switch and the pinned key. */
export function defaultAssistantRuntime(): AssistantRuntime {
  const version = parseKeyVersion(programAssistantKeyVersion.value(), projectId());
  return {
    enabled: programAssistantEnabled.value() === true && version !== null,
    provider: async () => createAnthropicProvider({apiKey: await readPinnedKey(version!)}),
  };
}
