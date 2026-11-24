import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import {requireEventPolicyTerms} from "../../events/configuredEvent";
import {eventPolicyFromEvent} from "../../events/eventPolicy";
import {assertUnpartitionedInventory} from "./admissionEligibility";

export type RegistrationMode = "closed" | "free" | "paid";

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
