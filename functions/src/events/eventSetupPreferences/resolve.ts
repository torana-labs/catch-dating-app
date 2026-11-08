import {createHash} from "crypto";
import {EVENT_MAX_DURATION_MINUTES} from "../../shared/businessRules";
import {
  EventPaymentTerms, EventPreferenceError, EventPreferenceIntents,
  OrganizerEventDefaults, PreferenceIntent, ResolvedEventPreferences,
  ResolvedPreference, ReusablePaymentPage,
} from "./types";

const venueId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const currencyCode = /^[A-Z]{3}$/;
const admission = new Set([
  "openCapacity", "inviteOnly", "balancedSingles", "fixedCohortCaps",
]);
const bookingModes = new Set(["anyone", "followersFirst", "askFirst"]);
const collection = new Set([
  "manualInstructions", "reusablePage", "personalRequest", "catchCheckout",
]);

/** Hashes only recognized defaults; no private credentials enter a snapshot. */
export function organizerEventDefaultsHash(
  defaults: OrganizerEventDefaults
): string {
  validateOrganizerDefaults(defaults);
  return digest({
    revision: defaults.revision,
    timezone: defaults.timezone ?? null,
    admissionPreset: defaults.eventPolicy?.admissionPreset ?? null,
    eventSetup: {
      usualDurationMinutes:
        defaults.eventSetup?.usualDurationMinutes ?? null,
      preferredVenueId: defaults.eventSetup?.preferredVenueId ?? null,
      offerValidityMinutes:
        defaults.eventSetup?.offerValidityMinutes ?? null,
      collectionPreference:
        defaults.eventSetup?.collectionPreference ?? null,
      currency: defaults.eventSetup?.currency ?? null,
      offerMessageTemplate:
        defaults.eventSetup?.offerMessageTemplate ?? null,
      paymentInstructions:
        defaults.eventSetup?.paymentInstructions ?? null,
      reusablePaymentPage:
        copyReusablePage(defaults.eventSetup?.reusablePaymentPage ?? null),
      // Added later: an unset key is left out, so existing hashes hold.
      bookingMode: defaults.eventSetup?.bookingMode,
      startingPriceMinor: defaults.eventSetup?.startingPriceMinor,
      places: defaults.eventSetup?.places,
      waitlistEnabled: defaults.eventSetup?.waitlistEnabled,
      refundPolicy: defaults.eventSetup?.refundPolicy,
      askedAtBooking: defaults.eventSetup?.askedAtBooking,
      autoMessages: defaults.eventSetup?.autoMessages,
    },
  });
}

/** Pure three-state resolution; a cleared field never re-inherits. */
export function resolveEventPreferences(input: {
  defaults: OrganizerEventDefaults;
  intents: EventPreferenceIntents;
  reviewedDefaultsHash: string;
}): ResolvedEventPreferences {
  const {defaults, intents} = input;
  const defaultsHash = organizerEventDefaultsHash(defaults);
  if (input.reviewedDefaultsHash !== defaultsHash) {
    throw new EventPreferenceError("stale",
      "Organizer defaults changed. Review them before saving.");
  }
  const setup = defaults.eventSetup ?? {};
  if ((intents.expectedAmountMinor as {mode: string})?.mode === "inherit") {
    invalid("Expected amount must be chosen for this event.");
  }
  const resolved: ResolvedEventPreferences = {
    defaultsRevision: defaults.revision,
    defaultsHash,
    usualDurationMinutes: resolve(intents.usualDurationMinutes,
      setup.usualDurationMinutes),
    preferredVenueId: resolve(intents.preferredVenueId,
      setup.preferredVenueId),
    offerValidityMinutes: resolve(intents.offerValidityMinutes,
      setup.offerValidityMinutes),
    admissionPreset: resolve(intents.admissionPreset,
      defaults.eventPolicy?.admissionPreset),
    collectionPreference: resolve(intents.collectionPreference,
      setup.collectionPreference),
    currency: resolve(intents.currency, setup.currency),
    offerMessageTemplate: resolve(intents.offerMessageTemplate,
      setup.offerMessageTemplate),
    paymentInstructions: resolve(intents.paymentInstructions,
      setup.paymentInstructions),
    reusablePaymentPage: resolve(intents.reusablePaymentPage,
      setup.reusablePaymentPage),
    expectedAmountMinor: resolve(intents.expectedAmountMinor, undefined),
  };
  // Optional intents appear once chosen here or set as an organizer default,
  // so events of organizers who never used them keep the original shape.
  if (intents.bookingMode !== undefined || setup.bookingMode !== undefined) {
    resolved.bookingMode = resolve(intents.bookingMode ?? {mode: "inherit"},
      setup.bookingMode);
  }
  validateResolved(resolved);
  resolved.reusablePaymentPage = {...resolved.reusablePaymentPage,
    value: copyReusablePage(resolved.reusablePaymentPage.value)};
  return resolved;
}

