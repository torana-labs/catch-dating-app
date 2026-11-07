import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {UploadedPhoto} from "../shared/generated/firestoreAdminTypes";
import {normalizeUploadedPhotosForFirestore} from
  "../shared/uploadedPhotoNormalization";
import {
  authorizeSetupManager,
  hashRequest,
  receiptFor,
} from "./progressiveSetup/service";

const id = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const requestId = /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/;
const digest = /^[a-f0-9]{64}$/;
export const EVENT_MEDIA_REQUEST_MAX_BYTES = 64 * 1024;

export interface EventMediaRecoveryReceipt {
  actorUid: string;
  organizerId: string;
  eventId: string;
  requestId: string;
  payloadHash: string;
}

/** Hash only ordered presentation identity. Derived thumbnails/moderation do
 * not invalidate a pending request; a changed gallery or cover always does. */
export function eventMediaFingerprint(
  event: Record<string, unknown>
): string {
  const photos = event.eventPhotos ?? [];
  if (
    !Array.isArray(photos) ||
    (event.photoUrl != null && typeof event.photoUrl !== "string")
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Invalid current event media."
    );
  }
  return sha([event.photoUrl ?? null, photos.map(mediaTuple)]);
}

/** Existing updateEvent's bounded media-only transaction. The callable still
 * performs generated schema validation, authentication and rate limiting. */
export async function updateEventMediaRecovery(params: {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  eventId: string;
  identity: unknown;
  fields: unknown;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}): Promise<{updated: true; receipt: EventMediaRecoveryReceipt}> {
  const {db, actorUid, eventId, serverTimestamp} = params;
  const identity = parseIdentity(params.identity);
  if (
    !id.test(actorUid) ||
    !id.test(eventId) ||
    Buffer.byteLength(JSON.stringify([identity, params.fields]), "utf8") >
      EVENT_MEDIA_REQUEST_MAX_BYTES
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid or oversized media request."
    );
  }
  const photos = parsePhotos(eventId, params.fields);
  const tuples = photos.map(mediaTuple);
  const payloadHash = sha([
    actorUid,
    identity.organizerId,
    eventId,
    identity.requestId,
    identity.expectedMediaHash,
    tuples,
  ]);
  // Bind timestamps too; normalizing transport encodings does not permit the
  // same request ID to acquire a different immutable attachment payload.
  const requestHash = hashRequest("update", [
    "media",
    payloadHash,
    photos.map((photo) => [
      photo.createdAt.seconds,
      photo.createdAt.nanoseconds,
      photo.updatedAt.seconds,
      photo.updatedAt.nanoseconds,
    ]),
  ]);
  const result: EventMediaRecoveryReceipt = {
    actorUid,
    organizerId: identity.organizerId,
    eventId,
    requestId: identity.requestId,
    payloadHash,
  };
  const eventRef = db.collection("events").doc(eventId);
  const receiptRef = receiptFor(
    db,
    actorUid,
    identity.organizerId,
    identity.requestId
  );
  return db.runTransaction(async (tx) => {
    const [eventSnap, organizerSnap, deletedSnap, receiptSnap] =
      await Promise.all([
        tx.get(eventRef),
        tx.get(db.collection("organizers").doc(identity.organizerId)),
        tx.get(db.collection("deletedUsers").doc(actorUid)),
        tx.get(receiptRef),
      ]);
    authorizeSetupManager(organizerSnap, deletedSnap, actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== identity.organizerId) {
      throw new HttpsError("not-found", "Event is unavailable.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data();
      if (
        !receipt ||
        receipt.operation !== "media" ||
        receipt.actorUid !== actorUid ||
        receipt.eventId !== eventId ||
        receipt.organizerId !== identity.organizerId ||
        receipt.requestId !== identity.requestId ||
        receipt.requestHash !== requestHash ||
        receipt.mediaPayloadHash !== payloadHash
      ) {
        throw new HttpsError(
          "already-exists",
          "Request ID was already used for different work."
        );
      }
      // Reconcile before checking the current gallery/status. A later edit or
      // cancellation does not undo the original committed receipt or replay it.
      return {updated: true, receipt: result};
    }
    // A private event's media belong to the progressive setup commands.
    const revision = event.setupRevision;
    if (
      event.status !== "active" ||
      event.publicationState !== "published" ||
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      revision >= 2147483647
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This event is not eligible for create-photo recovery."
      );
    }
    if (eventMediaFingerprint(event) !== identity.expectedMediaHash) {
      throw new HttpsError(
        "aborted",
        "Event photos changed. Review them first."
      );
    }
    // This recovery attaches new create media only. It cannot become a second
    // editor/cleanup authority for a pre-existing gallery.
    if (
      (event.eventPhotos as unknown[] | undefined)?.length ||
      event.photoUrl
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Use the event editor to replace an existing gallery."
      );
    }
    tx.update(eventRef, {
      photoUrl: photos[0].url,
      eventPhotos: photos,
      setupRevision: revision + 1,
      updatedAt: serverTimestamp(),
    });
    tx.create(receiptRef, {
      operation: "media",
      actorUid,
      organizerId: identity.organizerId,
      eventId,
      requestId: identity.requestId,
      requestHash,
      mediaPayloadHash: payloadHash,
      createdAt: serverTimestamp(),
    });
    return {updated: true, receipt: result};
  });
}

