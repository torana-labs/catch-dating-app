/* eslint-disable max-len */
import {createHash, timingSafeEqual} from "node:crypto";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {supplyIntakeRequestId} from "../operations/supplyIntake/requests";
import type {DraftLinkClassification, DraftRequestKind} from "./links";

// The website's instant draft contract (contracts/callables/
// request_instant_draft_payload.schema.json, get_instant_draft_payload and
// their responses) and the private state a draft keeps on its Supply Intake
// request (supplyIntakeRequests.instantDraft).
//
// The payloads are checked here by hand, field for field with their schema,
// because the generated runtime validators come from
// contracts/functions/runtime_modules.json, which another task holds this
// round. model.test.ts proves this check and the schema accept and refuse the
// same payloads; once the four contract names are registered there, swap
// these for the generated validators.

export const WHATSAPP_CONSENT_VERSION = "instant-draft-whatsapp-v1";
export const DRAFT_PATH_PREFIX = "/drafts/";
export const DRAFT_POLL_MS = 2_000;
/** The approver recorded on a draft the worker saves by itself. */
export const INSTANT_DRAFT_ACTOR = "supply-instant-draft";

export type DraftEntry = "event_page_tool" | "demo_request";

export interface RequestInstantDraftPayload {
  requestId: string;
  requestKind: DraftRequestKind;
  entry: DraftEntry;
  link: string;
  accessToken: string;
  /**
   * The number Catch replies to is the caller's verified Firebase phone. A
   * submitted phone is optional and, when sent, must be that same number.
   */
  whatsapp: {phone?: string; consentVersion: typeof WHATSAPP_CONSENT_VERSION; followUpConsent: true};
  city?: string | null;
}

export interface GetInstantDraftPayload {
  draftId: string;
  accessToken: string;
  /** The open market the submitter picked after a needs_city answer. */
  city?: string;
}

/** An open launch market the website offers when the draft needs a city. */
export interface DraftMarketOption {
  marketId: string;
  label: string;
}

export interface DraftFollowUp {
  channel: "whatsapp";
  mode: "staff_reply";
}

export const STAFF_REPLY: DraftFollowUp = {channel: "whatsapp", mode: "staff_reply"};

export interface RequestInstantDraftResponse {
  draftId: string;
  status: "building" | "staff_follow_up";
  link: DraftLinkClassification;
  followUp: DraftFollowUp;
  draftPath: string;
  pollAfterMs: number | null;
  idempotentReplay: boolean;
}

export interface DraftPreviewEvent {
  title: string | null;
  startAt: string;
  endAt: string | null;
  venue: string | null;
  sourceUrl: string;
}

export interface GetInstantDraftResponse {
  draftId: string;
  status: "building" | "draft_ready" | "needs_city" | "staff_follow_up" | "expired";
  requestKind: DraftRequestKind;
  link: DraftLinkClassification;
  draft: null | {
    organizerId: string;
    name: string;
    description: string | null;
    visibility: "private_until_claimed" | "claimed_unpublished" | "published";
    claimState: "unclaimed" | "claimPending" | "claimed" | "unavailable";
    eventCount: number;
    events: DraftPreviewEvent[];
  };
  reasons: string[];
  /** The open markets to choose from; empty unless status is needs_city. */
  markets: DraftMarketOption[];
  followUp: DraftFollowUp;
  pollAfterMs: number | null;
}

export type DraftMarketSource = "submitted" | "event_location" | "chosen";

/** supplyIntakeRequests.instantDraft, as the contract stores it. */
export interface StoredInstantDraft {
  schemaVersion: 1;
  draftId: string;
  accessTokenHash: string;
  requestKind: DraftRequestKind;
  entry: DraftEntry;
  link: {url: string} & DraftLinkClassification;
  whatsapp: {phone: string; consentVersion: typeof WHATSAPP_CONSENT_VERSION; consentedAt: string;
    purpose: "instant_draft_follow_up"; verifiedByUid: string};
  followUp: DraftFollowUp;
  /** The open market the draft is saved in, once known, and where it came from. */
  market?: {marketId: string; source: DraftMarketSource; at: string} | null;
  /** When a saved, still unclaimed draft is removed; null once it is claimed, published or expired. */
  expiresAt?: string | null;
  outcome: null | {state: "draft_ready" | "needs_staff" | "needs_city" | "expired"; reasons: string[]; at: string};
}

/** A saved draft nobody claims is removed this long after it was saved (owner decision, 16 Nov 2026). */
export const DRAFT_TTL_DAYS = 30;

const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/u;
const TOKEN = /^[A-Za-z0-9_-]{43}$/u;
const PHONE = /^\+[1-9][0-9]{7,14}$/u;
const DRAFT_ID = /^draft-[a-f0-9]{40}$/u;

/** The draft id and its Supply Intake request id are one value, deterministic per website request id. */
export function instantDraftId(requestId: string): string {
  return supplyIntakeRequestId("draft", [requestId]);
}

export function accessTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented token with the stored hash. */
export function tokenMatches(token: string, storedHash: unknown): boolean {
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/u.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(accessTokenHash(token), "hex"), Buffer.from(storedHash, "hex"));
}

