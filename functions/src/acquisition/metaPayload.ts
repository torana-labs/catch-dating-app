import {createHash} from "node:crypto";
import {
  hostMetaDispatchDecision, type HostMetaDispatchState,
} from "./consentPolicy";
import {brandWebUrl} from "../shared/generated/brand";

export interface HostMetaBrowserContext {
  clientId: string;
  userAgent: string;
  fbclid?: string;
  clickCapturedAt?: number;
}

export interface HostMetaLeadPayload {
  event_name: "Lead";
  event_id: string;
  event_time: number;
  action_source: "website";
  event_source_url: string;
  user_data: {
    external_id: string[];
    client_user_agent: string;
    fbc?: string;
  };
}

/** A projection, never a copy of an intake/Sales record. The caller obtains
 * browser context only from a fresh purpose-specific permission handshake.
 * No names, answers, contacts, user ids, IP addresses or arbitrary URLs. */
export function hostMetaLeadPayload(input: {
  enabled: boolean;
  consent: unknown;
  state: HostMetaDispatchState;
  context: unknown;
  now: number;
}): HostMetaLeadPayload | null {
  if (hostMetaDispatchDecision(input).kind !== "dispatch") return null;
  if (!input.context || typeof input.context !== "object" ||
      Array.isArray(input.context)) return null;
  const context = input.context as Record<string, unknown>;
  if (typeof context.clientId !== "string" ||
      !/^\d{1,10}\.\d{10}$/u.test(context.clientId) ||
      typeof context.userAgent !== "string" ||
      context.userAgent.length < 1 || context.userAgent.length > 512 ||
      [...context.userAgent].some((char) =>
        char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  const userData: HostMetaLeadPayload["user_data"] = {
    external_id: [createHash("sha256")
      .update(`catch-host-browser-v1:${context.clientId}`).digest("hex")],
    client_user_agent: context.userAgent,
  };
  // Construct fbc only from a real, consented click observation. Never invent
  // fbclid or substitute a receipt/client id as an advertising click.
  if (typeof context.fbclid === "string" &&
      /^[A-Za-z0-9_-]{10,512}$/u.test(context.fbclid) &&
      Number.isSafeInteger(context.clickCapturedAt) &&
      Number(context.clickCapturedAt) >=
        (input.consent as {chosenAt: number}).chosenAt &&
      Number(context.clickCapturedAt) <= input.state.acceptedAt) {
    userData.fbc = `fb.1.${context.clickCapturedAt}.${context.fbclid}`;
  }
  return {
    event_name: "Lead",
    event_id: input.state.eventId,
    event_time: Math.floor(input.state.acceptedAt / 1000),
    action_source: "website",
    event_source_url: brandWebUrl("/host/apply/"),
    user_data: userData,
  };
}

export type HostMetaResponse =
  | {kind: "accepted"}
  | {kind: "rejected"; retryable: boolean}
  | {kind: "unknown"};

/** HTTP success alone is not event acceptance. A transport timeout, malformed
 * response, contradictory response or 5xx is uncertain, not permission to
 * blindly resend. Provider error bodies are not logged or persisted. */
export function classifyHostMetaResponse(
  httpStatus: number, body: unknown,
): HostMetaResponse {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {kind: "unknown"};
  }
  const row = body as Record<string, unknown>;
  if (httpStatus === 200 && row.events_received === 1 &&
      !Object.hasOwn(row, "error") &&
      Array.isArray(row.messages) && row.messages.length === 0) {
    return {kind: "accepted"};
  }
  if (httpStatus >= 400 && httpStatus < 500 &&
      !Object.hasOwn(row, "events_received") &&
      row.error && typeof row.error === "object" &&
      Number.isSafeInteger((row.error as Record<string, unknown>).code)) {
    return {kind: "rejected", retryable: httpStatus === 429};
  }
  return {kind: "unknown"};
}
