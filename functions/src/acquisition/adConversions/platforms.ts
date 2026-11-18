import {HOST_META_EVENTS_URL} from "../metaSender";
import type {Delivery, SendOutcome} from "./deliveries";
import {sha256Hex} from "./hostConversions";

/** Fixed Catch destinations named in docs/ads_conversion_spec.md. */
export const GOOGLE_ADS_CUSTOMER_ID = "1016806229";
export const GOOGLE_CONVERSION_ACTIONS: Record<Delivery["eventName"], string> =
  {
    organizer_signup: "7906745506",
    organizer_qualified: "7906748544",
  };
export const DATA_MANAGER_INGEST_URL =
  "https://datamanager.googleapis.com/v1/events:ingest";

const metaEventNames: Record<Delivery["eventName"], string> = {
  organizer_signup: "CompleteRegistration",
  organizer_qualified: "QualifiedHost",
};
const COUNTRY_SHA256 = sha256Hex("in");

/**
 * One Conversions API event. Host milestones happen in the Host app and on
 * the server, not on a web page, so they are `system_generated` and match on
 * hashed contact keys. No raw contact data, IDs or URLs.
 * @param {Delivery} delivery Queue record.
 * @return {object} Wire event.
 */
export function metaEvent(delivery: Delivery) {
  const m = delivery.matching;
  return {
    event_name: metaEventNames[delivery.eventName],
    event_id: delivery.eventId,
    event_time: Math.floor(delivery.occurredAt.toMillis() / 1000),
    action_source: "system_generated",
    user_data: {
      // A conversion-leads CRM stage names its lead; Meta matches it first.
      ...(delivery.metaLeadId ? {lead_id: delivery.metaLeadId} : {}),
      // Meta hashes the number as digits only; a record queued before that
      // digest existed sends no phone rather than one Meta cannot match.
      ...(m.metaPhoneSha256 ? {ph: [m.metaPhoneSha256]} : {}),
      ...(m.emailSha256 ? {em: [m.emailSha256]} : {}),
      external_id: [m.externalIdSha256],
      country: [COUNTRY_SHA256],
    },
    custom_data: {
      content_category: "host",
      ...(delivery.metaLeadId ?
        {event_source: "crm", lead_event_source: "Catch"} : {}),
      ...(delivery.valueMinor !== null ? {
        value: delivery.valueMinor / 100, currency: delivery.currency,
      } : {}),
    },
  };
}

/**
 * The Data Manager request for one event. `validateOnly` checks the payload
 * without recording a conversion.
 * @param {Delivery} delivery Queue record.
 * @param {boolean} validateOnly Validate without ingesting.
 * @return {object} Request body.
 */
export function googleIngestBody(delivery: Delivery, validateOnly: boolean) {
  const m = delivery.matching;
  const account = {accountType: "GOOGLE_ADS",
    accountId: GOOGLE_ADS_CUSTOMER_ID};
  return {
    destinations: [{
      reference: "catch",
      operatingAccount: account,
      loginAccount: account,
      productDestinationId: GOOGLE_CONVERSION_ACTIONS[delivery.eventName],
    }],
    encoding: "HEX",
    consent: {adUserData: "CONSENT_GRANTED",
      adPersonalization: "CONSENT_DENIED"},
    events: [{
      destinationReferences: ["catch"],
      transactionId: delivery.eventId,
      eventTimestamp: delivery.occurredAt.toDate().toISOString(),
      eventSource: "OTHER",
      conversionValue: delivery.valueMinor !== null ?
        delivery.valueMinor / 100 : 1,
      currency: delivery.currency,
      userData: {userIdentifiers: [
        ...(m.phoneSha256 ? [{phoneNumber: m.phoneSha256}] : []),
        ...(m.emailSha256 ? [{emailAddress: m.emailSha256}] : []),
      ]},
    }],
    validateOnly,
  };
}

async function boundedJson(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (text.length > 16_384) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Meta accepted the one event only when it says so; 4xx is final except
 * throttling, and anything uncertain is retried (Meta deduplicates by ID). */
export function classifyMeta(status: number, body: unknown): SendOutcome {
  const row = body && typeof body === "object" ?
    body as Record<string, unknown> : null;
  if (status === 200 && row?.events_received === 1) return {kind: "accepted"};
  if (status === 429) return {kind: "retry", code: "meta_throttled"};
  if (status >= 400 && status < 500) {
    return {kind: "rejected", code: "meta_rejected"};
  }
  return {kind: "retry", code: "meta_uncertain"};
}

/** Google: 200 is accepted; 400/403/404 are final; the rest are retried
 * (Google deduplicates by transaction ID). */
export function classifyGoogle(status: number): SendOutcome {
  if (status === 200) return {kind: "accepted"};
  if ([400, 403, 404].includes(status)) {
    return {kind: "rejected", code: `google_${status}`};
  }
  return {kind: "retry", code: status === 429 ?
    "google_throttled" : "google_uncertain"};
}

export async function sendMeta(input: {
  delivery: Delivery; token: string; testEventCode?: string;
  fetch?: typeof fetch;
}): Promise<SendOutcome> {
  if (!input.token || /[\r\n]/u.test(input.token)) {
    return {kind: "retry", code: "meta_credential_unavailable"};
  }
  try {
    const response = await (input.fetch ?? fetch)(HOST_META_EVENTS_URL, {
      method: "POST", redirect: "error",
      headers: {"Content-Type": "application/json",
        "Authorization": `Bearer ${input.token}`},
      body: JSON.stringify({data: [metaEvent(input.delivery)],
        ...(input.testEventCode ?
          {test_event_code: input.testEventCode} : {})}),
      signal: AbortSignal.timeout(10_000),
    });
    return classifyMeta(response.status, await boundedJson(response));
  } catch {
    return {kind: "retry", code: "meta_transport"};
  }
}

export async function sendGoogle(input: {
  delivery: Delivery; accessToken: string; validateOnly: boolean;
  quotaProject: string; fetch?: typeof fetch;
}): Promise<SendOutcome> {
  try {
    const response = await (input.fetch ?? fetch)(DATA_MANAGER_INGEST_URL, {
      method: "POST", redirect: "error",
      headers: {"Content-Type": "application/json",
        "Authorization": `Bearer ${input.accessToken}`,
        "x-goog-user-project": input.quotaProject},
      body: JSON.stringify(googleIngestBody(input.delivery,
        input.validateOnly)),
      signal: AbortSignal.timeout(10_000),
    });
    await response.text().catch(() => "");
    return classifyGoogle(response.status);
  } catch {
    return {kind: "retry", code: "google_transport"};
  }
}