function parseIdentity(value: unknown): {
  organizerId: string;
  requestId: string;
  expectedMediaHash: string;
} {
  if (
    !record(value) ||
    Object.keys(value).some(
      (key) =>
        !["organizerId", "requestId", "expectedMediaHash"].includes(key)
    ) ||
    typeof value.organizerId !== "string" ||
    !id.test(value.organizerId) ||
    typeof value.requestId !== "string" ||
    !requestId.test(value.requestId) ||
    typeof value.expectedMediaHash !== "string" ||
    !digest.test(value.expectedMediaHash)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid media request identity."
    );
  }
  return {
    organizerId: value.organizerId,
    requestId: value.requestId,
    expectedMediaHash: value.expectedMediaHash,
  };
}

function parsePhotos(eventId: string, value: unknown): UploadedPhoto[] {
  if (
    !record(value) ||
    Object.keys(value).length !== 2 ||
    !Array.isArray(value.eventPhotos) ||
    !value.eventPhotos.length ||
    !Object.hasOwn(value, "photoUrl")
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Only complete media fields are allowed."
    );
  }
  const allowed = new Set([
    "id",
    "url",
    "storagePath",
    "position",
    "createdAt",
    "updatedAt",
    "thumbnailUrl",
    "thumbnailStoragePath",
  ]);
  const seen = new Set<string>();
  for (const [position, photo] of value.eventPhotos.entries()) {
    if (
      !record(photo) ||
      Object.keys(photo).some((key) => !allowed.has(key)) ||
      typeof photo.id !== "string" ||
      !requestId.test(photo.id) ||
      seen.has(photo.id) ||
      photo.position !== position ||
      photo.storagePath !==
        `events/${eventId}/media/${photo.id}/original.jpg` ||
      photo.thumbnailUrl !== null ||
      photo.thumbnailStoragePath !== null ||
      typeof photo.url !== "string" ||
      photo.url.length > 2048
    ) {
      throw new HttpsError("invalid-argument", "Invalid owned event photo.");
    }
    let url: URL;
    try {
      url = new URL(photo.url);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid event photo URL.");
    }
    if (url.protocol !== "https:") {
      throw new HttpsError("invalid-argument", "Invalid event photo URL.");
    }
    seen.add(photo.id);
  }
  let photos: UploadedPhoto[];
  try {
    photos = normalizeUploadedPhotosForFirestore(value.eventPhotos);
  } catch {
    throw new HttpsError("invalid-argument", "Invalid media timestamp.");
  }
  if (value.photoUrl !== photos[0].url) {
    throw new HttpsError(
      "invalid-argument",
      "Cover must match the first photo."
    );
  }
  return photos;
}

function mediaTuple(photo: unknown): unknown[] {
  if (
    !record(photo) ||
    typeof photo.id !== "string" ||
    typeof photo.url !== "string" ||
    typeof photo.storagePath !== "string" ||
    !Number.isSafeInteger(photo.position)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Invalid current event media."
    );
  }
  return [photo.id, photo.url, photo.storagePath, photo.position];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
