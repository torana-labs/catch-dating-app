import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import type {ManagePublicEventCheckoutCallableResponse} from
  "../../shared/generated/managePublicEventCheckoutCallableResponse";
import {
  requirePublicConfiguredEvent,
  requireEventPolicyTerms,
} from "../configuredEvent";
import {eventPolicyFromEvent} from "../eventPolicy";
import {assertUnpartitionedInventory} from
  "../../organizerFormAdmission/admissionEligibility";
import {eventCancellationPolicy} from
  "../../payments/eventCheckout/eventCancellationPolicy";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import type {PublicMemberQuoteTerms} from
  "../../hostMemberships/publicCheckout";

export type RegistrationMode = "closed" | "free" | "paid";
export type PublicCheckoutQuote = NonNullable<
  ManagePublicEventCheckoutCallableResponse["quote"]
>;

/** One public booking holds at most this many places, the booker included.
 * The seat authority enforces capacity; this is the per-booking ceiling. */
export const MAX_PUBLIC_BOOKING_PLACES = 4;

/** A reviewed or requested place count; absent means one place. */
export function publicBookingPlaces(value: unknown): number {
  if (value === undefined) return 1;
  if (!Number.isSafeInteger(value) || (value as number) < 1 ||
      (value as number) > MAX_PUBLIC_BOOKING_PLACES) {
    registrationUnavailable(
      `Choose between 1 and ${MAX_PUBLIC_BOOKING_PLACES} places.`);
  }
  return value as number;
}

/** One guest name, as the booker types it; the contract bounds the count. */
export const MAX_PUBLIC_GUEST_NAME_LENGTH = 80;

/**
 * The names of the people on a booking after the booker: exactly one per
 * extra place. One place takes none, so an older client that never sends the
 * field still books. Names are trimmed with inner whitespace collapsed, like
 * displayName, and a control character is refused rather than stripped.
 */
export function publicGuestNames(value: unknown, places: number): string[] {
  const expected = places - 1;
  const names = value === undefined ? [] : value;
  if (!Array.isArray(names) || names.length !== expected) {
    throw new HttpsError("invalid-argument", expected === 0 ?
      "A booking for one place takes no guest names." :
      `Add a name for each guest: ${expected} ` +
        `${expected === 1 ? "name" : "names"} for ${places} places.`,
    {reason: "guestNamesCount", expected,
      received: Array.isArray(names) ? names.length : null});
  }
  return names.map((name: unknown, index) => {
    const clean = typeof name === "string" && !/\p{Cc}/u.test(name) ?
      name.trim().replace(/\s+/gu, " ") : "";
    if (!clean || [...clean].length > MAX_PUBLIC_GUEST_NAME_LENGTH) {
      throw new HttpsError("invalid-argument",
        `Guest ${index + 1} needs a name of 1 to ` +
          `${MAX_PUBLIC_GUEST_NAME_LENGTH} characters.`,
        {reason: "guestNameInvalid", index});
    }
    return clean;
  });
}

export function registrationUnavailable(
  message = "Registration is not available for this event.",
): never {
  throw new HttpsError("failed-precondition", message);
}

/** An old opt-in is free registration only, never permission to collect
 * money. */
export function publicRegistrationMode(
  event: EventDocument,
): RegistrationMode {
  if (event.publicRegistrationEnabled !== true) return "closed";
  return event.publicRegistrationMode ?? "free";
}

/** Public phone verification cannot prove invitation, membership or cohort
 * eligibility. Those policies retain their own admission authority.
 */
export function assertPublicRegistrationPolicy(
  event: EventDocument,
  organizer: OrganizerDocument,
  mode: Exclude<RegistrationMode, "closed">,
  nowMillis: number,
  hasActiveCommunityMembership = false,
): void {
  assertPublicRegistrationAvailability(event, organizer, mode, nowMillis);
  const admission = eventPolicyFromEvent(event).admission;
  if ((admission.membershipRequired || admission.format === "membersOnly") &&
      !hasActiveCommunityMembership ||
      (admission.manualApprovalRequired ||
        admission.format === "manualApproval") &&
      !(admission.approvedMembersSkipReview && hasActiveCommunityMembership)) {
    registrationUnavailable("This event requires its reviewed admission flow.");
  }
}

