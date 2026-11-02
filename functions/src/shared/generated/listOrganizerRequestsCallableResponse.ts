/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * People waiting across an organizer's coming events, soonest event first and oldest ask first within an event. complete is false when the bounded read left people out. Anyone with a block either way with the caller is left out.
 */
export interface ListOrganizerRequestsCallableResponse {
  complete: boolean;
  /**
   * @maxItems 100
   */
  rows: {
    uid: string;
    /**
     * request: the host lets them in or declines. waitlist: the host can offer a spot.
     */
    kind: "request" | "waitlist";
    eventId: string;
    eventName: string;
    eventStartMillis: number;
    placesLeft: number;
    capacityLimit: number;
    name: string | null;
    askedAtMillis: number | null;
    /**
     * Their place on this event's waitlist; null for a request.
     */
    waitlistPosition: number | null;
    /**
     * Events they came to with this organizer; null when no contact is linked to them yet.
     */
    attendedEventCount: number | null;
    /**
     * When a live waitlist offer runs out; null when none is live.
     */
    offerExpiresAtMillis: number | null;
  }[];
}
