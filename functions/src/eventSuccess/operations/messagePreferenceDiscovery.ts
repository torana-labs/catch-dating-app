import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {guestSourceFactsFromSnapshots, requireDocumentId} from
  "./guestRecords";
import {RUNTIME_CONFIGS, runtimeConfigId, parseRuntimeConfig,
  runtimeConfigSource} from "./runtimeConfigRecords";

/** Canonical participant and saved sender selection, independent of consent. */
export async function readMessagePreferenceDiscovery(db: Firestore,
  tx: Transaction, uid: string, scope: {eventId: string; attendeeId: string},
  now: number) {
  [uid, scope.eventId, scope.attendeeId].forEach(requireDocumentId);
  const [eventSnap, attendeeSnap] = await tx.getAll(
    db.collection("events").doc(scope.eventId),
    db.collection("eventAttendees").doc(scope.attendeeId));
  const event = eventSnap.data();
  const attendee = attendeeSnap.data();
  if (!event || !attendee || attendee.linkedUid !== uid ||
      attendee.eventId !== scope.eventId) {
    throw new HttpsError("permission-denied",
      "Event message preferences unavailable.");
  }
  const context = {mode: "live" as const, eventId: scope.eventId,
    organizerId: event.organizerId};
  const source = guestSourceFactsFromSnapshots(context, scope.attendeeId,
    eventSnap, attendeeSnap);
  const [runtimeSnap, planSnap] = await tx.getAll(
    db.collection(RUNTIME_CONFIGS).doc(runtimeConfigId(context)),
    db.collection("eventSuccessPlans").doc(scope.eventId));
  const runtime = runtimeSnap.exists ? parseRuntimeConfig(
    runtimeSnap.data(), context, now) : null;
  const binding = runtimeConfigSource(context, eventSnap, planSnap, now);
  // Pausing execution preserves its selection. A changed source does not.
  const routes = runtime?.sourceGeneration === binding.generation &&
    runtime.sourceHash === binding.hash ?
    runtime.configuration?.options.routes ?? [] : [];
  return {context, source, phone: attendee.phoneE164 as unknown, routes};
}

export function messagePreferenceClock(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpsError("unavailable", "Event preference clock invalid.");
  }
  return value;
}
