import type {
  AdminGetOrganizerOverviewCallableResponse,
} from "../../shared/generated/adminGetOrganizerOverviewCallableResponse";
import type {
  EventDocument,
  OrganizerClaimRequestDocument,
  OrganizerDocument,
  SupplyIntakeRequestsDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {timestampIso, timestampMillis} from "../../shared/dates";
import {catchEventTitle} from "../../shared/eventLabels";

/**
 * An organizer's journey, read from the records each step already leaves:
 * nomination, listing, claims, the first event and the first paid booking.
 * The Admin organizer Overview and the host's own journey both show it.
 */
export type JourneyStep =
  AdminGetOrganizerOverviewCallableResponse["journey"][number];

/**
 * The organizer's steps, oldest first. A step without its own time keeps
 * its place after the step before it.
 * @param {object} input Records the steps are read from.
 * @return {JourneyStep[]} Journey.
 */
export function journeyOf(input: {
  organizer: Partial<OrganizerDocument>;
  nomination: Partial<SupplyIntakeRequestsDocument> | null;
  claims: Array<Partial<OrganizerClaimRequestDocument>>;
  firstEvent: Partial<EventDocument> | undefined;
  firstPaidBookingAt: unknown;
  names: Map<string, string>;
}): JourneyStep[] {
  const {organizer, nomination, claims, firstEvent, firstPaidBookingAt,
    names} = input;
  const steps: JourneyStep[] = [];
  const step = (kind: JourneyStep["kind"], at: unknown,
    actorName: string | null = null, detail: string | null = null) =>
    steps.push({kind, at: timestampIso(at), actorName, detail});

  if (nomination?.request) {
    const submitter = nomination.request.submittedBy;
    step("nominated", nomination.request.submittedAt,
      submitter?.uid ? names.get(submitter.uid) ?? null : null,
      (nomination.request.seed?.urls as string[] | undefined)?.[0] ?? null);
    if (nomination.result) {
      step("listingBuilt", null, null, String(nomination.result.eventCount));
    }
    if (nomination.approval) {
      step("approved", nomination.approval.approvedAt,
        names.get(nomination.approval.approvedByUid) ?? null);
    }
  }
  step("listed", organizer.createdAt);
  const byCreation = [...claims].sort((a, b) =>
    (timestampMillis(a.createdAt) ?? 0) - (timestampMillis(b.createdAt) ?? 0));
  for (const claim of byCreation) {
    const requester = claim.requesterName?.trim() || null;
    step("claimRequested", claim.createdAt, requester,
      claim.requesterRole ?? null);
    if (claim.status === "approved" || claim.status === "rejected") {
      step(claim.status === "approved" ? "claimApproved" : "claimRejected",
        claim.decidedAt, null, claim.decisionReason?.trim() || null);
    }
  }
  if (organizer.ownership?.claimedAt) {
    step("claimed", organizer.ownership.claimedAt,
      organizer.hostName?.trim() || null);
  }
  if (firstEvent) {
    step("firstEvent", firstEvent.startTime, null, catchEventTitle(firstEvent));
  }
  if (firstPaidBookingAt) step("firstPaidBooking", firstPaidBookingAt);

  let previous = -Infinity;
  return steps
    .map((item, index) => {
      const millis = item.at ? Date.parse(item.at) : null;
      previous = millis ?? previous;
      return {item, order: millis ?? previous, index};
    })
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({item}) => item);
}
