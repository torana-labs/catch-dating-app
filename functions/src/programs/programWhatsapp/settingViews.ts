/* firestore-index: programStaffGrants (
  programId:ASCENDING,
  status:ASCENDING
) */
import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramAssistantSettingViewDocument,
  ProgramSenderViewDocument,
  ProgramStaffGrantDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../../shared/eventOperatorAuthority";
import {
  firstActiveWhatsappConnection,
  readProgramAssistantSettings,
  resolveProgramSender,
} from "./assistantSettings";

export const programSenderViewsCollection = "programSenderViews";
export const programAssistantSettingViewsCollection =
  "programAssistantSettingViews";

/** The most staff grants one programme's settings view lists. */
export const maxSettingViewStaff = 100;

type Tx = FirebaseFirestore.Transaction;
type Db = FirebaseFirestore.Firestore;

async function readProgram(db: Db, tx: Tx, programId: string):
  Promise<OrganizerProgramDocument | null> {
  const snap = await tx.get(db.collection("organizerPrograms").doc(programId));
  const program = snap.data() as OrganizerProgramDocument | undefined;
  return program && typeof program.organizerId === "string" &&
    program.organizerId ? program : null;
}

/**
 * One programme's WhatsApp sender for display, read only: the number the
 * inbox header, the assistant settings and new planned messages show, as
 * listProgramWhatsappThreads, getProgramAssistantSettings and
 * listOrganizerMoments resolved it. The connection's provider ids (WABA,
 * phone number and business ids), its secret reference, test evidence and
 * connecting account never reach the view.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} programId The programme document id.
 * @return {Promise<ProgramSenderViewDocument|null>} The view, or null when
 *   the programme is gone.
 */
export async function readProgramSenderView(db: Db, tx: Tx,
  programId: string): Promise<ProgramSenderViewDocument | null> {
  const program = await readProgram(db, tx, programId);
  if (!program) return null;
  const sender = await resolveProgramSender(db, program, tx);
  const firstActive = await firstActiveWhatsappConnection(db,
    program.organizerId, tx);
  return {programId, organizerId: program.organizerId, sender,
    organizerActiveConnectionId: firstActive?.id ?? null, version: 1};
}

/**
 * One programme's assistant settings view, read only: the stored settings
 * or the defaults, exactly as getProgramAssistantSettings returned them,
 * and the staff who can take escalations with each grant's expiry instead
 * of the callable's clock filter, so the phone drops a grant when it ends.
 * The settings' request ids and hashes and the editor's uid never reach it.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} programId The programme document id.
 * @return {Promise<ProgramAssistantSettingViewDocument|null>} The view, or
 *   null when the programme is gone.
 */
export async function readProgramAssistantSettingView(db: Db, tx: Tx,
  programId: string): Promise<ProgramAssistantSettingViewDocument | null> {
  const program = await readProgram(db, tx, programId);
  if (!program) return null;
  const settings = await readProgramAssistantSettings(db, programId, tx);
  const grants = await tx.get(db.collection("programStaffGrants")
    .where("programId", "==", programId)
    .where("status", "==", "active")
    .limit(maxSettingViewStaff));
  const staff = grants.docs
    .map((doc) => doc.data() as ProgramStaffGrantDocument)
    .filter((grant) => grant.revokedAt == null &&
      grant.organizerId === program.organizerId &&
      typeof grant.uid === "string" && grant.uid !== "")
    .map((grant) => ({uid: grant.uid,
      displayName: grant.displayName ?? null,
      expiresAtMillis: staffTimestampMillis(grant.expiresAt)}))
    .filter((row) => Number.isSafeInteger(row.expiresAtMillis) &&
      row.expiresAtMillis > 0)
    .sort((a, b) => (a.displayName ?? a.uid)
      .localeCompare(b.displayName ?? b.uid) || a.uid.localeCompare(b.uid));
  return {programId, organizerId: program.organizerId,
    enabled: settings.enabled, languages: settings.languages,
    replyWithin: settings.replyWithin,
    escalationStaffUids: settings.escalationStaffUids,
    neverDoes: settings.neverDoes, tone: settings.tone,
    dailyTokenBudget: settings.dailyTokenBudget,
    answerTopics: settings.answerTopics,
    attachmentReads: settings.attachmentReads,
    revision: settings.revision, usesDefaults: settings.usesDefaults,
    staff, version: 1};
}

async function reconcile<T>(db: Db, collection: string, programId: string,
  what: string, build: (tx: Tx) => Promise<T | null>): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(programId);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await build(tx);
    } catch (error) {
      logger.warn(`${what} kept a source that fails its contract.`,
        {programId,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one programme's sender view, writing only on change. */
export function reconcileProgramSenderView(db: Db, programId: string):
  Promise<void> {
  return reconcile(db, programSenderViewsCollection, programId,
    "Programme sender view", (tx) => readProgramSenderView(db, tx, programId));
}

/** Rewrites one programme's assistant settings view, only on change. */
export function reconcileProgramAssistantSettingView(db: Db,
  programId: string): Promise<void> {
  return reconcile(db, programAssistantSettingViewsCollection, programId,
    "Programme assistant settings view",
    (tx) => readProgramAssistantSettingView(db, tx, programId));
}

/** The most programmes of one organizer a sender change rewrites. */
export const senderFanoutLimit = 500;

/**
 * Rewrites the sender view of every programme of [organizerId], up to
 * [senderFanoutLimit] of them, after one of its sender connections changed.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @return {Promise<void>} Resolves once every view matches its sources.
 */
export async function reconcileOrganizerSenderViews(db: Db,
  organizerId: string): Promise<void> {
  const programs = await db.collection("organizerPrograms")
    .where("organizerId", "==", organizerId).limit(senderFanoutLimit + 1)
    .get();
  if (programs.size > senderFanoutLimit) {
    logger.warn("Sender views rewrote only the first programmes.",
      {organizerId, limit: senderFanoutLimit});
  }
  for (const doc of programs.docs.slice(0, senderFanoutLimit)) {
    await reconcileProgramSenderView(db, doc.id);
  }
}
