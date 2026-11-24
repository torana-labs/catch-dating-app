import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {reconcileProgramHotelRoomView} from "./programHotelRoomViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 600;

type Data = FirebaseFirestore.DocumentData | undefined;

const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(fields.map((f) => before[f] ?? null),
    fields.map((f) => after[f] ?? null));

/** The programme and hotel pairs a source names before and after a write. */
function boards(before: Data, after: Data, hotelField: string):
  Array<[string, string]> {
  const pairs = new Map<string, [string, string]>();
  for (const data of [before, after]) {
    const programId = data?.programId;
    const hotelId = data?.[hotelField];
    if (typeof programId === "string" && programId &&
        typeof hotelId === "string" && hotelId) {
      pairs.set(`${programId}__${hotelId}`, [programId, hotelId]);
    }
  }
  return [...pairs.values()];
}

async function reconcileAll(pairs: Array<[string, string]>): Promise<void> {
  const db = admin.firestore();
  for (const [programId, hotelId] of pairs) {
    await reconcileProgramHotelRoomView(db, programId, hotelId);
  }
}

/** A stay's block, room, status, dates or desk marks: its hotel's board. */
export const onProgramHotelRoomStayChanged = onDocumentWritten({
  ...options, document: "programStays/{stayId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "hotelId",
    "guestId", "roomBlockId", "roomLabel", "roomOccupancyId", "status",
    "startsAt", "endsAt", "roomReadyAt", "hotelArrivedAt",
    "revision"])) return;
  await reconcileAll(boards(before, after, "hotelId"));
});

/** A room block's label, size, window or holds: its hotel's board. */
export const onProgramHotelRoomBlockChanged = onDocumentWritten({
  ...options, document: "programRoomBlocks/{roomBlockId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "hotelId",
    "label", "roomType", "totalRooms", "maxOccupantsPerRoom",
    "heldForGroupIds", "startsAt", "endsAt"])) return;
  await reconcileAll(boards(before, after, "hotelId"));
});

/** A hotel's name, or the hotel appearing or vanishing: its board. */
export const onProgramHotelRoomHotelChanged = onDocumentWritten({
  ...options, document: "programHotels/{hotelId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "name"])) return;
  const programIds = new Set([before?.programId, after?.programId].filter(
    (id): id is string => typeof id === "string" && id.length > 0));
  await reconcileAll([...programIds].map((programId) =>
    [programId, event.params.hotelId]));
});

/**
 * An inbound journey routing a guest to a hotel, or turning into a no-show:
 * the boards of its destination hotels, before and after. Other readiness
 * changes leave the board alone.
 */
export const onProgramHotelRoomLegChanged = onDocumentWritten({
  ...options, document: "programTravelLegs/{legId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const routes = (data: Data) => data?.kind === "inbound" &&
    typeof data.destinationHotelId === "string" && data.destinationHotelId;
  if (!routes(before) && !routes(after)) return;
  const shape = (data: Data) => data === undefined ? null : {
    programId: data.programId ?? null, organizerId: data.organizerId ?? null,
    kind: data.kind ?? null, guestId: data.guestId ?? null,
    destinationHotelId: data.destinationHotelId ?? null,
    noShow: data.readiness === "noShow"};
  if (isDeepStrictEqual(shape(before), shape(after))) return;
  await reconcileAll(boards(before?.kind === "inbound" ? before : undefined,
    after?.kind === "inbound" ? after : undefined, "destinationHotelId"));
});

/** A guest's name or groups: the boards of the hotels they stay or land at. */
export const onProgramHotelRoomGuestChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = after?.programId ?? before?.programId;
  if (typeof programId !== "string" || !programId ||
      unchanged(before, after, ["displayName", "groupIds", "organizerId"])) {
    return;
  }
  const db = admin.firestore();
  const guestId = event.params.guestId;
  // One equality filter each keeps these off the composite index list; the
  // programme is checked on each row.
  const [stays, legs] = await Promise.all([
    db.collection("programStays").where("guestId", "==", guestId)
      .limit(fanoutLimit).get(),
    db.collection("programTravelLegs").where("guestId", "==", guestId)
      .limit(fanoutLimit).get(),
  ]);
  const pairs = new Map<string, [string, string]>();
  for (const doc of stays.docs) {
    const hotelId = doc.data().hotelId;
    if (doc.data().programId === programId && typeof hotelId === "string" &&
        hotelId) pairs.set(hotelId, [programId, hotelId]);
  }
  for (const doc of legs.docs) {
    const leg = doc.data();
    if (leg.programId === programId && leg.kind === "inbound" &&
        typeof leg.destinationHotelId === "string" &&
        leg.destinationHotelId) {
      pairs.set(leg.destinationHotelId, [programId, leg.destinationHotelId]);
    }
  }
  await reconcileAll([...pairs.values()]);
});

