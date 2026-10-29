/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Raw aggregate-safe BigQuery event for host-visible organizer analytics. This is the source event table for discovery metrics; Firestore must not be the source of truth for these counters.
 */
export interface HostAnalyticsEvent {
  analytics_event_id: string;
  occurred_at: string;
  event_date: string;
  event_name:
    | "listingView"
    | "searchAppearance"
    | "eventView"
    | "organizerSave"
    | "eventSave"
    | "contactClick"
    | "claimClick"
    | "outboundClick"
    | "linkClick";
  club_id: string;
  target_event_id?: string | null;
  page_path: string;
  source?: string | null;
  session_hash?: string | null;
  platform?: string | null;
  /**
   * The owner link a linkClick opened; null for other events.
   */
  link_id?: string | null;
  /**
   * Where the visitor came from, mapped by the page from its referrer host or ?via= to this fixed list. Raw referrers and campaign values are never sent.
   */
  traffic_source?:
    | "instagram"
    | "whatsapp"
    | "facebook"
    | "google"
    | "qr"
    | "email"
    | "direct"
    | "other"
    | null;
  ingested_at: string;
}
