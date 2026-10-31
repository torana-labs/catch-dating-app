/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One dated fact about an organizer, streamed to catch_analytics.organizer_growth_events so cohorts, channels and ticket sales can be counted. Steps (listed, claim_requested, claimed, first_event, first_paid_booking) mirror organizerGrowthFacts and appear once per organizer; paid_booking and refund appear once per payment. The insert id is the growth event id, and readers count distinct ids, so a retried insert never counts twice.
 */
export interface OrganizerGrowthEvent {
  growth_event_id: string;
  organizer_id: string;
  event_name:
    | "listed"
    | "claim_requested"
    | "claimed"
    | "first_event"
    | "first_paid_booking"
    | "paid_booking"
    | "refund";
  occurred_at: string;
  event_date: string;
  /**
   * Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.
   */
  channel:
    | "imported"
    | "sales_associate"
    | "partner"
    | "guest"
    | "organizer"
    | "came_to_us"
    | "ads";
  market_id: string | null;
  nominator_role?: "associate" | "partner" | "guest" | "organizer" | null;
  booking_event_id?: string | null;
  /**
   * The payment record collection a paid_booking or refund came from.
   */
  payment_source?:
    | "payments"
    | "publicEventPayments"
    | "organizerEventOfferPayments"
    | null;
  payment_id?: string | null;
  currency?: string | null;
  amount_minor?: number | null;
  provider_fee_minor?: number | null;
  provider_tax_minor?: number | null;
  ingested_at: string;
}
