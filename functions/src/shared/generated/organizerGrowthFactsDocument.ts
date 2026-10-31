/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Server-only growth facts for one organizer: the one acquisition channel set when its listing was made, the first person who nominated it, and the dated steps it reached (listed, claim asked, claimed, first event, first paid booking). Each step is set once, to the earliest time observed, and never edited by hand, so organizer cohorts can be counted from it. Every step is also streamed to BigQuery as an organizer growth event.
 */
export interface OrganizerGrowthFactsDocument {
  schemaVersion: 1;
  organizerId: string;
  marketId: string | null;
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
  /**
   * What decided the channel: the Supply Intake request the listing came from, or, for an organizer created any other way, its provenance.
   */
  channelSource: {
    kind: "supply_intake" | "provenance";
    requestId: string | null;
    originKind: string | null;
    campaign: string | null;
  };
  /**
   * The first person who nominated the organizer, kept for nominator credit (partners, guests and organizers earn it; sales associates do not). Null when nobody nominated it.
   */
  nominator: null | {
    uid: string;
    role: "associate" | "partner" | "guest" | "organizer";
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    nominatedAt: {
      _seconds: number;
      _nanoseconds: number;
    };
  };
  milestones: {
    /**
     * The day the page was published, claimed or not.
     */
    listedAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
    /**
     * The first claim request for the page.
     */
    claimRequestedAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
    /**
     * The day an owner was approved (or set the organizer up themselves).
     */
    claimedAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
    /**
     * The start of the earliest event on Catch with at least one paid or free booking.
     */
    firstEventAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
    /**
     * The capture time of the organizer's first paid booking.
     */
    firstPaidBookingAt: {
      _seconds: number;
      _nanoseconds: number;
    } | null;
  };
  firstEventId: string | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
