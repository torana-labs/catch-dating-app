/* firestore-index: programRoomBlocks (
  programId:ASCENDING,
  organizerId:ASCENDING,
  hotelId:ASCENDING
) */
/* firestore-index: programStays (
  programId:ASCENDING,
  organizerId:ASCENDING,
  hotelId:ASCENDING
) */
/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  organizerId:ASCENDING,
  destinationHotelId:ASCENDING,
  kind:ASCENDING
) */
import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramGuestDocument,
  ProgramHotelDocument,
  ProgramHotelRoomViewDocument,
  ProgramRoomBlockDocument,
  ProgramStayDocument,
  ProgramTravelLegDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  blockRemainingRooms,
  suggestStayBlock,
  unplacedGuests,
} from "./programStayAllocation";
import type {RoomBlockRow, StayRow} from "./programStayAllocation";
import {peakRoomOccupancy} from "./programRoomOccupancy";

export const programHotelRoomViewsCollection = "programHotelRoomViews";

/** The complete-read caps getProgramHotelRooms refuses past. */
export const roomBlockCap = 500;
export const roomRowCap = 2000;
/** A board larger than this is written as overflowing, under 1 MiB. */
const boardByteBudget = 900_000;

/** programHotelRoomViews document id: one board per programme and hotel. */
export function programHotelRoomViewId(programId: string,
  hotelId: string): string {
  return `${programId}__${hotelId}`;
}

type Entry<T> = {id: string; doc: T};

/** The sources one hotel's room board is built from. */
export interface HotelRoomSources {
  program: OrganizerProgramDocument | undefined;
  hotel: ProgramHotelDocument | undefined;
  blocks: Entry<ProgramRoomBlockDocument>[];
  stays: Entry<ProgramStayDocument>[];
  inboundLegs: ProgramTravelLegDocument[];
  guests: ReadonlyMap<string, ProgramGuestDocument>;
  /** A source query returned more than its cap. */
  truncated: boolean;
}

const millisOrNull = (value: FirebaseFirestore.Timestamp | null |
  undefined): number | null =>
  value == null ? null : staffTimestampMillis(value);

function stayRow(id: string, stay: ProgramStayDocument): StayRow {
  return {stayId: id, guestId: stay.guestId, hotelId: stay.hotelId,
    roomBlockId: stay.roomBlockId, roomLabel: stay.roomLabel,
    roomOccupancyId: stay.roomOccupancyId ?? id, status: stay.status,
    startsAtMillis: millisOrNull(stay.startsAt),
    endsAtMillis: millisOrNull(stay.endsAt)};
}

function blockRow(id: string, block: ProgramRoomBlockDocument):
  RoomBlockRow {
  return {roomBlockId: id, hotelId: block.hotelId, label: block.label,
    totalRooms: block.totalRooms, assignedCount: block.assignedCount,
    maxOccupantsPerRoom: block.maxOccupantsPerRoom ?? 1,
    heldForGroupIds: block.heldForGroupIds,
    startsAtMillis: staffTimestampMillis(block.startsAt),
    endsAtMillis: staffTimestampMillis(block.endsAt)};
}

/**
 * One hotel's room board, exactly as getProgramHotelRooms returns it without
 * the caller's access expiry and the read time: the room blocks with their
 * peak occupancy and rooms left, every stay at the hotel with the guest's
 * display name and the stay revision `upsertProgramStay` fences on, and the
 * guests routed to the hotel (an inbound journey that is not a no-show, or a
 * stay here) with no live stay, each with the block the server would suggest.
 * Guest ids and block ids only: no phone number, email or other contact
 * field. A board past the callable's complete-read caps is written with
 * `overflow` and empty lists, as the callable refused it.
 * @param {string} programId The programme.
 * @param {string} hotelId The hotel.
 * @param {HotelRoomSources} sources The sources, already read.
 * @return {ProgramHotelRoomViewDocument|null} The board, or null when the
 *   hotel is not the programme's.
 */
