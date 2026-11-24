import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {
  reconcileProgramArrivalView,
  reconcileProgramDepartureView,
  reconcileProgramVendorView,
} from "./programArrivalViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 600;

type Data = FirebaseFirestore.DocumentData | undefined;

const pick = (data: Data, fields: string[]) =>
  fields.map((field) => data?.[field] ?? null);

/** Whether a write changed none of the fields a view reads. */
const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(pick(before, fields), pick(after, fields));

/** Rewrites the arrivals and departures rows of the legs a query names. */
async function reconcileLegs(db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query, which: {arrivals?: boolean;
    departures?: boolean} = {arrivals: true, departures: true}):
  Promise<void> {
  const legs = await query.limit(fanoutLimit).get();
  for (const doc of legs.docs) {
    if (which.arrivals) await reconcileProgramArrivalView(db, doc.id);
    if (which.departures) await reconcileProgramDepartureView(db, doc.id);
  }
}

const legsOf = (db: FirebaseFirestore.Firestore, programId: string) =>
  db.collection("programTravelLegs").where("programId", "==", programId);

/** A journey's own row, and its party's rows when membership moves. */
export const onProgramArrivalLegChanged = onDocumentWritten({
  ...options, document: "programTravelLegs/{legId}",
}, async (event) => {
  const db = admin.firestore();
  const legId = event.params.legId;
  await reconcileProgramArrivalView(db, legId);
  await reconcileProgramDepartureView(db, legId);
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const partyFields = ["kind", "readiness", "partyId", "guestId"];
  if (unchanged(before, after, partyFields)) return;
  const partyIds = new Set([before?.partyId, after?.partyId].filter(
    (id): id is string => typeof id === "string" && id.length > 0));
  for (const partyId of partyIds) {
    await reconcileLegs(db, db.collection("programTravelLegs")
      .where("partyId", "==", partyId), {arrivals: true});
  }
});

/** A party's label or members: the rows of its journeys. */
export const onProgramArrivalPartyChanged = onDocumentWritten({
  ...options, document: "programTravelParties/{partyId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["label", "legIds"])) return;
  await reconcileLegs(admin.firestore(), admin.firestore()
    .collection("programTravelLegs")
    .where("partyId", "==", event.params.partyId));
});

/** A guest's name: the rows of their journeys. */
export const onProgramArrivalGuestChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  if (typeof programId !== "string" || !programId ||
      unchanged(before, after, ["displayName"])) return;
  const db = admin.firestore();
  await reconcileLegs(db, legsOf(db, programId)
    .where("guestId", "==", event.params.guestId));
});

/** A hotel's name: the arrivals rows heading to it. */
export const onProgramArrivalHotelChanged = onDocumentWritten({
  ...options, document: "programHotels/{hotelId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  if (typeof programId !== "string" || !programId ||
      unchanged(before, after, ["name"])) return;
  const db = admin.firestore();
  await reconcileLegs(db, legsOf(db, programId)
    .where("destinationHotelId", "==", event.params.hotelId),
  {arrivals: true});
});

/** A staff member's display name: the rows of the journeys they claimed. */
export const onProgramArrivalStaffLabelChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  const uid = after?.uid ?? before?.uid;
  if (typeof programId !== "string" || typeof uid !== "string" ||
      unchanged(before, after, ["displayName"])) return;
  const db = admin.firestore();
  await reconcileLegs(db, legsOf(db, programId)
    .where("claimedByUid", "==", uid), {arrivals: true});
});

/** A stay's room or status: the departures row of that guest at that hotel. */
export const onProgramDepartureStayChanged = onDocumentWritten({
  ...options, document: "programStays/{stayId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after,
    ["guestId", "hotelId", "status", "roomLabel", "endsAt"])) return;
  const db = admin.firestore();
  const keys = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.programId === "string" &&
        typeof data?.guestId === "string" &&
        typeof data?.hotelId === "string") {
      keys.add(JSON.stringify([data.programId, data.guestId, data.hotelId]));
    }
  }
  for (const key of keys) {
    const [programId, guestId, hotelId] = JSON.parse(key) as string[];
    await reconcileLegs(db, legsOf(db, programId)
      .where("guestId", "==", guestId)
      .where("destinationHotelId", "==", hotelId)
      .where("kind", "==", "outbound"), {departures: true});
  }
});

/** Every inbound journey's arrival view in a programme. */
async function reconcileProgramArrivalCurbTimes(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  await reconcileLegs(db, legsOf(db, programId)
    .where("kind", "==", "inbound"), {arrivals: true});
}

/** The programme's transport settings: every journey's curb time. */
export const onProgramArrivalSettingsChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after || unchanged(before, after, ["transportSettings"])) return;
  await reconcileProgramArrivalCurbTimes(admin.firestore(),
    event.params.programId);
});

/**
 * The programme's transport settings: every journey's curb time.
 * dispatchOrganizerPrograms (issue #2451) runs the same work; both run
 * until the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const programArrivalSettingsProjections = defineProjections(
  "organizerPrograms", [{
    id: "programArrivalView", kind: "projection",
    when: ({before, after}) =>
      !(!after || unchanged(before, after, ["transportSettings"])),
    run: (change, ctx) =>
      reconcileProgramArrivalCurbTimes(ctx.db, change.documentId),
  }]);

/** A vendor's name, active flag or bound programmes: its programme views. */
export const onProgramVendorViewChanged = onDocumentWritten({
  ...options, document: "transportVendors/{vendorId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["name", "active", "programIds",
    "organizerId"])) return;
  const programIds = new Set<string>([...(before?.programIds ?? []),
    ...(after?.programIds ?? [])]);
  for (const programId of programIds) {
    await reconcileProgramVendorView(admin.firestore(), programId,
      event.params.vendorId);
  }
});
