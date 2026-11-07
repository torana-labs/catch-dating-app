import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/eventDocument";
import {timestampEvidence} from
  "../eventSuccess/operations/groupProgressSource";
import {isAssistanceId} from "./support/ids";

export const groupProgressViewsCollection = "hostEventGroupProgressViews";
export const departureViewsCollection = "hostEventDepartureViews";
export const checkpointViewsCollection = "hostEventCheckpointViews";
/** Checkpoint views stop changing this long after their event ends. */
export const checkpointViewFreezeMillis = 24 * 60 * 60 * 1000;

export interface MovementViewDeps {
  now: () => FirebaseFirestore.Timestamp;
}

export const defaultMovementViewDeps: MovementViewDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

export type LiveContext = {mode: "live"; organizerId: string; eventId: string};

/**
 * The live context of an event the live console can operate: it exists, has
 * an assistance format, an end and an organizer id usable in a document id.
 * Anything else has no movement views.
 */
export function operableEvent(eventId: string,
  event: FirebaseFirestore.DocumentData | undefined):
  {context: LiveContext; endAtMillis: number} | null {
  if (!event || !event.eventFormat || !isAssistanceId(eventId) ||
      !isAssistanceId(event.organizerId)) return null;
  let endAtMillis: number;
  try {
    const end = timestampEvidence(event.endTime);
    endAtMillis = Math.floor(end._seconds * 1000 + end._nanoseconds / 1e6);
  } catch {
    return null;
  }
  if (!Number.isSafeInteger(endAtMillis) || endAtMillis < 1) return null;
  return {context: {mode: "live", organizerId: event.organizerId, eventId},
    endAtMillis};
}

/** The groups a route plan configures, the whole event first. */
export function configuredGroupIds(event: Pick<EventDocument, "eventFormat">):
  string[] {
  const route = event.eventFormat?.activityDetails?.routePlan;
  const paceGroups = route?.groupStrategy === "paceGroups" ?
    (route.paceGroups ?? []).map((group) => group.id) : [];
  return ["event:whole", ...new Set(paceGroups.filter((id) =>
    id !== "event:whole"))];
}