/** Configuration checks capability; every guest action checks identity too. */
export function assertPublicRegistrationAvailability(
  event: EventDocument, organizer: OrganizerDocument,
  mode: Exclude<RegistrationMode, "closed">, nowMillis: number,
): void {
  requirePublicConfiguredEvent(event);
  // Tickets sold elsewhere keep Catch registration closed.
  if (event.externalBooking !== undefined) {
    registrationUnavailable("Guests book this event on its own page.");
  }
  if (
    !Number.isSafeInteger(nowMillis) ||
    nowMillis <= 0 ||
    event.status !== "active" ||
    event.startTime.toMillis() <= nowMillis ||
    organizer.archived === true ||
    organizer.appVisibility !== "discoverable" ||
    organizer.publicPage?.publishStatus !== "published"
  ) {
    registrationUnavailable();
  }
  assertPublicRegistrationTerms(event, mode);
}

/** Shared price/eligibility guard for registration and ordinary event edits. */
export function assertPublicRegistrationTerms(
  event: EventDocument,
  mode: Exclude<RegistrationMode, "closed">,
): void {
  const configured = requireEventPolicyTerms(event);
  assertUnpartitionedInventory(event);
  const policy = eventPolicyFromEvent(configured);
  if (
    (mode === "paid" && (event.currency ?? "INR") !== "INR") ||
    event.eventPolicy?.admission.privateAccessPolicy?.mode ===
      "inviteCode" ||
    !["open", "manualApproval", "membersOnly"].includes(
      policy.admission.format) ||
    policy.admission.inviteRequired ||
    (policy.admission.manualApprovalRequired ||
      policy.admission.format === "manualApproval") &&
      policy.admission.approvedMembersSkipReview !== true ||
    policy.admission.privateAccessPolicy?.mode !== "none" ||
    Object.keys(policy.pricing.cohortAdjustmentsInPaise ?? {}).length > 0 ||
    (policy.pricing.demandPricingRules ?? []).length > 0 ||
    policy.pricing.basePriceInPaise !== configured.priceInPaise
  ) {
    registrationUnavailable(
      "This event requires its reviewed admission flow.",
    );
  }
  const price = policy.pricing.basePriceInPaise;
  if (
    mode === "free" ?
      price !== 0 :
      !Number.isSafeInteger(price) || price < 100 || price > 100_000_000
  ) {
    registrationUnavailable("Registration must match the event's price.");
  }
}

/** The returned terms are reviewed before a hold and frozen in the ledger.
 * A multi-place quote prices the booker's place at unitAmountPaise and every
 * other place at the list price. Without a member price those are the same;
 * with one, the member's own place is the one member-priced place and the
 * quote says so (memberPlaceCount, guestUnitAmountPaise). A one-place quote
 * carries no place fields, so it matches what older clients echo.
 */
export function publicCheckoutQuote(
  eventId: string,
  event: EventDocument,
  organizer: OrganizerDocument,
  nowMillis: number,
  hasActiveCommunityMembership = false,
  memberTerms: PublicMemberQuoteTerms | null = null,
  placeCount = 1,
): PublicCheckoutQuote {
  const places = publicBookingPlaces(placeCount);
  assertPublicRegistrationPolicy(event, organizer, "paid", nowMillis,
    hasActiveCommunityMembership);
  if (
    publicRegistrationMode(event) !== "paid" ||
    !Number.isSafeInteger(event.publicRegistrationRevision) ||
    (event.publicRegistrationRevision ?? 0) < 1 ||
    !event.name?.trim()
  ) {
    registrationUnavailable();
  }
  // A member price is the member's own benefit: their place takes it, and
  // each guest's place is an ordinary ticket at the list price.
  const listAmountPaise = event.priceInPaise!;
  const unitAmountPaise = memberTerms?.priceInPaise ?? listAmountPaise;
  const memberParty = memberTerms !== null && places > 1;
  const guestUnitAmountPaise = memberParty ? listAmountPaise : unitAmountPaise;
  const amountPaise = unitAmountPaise + guestUnitAmountPaise * (places - 1);
  if (!Number.isSafeInteger(amountPaise) || amountPaise > 100_000_000) {
    registrationUnavailable("Choose fewer places for one booking.");
  }
  return {
    eventId,
    eventName: event.name,
    registrationRevision: event.publicRegistrationRevision!,
    startTimeMillis: event.startTime.toMillis(),
    amountPaise,
    ...(places > 1 ? {unitAmountPaise, placeCount: places} : {}),
    ...(memberParty ? {memberPlaceCount: 1 as const, guestUnitAmountPaise} :
      {}),
    ...(memberTerms ? {listAmountPaise: memberTerms.listPriceInPaise} : {}),
    currency: "INR",
    cancellationPolicy: eventCancellationPolicy(event),
  };
}

export function assertReviewedPublicQuote(
  reviewed: PublicCheckoutQuote,
  current: PublicCheckoutQuote,
): void {
  if (canonicalJson(reviewed) !== canonicalJson(current)) {
    registrationUnavailable(
      "Event terms changed. Review them before paying.",
    );
  }
}
