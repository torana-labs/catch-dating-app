export type PreferenceIntent<T> =
  {mode: "inherit"} |
  {mode: "set"; value: T} |
  {mode: "clear"};

export type CollectionPreference =
  "manualInstructions" | "reusablePage" | "personalRequest" |
  "catchCheckout";

export type AdmissionPreset =
  "openCapacity" | "inviteOnly" | "balancedSingles" |
  "fixedCohortCaps";

/** The cancellation policy paid events start with: flexible refunds up to
 * 24 hours before, standard up to 3 days before, strict never. */
export type RefundPolicy = "flexible" | "standard" | "strict";

/** Who can book. askFirst sends sign-ups to the host for approval. */
export type BookingMode = "anyone" | "followersFirst" | "askFirst";

/**
 * Manager-authorized resolution projection, not an organizer document schema.
 * Public hostDefaults may supply safe fields. Payment instructions, reusable
 * links and message templates require manager-only storage and reads. The
 * adapter must combine authorized inputs under a revision fence; never persist
 * this whole projection into the publicly readable organizer document.
 */
export interface OrganizerEventDefaults {
  revision: number;
  timezone?: string;
  eventPolicy?: {admissionPreset?: AdmissionPreset};
  eventSetup?: {
    usualDurationMinutes?: number;
    preferredVenueId?: string;
    offerValidityMinutes?: number;
    collectionPreference?: CollectionPreference;
    currency?: string;
    offerMessageTemplate?: string;
    paymentInstructions?: string;
    reusablePaymentPage?: {
      url: string;
      reusableForEvents: true;
    };
    bookingMode?: BookingMode;
    startingPriceMinor?: number;
    places?: number;
    waitlistEnabled?: boolean;
    refundPolicy?: RefundPolicy;
    askedAtBooking?: string[];
    autoMessages?: {thankYou: boolean; arrival: boolean};
  };
}

export interface ReusablePaymentPage {
  url: string;
  reusableForEvents: true;
}

export interface EventPreferenceIntents {
  usualDurationMinutes: PreferenceIntent<number>;
  preferredVenueId: PreferenceIntent<string>;
  offerValidityMinutes: PreferenceIntent<number>;
  admissionPreset: PreferenceIntent<AdmissionPreset>;
  collectionPreference: PreferenceIntent<CollectionPreference>;
  currency: PreferenceIntent<string>;
  offerMessageTemplate: PreferenceIntent<string>;
  paymentInstructions: PreferenceIntent<string>;
  reusablePaymentPage: PreferenceIntent<ReusablePaymentPage>;
  /** Event amount never inherits from organizer defaults. */
  expectedAmountMinor: Exclude<PreferenceIntent<number>, {mode: "inherit"}>;
  /** Optional: commands from older clients omit it, and it reads inherit. */
  bookingMode?: PreferenceIntent<BookingMode>;
  /** Optional, like bookingMode. */
  waitlistEnabled?: PreferenceIntent<boolean>;
}

export interface ResolvedPreference<T> {
  value: T | null;
  source: "organizer" | "event" | "cleared";
}

export interface ResolvedEventPreferences {
  defaultsRevision: number;
  defaultsHash: string;
  usualDurationMinutes: ResolvedPreference<number>;
  preferredVenueId: ResolvedPreference<string>;
  offerValidityMinutes: ResolvedPreference<number>;
  admissionPreset: ResolvedPreference<AdmissionPreset>;
  collectionPreference: ResolvedPreference<CollectionPreference>;
  currency: ResolvedPreference<string>;
  offerMessageTemplate: ResolvedPreference<string>;
  paymentInstructions: ResolvedPreference<string>;
  reusablePaymentPage: ResolvedPreference<ReusablePaymentPage>;
  expectedAmountMinor: ResolvedPreference<number>;
  /** Present only when the saving command carried the intent. */
  bookingMode?: ResolvedPreference<BookingMode>;
  waitlistEnabled?: ResolvedPreference<boolean>;
}

export interface EventPaymentTerms {
  /** Revision of this event-local configuration, not organizer defaults. */
  revision: number;
  /** Preference is advisory; it is not provider/account activation. */
  preferredCollection: CollectionPreference | null;
  reusablePaymentPage: ReusablePaymentPage | null;
  paymentInstructions: string | null;
  expectedAmountMinor: number | null;
  currency: string | null;
  offerValidityMinutes: number | null;
  offerMessageTemplate: string | null;
  sourceDefaultsRevision: number;
  sourceDefaultsHash: string;
  fieldSources: Record<string, ResolvedPreference<unknown>["source"]>;
}

export interface OfferPaymentSnapshot {
  eventPaymentRevision: number;
  eventPaymentHash: string;
  reusablePaymentPageUrl: string | null;
  paymentInstructions: string | null;
  expectedAmountMinor: number | null;
  currency: string | null;
  messageTemplate: string | null;
  expiresAtMillis: number;
}

export class EventPreferenceError extends Error {
  constructor(readonly code: "invalid" | "stale" | "incomplete",
    message: string) {
    super(message);
  }
}
