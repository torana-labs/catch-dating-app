import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";
import {MOMENTS_COLLECTION, momentToDocument} from "./momentDocuments";
import {eventStartReminder} from "./momentTemplates";

/**
 * System-default moment provisioning. The unified engine only knows
 * about moments that exist as documents, so this pass materializes the
 * default armed moments each scope is born with — today, the T-15m
 * event-start reminder that replaces the legacy sendEventReminders cron.
 *
 * Provisioning is idempotent and deliberately create-only: a moment doc
 * that already exists is left alone, so an organizer pausing or editing
 * the system default is never clobbered by the next sweep.
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

/** Ensures every upcoming active event has its armed start-reminder
 *  moment. The scheduled sweep calls this before replanning so a fresh
 *  moment plans in the same pass. */
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
    const ref = db.collection(MOMENTS_COLLECTION)
      .doc(`${doc.id}_event_start_reminder`);
    const existing = await ref.get();
    if (existing.exists) continue;
    const name = readEventName(doc.data() as Record<string, unknown>);
    const moment = eventStartReminder(
      {eventId: doc.id, name},
      {armedBy: {approvedByUid: SYSTEM_UID, approvedAtMillis: now}},
    );
    await ref.set(momentToDocument(moment, now, true));
    summary.created += 1;
  }
  return summary;
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
