import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramHouseholdDocument,
  ProgramWhatsappThreadViewDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {PROGRAM_WHATSAPP_THREADS} from "./ids";
import type {ProgramThread} from "./threads";

export const programWhatsappThreadViewsCollection =
  "programWhatsappThreadViews";

/** The thread's fields every inbox row carries (no clock, no phone data). */
export type ProgramThreadSummary = Omit<ProgramWhatsappThreadViewDocument,
  "programId" | "organizerId" | "householdLabel" | "primaryContactName" |
  "guestCount" | "version">;

function sideLabel(program: Pick<OrganizerProgramDocument,
  "householdSideLabels">, household: ProgramHouseholdDocument | undefined):
  string | null {
  const side = household?.side;
  if (side !== "partnerA" && side !== "partnerB") return null;
  return program.householdSideLabels?.[side] ?? null;
}

/**
 * One thread's inbox summary without the service-window flag, which depends
 * on the reader's clock. listProgramWhatsappThreads and the thread view both
 * build their rows from this, so they cannot drift.
 * @param {ProgramThread} thread The thread.
 * @param {object} program The programme's side labels.
 * @param {ProgramHouseholdDocument|undefined} household The thread's
 *   household, when it has one that still exists.
 * @return {ProgramThreadSummary} The summary fields.
 */
export function programThreadSummary(thread: ProgramThread,
  program: Pick<OrganizerProgramDocument, "householdSideLabels">,
  household: ProgramHouseholdDocument | undefined): ProgramThreadSummary {
  return {
    threadId: thread.threadId,
    householdId: thread.householdId,
    guestId: thread.guestId,
    displayName: household?.label ?? (thread.unknownSender ?
      "Unknown number" : "Guest"),
    sideLabel: sideLabel(program, household),
    unknownSender: thread.unknownSender,
    handledBy: thread.handledBy,
    state: thread.state,
    language: thread.language,
    escalationReason: thread.escalationReason,
    lastMessagePreview: thread.lastMessagePreview,
    lastMessageDirection: thread.lastMessageDirection,
    lastMessageAuthor: thread.lastMessageAuthor,
    lastMessageAtMillis: thread.lastMessageAtMillis,
    lastInboundAtMillis: thread.lastInboundAtMillis,
    serviceWindowExpiresAtMillis: thread.serviceWindowExpiresAtMillis,
    unreadCount: thread.unreadCount,
    revision: thread.revision,
  };
}

/**
 * The inbox row of one thread: the summary plus the household's own label,
 * primary contact name and guest count (the thread header's household).
 * Null when the thread is absent, names no programme or organizer, or its
 * programme is missing or belongs to another organizer. Never the phone
 * hash, the sender connection, who took the thread over or the message count.
 * @param {string} threadId The thread document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The thread.
 * @param {OrganizerProgramDocument|undefined} program Its programme.
 * @param {ProgramHouseholdDocument|undefined} household Its household.
 * @return {ProgramWhatsappThreadViewDocument|null} The view, or null.
 */
export function programWhatsappThreadView(threadId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  program: OrganizerProgramDocument | undefined,
  household: ProgramHouseholdDocument | undefined):
  ProgramWhatsappThreadViewDocument | null {
  if (!data) return null;
  const thread = data as ProgramThread;
  if (typeof thread.programId !== "string" || !thread.programId ||
      typeof thread.organizerId !== "string" || !thread.organizerId ||
      !program || program.organizerId !== thread.organizerId) return null;
  if (thread.threadId !== threadId) {
    throw new Error("Programme WhatsApp thread id does not match its " +
      "document id.");
  }
  const own = household && household.programId === thread.programId &&
    household.organizerId === thread.organizerId ? household : undefined;
  return {
    programId: thread.programId, organizerId: thread.organizerId,
    ...programThreadSummary(thread, program, own),
    householdLabel: own?.label ?? null,
    primaryContactName: own?.primaryContactName ?? null,
    guestCount: own?.memberGuestIds?.length ?? 0,
    version: 1,
  };
}

/** One thread's view from current sources, read only. */
export async function readProgramWhatsappThreadView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  threadId: string): Promise<ProgramWhatsappThreadViewDocument | null> {
  const threadSnap = await tx.get(
    db.collection(PROGRAM_WHATSAPP_THREADS).doc(threadId));
  const thread = threadSnap.data();
  if (!thread || typeof thread.programId !== "string" || !thread.programId) {
    return null;
  }
  const [program, household] = await Promise.all([
    tx.get(db.collection("organizerPrograms").doc(thread.programId)),
    typeof thread.householdId === "string" && thread.householdId ?
      tx.get(db.collection("programHouseholds").doc(thread.householdId)) :
      Promise.resolve(null),
  ]);
  return programWhatsappThreadView(threadId, thread,
    program.data() as OrganizerProgramDocument | undefined,
    household?.data() as ProgramHouseholdDocument | undefined);
}

/**
 * Rewrites one thread's view from current sources, writing only on change.
 * A source that fails its contract is logged and keeps its previous view
 * rather than blocking a trigger retry loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} threadId The thread document id.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileProgramWhatsappThreadView(
  db: FirebaseFirestore.Firestore, threadId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programWhatsappThreadViewsCollection)
      .doc(threadId);
    const old = await tx.get(ref);
    let next: ProgramWhatsappThreadViewDocument | null;
    try {
      next = await readProgramWhatsappThreadView(db, tx, threadId);
    } catch (error) {
      logger.warn("Programme WhatsApp thread view kept a source that " +
        "fails its contract.", {threadId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
