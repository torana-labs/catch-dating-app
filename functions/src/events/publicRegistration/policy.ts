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
 * A multi-place quote charges every place the same unit price; a one-place
 * quote carries no place fields, so it matches what older clients echo.
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
  // A member price is the member's own benefit; guests' places have no
  // reviewed price yet, so a member books one place at a time.
  if (memberTerms && places > 1) {
    registrationUnavailable(
      "Member pricing covers one place. Book a single place to use it.");
  }
  const unitAmountPaise = memberTerms?.priceInPaise ?? event.priceInPaise!;
  const amountPaise = unitAmountPaise * places;
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
