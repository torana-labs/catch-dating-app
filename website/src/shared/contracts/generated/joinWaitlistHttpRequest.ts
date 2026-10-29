/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Version 1 request body for member waitlist and optional Host operating-application submissions. A member may instead ask for one WhatsApp message when Catch opens in their city: that path carries `whatsapp` and needs no name or email.
 */
export interface JoinWaitlistHTTPRequest {
  hostMeasurement?: {
    capability: string;
    clientId: string;
    fbclid?: string;
    clickCapturedAt?: number;
  };
  fullName?: string;
  email?: string;
  city: string;
  role: "member" | "runner" | "host" | "both";
  instagram?: string;
  website?: string;
  hostApplication?: {
    organizationName?: string;
    organizationType?: string;
    operatingCity?: string;
    communityLink?: string;
    /**
     * @maxItems 10
     */
    formats?: string[];
    eventCadence?: string;
    nextEventName?: string;
    nextEventDate?: string;
    eventLocation?: string;
    expectedCapacity?: string;
    bookingPlatform?: string;
    guestListFormat?: string;
    priceRange?: string;
    admissionModel?: string;
    waitlistPlan?: string;
    paymentReadiness?: string;
    /**
     * @maxItems 16
     */
    eventSuccessModules?: string[];
    hostGoals?: string;
    operatingNotes?: string;
    eventPricing?: "paid" | "free" | "mixed" | "undecided";
  };
  attribution?: {
    firstTouch: {
      capturedAt: string;
      landingPath: string;
      landingUrl: string;
      referrer: string | null;
      values: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
        utm_term?: string;
        gclid?: string;
        gbraid?: string;
        wbraid?: string;
        fbclid?: string;
        ttclid?: string;
        msclkid?: string;
        li_fat_id?: string;
        rdt_cid?: string;
      };
    };
    lastTouch: {
      capturedAt: string;
      landingPath: string;
      landingUrl: string;
      referrer: string | null;
      values: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
        utm_term?: string;
        gclid?: string;
        gbraid?: string;
        wbraid?: string;
        fbclid?: string;
        ttclid?: string;
        msclkid?: string;
        li_fat_id?: string;
        rdt_cid?: string;
      };
    };
  } | null;
  analytics?: {
    consent: {
      choice: "accepted" | "analytics" | "essential";
      analytics: boolean;
      marketing: boolean;
      updatedAt: string;
    } | null;
    eventId: string;
    formVariant: "member" | "host";
    pagePath: string;
    pageTitle: string;
    submittedAt: string;
  };
  /**
   * A member's request for one WhatsApp message on the day Catch opens in their city. The launch notice is the explicit purpose of the form; marketing permission is a separate choice that is off unless the person chose it (CAT-72). consentVersion names the wording they saw.
   */
  whatsapp?: {
    /**
     * E.164 mobile number.
     */
    phone: string;
    launchNotice: true;
    marketing: boolean;
    consentVersion: string;
  };
}
