import {normalizeEventItinerary, assertValidEventItinerary} from
  "../event_itinerary";
import {normalizeUploadedPhotosForFirestore} from
  "../../shared/uploadedPhotoNormalization";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument, OrganizerEventVenueDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {requireDoc} from "../../shared/validation";
import {EVENT_MAX_DURATION_MINUTES} from "../../shared/businessRules";
import {organizerEventVenueDocumentId,
  assertOrganizerEventVenueSource} from "../organizerEventVenues";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import {projectManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {assertPrivateEventBasicsEditable} from "./commitments";
import {eventListingTermsPatch, preparePrivateListingTerms} from
  "./listingTerms";
import {authorizeSetupManager, hashRequest, receiptFor,
  requireRevision, ProgressiveSetupDependencies,
  ProgressiveSetupResult} from "./service";

import type {UpdatePrivateEventDetailsCallablePayload} from
  "../../shared/generated/updatePrivateEventDetailsCallablePayload";
import {validateUpdatePrivateEventDetailsCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventDetailsInput";

export type UpdatePrivateEventDetailsCommand =
  UpdatePrivateEventDetailsCallablePayload;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

function duration(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 15 ||
      (value as number) > EVENT_MAX_DURATION_MINUTES) {
    throw new HttpsError("invalid-argument", "Invalid event duration.");
  }
  return value as number;
}

function venueName(value: unknown): string {
  if (!value || typeof value !== "object" ||
      typeof (value as {name?: unknown}).name !== "string") {
    throw new HttpsError("invalid-argument", "Invalid event venue.");
  }
  const name = (value as {name: string}).name.trim();
  if (!name || name.length > 240) {
    throw new HttpsError("invalid-argument", "Invalid event venue.");
  }
  return name;
}

/** Saves optional private details on the same canonical events/{id} record. */
export async function updatePrivateEventDetails(params: {
  actorUid: string;
  command: UpdatePrivateEventDetailsCommand;
  deps: ProgressiveSetupDependencies;
}): Promise<ProgressiveSetupResult> {
  const {actorUid, command, deps} = params;
  if (!ID.test(actorUid)) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  if (!validateUpdatePrivateEventDetailsCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event details.");
  }
  const {db} = deps;
  const eventRef = db.collection("events").doc(command.eventId);
  const receiptRef = receiptFor(db, actorUid, command.organizerId,
    command.requestId);
  const hash = hashRequest("details", command);
  return db.runTransaction(async (tx) => {
    const [organizerSnap, deletedSnap, eventSnap, defaultsSnap, receiptSnap] =
      await Promise.all([
        tx.get(db.collection("organizers").doc(command.organizerId)),
        tx.get(db.collection("deletedUsers").doc(actorUid)),
        tx.get(eventRef),
        tx.get(db.collection("organizerEventSetupDefaults")
          .doc(command.organizerId)),
        tx.get(receiptRef),
      ]);
    const organizer = authorizeSetupManager(organizerSnap, deletedSnap,
      actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data();
      if (isDiscardedDetailsReceipt(receipt!, actorUid, command)) {
        throw new HttpsError("aborted", "This change was discarded.", {
          ...privateDetailsReviewStale(command).details as object,
          reason: "event-details-discarded"});
      }
      if (receipt?.operation !== "details" ||
          receipt.actorUid !== actorUid ||
          receipt.organizerId !== command.organizerId ||
          receipt.eventId !== command.eventId ||
          receipt.requestHash !== hash ||
          !Number.isSafeInteger(receipt.appliedRevision)) {
        throw new HttpsError("already-exists",
          "Request ID was used for another event change.");
      }
      return {eventId: command.eventId,
        setupRevision: receipt.appliedRevision,
        replayed: true};
    }
    await readSeatMigrationWriterFence({db, tx, eventId: command.eventId});
    if (!validateEventDocument(event) ||
        event.publicationState !== "private" ||
        event.publicRegistrationEnabled !== false ||
        event.status !== "active") {
      throw new HttpsError("failed-precondition",
        "Only active private event details can be edited here.");
    }
    const revision = requireRevision(event);
    if (revision !== command.expectedSetupRevision) {
      throw privateDetailsReviewStale(command);
    }
    const defaults = projectManagerEventSetupDefaults(command.organizerId,
      organizer, defaultsSnap.data(), eventSetupDefaultsDependencies(db));
    if (defaults.preferencesHash !== command.reviewedDefaultsHash) {
      throw privateDetailsReviewStale(command);
    }
    const venueDecision = command.details.venue;
    const preferredVenueId = venueDecision?.mode === "inherit" ?
      defaults.preferences.preferredVenueId : undefined;
    let savedVenue: OrganizerEventVenueDocument | undefined;
    if (venueDecision?.mode === "inherit") {
      if (!preferredVenueId || !ID.test(preferredVenueId)) {
        throw new HttpsError("failed-precondition",
          "Choose a venue before inheriting a saved place.");
      }
      const venueSnap = await tx.get(db.collection("organizerEventVenues")
        .doc(organizerEventVenueDocumentId(command.organizerId,
          preferredVenueId)));
      if (!venueSnap.exists) {
        throw new HttpsError("failed-precondition",
          "The saved place is unavailable.");
      }
      savedVenue = requireDoc<OrganizerEventVenueDocument>(venueSnap,
        "OrganizerEventVenueDocument");
      assertOrganizerEventVenueSource({venue: savedVenue,
        organizerId: command.organizerId, venueId: preferredVenueId,
        meetingLocation: savedVenue.meetingLocation});
    }

    const next: Record<string, unknown> = {...event};
    const patch: Record<string, unknown> = {};
    const drop = (key: string) => {
      if (!(key in next)) return;
      delete next[key];
      patch[key] = admin.firestore.FieldValue.delete();
    };
    const set = (key: string, value: unknown) => {
      next[key] = value;
      patch[key] = value;
    };
    if (command.details.description !== undefined) {
      set("description", command.details.description.trim());
    }
    if (command.details.distanceKm !== undefined) {
      set("distanceKm", command.details.distanceKm);
    }
    if (command.details.pace !== undefined) set("pace", command.details.pace);
    if (command.details.itinerary !== undefined) {
      set("itinerary", normalizeEventItinerary(command.details.itinerary));
    }
    if (command.details.eventPhotos !== undefined) {
      const photos = normalizeUploadedPhotosForFirestore(
        command.details.eventPhotos)
        .map((photo, position) => ({...photo, position}));
      set("eventPhotos", photos);
      set("photoUrl", photos[0]?.url ?? null);
    }
    const terms = command.details.admissionTerms;
    if (terms) {
      const termsPatch = eventListingTermsPatch(
        event as unknown as EventDocument, terms);
      for (const [key, value] of Object.entries(termsPatch)) set(key, value);
    }
    const durationDecision = command.details.durationMinutes;
    if (durationDecision) {
      if (durationDecision.mode === "clear") {
        drop("endTime");
      } else {
        const minutes = duration(durationDecision.mode === "inherit" ?
          defaults.preferences.usualDurationMinutes : durationDecision.value);
        const start = event.startTime as unknown as
          FirebaseFirestore.Timestamp;
        const startMillis = typeof start?.toMillis === "function" ?
          start.toMillis() : null;
        if (startMillis === null || !Number.isSafeInteger(startMillis)) {
          throw new HttpsError("failed-precondition",
            "Event start time needs review.");
        }
        set("endTime", deps.timestampFromMillis(startMillis +
          minutes * 60_000));
      }
    }
    if (event.firstPublishedAt !== undefined &&
        canonicalJson(event.endTime) !== canonicalJson(next.endTime)) {
      throw new HttpsError("failed-precondition",
        "A previously published schedule needs the event change flow.");
    }
    if (venueDecision) {
      for (const key of ["meetingPoint", "meetingLocation", "sourceVenueId",
        "startingPointLat", "startingPointLng", "locationDetails"]) {
        drop(key);
      }
      if (venueDecision.mode === "set") {
        const location = venueDecision.value;
        const name = venueName(location);
        set("meetingPoint", name);
        if ("latitude" in location && "longitude" in location) {
          set("meetingLocation", {...location, name});
          set("startingPointLat", location.latitude);
          set("startingPointLng", location.longitude);
          set("locationDetails", location.notes ?? null);
        }
      } else if (venueDecision.mode === "inherit" && savedVenue) {
        set("meetingPoint", savedVenue.meetingLocation.name);
        set("meetingLocation", savedVenue.meetingLocation);
        set("sourceVenueId", preferredVenueId);
        set("startingPointLat", savedVenue.meetingLocation.latitude);
        set("startingPointLng", savedVenue.meetingLocation.longitude);
        set("locationDetails", savedVenue.meetingLocation.notes ?? null);
      }
    }
    const formatDecision = command.details.eventFormat;
    if (formatDecision?.mode === "clear") drop("eventFormat");
    if (formatDecision?.mode === "set") {
      set("eventFormat", formatDecision.value);
    }
    if (formatDecision?.mode === "set") {
      const distanceKinds = ["socialRun", "running", "walking", "cycling"];
      if (!distanceKinds.includes(formatDecision.value.activityKind)) {
        // Compatibility fields are hidden for non-distance formats by readers.
        set("distanceKm", 0);
        set("pace", "easy");
      } else if (!event.eventFormat ||
          !distanceKinds.includes(event.eventFormat.activityKind)) {
        if (command.details.distanceKm === undefined) drop("distanceKm");
        if (command.details.pace === undefined) drop("pace");
      }
    }
    // Hosts can complete location/duration after offers or roster import.
    // Format changes can alter cohort/rotation expectations, so they retain
    // the same commitment guard as date/city changes. Unchanged format is
    // harmless when a client saves the complete details form.
    if (canonicalJson(event.eventFormat ?? null) !==
        canonicalJson(next.eventFormat ?? null)) {
      const guard = deps.assertBasicsEditable ??
        assertPrivateEventBasicsEditable;
      await guard({tx, db, eventId: command.eventId, event});
    }
    const startMillis = (event.startTime as unknown as
      FirebaseFirestore.Timestamp).toMillis();
    const endMillis = (next.endTime as FirebaseFirestore.Timestamp | undefined)
      ?.toMillis() ?? startMillis + EVENT_MAX_DURATION_MINUTES * 60_000;
    assertValidEventItinerary({
      itinerary: next.itinerary as EventDocument["itinerary"],
      startTimeMillis: startMillis, endTimeMillis: endMillis,
      eventFormat: next.eventFormat as EventDocument["eventFormat"],
    });
    if (!validateEventDocument(next)) {
      throw new HttpsError("invalid-argument", "Invalid event details.");
    }
    const ledger = terms ? await preparePrivateListingTerms({db, tx,
      eventId: command.eventId, before: event as unknown as EventDocument,
      after: next as unknown as EventDocument}) : null;
    if (ledger?.ledger) {
      tx.set(db.collection("eventSeatLedgers").doc(command.eventId),
        ledger.ledger);
    }
    if (ledger?.fence) {
      tx.create(db.collection("eventSeatMigrationFences")
        .doc(command.eventId), ledger.fence);
    }
    tx.update(eventRef, {...patch, setupRevision: revision + 1,
      updatedAt: deps.serverTimestamp()});
    tx.create(receiptRef, {operation: "details", actorUid,
      organizerId: command.organizerId, eventId: command.eventId,
      requestHash: hash, appliedRevision: revision + 1,
      createdAt: deps.serverTimestamp()});
    return {eventId: command.eventId, setupRevision: revision + 1,
      replayed: false};
  });
}


/** Only use after the transaction established no receipt and no active run. */
export function privateDetailsReviewStale(
  command: UpdatePrivateEventDetailsCommand
): HttpsError {
  return new HttpsError("aborted", "Event settings changed. Review them again.",
    {reason: "event-details-review-stale", requestId: command.requestId,
      organizerId: command.organizerId, eventId: command.eventId,
      expectedSetupRevision: command.expectedSetupRevision,
      reviewedDefaultsHash: command.reviewedDefaultsHash});
}


/** Durable rejection blocks delayed sends of a discarded command. */
export function isDiscardedDetailsReceipt(raw: Record<string, unknown>,
  actorUid: string, command: UpdatePrivateEventDetailsCommand): boolean {
  if (raw.outcome !== "discarded") return false;
  if (raw.operation !== "details" || raw.actorUid !== actorUid ||
      raw.organizerId !== command.organizerId ||
      raw.eventId !== command.eventId ||
      raw.requestHash !== hashRequest("details", command) ||
      raw.expectedSetupRevision !== command.expectedSetupRevision ||
      raw.appliedRevision !== undefined) {
    throw new HttpsError("already-exists",
      "Request ID was used for another event change.");
  }
  return true;
}
