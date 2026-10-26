import {randomBytes} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  OrganizerDocument,
  OrganizerEventVenueDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertOrganizerEventVenueCallablePayload} from
  "../shared/generated/upsertOrganizerEventVenueCallablePayload";
import type {UpsertOrganizerEventVenueCallableResponse} from
  "../shared/generated/upsertOrganizerEventVenueCallableResponse";
import {
  validateUpsertOrganizerEventVenueCallablePayload,
} from
  "../shared/generated/validators/upsertOrganizerEventVenueInput";
import {isOrganizerManager} from "../shared/organizerHosts";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

interface OrganizerEventVenueDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  randomVenueId: () => string;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerEventVenueDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  randomVenueId: () => randomBytes(12).toString("base64url"),
  checkRateLimit: defaultCheckRateLimit,
};

/** Returns the deterministic organizer-venue document id. */
export function organizerEventVenueDocumentId(
  organizerId: string,
  venueId: string
): string {
  return `${organizerId}_${venueId}`;
}

/** Creates, updates, archives, or restores one reusable organizer venue. */
export async function upsertOrganizerEventVenueHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerEventVenueDeps = defaultDeps
): Promise<UpsertOrganizerEventVenueCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    UpsertOrganizerEventVenueCallablePayload
  >(request, validateUpsertOrganizerEventVenueCallablePayload);
  const label = payload.label.trim();
  const meetingLocation = normalizeMeetingLocation(payload.meetingLocation);
  if (!label || !meetingLocation.name) {
    throw new HttpsError(
      "invalid-argument",
      "Saved places require a label and meeting-location name."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "upsertOrganizerEventVenue", {
    maxRequests: 20, windowMs: 60 * 1000,
  });

  const organizerSnap = await db.collection("organizers")
    .doc(payload.organizerId).get();
  const organizer = requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  );
  if (!isOrganizerManager(organizer, uid)) {
    throw new HttpsError(
      "permission-denied",
      "Only organizer managers can save venues."
    );
  }

  const venueId = payload.venueId ?? deps.randomVenueId();
  const ref = db.collection("organizerEventVenues").doc(
    organizerEventVenueDocumentId(payload.organizerId, venueId)
  );
  const now = deps.now();
  const saved = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const current = existing.exists ?
      requireDoc<OrganizerEventVenueDocument>(
        existing,
        "OrganizerEventVenueDocument"
      ) : null;
    if (
      current &&
      (current.organizerId !== payload.organizerId ||
        current.venueId !== venueId)
    ) {
      throw new HttpsError("failed-precondition", "Venue identity mismatch.");
    }
    const venue: OrganizerEventVenueDocument = {
      organizerId: payload.organizerId,
      venueId,
      label,
      meetingLocation,
      defaultEventCapacity: payload.defaultEventCapacity ?? null,
      status: payload.status ?? "active",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    tx.set(ref, venue);
    return venue;
  });
  return {venue: publicOrganizerEventVenue(saved)};
}

/** Projects the reusable value without server-owned timestamps. */
export function publicOrganizerEventVenue(
  venue: OrganizerEventVenueDocument
): UpsertOrganizerEventVenueCallableResponse["venue"] {
  return {
    organizerId: venue.organizerId,
    venueId: venue.venueId,
    label: venue.label,
    meetingLocation: venue.meetingLocation,
    defaultEventCapacity: venue.defaultEventCapacity ?? null,
    status: venue.status,
  };
}

/** Verifies event provenance while allowing event-specific name/notes copy. */
export function assertOrganizerEventVenueSource(params: {
  venue: OrganizerEventVenueDocument;
  organizerId: string;
  venueId: string;
  meetingLocation: OrganizerEventVenueDocument["meetingLocation"];
}): void {
  if (
    params.venue.organizerId !== params.organizerId ||
    params.venue.venueId !== params.venueId
  ) {
    throw new HttpsError(
      "permission-denied",
      "The selected saved place belongs to another organizer."
    );
  }
  if (params.venue.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "The selected saved place has been archived."
    );
  }
  const source = params.venue.meetingLocation;
  const coordinatesMatch =
    Math.abs(source.latitude - params.meetingLocation.latitude) < 1e-7 &&
    Math.abs(source.longitude - params.meetingLocation.longitude) < 1e-7;
  const sourcePlaceId = source.placeId?.trim() || null;
  const eventPlaceId = params.meetingLocation.placeId?.trim() || null;
  if (!coordinatesMatch || sourcePlaceId !== eventPlaceId) {
    throw new HttpsError(
      "failed-precondition",
      "The selected saved place no longer matches this event location."
    );
  }
}

function normalizeMeetingLocation(
  location: UpsertOrganizerEventVenueCallablePayload["meetingLocation"]
): OrganizerEventVenueDocument["meetingLocation"] {
  return {
    name: location.name.trim(),
    address: trimToNull(location.address),
    placeId: trimToNull(location.placeId),
    latitude: location.latitude,
    longitude: location.longitude,
    notes: trimToNull(location.notes),
  };
}

function trimToNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export const upsertOrganizerEventVenue = onCall(
  appCheckCallableOptions,
  (request) => upsertOrganizerEventVenueHandler(request)
);
