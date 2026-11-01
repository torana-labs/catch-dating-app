import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  type GrowthDeps,
  type ObservedMilestones,
  recordOrganizerMilestones,
} from "./organizerGrowthFacts";

/**
 * The growth triggers run once and are not retried, so a trigger that
 * failed leaves a step unrecorded. Each night this recomputes every step
 * from its source records and records any that are missing or earlier.
 * Steps keep the earliest time, so a rerun changes nothing. Claimed, claim
 * asked, first event and first paid booking are exact; listed falls back
 * to the organizer's creation time, the earliest it can have been.
 */
type Raw = Record<string, unknown>;
const sourceLimit = 10_000;

const millis = (value: unknown) => value instanceof Timestamp ?
  value.toMillis() : null;

/**
 * Earliest observed steps per organizer from source records.
 * @param {object} sources Organizer, claim request, event and payment rows.
 * @return {Map<string, object>} Steps and first event per organizer.
 */
export function milestonesFromSources(sources: {
  organizers: Array<{id: string; data: Raw}>;
  claimRequests: Raw[];
  events: Array<{id: string; data: Raw}>;
  payments: Raw[];
}): Map<string, {observed: ObservedMilestones; firstEventId: string | null}> {
  const result = new Map<string, {observed: ObservedMilestones;
    firstEventId: string | null}>();
  const entry = (organizerId: string) => {
    const current = result.get(organizerId) ??
      {observed: {}, firstEventId: null};
    result.set(organizerId, current);
    return current;
  };
  const earliest = (organizerId: string, key: keyof ObservedMilestones,
    at: number | null, eventId?: string) => {
    if (at === null) return;
    const current = entry(organizerId);
    const known = current.observed[key]?.toMillis();
    if (known !== undefined && known <= at) return;
    current.observed[key] = Timestamp.fromMillis(at);
    if (eventId) current.firstEventId = eventId;
  };
  for (const {id, data} of sources.organizers) {
    const page = data.publicPage as Raw | undefined;
    const ownership = data.ownership as Raw | undefined;
    if (page?.publishStatus === "published") {
      earliest(id, "listedAt", millis(data.createdAt));
    }
    if (["claimed", "transferred", "userCreated"]
      .includes(String(ownership?.state))) {
      earliest(id, "claimedAt", millis(ownership?.claimedAt) ??
        millis(data.createdAt));
    }
  }
  for (const request of sources.claimRequests) {
    if (typeof request.organizerId === "string") {
      earliest(request.organizerId, "claimRequestedAt",
        millis(request.createdAt));
    }
  }
  for (const {id, data} of sources.events) {
    if (typeof data.organizerId === "string" && data.status !== "cancelled" &&
        Number(data.bookedCount) > 0) {
      earliest(data.organizerId, "firstEventAt", millis(data.startTime), id);
    }
  }
  for (const payment of sources.payments) {
    if (typeof payment.organizerId === "string") {
      earliest(payment.organizerId, "firstPaidBookingAt",
        millis(payment.capturedAt));
    }
  }
  return result;
}

/**
 * Reads the sources and records every step the facts are missing.
 * @param {GrowthDeps} deps Firestore and BigQuery.
 * @return {Promise<number>} Organizers whose facts moved.
 */
export async function reconcileOrganizerGrowth(deps: GrowthDeps):
  Promise<number> {
  const {db} = deps;
  const rows = (snap: FirebaseFirestore.QuerySnapshot) =>
    snap.docs.map((doc) => ({id: doc.id, data: doc.data()}));
  const [organizers, claimRequests, events, publicPayments, offerPayments] =
    await Promise.all([
      db.collection("organizers").limit(sourceLimit).get(),
      db.collection("organizerClaimRequests").limit(sourceLimit).get(),
      db.collection("events").where("bookedCount", ">", 0)
        .limit(sourceLimit).get(),
      db.collection("publicEventPayments").where("capturedAt", "!=", null)
        .limit(sourceLimit).get(),
      db.collection("organizerEventOfferPayments")
        .where("capturedAt", "!=", null).limit(sourceLimit).get(),
    ]);
  const steps = milestonesFromSources({organizers: rows(organizers),
    claimRequests: claimRequests.docs.map((doc) => doc.data()),
    events: rows(events),
    payments: [...publicPayments.docs, ...offerPayments.docs]
      .map((doc) => doc.data())});
  let moved = 0;
  for (const [organizerId, {observed, firstEventId}] of steps) {
    try {
      const changed = await recordOrganizerMilestones(deps, organizerId,
        observed, firstEventId);
      if (changed.length) moved++;
    } catch (error) {
      logger.warn("Organizer growth reconcile skipped an organizer.", {
        organizerId,
        error: error instanceof Error ? error.message : String(error)});
    }
  }
  return moved;
}

export const reconcileOrganizerGrowthDaily = onSchedule({
  schedule: "40 3 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 540,
  maxInstances: 1,
}, async () => {
  const moved = await reconcileOrganizerGrowth({db: admin.firestore()});
  logger.info("Organizer growth facts reconciled.", {moved});
});