/** Every hotel board of a programme. */
async function reconcileProgramHotelBoards(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  const hotels = await db.collection("programHotels")
    .where("programId", "==", programId).limit(fanoutLimit).get();
  await reconcileAll(hotels.docs.map((doc) => [programId, doc.id]));
}

/**
 * The programme's time zone or organizer: every hotel's board.
 * Served by dispatchOrganizerPrograms (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const programHotelRoomProgramProjections = defineProjections(
  "organizerPrograms", [{
    id: "programHotelRoomView", kind: "projection",
    when: ({before, after}) =>
      !(unchanged(before, after, ["timezone", "organizerId"])),
    run: (change, ctx) =>
      reconcileProgramHotelBoards(ctx.db, change.documentId),
  }]);

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const programGuestsProjections = defineProjections("programGuests", [
  {
    id: "programHotelRoomGuestChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      const programId = after?.programId ?? before?.programId;
      if (typeof programId !== "string" || !programId ||
          unchanged(before, after, ["displayName", "groupIds",
            "organizerId"])) {
        return;
      }
      const db = admin.firestore();
      const guestId = documentId;
      // One equality filter each keeps these off the composite index list; the
      // programme is checked on each row.
      const [stays, legs] = await Promise.all([
        db.collection("programStays").where("guestId", "==", guestId)
          .limit(fanoutLimit).get(),
        db.collection("programTravelLegs").where("guestId", "==", guestId)
          .limit(fanoutLimit).get(),
      ]);
      const pairs = new Map<string, [string, string]>();
      for (const doc of stays.docs) {
        const hotelId = doc.data().hotelId;
        if (doc.data().programId === programId && typeof hotelId === "string" &&
            hotelId) pairs.set(hotelId, [programId, hotelId]);
      }
      for (const doc of legs.docs) {
        const leg = doc.data();
        if (leg.programId === programId && leg.kind === "inbound" &&
            typeof leg.destinationHotelId === "string" &&
            leg.destinationHotelId) {
          pairs.set(leg.destinationHotelId, [programId,
            leg.destinationHotelId]);
        }
      }
      await reconcileAll([...pairs.values()]);
    },
  },
]);

export const programHotelsProjections = defineProjections("programHotels", [
  {
    id: "programHotelRoomHotelChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      if (unchanged(before, after, ["programId", "organizerId",
        "name"])) return;
      const programIds = new Set([before?.programId, after?.programId].filter(
        (id): id is string => typeof id === "string" && id.length > 0));
      await reconcileAll([...programIds].map((programId) =>
        [programId, documentId]));
    },
  },
]);

export const programTravelLegsProjections = defineProjections(
  "programTravelLegs", [
    {
      id: "programHotelRoomLegChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after} = change;
        const routes = (data: Data) => data?.kind === "inbound" &&
        typeof data.destinationHotelId === "string" && data.destinationHotelId;
        if (!routes(before) && !routes(after)) return;
        const shape = (data: Data) => data === undefined ? null : {
          programId: data.programId ?? null,
          organizerId: data.organizerId ?? null,
          kind: data.kind ?? null, guestId: data.guestId ?? null,
          destinationHotelId: data.destinationHotelId ?? null,
          noShow: data.readiness === "noShow"};
        if (isDeepStrictEqual(shape(before), shape(after))) return;
        const inbound = (data: Data) =>
          data?.kind === "inbound" ? data : undefined;
        await reconcileAll(boards(inbound(before), inbound(after),
          "destinationHotelId"));
      },
    },
  ]);