export function programHotelRoomView(programId: string, hotelId: string,
  sources: HotelRoomSources): ProgramHotelRoomViewDocument | null {
  const {program, hotel} = sources;
  if (!program || typeof program.organizerId !== "string" || !hotel ||
      hotel.programId !== programId ||
      hotel.organizerId !== program.organizerId) return null;
  const base = {programId, organizerId: program.organizerId, hotelId,
    hotelName: hotel.name};
  const overflowing = (): ProgramHotelRoomViewDocument => ({...base,
    overflow: true, roomBlocks: [], stays: [], unplacedGuests: [],
    version: 1});
  if (sources.truncated) return overflowing();
  const timezone = program.timezone || "UTC";
  const stayRows = sources.stays.map(({id, doc}) => stayRow(id, doc));
  const blockRows = sources.blocks.map(({id, doc}) => blockRow(id, doc));
  const guests = sources.guests;
  const routed = new Set<string>();
  for (const leg of sources.inboundLegs) {
    if (leg.readiness !== "noShow") routed.add(leg.guestId);
  }
  for (const {doc} of sources.stays) routed.add(doc.guestId);
  const guestRows = [...routed].filter((guestId) => guests.has(guestId))
    .map((guestId) => ({guestId,
      groupIds: guests.get(guestId)!.groupIds ?? []}));
  const name = (guestId: string) => guests.get(guestId)?.displayName ??
    "Guest";
  const view: ProgramHotelRoomViewDocument = {...base, overflow: false,
    roomBlocks: sources.blocks.map(({id, doc}) => {
      const row = blockRows.find((r) => r.roomBlockId === id)!;
      return {roomBlockId: id, label: row.label, roomType: doc.roomType ?? null,
        totalRooms: row.totalRooms,
        assignedCount: peakRoomOccupancy(stayRows.filter((stay) =>
          stay.roomBlockId === id), timezone),
        remainingRooms: blockRemainingRooms(row, stayRows, timezone),
        maxOccupantsPerRoom: row.maxOccupantsPerRoom ?? 1,
        heldForGroupIds: [...row.heldForGroupIds],
        startsAtMillis: row.startsAtMillis!,
        endsAtMillis: row.endsAtMillis!};
    }).sort((a, b) => a.label.localeCompare(b.label) ||
      a.roomBlockId.localeCompare(b.roomBlockId)),
    stays: sources.stays.map(({id, doc}) => ({stayId: id,
      guestId: doc.guestId, guestDisplayName: name(doc.guestId),
      roomBlockId: doc.roomBlockId ?? null, roomLabel: doc.roomLabel ?? null,
      roomOccupancyId: doc.roomOccupancyId ?? id, status: doc.status,
      startsAtMillis: millisOrNull(doc.startsAt),
      endsAtMillis: millisOrNull(doc.endsAt),
      roomReadyAtMillis: millisOrNull(doc.roomReadyAt),
      hotelArrivedAtMillis: millisOrNull(doc.hotelArrivedAt),
      revision: doc.revision}))
      .sort((a, b) => a.guestDisplayName.localeCompare(b.guestDisplayName) ||
        a.stayId.localeCompare(b.stayId)),
    unplacedGuests: unplacedGuests(guestRows, stayRows).map((row) => ({
      guestId: row.guestId, displayName: name(row.guestId),
      suggestedRoomBlockId: suggestStayBlock(row, hotelId, blockRows,
        stayRows, timezone)?.roomBlockId ?? null,
    })).sort((a, b) => a.displayName.localeCompare(b.displayName) ||
      a.guestId.localeCompare(b.guestId)),
    version: 1};
  return JSON.stringify(view).length > boardByteBudget ? overflowing() : view;
}

/** One hotel's board from current sources, read only. */
export async function readProgramHotelRoomView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string, hotelId: string):
  Promise<ProgramHotelRoomViewDocument | null> {
  const [programSnap, hotelSnap] = await Promise.all([
    tx.get(db.collection("organizerPrograms").doc(programId)),
    tx.get(db.collection("programHotels").doc(hotelId)),
  ]);
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  const hotel = hotelSnap.data() as ProgramHotelDocument | undefined;
  if (!program || !hotel || hotel.programId !== programId ||
      hotel.organizerId !== program.organizerId) return null;
  const organizerId = program.organizerId;
  // The same three queries, and composite indexes, as getProgramHotelRooms.
  const [blocksSnap, staysSnap, legsSnap] = await Promise.all([
    tx.get(db.collection("programRoomBlocks")
      .where("programId", "==", programId)
      .where("organizerId", "==", organizerId)
      .where("hotelId", "==", hotelId).limit(roomBlockCap + 1)),
    tx.get(db.collection("programStays")
      .where("programId", "==", programId)
      .where("organizerId", "==", organizerId)
      .where("hotelId", "==", hotelId).limit(roomRowCap + 1)),
    tx.get(db.collection("programTravelLegs")
      .where("programId", "==", programId)
      .where("organizerId", "==", organizerId)
      .where("destinationHotelId", "==", hotelId)
      .where("kind", "==", "inbound").limit(roomRowCap + 1)),
  ]);
  const truncated = blocksSnap.size > roomBlockCap ||
    staysSnap.size > roomRowCap || legsSnap.size > roomRowCap;
  const sources: HotelRoomSources = {program, hotel, truncated,
    blocks: [], stays: [], inboundLegs: [], guests: new Map()};
  if (truncated) return programHotelRoomView(programId, hotelId, sources);
  sources.blocks = blocksSnap.docs.map((doc) =>
    ({id: doc.id, doc: doc.data() as ProgramRoomBlockDocument}));
  sources.stays = staysSnap.docs.map((doc) =>
    ({id: doc.id, doc: doc.data() as ProgramStayDocument}));
  sources.inboundLegs = legsSnap.docs.map((doc) =>
    doc.data() as ProgramTravelLegDocument);
  const guestIds = [...new Set([
    ...sources.inboundLegs.map((leg) => leg.guestId),
    ...sources.stays.map(({doc}) => doc.guestId),
  ].filter((id) => typeof id === "string" && id.length > 0))].sort();
  const guests = new Map<string, ProgramGuestDocument>();
  for (let offset = 0; offset < guestIds.length; offset += 32) {
    const ids = guestIds.slice(offset, offset + 32);
    const snaps = await Promise.all(ids.map((id) =>
      tx.get(db.collection("programGuests").doc(id))));
    snaps.forEach((snap, index) => {
      const guest = snap.data() as ProgramGuestDocument | undefined;
      if (guest && guest.programId === programId &&
          guest.organizerId === organizerId) guests.set(ids[index], guest);
    });
  }
  sources.guests = guests;
  return programHotelRoomView(programId, hotelId, sources);
}

/** Rewrites one hotel's room board, writing only on change. */
export async function reconcileProgramHotelRoomView(
  db: FirebaseFirestore.Firestore, programId: string,
  hotelId: string): Promise<void> {
  if (!programId || !hotelId) return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programHotelRoomViewsCollection)
      .doc(programHotelRoomViewId(programId, hotelId));
    const old = await tx.get(ref);
    let next: ProgramHotelRoomViewDocument | null;
    try {
      next = await readProgramHotelRoomView(db, tx, programId, hotelId);
    } catch (error) {
      logger.warn("Programme room board kept a source that fails its " +
        "contract.", {programId, hotelId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
