import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramFunctionDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
  ProgramResourceViewDocument,
  ProgramWorkSummaryDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";

export const programWorkSummariesCollection = "programWorkSummaries";
export const programResourceViewsCollection = "programResourceViews";

export type ProgramResourceKind = ProgramResourceViewDocument["kind"];

const sourceCollections: Record<ProgramResourceKind, string> = {
  pickupPoint: "programPickupPoints",
  hotel: "programHotels",
  function: "programFunctions",
};

/** programResourceViews document id. */
export function programResourceViewId(programId: string,
  kind: ProgramResourceKind, resourceId: string): string {
  return `${programId}__${kind}__${resourceId}`;
}

/**
 * The work shell's programme header: exactly the programme fields
 * getProgramWorkAccess returns, and nothing else the programme holds.
 * @param {string} programId The programme document id.
 * @param {OrganizerProgramDocument|undefined} program The programme.
 * @return {ProgramWorkSummaryDocument|null} The summary, or null when absent.
 */
export function programWorkSummary(programId: string,
  program: OrganizerProgramDocument | undefined):
  ProgramWorkSummaryDocument | null {
  if (!program) return null;
  return {programId, organizerId: program.organizerId, title: program.title,
    kind: program.kind, timezone: program.timezone, status: program.status,
    capabilities: program.capabilities,
    vehicleClasses: program.transportSettings.vehicleClasses, version: 1};
}

const emptyResource = {pickupKind: null, iataCode: null, terminal: null,
  venueName: null, startsAtMillis: null, endsAtMillis: null,
  checkInEnabled: null, status: null, expectedCount: null,
  checkedInCount: null};

/**
 * One resource's label as the work shell shows it, or null when the source
 * is absent or belongs to another programme. The fields are exactly those
 * getProgramWorkAccess returns; contact, notes, coordinates, venue notes,
 * instructions and dress code stay in the source.
 * @param {ProgramResourceKind} kind The kind of resource.
 * @param {string} resourceId The source document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The source data.
 * @return {ProgramResourceViewDocument|null} The view, or null.
 */
export function programResourceView(kind: ProgramResourceKind,
  resourceId: string, data: FirebaseFirestore.DocumentData | undefined):
  ProgramResourceViewDocument | null {
  if (!data || typeof data.programId !== "string" || !data.programId ||
      typeof data.organizerId !== "string" || !data.organizerId) return null;
  const base = {programId: data.programId, organizerId: data.organizerId,
    kind, resourceId, ...emptyResource, version: 1 as const};
  if (kind === "pickupPoint") {
    const pickup = data as ProgramPickupPointDocument;
    return {...base, active: pickup.active === true, label: pickup.label,
      pickupKind: pickup.kind, iataCode: pickup.iataCode ?? null,
      terminal: pickup.terminal ?? null};
  }
  if (kind === "hotel") {
    const hotel = data as ProgramHotelDocument;
    return {...base, active: hotel.active === true, label: hotel.name};
  }
  const fn = data as ProgramFunctionDocument;
  return {...base, active: true, label: fn.name, venueName: fn.venueName,
    startsAtMillis: staffTimestampMillis(fn.startsAt),
    endsAtMillis: staffTimestampMillis(fn.endsAt),
    checkInEnabled: fn.checkInEnabled ?? true, status: fn.status,
    expectedCount: fn.expectedCount ?? 0,
    checkedInCount: fn.checkedInCount ?? 0};
}

/**
 * Rewrites one programme's work summary from its source inside a
 * transaction, writing only on change. A source that fails its contract is
 * logged and keeps the previous view.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme document id.
 * @return {Promise<void>} Resolves once the summary matches its source.
 */
export async function reconcileProgramWorkSummary(
  db: FirebaseFirestore.Firestore, programId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const source = await tx.get(
      db.collection("organizerPrograms").doc(programId));
    const ref = db.collection(programWorkSummariesCollection).doc(programId);
    const old = await tx.get(ref);
    let next: ProgramWorkSummaryDocument | null;
    try {
      next = programWorkSummary(programId,
        source.data() as OrganizerProgramDocument | undefined);
    } catch (error) {
      logger.warn("Programme work summary kept a source that fails its " +
        "contract.", {programId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Rewrites one resource's view from its source inside a transaction,
 * writing only on change. The view's programme comes from the source, so a
 * delete removes it by the id the source named.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {ProgramResourceKind} kind The kind of resource.
 * @param {string} resourceId The source document id.
 * @param {string} programId The programme the source named when it last
 *   existed (the deleted source's own programme).
 * @return {Promise<void>} Resolves once the view matches its source.
 */
export async function reconcileProgramResourceView(
  db: FirebaseFirestore.Firestore, kind: ProgramResourceKind,
  resourceId: string, programId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const source = await tx.get(
      db.collection(sourceCollections[kind]).doc(resourceId));
    const ref = db.collection(programResourceViewsCollection)
      .doc(programResourceViewId(programId, kind, resourceId));
    const old = await tx.get(ref);
    let next: ProgramResourceViewDocument | null;
    try {
      next = programResourceView(kind, resourceId, source.data());
      // A source that now names another programme leaves this id unowned.
      if (next && next.programId !== programId) next = null;
    } catch (error) {
      logger.warn("Programme resource view kept a source that fails its " +
        "contract.", {programId, kind, resourceId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** One view from current sources, read only, for the migration. */
export async function readProgramResourceView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  kind: ProgramResourceKind, resourceId: string
): Promise<ProgramResourceViewDocument | null> {
  const source = await tx.get(
    db.collection(sourceCollections[kind]).doc(resourceId));
  return programResourceView(kind, resourceId, source.data());
}

/** One summary from current sources, read only, for the migration. */
export async function readProgramWorkSummary(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string): Promise<ProgramWorkSummaryDocument | null> {
  const source = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  return programWorkSummary(programId,
    source.data() as OrganizerProgramDocument | undefined);
}