/** A short, salted key for rate limits, so no number or address is stored in a counter id. */
export function limiterKey(kind: "phone" | "ip" | "draft", value: string): string {
  return `idraft-${kind}-${createHash("sha256").update(`${kind}:${value}`).digest("hex").slice(0, 32)}`;
}

/** Checks a requestInstantDraft payload exactly as its schema does. */
export function parseRequestInstantDraftPayload(value: unknown): RequestInstantDraftPayload {
  const data = record(value);
  if (!data) invalid("Send a draft request.");
  allowOnly(data, ["requestId", "requestKind", "entry", "link", "accessToken", "whatsapp", "city"]);
  if (typeof data.requestId !== "string" || !REQUEST_ID.test(data.requestId)) invalid("requestId is invalid.");
  if (data.requestKind !== "event_link" && data.requestKind !== "form_link") invalid("requestKind is invalid.");
  if (data.entry !== "event_page_tool" && data.entry !== "demo_request") invalid("entry is invalid.");
  if (typeof data.link !== "string" || data.link.length < 8 || data.link.length > 2000 || !/^https?:\/\//u.test(data.link)) {
    invalid("Send a public https link.");
  }
  if (typeof data.accessToken !== "string" || !TOKEN.test(data.accessToken)) invalid("accessToken is invalid.");
  const whatsapp = record(data.whatsapp);
  if (!whatsapp) invalid("Add your WhatsApp number.");
  allowOnly(whatsapp, ["phone", "consentVersion", "followUpConsent"]);
  if (whatsapp.phone !== undefined && (typeof whatsapp.phone !== "string" || !PHONE.test(whatsapp.phone))) {
    invalid("Enter your WhatsApp number with its country code.");
  }
  if (whatsapp.consentVersion !== WHATSAPP_CONSENT_VERSION) invalid("Review the WhatsApp consent again.");
  if (whatsapp.followUpConsent !== true) invalid("Tick the box so we can message you on WhatsApp.");
  const city = data.city;
  if (city !== undefined && city !== null && (typeof city !== "string" || city.length < 2 || city.length > 80)) {
    invalid("city is invalid.");
  }
  return {requestId: data.requestId, requestKind: data.requestKind, entry: data.entry, link: data.link,
    accessToken: data.accessToken,
    whatsapp: {...(whatsapp.phone === undefined ? {} : {phone: whatsapp.phone as string}),
      consentVersion: WHATSAPP_CONSENT_VERSION, followUpConsent: true},
    ...(city === undefined ? {} : {city: city as string | null})};
}

/** Checks a getInstantDraft payload exactly as its schema does. */
export function parseGetInstantDraftPayload(value: unknown): GetInstantDraftPayload {
  const data = record(value);
  if (!data) invalid("Send a draft id.");
  allowOnly(data, ["draftId", "accessToken", "city"]);
  if (typeof data.draftId !== "string" || !DRAFT_ID.test(data.draftId)) invalid("draftId is invalid.");
  if (typeof data.accessToken !== "string" || !TOKEN.test(data.accessToken)) invalid("accessToken is invalid.");
  if (data.city !== undefined && (typeof data.city !== "string" || data.city.length < 2 || data.city.length > 80)) {
    invalid("city is invalid.");
  }
  return {draftId: data.draftId, accessToken: data.accessToken,
    ...(data.city === undefined ? {} : {city: data.city as string})};
}

/**
 * The caller's verified WhatsApp number: the phone their Firebase sign-in
 * confirmed with a one-time code (the website's "Continue with phone" sheet,
 * the same verification checkout and following by phone use). A submitted
 * number must be that same number, so nobody can ask Catch to message a
 * number they do not hold.
 */
export function verifiedWhatsapp(request: CallableRequest<unknown>, submittedPhone: string | undefined):
  {uid: string; phone: string} {
  if (!request.auth) throw new HttpsError("unauthenticated", "Confirm your WhatsApp number with a code first.");
  const phone = request.auth.token?.phone_number;
  if (typeof phone !== "string" || !PHONE.test(phone)) {
    throw new HttpsError("failed-precondition", "Confirm your WhatsApp number with a code first.");
  }
  if (submittedPhone !== undefined && submittedPhone !== phone) {
    throw new HttpsError("failed-precondition", "Use the WhatsApp number you confirmed with a code.");
  }
  return {uid: request.auth.uid, phone};
}

/** Reads supplyIntakeRequests.instantDraft back, or null when the request has none. */
export function storedInstantDraft(value: unknown): StoredInstantDraft | null {
  const draft = record(value);
  if (!draft || draft.schemaVersion !== 1 || typeof draft.draftId !== "string" || !record(draft.link) ||
      !record(draft.whatsapp) || (draft.requestKind !== "event_link" && draft.requestKind !== "form_link")) return null;
  return draft as unknown as StoredInstantDraft;
}

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function allowOnly(data: Record<string, unknown>, keys: readonly string[]): void {
  const extra = Object.keys(data).find((key) => !keys.includes(key));
  if (extra) invalid(`${extra} is not part of this request.`);
}

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}
