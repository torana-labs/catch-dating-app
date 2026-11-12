/**
 * Per-recipient delivery policy for moments. This is the single place that
 * decides send vs defer vs suppress for a resolved recipient, shared across
 * initiation kinds and channels. It is pure: the runner injects facts it
 * fetched (consent state, preference flag, cap counters, local time), so the
 * same rules cover phone-record guests and signed-in app users.
 */

export type RecipientEndpoint = {
  kind: "phone";
  e164: string;
} | {
  kind: "uid";
  uid: string;
};

/**
 * Consent facts for a phone recipient. Exactly one source applies per
 * recipient: a program household's explicit tick, or a CRM contact's
 * channel state + organizer communication preference.
 */
export interface ConsentFacts {
  /** Program household consent. `undefined` = no record (absent ≠ decline). */
  householdConsentGranted?: boolean | null;
  /** CRM path: resolved whatsapp permission state. */
  communicationPermission?: "optedIn" | "optedOut" | "unknown";
  /** CRM path: provider/admin suppression on the endpoint. */
  endpointSuppressed?: boolean;
}

export interface QuietHours {
  /** Local minute-of-day when sends pause (e.g. 21:00 = 1260). */
  startMinute: number;
  /** Local minute-of-day when sends resume (e.g. 08:00 = 480). May wrap
   *  past midnight — the paused span is [start, end) in local time. */
  endMinute: number;
}

export interface PolicyInput {
  endpoint: RecipientEndpoint;
  consent: ConsentFacts;
  /** Whether this send requires explicit consent (WhatsApp templates do;
   *  push honors the user's preference instead). */
  explicitConsentRequired: boolean;
  quietHours: QuietHours | null;
  localMinuteOfDay: number;
  sentTodayForEndpoint: number;
  dailyCap: number;
}

export type SuppressionReason =
  "noEndpoint" | "preferenceOff" | "noConsent" | "optedOut" |
    "endpointSuppressed" | "dailyCap" |
    // Shared delivery core outcomes for durable-intent sends.
    "deliveryConflict" | "superseded" | "expired" | "programEnded" |
    "recipientWithdrawn" | "permissionRevoked" | "hostReview" |
    // CRM frequency ledger cap (distinct from the per-day send cap).
    "frequencyCapped";

export type PolicyDecision = {
  kind: "send";
} | {
  kind: "defer";
  reason: "quietHours" | "travelLead" | "delivery";
} | {
  kind: "suppress";
  reason: SuppressionReason;
};

export function inQuietHours(
  quietHours: QuietHours,
  localMinuteOfDay: number,
): boolean {
  const {startMinute, endMinute} = quietHours;
  if (startMinute === endMinute) return false;
  if (startMinute < endMinute) {
    return localMinuteOfDay >= startMinute && localMinuteOfDay < endMinute;
  }
  // Wraps midnight: e.g. 21:00–08:00 pauses [1260, 1440) and [0, 480).
  return localMinuteOfDay >= startMinute || localMinuteOfDay < endMinute;
}

export function evaluateRecipientPolicy(input: PolicyInput): PolicyDecision {
  const {endpoint, consent} = input;
  if (endpoint.kind === "uid") {
    // A uid endpoint is always deliverable: the send lands as an in-app
    // activity item, and the FCM leg is gated separately at delivery by
    // the user's own notification preference and token.
    if (consent.communicationPermission === "optedOut") {
      return {kind: "suppress", reason: "preferenceOff"};
    }
  } else {
    if (endpoint.e164.trim().length === 0) {
      return {kind: "suppress", reason: "noEndpoint"};
    }
    if (consent.endpointSuppressed === true) {
      return {kind: "suppress", reason: "endpointSuppressed"};
    }
    if (consent.communicationPermission === "optedOut") {
      return {kind: "suppress", reason: "optedOut"};
    }
    if (input.explicitConsentRequired) {
      // Explicit household decline or unresolved CRM permission suppresses;
      // an absent consent record does not — service messages precede the
      // first consent opportunity (mirrors the shipped campaign dispatcher).
      if (consent.householdConsentGranted === false ||
          consent.communicationPermission === "unknown") {
        return {kind: "suppress", reason: "noConsent"};
      }
    }
  }
  if (input.dailyCap > 0 && input.sentTodayForEndpoint >= input.dailyCap) {
    return {kind: "suppress", reason: "dailyCap"};
  }
  if (input.quietHours !== null &&
      inQuietHours(input.quietHours, input.localMinuteOfDay)) {
    return {kind: "defer", reason: "quietHours"};
  }
  return {kind: "send"};
}

/** Rollup of a policy evaluation over a resolved recipient set. */
export interface PolicyRollup {
  send: number;
  deferred: number;
  suppressed: Partial<Record<SuppressionReason, number>>;
}

export function rollupPolicy(
  decisions: ReadonlyArray<PolicyDecision>,
): PolicyRollup {
  const rollup: PolicyRollup = {send: 0, deferred: 0, suppressed: {}};
  for (const decision of decisions) {
    if (decision.kind === "send") rollup.send += 1;
    else if (decision.kind === "defer") rollup.deferred += 1;
    else {
      rollup.suppressed[decision.reason] =
        (rollup.suppressed[decision.reason] ?? 0) + 1;
    }
  }
  return rollup;
}
