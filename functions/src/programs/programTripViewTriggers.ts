import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {
  reconcileProgramHotelInboundView,
  reconcileProgramTripView,
} from "./programTripViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 600;

type Data = FirebaseFirestore.DocumentData | undefined;

const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(fields.map((f) => before[f] ?? null),
    fields.map((f) => after[f] ?? null));

/** A trip's creation, arrival, cancellation or void. */
export const onProgramTripViewChanged = onDocumentWritten({
  ...options, document: "transportTrips/{tripId}",
}, (event) => reconcileProgramTripView(admin.firestore(),
  event.params.tripId));

/** A journey's readiness, hotel or timing: its hotel inbound row. */
export const onProgramHotelInboundLegChanged = onDocumentWritten({
  ...options, document: "programTravelLegs/{legId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["kind", "readiness", "destinationHotelId",
    "partyId", "guestId", "passengers", "flightNumber", "flightStatus",
    "scheduledArrivalAt", "estimatedArrivalAt", "actualArrivalAt",
    "manualCurbAt", "readyAt", "international"])) return;
  await reconcileProgramHotelInboundView(admin.firestore(),
    event.params.legId);
});

/** A party's label or members: its journeys' hotel inbound rows. */
export const onProgramHotelInboundPartyChanged = onDocumentWritten({
  ...options, document: "programTravelParties/{partyId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["label", "legIds"])) return;
  const db = admin.firestore();
  const legs = await db.collection("programTravelLegs")
    .where("partyId", "==", event.params.partyId).limit(fanoutLimit).get();
  for (const doc of legs.docs) {
    await reconcileProgramHotelInboundView(db, doc.id);
  }
});

/**
 * A guest's name: the hotel inbound rows of their journeys and the trips
 * whose legacy manifests name them.
 */
export const onProgramTripGuestChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  if (typeof programId !== "string" || !programId ||
      unchanged(before, after, ["displayName"])) return;
  const db = admin.firestore();
  // One equality filter keeps this off the composite index list; the
  // programme is checked on each journey.
  const legs = await db.collection("programTravelLegs")
    .where("guestId", "==", event.params.guestId).limit(fanoutLimit).get();
  for (const leg of legs.docs) {
    if (leg.data().programId !== programId) continue;
    await reconcileProgramHotelInboundView(db, leg.id);
    const trips = await db.collection("transportTrips")
      .where("legIds", "array-contains", leg.id).limit(20).get();
    for (const trip of trips.docs) {
      await reconcileProgramTripView(db, trip.id);
    }
  }
});

/** Every inbound journey's hotel desk row in a programme. */
async function reconcileProgramInboundCurbTimes(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  // The programme's journeys a page at a time (one equality filter keeps
  // this off the composite index list); inbound ones are rewritten.
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (let page = 0; page < 6; page++) {
    let query: FirebaseFirestore.Query = db.collection("programTravelLegs")
      .where("programId", "==", programId)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(fanoutLimit);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    for (const doc of snap.docs) {
      if (doc.data().kind === "inbound") {
        await reconcileProgramHotelInboundView(db, doc.id);
      }
    }
    if (snap.docs.length < fanoutLimit) break;
    last = snap.docs[snap.docs.length - 1];
  }
}

/**
 * The programme's transport settings: every inbound journey's curb time.
 * Served by dispatchOrganizerPrograms (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const programHotelInboundSettingsProjections = defineProjections(
  "organizerPrograms", [{
    id: "programHotelInboundView", kind: "projection",
    when: ({before, after}) =>
      !(!after || unchanged(before, after, ["transportSettings"])),
    run: (change, ctx) =>
      reconcileProgramInboundCurbTimes(ctx.db, change.documentId),
  }]);