/** Immutable event-local draft; it cannot activate payment capabilities. */
export function eventPaymentTermsFromPreferences(
  preferences: ResolvedEventPreferences,
  revision: number
): EventPaymentTerms {
  requireInteger(revision, 1, 1_000_000_000, "Event payment revision");
  validateResolved(preferences);
  return {
    revision,
    preferredCollection: preferences.collectionPreference.value,
    reusablePaymentPage: copyReusablePage(
      preferences.reusablePaymentPage.value),
    paymentInstructions: preferences.paymentInstructions.value,
    expectedAmountMinor: preferences.expectedAmountMinor.value,
    currency: preferences.currency.value,
    offerValidityMinutes: preferences.offerValidityMinutes.value,
    offerMessageTemplate: preferences.offerMessageTemplate.value,
    sourceDefaultsRevision: preferences.defaultsRevision,
    sourceDefaultsHash: preferences.defaultsHash,
    fieldSources: {
      preferredCollection: preferences.collectionPreference.source,
      reusablePaymentPage: preferences.reusablePaymentPage.source,
      paymentInstructions: preferences.paymentInstructions.source,
      expectedAmountMinor: preferences.expectedAmountMinor.source,
      currency: preferences.currency.source,
      offerValidityMinutes: preferences.offerValidityMinutes.source,
      offerMessageTemplate: preferences.offerMessageTemplate.source,
    },
  };
}

export function eventPaymentTermsHash(terms: EventPaymentTerms): string {
  validateEventPaymentTerms(terms);
  return digest(terms);
}

export function validateEventPaymentTerms(terms: EventPaymentTerms): void {
  requireInteger(terms.revision, 1, 1_000_000_000,
    "Event payment revision");
  requireInteger(terms.sourceDefaultsRevision, 0, 1_000_000_000,
    "Source defaults revision");
  validateValues({
    usualDurationMinutes: null,
    preferredVenueId: null,
    offerValidityMinutes: terms.offerValidityMinutes,
    admissionPreset: null,
    collectionPreference: terms.preferredCollection,
    currency: terms.currency,
    offerMessageTemplate: terms.offerMessageTemplate,
    paymentInstructions: terms.paymentInstructions,
    reusablePaymentPage: terms.reusablePaymentPage,
    expectedAmountMinor: terms.expectedAmountMinor,
  });
}

function resolve<T>(intent: PreferenceIntent<T>, inherited: T | undefined):
  ResolvedPreference<T> {
  if (!intent || typeof intent !== "object") invalid("Missing intent.");
  switch (intent.mode) {
  case "inherit":
    return {value: inherited ?? null, source: "organizer"};
  case "set":
    if (intent.value === undefined || intent.value === null) {
      invalid("Set requires a value.");
    }
    return {value: intent.value, source: "event"};
  case "clear":
    return {value: null, source: "cleared"};
  default:
    return invalid("Unknown intent.");
  }
}

function validateOrganizerDefaults(defaults: OrganizerEventDefaults): void {
  requireInteger(defaults.revision, 0, 1_000_000_000,
    "Organizer defaults revision");
  if (defaults.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en", {timeZone: defaults.timezone});
    } catch {
      invalid("Invalid organizer timezone.");
    }
  }
  const setup = defaults.eventSetup;
  validateBookingMode(setup?.bookingMode ?? null);
  validateBoardDefaults(setup);
  validateValues({
    usualDurationMinutes: setup?.usualDurationMinutes ?? null,
    preferredVenueId: setup?.preferredVenueId ?? null,
    offerValidityMinutes: setup?.offerValidityMinutes ?? null,
    admissionPreset: defaults.eventPolicy?.admissionPreset ?? null,
    collectionPreference: setup?.collectionPreference ?? null,
    currency: setup?.currency ?? null,
    offerMessageTemplate: setup?.offerMessageTemplate ?? null,
    paymentInstructions: setup?.paymentInstructions ?? null,
    reusablePaymentPage: setup?.reusablePaymentPage ?? null,
    expectedAmountMinor: null,
  });
}

function validateResolved(value: ResolvedEventPreferences): void {
  validateBookingMode(value.bookingMode?.value ?? null);
  validateValues({
    usualDurationMinutes: value.usualDurationMinutes.value,
    preferredVenueId: value.preferredVenueId.value,
    offerValidityMinutes: value.offerValidityMinutes.value,
    admissionPreset: value.admissionPreset.value,
    collectionPreference: value.collectionPreference.value,
    currency: value.currency.value,
    offerMessageTemplate: value.offerMessageTemplate.value,
    paymentInstructions: value.paymentInstructions.value,
    reusablePaymentPage: value.reusablePaymentPage.value,
    expectedAmountMinor: value.expectedAmountMinor.value,
  });
}

