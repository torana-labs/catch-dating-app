/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Public website analytics event for host-visible organizer metrics. The callable validates organizer scope and writes a raw, aggregate-safe event to BigQuery.
 */
export interface RecordOrganizerAnalyticsEventCallablePayload {
  organizerId: string;
  clubId?: string;
  eventId?: string | null;
  eventName:
    | "listingView"
    | "searchAppearance"
    | "eventView"
    | "organizerSave"
    | "eventSave"
    | "contactClick"
    | "claimClick"
    | "outboundClick"
    | "linkClick";
  /**
   * The owner link a linkClick opened, one of the organizer's ownerLinks ids. Other events send null.
   */
  linkId?: string | null;
  /**
   * Where the visitor came from, mapped by the page from its referrer host or ?via= to this fixed list. Raw referrers and campaign values are never sent.
   */
  trafficSource?:
    | "instagram"
    | "whatsapp"
    | "facebook"
    | "google"
    | "qr"
    | "email"
    | "direct"
    | "other"
    | null;
  pagePath: string;
  source?: string | null;
  sessionId?: string | null;
  platform?: string | null;
}
