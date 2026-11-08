import type {Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {armDefaultThankYou} from "../../eventSuccess/closeOut";
import {MOMENTS_COLLECTION, momentToDocument} from
  "../../moments/momentDocuments";
import type {MomentDefinition} from "../../moments/momentModel";
import {eventStartReminder} from "../../moments/momentTemplates";

/** Which automatic messages the organizer's defaults ask new events to send
 * (`eventSetup.autoMessages`); both off when unset or not the saved shape.
 */
export function defaultAutoMessages(
  raw: FirebaseFirestore.DocumentData | undefined
): {thankYou: boolean; arrival: boolean} {
  const messages = (raw?.eventSetup as {autoMessages?: unknown} | undefined)
    ?.autoMessages as {thankYou?: unknown; arrival?: unknown} | undefined;
  return {thankYou: messages?.thankYou === true,
    arrival: messages?.arrival === true};
}

function millis(value: unknown): number | null {
  const stamp = value as {toMillis?: () => number} | null | undefined;
  return typeof stamp?.toMillis === "function" ? stamp.toMillis() : null;
}

/**
 * After an event is published, arms the automatic messages the organizer's
 * defaults ask for: the thank-you the morning after (the close-out lane's
 * moment) and the arrival reminder (the event-start reminder moment). Each
 * is created only when the event has none yet, so a host's later choice is
 * never overridden. Publication is already committed, so a failure here is
 * logged and left to the host's own controls and the moments sweep.
 */
export async function armDefaultMomentsOnPublish(params: {
  db: Firestore;
  eventId: string;
  organizerId: string;
  actorUid: string;
  nowMillis: number;
  replan?: (db: Firestore, moment: MomentDefinition, now: number) =>
    Promise<unknown>;
}): Promise<{thankYou: boolean; arrival: boolean}> {
  const {db, eventId, organizerId, actorUid, nowMillis} = params;
  const armed = {thankYou: false, arrival: false};
  try {
    const [defaultsSnap, eventSnap] = await Promise.all([
      db.collection("organizerEventSetupDefaults").doc(organizerId).get(),
      db.collection("events").doc(eventId).get(),
    ]);
    const event = eventSnap.data();
    if (!event || event.organizerId !== organizerId) return armed;
    const wanted = defaultAutoMessages(defaultsSnap.data());
    if (wanted.thankYou) {
      const end = millis(event.endTime) ?? millis(event.startTime) ??
        nowMillis;
      armed.thankYou = await armDefaultThankYou({db, eventId, actorUid,
        eventEndMillis: end, nowMillis, replan: params.replan});
    }
    if (wanted.arrival) {
      const ref = db.collection(MOMENTS_COLLECTION)
        .doc(`${eventId}_event_start_reminder`);
      if (!(await ref.get()).exists) {
        const name = typeof event.name === "string" && event.name.trim() ?
          event.name.trim() : undefined;
        const moment = eventStartReminder({eventId, name},
          {armedBy: {approvedByUid: actorUid, approvedAtMillis: nowMillis}});
        await ref.set(momentToDocument(moment, nowMillis, true));
        armed.arrival = true;
      }
    }
  } catch (error) {
    logger.warn("Default event messages were not armed on publish",
      {eventId, error});
  }
  return armed;
}