function validateValues(value: {
  usualDurationMinutes: number | null;
  preferredVenueId: string | null;
  offerValidityMinutes: number | null;
  admissionPreset: string | null;
  collectionPreference: string | null;
  currency: string | null;
  offerMessageTemplate: string | null;
  paymentInstructions: string | null;
  reusablePaymentPage: ReusablePaymentPage | null;
  expectedAmountMinor: number | null;
}): void {
  if (value.usualDurationMinutes !== null) {
    requireInteger(value.usualDurationMinutes, 15,
      EVENT_MAX_DURATION_MINUTES,
      "Usual duration");
  }
  if (value.preferredVenueId !== null &&
      !venueId.test(value.preferredVenueId)) invalid("Invalid venue ID.");
  if (value.offerValidityMinutes !== null) {
    requireInteger(value.offerValidityMinutes, 5, 10080,
      "Offer validity");
  }
  if (value.admissionPreset !== null &&
      !admission.has(value.admissionPreset)) {
    invalid("Invalid admission preset.");
  }
  if (value.collectionPreference !== null &&
      !collection.has(value.collectionPreference)) {
    invalid("Invalid collection preference.");
  }
  if (value.currency !== null &&
      !currencyCode.test(value.currency)) invalid("Invalid currency.");
  if (value.expectedAmountMinor !== null) {
    requireInteger(value.expectedAmountMinor, 0, 100_000_000,
      "Expected amount");
    if (value.currency === null) invalid("An amount requires currency.");
  }
  if (value.offerMessageTemplate !== null) {
    boundedText(value.offerMessageTemplate, 1, 1000, "Offer message");
  }
  if (value.paymentInstructions !== null) {
    boundedText(value.paymentInstructions, 1, 1000,
      "Payment instructions");
  }
  if (value.reusablePaymentPage !== null) {
    validateReusablePage(value.reusablePaymentPage);
  }
}

const refundPolicies = new Set(["flexible", "standard", "strict"]);

/** The defaults the event boards added; each is optional. */
function validateBoardDefaults(setup: OrganizerEventDefaults["eventSetup"]):
  void {
  if (setup?.startingPriceMinor !== undefined) {
    requireInteger(setup.startingPriceMinor, 0, 100_000_000,
      "Starting price");
  }
  if (setup?.places !== undefined) {
    requireInteger(setup.places, 1, 1000, "Places");
  }
  if (setup?.waitlistEnabled !== undefined &&
      typeof setup.waitlistEnabled !== "boolean") invalid("Invalid waitlist.");
  if (setup?.refundPolicy !== undefined &&
      !refundPolicies.has(setup.refundPolicy)) invalid("Invalid refunds.");
  const questions = setup?.askedAtBooking;
  if (questions !== undefined && (!Array.isArray(questions) ||
      questions.length > 20 || new Set(questions).size !== questions.length ||
      questions.some((id) => typeof id !== "string" || !venueId.test(id)))) {
    invalid("Invalid booking questions.");
  }
  const messages = setup?.autoMessages;
  if (messages !== undefined && (typeof messages !== "object" ||
      messages === null || Object.keys(messages).length !== 2 ||
      typeof messages.thankYou !== "boolean" ||
      typeof messages.arrival !== "boolean")) {
    invalid("Invalid automatic messages.");
  }
}

function validateBookingMode(value: string | null): void {
  if (value !== null && !bookingModes.has(value)) {
    invalid("Invalid booking mode.");
  }
}

function copyReusablePage(page: ReusablePaymentPage | null):
  ReusablePaymentPage | null {
  return page === null ? null : {url: page.url, reusableForEvents: true};
}

function validateReusablePage(page: ReusablePaymentPage): void {
  if (page.reusableForEvents !== true) {
    invalid("Payment page must be explicitly reusable for events.");
  }
  if (typeof page.url !== "string" || page.url.length > 2048) {
    invalid("Invalid reusable payment page.");
  }
  let url: URL;
  try {
    url = new URL(page.url);
  } catch {
    return invalid("Invalid reusable payment page URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hostname === "localhost" || !url.hostname.includes(".") ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) ||
      url.hostname.startsWith("[") || url.toString() !== page.url) {
    invalid("Use a canonical public HTTPS payment page.");
  }
}

function boundedText(value: string, min: number, max: number,
  label: string): void {
  if (typeof value !== "string" || value.trim().length < min ||
      value.length > max) invalid(`Invalid ${label}.`);
}

function requireInteger(value: number, min: number, max: number,
  label: string): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    invalid(`Invalid ${label}.`);
  }
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort()
      .filter((key) => object[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function invalid(message: string): never {
  throw new EventPreferenceError("invalid", message);
}
