import {
  EventPaymentTerms, EventPreferenceError, OfferPaymentSnapshot,
} from "./types";
import {
  canonicalJson, eventPaymentTermsHash, validateEventPaymentTerms,
} from "./resolve";

/** Freezes event-local terms for one explicit offer, never for admission. */
export function snapshotOfferPaymentTerms(input: {
  terms: EventPaymentTerms;
  nowMillis: number;
  eventStartsAtMillis: number;
  /** Server integration opt-in, never a caller-supplied preference. */
  allowCatchCheckout?: boolean;
}): OfferPaymentSnapshot {
  const {terms, nowMillis, eventStartsAtMillis} = input;
  if (!Number.isSafeInteger(nowMillis) ||
      !Number.isSafeInteger(eventStartsAtMillis) ||
      nowMillis >= eventStartsAtMillis) {
    throw new EventPreferenceError("incomplete",
      "The event has started or has no valid start time.");
  }
  const validity = terms.offerValidityMinutes;
  if (!Number.isSafeInteger(validity) || validity === null ||
      validity < 5 || validity > 10080) {
    throw new EventPreferenceError("incomplete",
      "Choose offer validity before recording an offer.");
  }
  const expiresAtMillis = Math.min(
    nowMillis + validity * 60_000, eventStartsAtMillis
  );
  if (!Number.isSafeInteger(expiresAtMillis) ||
      expiresAtMillis <= nowMillis) {
    throw new EventPreferenceError("incomplete",
      "Offer expiry must precede the event.");
  }
  if (terms.expectedAmountMinor !== null &&
      terms.expectedAmountMinor > 0 && !terms.preferredCollection) {
    throw new EventPreferenceError("incomplete",
      "Choose how the expected amount will be collected.");
  }
  let reusablePaymentPageUrl: string | null = null;
  switch (terms.preferredCollection) {
  case "reusablePage":
    if (!terms.reusablePaymentPage?.reusableForEvents) {
      throw new EventPreferenceError("incomplete",
        "Choose an explicitly reusable event payment page.");
    }
    reusablePaymentPageUrl = terms.reusablePaymentPage.url;
    break;
  case "manualInstructions":
    if (!terms.paymentInstructions) {
      throw new EventPreferenceError("incomplete",
        "Enter payment instructions for this event.");
    }
    break;
  case "personalRequest":
    throw new EventPreferenceError("incomplete",
      "Create a recipient-bound request for this person first.");
  case "catchCheckout":
    if (!input.allowCatchCheckout || terms.currency !== "INR" ||
        !Number.isSafeInteger(terms.expectedAmountMinor) ||
        terms.expectedAmountMinor === null || terms.expectedAmountMinor < 100) {
      throw new EventPreferenceError("incomplete",
        "Catch checkout needs a supported amount and verified integration.");
    }
    break;
  }
  return {
    eventPaymentRevision: terms.revision,
    eventPaymentHash: eventPaymentTermsHash(terms),
    reusablePaymentPageUrl,
    paymentInstructions: terms.paymentInstructions,
    expectedAmountMinor: terms.expectedAmountMinor,
    currency: terms.currency,
    messageTemplate: terms.offerMessageTemplate,
    expiresAtMillis,
  };
}

export interface PaymentChangePreview {
  changedFields: string[];
  candidateRevision: number;
  priorOfferCount: number;
  existingOffersKeepOriginalTerms: true;
  requiresOfferReview: boolean;
}

/** Preview only. Persisting terms and reissuing offers are separate actions. */
export function previewEventPaymentChange(input: {
  current: EventPaymentTerms;
  candidate: EventPaymentTerms;
  expectedRevision: number;
  existingOffers: readonly OfferPaymentSnapshot[];
}): PaymentChangePreview {
  const {current, candidate, expectedRevision, existingOffers} = input;
  validateEventPaymentTerms(current);
  validateEventPaymentTerms(candidate);
  if (current.revision !== expectedRevision ||
      candidate.revision !== current.revision + 1) {
    throw new EventPreferenceError("stale",
      "Event payment settings changed. Reload before saving.");
  }
  const fields = [
    "preferredCollection", "reusablePaymentPage", "paymentInstructions",
    "expectedAmountMinor", "currency", "offerValidityMinutes",
    "offerMessageTemplate",
  ] as const;
  const changedFields = fields.filter((field) =>
    canonicalJson(current[field]) !== canonicalJson(candidate[field]));
  return {
    changedFields,
    candidateRevision: candidate.revision,
    priorOfferCount: existingOffers.length,
    existingOffersKeepOriginalTerms: true,
    requiresOfferReview: changedFields.length > 0 &&
      existingOffers.length > 0,
  };
}
