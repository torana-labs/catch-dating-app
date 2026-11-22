import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";
import {
  MOMENTS_COLLECTION,
  momentFromDocument,
  momentToDocument,
} from "./momentDocuments";
import {pauseMoment, type MomentDefinition} from "./momentModel";
import {
  closeOutThankYouMomentId,
  eventFeedbackPrompt,
  eventStartReminder,
} from "./momentTemplates";

/**
 * System-default moment provisioning. The unified engine only knows
 * about moments that exist as documents, so this pass materializes the
 * default armed moments each scope is born with: the T-15m event-start
 * reminder that replaces the legacy sendEventReminders cron, and the
 * feedback request two hours after the event ends.
 *
 * Provisioning is idempotent and deliberately create-only: a moment doc
 * that already exists is left alone, so an organizer pausing or editing
 * the system default is never clobbered by the next sweep.
 *
 * The host's close-out thank-you is the same feedback request at a time
 * the host picked, so an event that has one never gets the default, and
 * a close-out choice pauses the default (`stepAsideEventFeedbackPrompt`).
 */

export interface MomentDefaultsDeps {
  firestore: () => Firestore;
  nowMillis: () => number;
  timestampFromMillis: (millis: number) => unknown;
}

export const defaultMomentDefaultsDeps: MomentDefaultsDeps = {
  firestore: () => admin.firestore(),
  nowMillis: () => Date.now(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
};

/** Events this far ahead get their system defaults provisioned. The
 *  reminder run only becomes due at T-15m, so a horizon far beyond the
 *  sweep interval is sufficient and keeps the scan bounded. */
const PROVISION_HORIZON_MILLIS = 7 * 24 * 60 * 60 * 1000;
const PROVISION_LIMIT = 500;
const SYSTEM_UID = "system";

export interface ProvisionSummary {
  scanned: number;
  created: number;
}

/** Ensures every upcoming active event has its armed start-reminder and
 *  feedback-request moments. The scheduled sweep calls this before
 *  replanning so a fresh moment plans in the same pass. */
export async function ensureEventDefaultMoments(
  deps: MomentDefaultsDeps = defaultMomentDefaultsDeps,
): Promise<ProvisionSummary> {
  const db = deps.firestore();
  const now = deps.nowMillis();
  const snap = await db.collection("events")
    .where("status", "==", "active")
    .where("startTime", ">", deps.timestampFromMillis(now))
    .where("startTime", "<=",
      deps.timestampFromMillis(now + PROVISION_HORIZON_MILLIS))
    .limit(PROVISION_LIMIT)
    .get();
  const summary: ProvisionSummary = {scanned: snap.size, created: 0};
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (!reminderEligible(data)) continue;
    const input = {eventId: doc.id, name: readEventName(data)};
    const armedBy = {approvedByUid: SYSTEM_UID, approvedAtMillis: now};
    if (await createIfAbsent(db, eventStartReminder(input, {armedBy}), now)) {
      summary.created += 1;
    }
    if (!(await hasCloseOutThankYou(db, doc.id)) &&
        await createIfAbsent(db, eventFeedbackPrompt(input, {armedBy}), now)) {
      summary.created += 1;
    }
  }
  return summary;
}

async function createIfAbsent(
  db: Firestore,
  moment: MomentDefinition,
  now: number,
): Promise<boolean> {
  const ref = db.collection(MOMENTS_COLLECTION).doc(moment.momentId);
  if ((await ref.get()).exists) return false;
  await ref.set(momentToDocument(moment, now, true));
  return true;
}

async function hasCloseOutThankYou(
  db: Firestore,
  eventId: string,
): Promise<boolean> {
  const snap = await db.collection(MOMENTS_COLLECTION)
    .doc(closeOutThankYouMomentId(eventId)).get();
  const status = (snap.data() as Record<string, unknown> | undefined)?.status;
  return status === "armed" || status === "done";
}

/**
 * Pauses the default feedback request once the host has made a close-out
 * choice: the host's thank-you replaces it, and choosing no thank-you
 * means no post-event message at all. Returns the paused moment, or null
 * when there was nothing armed to pause.
 */
export async function stepAsideEventFeedbackPrompt(
  db: Firestore,
  eventId: string,
  now: number,
): Promise<MomentDefinition | null> {
  const ref = db.collection(MOMENTS_COLLECTION)
    .doc(eventFeedbackPrompt({eventId}).momentId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = momentFromDocument(snap.data() as Record<string, unknown>);
  if (current === null || current.origin !== "systemDefault") return null;
  const paused = pauseMoment(current);
  if (paused.kind === "rejected") return null;
  await ref.set(momentToDocument(paused.moment, now, false), {merge: true});
  return paused.moment;
}

/**
 * Mirrors the legacy sendEventReminders eligibility: publicly accessible
 * events only. An event with Catch booking provenance (`eventOrigin`) always
 * qualifies; one published through progressive setup, which closes public
 * registration until a manager opens it, qualifies only while it is open.
 * Private programs never get the broadcast reminder.
 */
function reminderEligible(event: Record<string, unknown>): boolean {
  return isEventPubliclyAccessible(event) &&
    (event.eventOrigin !== undefined ||
      event.publicRegistrationEnabled !== false);
}

function readEventName(data: Record<string, unknown>): string | undefined {
  const title = data.title ?? data.name;
  return typeof title === "string" && title.length > 0 ? title : undefined;
}
