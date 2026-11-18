/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  kind:ASCENDING
) */
import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  ProgramAlertViewDocument,
  ProgramTravelCountViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {momentAttentionWindowMillis} from
  "../organizers/organizerAttentionPolicy";
import {MOMENT_SENDS_COLLECTION} from "../moments/momentDocuments";
import {PROGRAM_ALERTS_COLLECTION, programAlertDocId, travelAlerts} from
  "./programLiveBoard";
import {staffAttentionSend} from "./programStaffAttention";
import type {StaffAttentionSend} from "./programStaffAttention";

export const programAlertViewsCollection = "programAlertViews";
export const programTravelCountViewsCollection = "programTravelCountViews";

const LEG_SCAN_LIMIT = 500;

/** programAlertViews document id: programme-prefixed alert id. */
export function programAlertViewId(programId: string,
  alertId: string): string {
  return programAlertDocId(programId, alertId);
}

/** The alert id a staff attention send raises: one per run and duty. */
export function staffAttentionAlertId(send: {runId: string; duty: string}):
  string {
  return `${send.runId}_${send.duty}`;
}

interface Resolution {
  state: "open" | "done";
  assigneeUid: string | null;
  assigneeName: string | null;
  revision: number;
}

/** The stored take, finish or reopen of one alert, as the board merges it. */
export function alertResolution(data: FirebaseFirestore.DocumentData |
  undefined): Resolution {
  return {state: data?.state === "done" ? "done" : "open",
    assigneeUid: typeof data?.assigneeUid === "string" ?
      data.assigneeUid : null,
    assigneeName: typeof data?.assigneeName === "string" ?
      data.assigneeName : null,
    revision: typeof data?.revision === "number" ? data.revision : 0};
}

/**
 * The alert a staff attention send raises, merged with its resolution.
 * Expired sends raise none, exactly as the callable's window drops them.
 * @param {string} programId The programme.
 * @param {string} organizerId The organizer.
 * @param {StaffAttentionSend} send The send.
 * @param {Resolution} resolution The stored resolution.
 * @param {number} nowMillis The evaluation time.
 * @return {ProgramAlertViewDocument|null} The alert, or null when expired.
 */
export function staffAttentionAlertView(programId: string,
  organizerId: string, send: StaffAttentionSend, resolution: Resolution,
  nowMillis: number): ProgramAlertViewDocument | null {
  const expiresAtMillis = send.createdAtMillis + momentAttentionWindowMillis;
  if (expiresAtMillis <= nowMillis) return null;
  return {programId, organizerId, alertId: staffAttentionAlertId(send),
    source: "staffAttention", severity: send.severity, title: send.title,
    subjectId: send.momentId, createdAtMillis: send.createdAtMillis,
    expiresAtMillis, duty: send.duty, ...resolution, version: 1};
}

/**
 * The alert a journey raises (a cancelled or diverted flight, or a journey
 * staff marked disrupted), merged with its resolution, or null when the leg
 * is not a disrupted inbound journey or its id is not the alert's.
 * @param {string} programId The programme.
 * @param {string} alertId The wanted alert id.
 * @param {string} legId The leg document id.
 * @param {FirebaseFirestore.DocumentData|undefined} leg The leg.
 * @param {Resolution} resolution The stored resolution.
 * @param {number} nowMillis The evaluation time.
 * @return {ProgramAlertViewDocument|null} The alert, or null.
 */
export function travelAlertView(programId: string, alertId: string,
  legId: string, leg: FirebaseFirestore.DocumentData | undefined,
  resolution: Resolution, nowMillis: number): ProgramAlertViewDocument | null {
  if (!leg || leg.kind !== "inbound" || leg.programId !== programId ||
      typeof leg.organizerId !== "string") return null;
  const derived = travelAlerts([{id: legId,
    flightNumber: typeof leg.flightNumber === "string" ?
      leg.flightNumber : null,
    flightStatus: String(leg.flightStatus ?? "unknown"),
    readiness: String(leg.readiness ?? "expected"),
    updatedAtMillis: staffTimestampMillis(leg.updatedAt) || nowMillis,
  }]).find((alert) => alert.alertId === alertId);
  if (!derived) return null;
  return {programId, organizerId: leg.organizerId, alertId,
    source: derived.source as "flight" | "readiness",
    severity: derived.severity, title: derived.title,
    subjectId: derived.subjectId ?? legId,
    createdAtMillis: derived.createdAtMillis,
    expiresAtMillis: null, duty: null, ...resolution, version: 1};
}

/** The journey counts the board shows to full reach. */
export function travelCountView(programId: string, organizerId: string,
  legs: FirebaseFirestore.DocumentData[]): ProgramTravelCountViewDocument {
  const own = legs.filter((leg) => leg.kind === "inbound" &&
    leg.programId === programId && leg.organizerId === organizerId);
  const count = (readiness: string) =>
    own.filter((leg) => String(leg.readiness ?? "expected") === readiness)
      .length;
  return {programId, organizerId, expected: count("expected"),
    atCurb: count("ready"), disrupted: count("disrupted"), version: 1};
}

