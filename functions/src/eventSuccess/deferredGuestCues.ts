import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {
  allowsPushPreference,
  eventCompanionReadyNotificationCopy,
  NotificationPreferenceDocument,
  sendFcmNotification,
} from "../shared/notifications";
import {readConsumerPushToken} from "../shared/consumerPushToken";

/**
 * A guest cue the event's phone rule held back, sent at the next moment the
 * rule allows: a planned stop (a step that is not the activity) or the
 * finish. Today this holds the companion-ready push for a guest the host
 * checked in after an arrival-only event started.
 */
export const EVENT_SUCCESS_DEFERRED_CUES_COLLECTION =
  "eventSuccessDeferredCues";

export type DeferredGuestCueKind = "companionReady";

export interface EventSuccessDeferredCueDocument {
  eventId: string;
  organizerId: string;
  uid: string;
  kind: DeferredGuestCueKind;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

/**
 * The deferred cue id: one companion-ready push per guest per event.
 * @param {string} eventId Event.
 * @param {string} uid Guest.
 * @return {string} Document id.
 */
export function deferredGuestCueId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Holds a companion-ready push until the next planned stop or the finish.
 * Repeating it for the same guest keeps one cue.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params Inputs.
 * @param {string} params.eventId Event.
 * @param {string} params.organizerId Organiser.
 * @param {string} params.uid Guest.
 * @return {Promise<void>}
 */
export async function deferCompanionReadyCue(
  db: FirebaseFirestore.Firestore,
  params: {eventId: string; organizerId: string; uid: string}
): Promise<void> {
  const cue: EventSuccessDeferredCueDocument = {
    eventId: params.eventId,
    organizerId: params.organizerId,
    uid: params.uid,
    kind: "companionReady",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection(EVENT_SUCCESS_DEFERRED_CUES_COLLECTION)
    .doc(deferredGuestCueId(params.eventId, params.uid))
    .set(cue);
}

/**
 * Whether held cues may go out after this live action: at the finish, or
 * when the host moves to a step that is not the activity (a planned stop).
 * @param {object} action The committed live action.
 * @param {string} action.action Action name.
 * @param {boolean | undefined} action.activeStepIsActivity Host-reported
 *   stage of the new step; unknown keeps the cues held.
 * @return {boolean} True when held cues may be sent.
 */
export function deferredCuesReleasedBy(action: {
  action: string;
  activeStepIsActivity?: boolean;
}): boolean {
  if (action.action === "complete") return true;
  return action.action === "setActiveStep" &&
    action.activeStepIsActivity === false;
}

/**
 * Sends and clears every held cue for an event. Each guest's push
 * preference and token are read again at send time.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params Inputs.
 * @param {string} params.eventId Event.
 * @param {EventDocument} params.event Event document.
 * @param {Function} params.sendNotification FCM sender.
 * @return {Promise<number>} Pushes sent.
 */
export async function releaseDeferredGuestCues(
  db: FirebaseFirestore.Firestore,
  params: {
    eventId: string;
    event: EventDocument;
    sendNotification?: typeof sendFcmNotification;
  }
): Promise<number> {
  const send = params.sendNotification ?? sendFcmNotification;
  const snap = await db.collection(EVENT_SUCCESS_DEFERRED_CUES_COLLECTION)
    .where("eventId", "==", params.eventId)
    .get();
  let sent = 0;
  for (const doc of snap.docs) {
    const cue = doc.data() as Partial<EventSuccessDeferredCueDocument>;
    // Clear first so a retry never sends the same cue twice.
    const clear = db.batch();
    clear.delete(doc.ref);
    await clear.commit();
    if (cue.kind !== "companionReady" || typeof cue.uid !== "string") {
      continue;
    }
    const [userSnap, token] = await Promise.all([
      db.collection("users").doc(cue.uid).get(),
      readConsumerPushToken(db, cue.uid),
    ]);
    const user = userSnap.data() as NotificationPreferenceDocument | undefined;
    if (!token || !allowsPushPreference(user, "eventStatusUpdates")) {
      continue;
    }
    const copy = eventCompanionReadyNotificationCopy(params.event);
    await send({
      token,
      title: copy.title,
      body: copy.body,
      type: "eventCompanionReady",
      eventId: params.eventId,
      organizerId: params.event.organizerId,
    });
    sent++;
  }
  return sent;
}
