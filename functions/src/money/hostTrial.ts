import type {CommercialTerms} from "../commercialTerms/terms";
import type {OrganizerGrowthFactsDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * The host's free trial, computed on the server from Catch's own records.
 *
 * The owner's 30 Oct terms start the trial at the organizer's first event
 * (`trial.anchor: firstEvent`). `organizerGrowthFacts` records that as the
 * start time of the first non-cancelled event with a booking. A paid booking
 * with no recorded event dates the trial instead, as monthly bills already did.
 * Nothing gates features when the trial ends; the next billing cycle is
 * simply billed.
 */
export const dayMillis = 24 * 60 * 60 * 1000;

export type TrialState =
  /** No event or paid booking yet: the trial has not started. */
  "notStarted" |
  /** The first event is booked but has not started yet. */
  "scheduled" |
  "active" |
  "ended" |
  /** The terms give no trial (zero days). */
  "none" |
  /** Catch's platform terms are not saved, so the trial length is unknown. */
  "unconfigured";

export interface TrialStatus {
  state: TrialState;
  anchor: "firstEvent" | "firstPaidBooking" | null;
  days: number | null;
  startsAtMillis: number | null;
  endsAtMillis: number | null;
  /** Whole days left, rounded up, while scheduled or active; else null. */
  daysLeft: number | null;
}

export interface TrialAnchors {
  firstEventAtMillis: number | null;
  firstPaidBookingAtMillis: number | null;
}

/**
 * Reads the trial anchors from the organizer's growth facts.
 * @param {OrganizerGrowthFactsDocument|undefined} facts Growth facts.
 * @return {TrialAnchors} First event and first paid booking.
 */
export function trialAnchorsFromFacts(
  facts: OrganizerGrowthFactsDocument | undefined): TrialAnchors {
  return {
    firstEventAtMillis: facts?.milestones.firstEventAt?.toMillis() ?? null,
    firstPaidBookingAtMillis:
      facts?.milestones.firstPaidBookingAt?.toMillis() ?? null,
  };
}

/**
 * When the trial starts and ends, or null when it has not started. The first
 * event wins over the first paid booking.
 * @param {TrialAnchors} anchors Growth-fact anchors.
 * @param {number} trialDays Trial length from the effective terms.
 * @return {object|null} Anchor kind, start and end.
 */
export function trialWindow(anchors: TrialAnchors, trialDays: number):
  {anchor: "firstEvent" | "firstPaidBooking"; startsAtMillis: number;
    endsAtMillis: number} | null {
  const anchor = anchors.firstEventAtMillis !== null ? "firstEvent" :
    anchors.firstPaidBookingAtMillis !== null ? "firstPaidBooking" : null;
  if (anchor === null) return null;
  const startsAtMillis = anchor === "firstEvent" ?
    anchors.firstEventAtMillis! : anchors.firstPaidBookingAtMillis!;
  return {anchor, startsAtMillis,
    endsAtMillis: startsAtMillis + Math.max(0, trialDays) * dayMillis};
}

/**
 * The trial as the host and Catch's staff see it.
 * @param {object} input Anchors, effective terms (null while unset) and now.
 * @return {TrialStatus} Trial status.
 */
export function computeTrialStatus(input: {
  anchors: TrialAnchors;
  terms: Pick<CommercialTerms, "trial"> | null;
  nowMillis: number;
}): TrialStatus {
  const {terms, nowMillis} = input;
  if (!terms) {
    return {state: "unconfigured", anchor: null, days: null,
      startsAtMillis: null, endsAtMillis: null, daysLeft: null};
  }
  const days = terms.trial.days;
  const window = trialWindow(input.anchors, days);
  if (!window) {
    return {state: days > 0 ? "notStarted" : "none", anchor: null, days,
      startsAtMillis: null, endsAtMillis: null, daysLeft: null};
  }
  const base = {anchor: window.anchor, days,
    startsAtMillis: window.startsAtMillis, endsAtMillis: window.endsAtMillis};
  if (days <= 0) return {...base, state: "none", daysLeft: null};
  if (nowMillis >= window.endsAtMillis) {
    return {...base, state: "ended", daysLeft: null};
  }
  const daysLeft = Math.ceil((window.endsAtMillis -
    Math.max(nowMillis, window.startsAtMillis)) / dayMillis);
  return {...base, state: nowMillis < window.startsAtMillis ? "scheduled" :
    "active", daysLeft};
}
