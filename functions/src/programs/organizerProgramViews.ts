import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  OrganizerProgramViewDocument,
  ProgramFunctionDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
} from "../shared/generated/firestoreAdminTypes";

export const organizerProgramViewsCollection = "organizerProgramViews";

const functionLimit = 40;
const pickupLimit = 32;
const hotelLimit = 64;

type Doc<T> = {id: string; data: T};

/**
 * The setup view of one programme: the programme object getOrganizerProgram
 * returned, its creator, the function count and the setup lists exactly as
 * that callable returned them, without a function's live expected and
 * checked-in counts (the phone reads those from programResourceViews). The
 * programme's sender connection, entitlement and request hash never appear.
 * Null when the programme is absent or has no organizer.
 * @param {string} programId The programme document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The programme.
 * @param {Doc<ProgramFunctionDocument>[]} functions Its functions.
 * @param {Doc<ProgramPickupPointDocument>[]} pickups Its pickup points.
 * @param {Doc<ProgramHotelDocument>[]} hotels Its hotels.
 * @return {OrganizerProgramViewDocument|null} The view, or null.
 */
export function organizerProgramView(programId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  functions: ReadonlyArray<Doc<ProgramFunctionDocument>>,
  pickups: ReadonlyArray<Doc<ProgramPickupPointDocument>>,
  hotels: ReadonlyArray<Doc<ProgramHotelDocument>>):
  OrganizerProgramViewDocument | null {
  if (!data || typeof data.organizerId !== "string" || !data.organizerId ||
      typeof data.createdBy !== "string" || !data.createdBy) return null;
  const program = data as OrganizerProgramDocument;
  const own = <T extends {programId?: string; organizerId?: string}>(
    docs: ReadonlyArray<Doc<T>>) => docs.filter((doc) =>
      doc.data.programId === programId &&
      doc.data.organizerId === program.organizerId)
      .sort((a, b) => a.id.localeCompare(b.id));
  const ownFunctions = own(functions).slice(0, functionLimit);
  return {
    programId,
    organizerId: program.organizerId,
    createdBy: program.createdBy,
    kind: program.kind,
    title: program.title,
    timezone: program.timezone,
    status: program.status,
    startsAtMillis: program.startsAt.toMillis(),
    endsAtMillis: program.endsAt.toMillis(),
    capabilities: program.capabilities,
    transportSettings: program.transportSettings,
    branding: program.branding ? {...program.branding} : null,
    archivedAtMillis: program.archivedAt?.toMillis() ?? null,
    anonymizeAtMillis: program.anonymizeAt?.toMillis() ?? null,
    anonymizedAtMillis: program.anonymizedAt?.toMillis() ?? null,
    revision: program.revision,
    functionCount: ownFunctions.length,
    functions: ownFunctions.map(({id, data: fn}) => ({
      functionId: id,
      name: fn.name,
      startsAtMillis: fn.startsAt.toMillis(),
      endsAtMillis: fn.endsAt.toMillis(),
      venueName: fn.venueName,
      status: fn.status,
      invitationMode: fn.invitationMode ?? "allGuests",
      checkInEnabled: fn.checkInEnabled ?? false,
      dressCode: fn.dressCode ?? null,
      instructions: fn.instructions ?? null,
      revision: fn.revision,
    })),
    pickupPoints: own(pickups).slice(0, pickupLimit)
      .map(({id, data: point}) => ({
        pickupPointId: id,
        kind: point.kind,
        label: point.label,
        iataCode: point.iataCode,
        terminal: point.terminal,
        meetingZone: point.meetingZone,
        instructions: point.instructions,
        active: point.active,
        revision: point.revision,
      })),
    hotels: own(hotels).slice(0, hotelLimit).map(({id, data: hotel}) => ({
      hotelId: id,
      name: hotel.name,
      address: hotel.address,
      receptionContact: hotel.receptionContact,
      active: hotel.active,
      revision: hotel.revision,
    })),
    version: 1,
  };
}

/** One programme's setup view from current sources, read only. */
export async function readOrganizerProgramView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string): Promise<OrganizerProgramViewDocument | null> {
  const programSnap = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  if (!programSnap.exists) return null;
  const read = <T>(collection: string, limit: number) =>
    tx.get(db.collection(collection).where("programId", "==", programId)
      .limit(limit)).then((snap) => snap.docs.map((doc) =>
      ({id: doc.id, data: doc.data() as T})));
  const [functions, pickups, hotels] = await Promise.all([
    read<ProgramFunctionDocument>("programFunctions", functionLimit),
    read<ProgramPickupPointDocument>("programPickupPoints", pickupLimit),
    read<ProgramHotelDocument>("programHotels", hotelLimit),
  ]);
  return organizerProgramView(programId, programSnap.data(), functions,
    pickups, hotels);
}

/**
 * Rewrites one programme's setup view from current sources, writing only on
 * change. A source that fails its contract is logged and keeps its previous
 * view.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme document id.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileOrganizerProgramView(
  db: FirebaseFirestore.Firestore, programId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(organizerProgramViewsCollection).doc(programId);
    const old = await tx.get(ref);
    let next: OrganizerProgramViewDocument | null;
    try {
      next = await readOrganizerProgramView(db, tx, programId);
    } catch (error) {
      logger.warn("Organizer programme view kept a source that fails its " +
        "contract.", {programId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