async function readResolution(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string,
  alertId: string): Promise<Resolution> {
  const snap = await tx.get(db.collection(PROGRAM_ALERTS_COLLECTION)
    .doc(programAlertDocId(programId, alertId)));
  return alertResolution(snap.data());
}

/**
 * The earliest send of one run and duty for a programme, the one the
 * callable's ascending scan keeps; or null when none exists.
 */
async function canonicalSend(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string, runId: string,
  duty: string): Promise<{send: StaffAttentionSend; organizerId: string;
    sourceId: string} | null> {
  const snap = await tx.get(db.collection(MOMENT_SENDS_COLLECTION)
    .where("actionKind", "==", "staffAttention")
    .where("scopeId", "==", programId).where("runId", "==", runId)
    .where("duty", "==", duty).limit(50));
  let best: {send: StaffAttentionSend; organizerId: string;
    sourceId: string} | null = null;
  for (const doc of snap.docs) {
    const send = staffAttentionSend(doc);
    if (send === null || send.scopeKind !== "program" ||
        send.scopeId !== programId) continue;
    const organizerId = doc.data().organizerId;
    if (typeof organizerId !== "string") continue;
    if (!best || send.createdAtMillis < best.send.createdAtMillis ||
        (send.createdAtMillis === best.send.createdAtMillis &&
          doc.id < best.sourceId)) {
      best = {send, organizerId, sourceId: doc.id};
    }
  }
  return best;
}

/** A staff attention alert from current sources, read only. */
export async function readStaffAttentionAlertView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string, runId: string, duty: string, nowMillis: number):
  Promise<{view: ProgramAlertViewDocument; sourceId: string} | null> {
  const found = await canonicalSend(db, tx, programId, runId, duty);
  if (!found) return null;
  const resolution = await readResolution(db, tx, programId,
    staffAttentionAlertId(found.send));
  const view = staffAttentionAlertView(programId, found.organizerId,
    found.send, resolution, nowMillis);
  return view ? {view, sourceId: found.sourceId} : null;
}

/** A travel alert from current sources, read only. */
export async function readTravelAlertView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string, alertId: string,
  legId: string, nowMillis: number): Promise<ProgramAlertViewDocument | null> {
  const leg = await tx.get(db.collection("programTravelLegs").doc(legId));
  const resolution = await readResolution(db, tx, programId, alertId);
  return travelAlertView(programId, alertId, legId, leg.data(), resolution,
    nowMillis);
}

/** A programme's travel counts from current sources, read only. */
export async function readTravelCountView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string):
  Promise<ProgramTravelCountViewDocument | null> {
  const program = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  const organizerId = program.data()?.organizerId;
  if (typeof organizerId !== "string") return null;
  const legs = await tx.get(db.collection("programTravelLegs")
    .where("programId", "==", programId).where("kind", "==", "inbound")
    .limit(LEG_SCAN_LIMIT));
  return travelCountView(programId, organizerId,
    legs.docs.map((doc) => doc.data()));
}

async function write<T>(db: FirebaseFirestore.Firestore, collection: string,
  id: string, what: string,
  read: (tx: FirebaseFirestore.Transaction) => Promise<T | null>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await read(tx);
    } catch (error) {
      logger.warn(`${what} kept a source that fails its contract.`, {id,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one staff attention alert, writing only on change. */
export function reconcileStaffAttentionAlert(
  db: FirebaseFirestore.Firestore, programId: string, runId: string,
  duty: string, nowMillis = Date.now()): Promise<void> {
  return write(db, programAlertViewsCollection, programAlertViewId(programId,
    staffAttentionAlertId({runId, duty})), "Programme alert view",
  async (tx) => (await readStaffAttentionAlertView(db, tx, programId, runId,
    duty, nowMillis))?.view ?? null);
}

/** Rewrites one journey's alerts, writing only on change. */
export async function reconcileTravelAlerts(
  db: FirebaseFirestore.Firestore, programId: string, legId: string,
  nowMillis = Date.now()): Promise<void> {
  for (const alertId of [`flight_${legId}`, `readiness_${legId}`]) {
    await write(db, programAlertViewsCollection,
      programAlertViewId(programId, alertId), "Programme alert view",
      (tx) => readTravelAlertView(db, tx, programId, alertId, legId,
        nowMillis));
  }
}

/** Rewrites a programme's travel counts, writing only on change. */
export function reconcileTravelCounts(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  return write(db, programTravelCountViewsCollection, programId,
    "Programme travel count view",
    (tx) => readTravelCountView(db, tx, programId));
}

/**
 * Merges a changed or removed resolution into its alert, which exists only
 * while the alert is derived; an absent alert has nothing to merge.
 */
export async function reconcileAlertResolution(
  db: FirebaseFirestore.Firestore, programId: string,
  alertId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programAlertViewsCollection)
      .doc(programAlertViewId(programId, alertId));
    const view = await tx.get(ref);
    if (!view.exists) return;
    const resolution = await readResolution(db, tx, programId, alertId);
    const next = {...view.data(), ...resolution};
    if (isDeepStrictEqual(view.data(), next)) return;
    tx.set(ref, next);
  });
}
