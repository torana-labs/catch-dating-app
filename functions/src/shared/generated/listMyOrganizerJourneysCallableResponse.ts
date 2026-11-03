/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * How a page got here, as its organizer sees it. Staff names, who nominated it, recommendations and decision reasons stay with Catch's staff, and someone else's claim is left out.
 */
export interface ListMyOrganizerJourneysCallableResponse {
  /**
   * @maxItems 5
   */
  journeys: {
    organizerId: string;
    organizerName: string;
    /**
     * The caller's own claim is still being checked.
     */
    waitingClaim: boolean;
    /**
     * @maxItems 40
     */
    steps: {
      kind:
        | "nominated"
        | "listed"
        | "claimRequested"
        | "claimRejected"
        | "claimed"
        | "firstEvent"
        | "firstPaidBooking";
      atMillis: number | null;
      /**
       * nominated: the link the page was built from. firstEvent: the event's name.
       */
      detail: string | null;
    }[];
    /**
     * What comes next; null once the organizer has run an event.
     */
    next: "runYourPage" | "firstEvent" | null;
  }[];
}
