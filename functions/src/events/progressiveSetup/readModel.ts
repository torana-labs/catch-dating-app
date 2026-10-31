import {Timestamp} from "firebase-admin/firestore";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {eventPublicationReadiness} from "./publicationReadiness";
import {HttpsError} from "firebase-functions/v2/https";
import type {PrivateEventSetupCallableResponse} from
  "../../shared/generated/privateEventSetupCallableResponse";
import {validateGetPrivateEventSetupCallablePayload} from
  "../../shared/generated/validators/getPrivateEventSetupInput";
import {validatePrivateEventSetupCallableResponse} from
  "../../shared/generated/validators/privateEventSetupOutput";
import {eventPolicyFromEvent} from "../eventPolicy";
import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {isEventPolicyTerms} from "../configuredEvent";
import {projectEventPreferences} from "./preferences";
import {authorizeSetupManager} from "./service";
import {canEditPrivateEventBasics} from "./commitments";

/** Reads a manager projection without decoding a fully configured event. */
export async function getPrivateEventSetup(params: {
  actorUid: string;
  command: unknown;
  db: FirebaseFirestore.Firestore;
  nowMillis?: () => number;
}): Promise<PrivateEventSetupCallableResponse> {
  const {actorUid, db} = params;
  if (!actorUid) throw new HttpsError("unauthenticated", "Sign in first.");
  const command = params.command;
  if (!validateGetPrivateEventSetupCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event setup request.");
  }
  return db.runTransaction(async (tx) => {
    const [organizer, deleted, eventSnap, preferencesSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(command.organizerId)),
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(db.collection("events").doc(command.eventId)),
      tx.get(db.collection("eventSetupPreferences").doc(command.eventId)),
    ]);
    const manager = authorizeSetupManager(organizer, deleted, actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (event.publicationState !== "private" &&
        (event.publicationState !== "published" ||
          !validateEventDocument(event))) {
      throw new HttpsError("failed-precondition",
        "Event publication state needs review.");
    }
    const endTimeMillis = event.endTime?.toMillis?.() ?? null;
    if (event.endTime !== undefined &&
        (!Number.isSafeInteger(endTimeMillis) ||
          endTimeMillis <= event.startTime?.toMillis?.())) {
      throw new HttpsError("failed-precondition", "Event duration is invalid.");
    }
    const canEditBasics = await canEditPrivateEventBasics({tx, db,
      eventId: command.eventId, event});
    const result: unknown = {
      eventId: command.eventId,
      organizerId: command.organizerId,
      setupRevision: event.setupRevision,
      canEditBasics,
      canChangeCity: canEditBasics && event.meetingLocation === undefined &&
        event.meetingPoint === undefined && event.sourceVenueId === undefined,
      eventDetails: {
        endTimeMillis,
        venueName: event.meetingLocation?.name ?? event.meetingPoint ?? null,
        meetingLocation: event.meetingLocation ?? null,
        description: event.description ?? null,
        itinerary: event.itinerary ?? [],
        eventPhotos: event.eventPhotos ?? [],
        distanceKm: event.distanceKm ?? null,
        pace: event.pace ?? null,
        admissionTerms: isEventPolicyTerms(event as EventDocument) ? {
          capacityLimit: event.capacityLimit, priceInPaise: event.priceInPaise,
          currency: event.currency ?? "INR",
          cancellationPolicyId: eventPolicyFromEvent(event as EventDocument)
            .cancellation.policyId,
        } : null,
        sourceVenueId: event.sourceVenueId ?? null,
        eventFormat: event.eventFormat ?? null,
      },
      eventPreferences: projectEventPreferences(preferencesSnap.data(),
        command.organizerId, command.eventId),
      name: event.name,
      city: {cityId: event.eventCityId, marketId: event.eventMarketId},
      localDate: event.eventLocalDate,
      localStartTime: event.eventLocalStartTime,
      timezone: event.eventTimezone,
      startTimeMillis: event.startTime?.toMillis?.(),
      publicationState: event.publicationState,
      publicationReadiness: eventPublicationReadiness({
        event: event as EventDocument, organizer: manager,
        nowMillis: (params.nowMillis ?? Date.now)(),
        timestampFromMillis: Timestamp.fromMillis}),
      status: event.status,
      setupDefaults: event.setupDefaults,
      detailsConfigured: event.endTime !== undefined ||
        event.meetingLocation !== undefined ||
        event.meetingPoint !== undefined ||
        event.eventFormat !== undefined ||
        event.eventSuccessPlanId !== undefined ||
        event.description !== undefined || event.capacityLimit !== undefined,
    };
    if (!validatePrivateEventSetupCallableResponse(result)) {
      throw new HttpsError("failed-precondition",
        "Event setup is incomplete or invalid. Contact support.");
    }
    return result as PrivateEventSetupCallableResponse;
  });
}
