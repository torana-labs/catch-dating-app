import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {isOrganizerManager} from "../shared/organizerHosts";
import {eventParticipationId} from "../shared/relationshipDocuments";
import type {
  EventDocument,
  EventHostPhotoDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AddEventHostPhotoCallablePayload} from
  "../shared/generated/addEventHostPhotoCallablePayload";
import type {DeleteEventHostPhotoCallablePayload} from
  "../shared/generated/deleteEventHostPhotoCallablePayload";
import type {ListEventHostPhotosCallablePayload} from
  "../shared/generated/listEventHostPhotosCallablePayload";
import type {EventHostPhotoCallableResponse} from
  "../shared/generated/eventHostPhotoCallableResponse";
import type {EventHostPhotosCallableResponse} from
  "../shared/generated/eventHostPhotosCallableResponse";
import type {DeleteEventHostPhotoCallableResponse} from
  "../shared/generated/deleteEventHostPhotoCallableResponse";
import {validateAddEventHostPhotoCallablePayload} from
  "../shared/generated/validators/addEventHostPhotoInput";
import {validateDeleteEventHostPhotoCallablePayload} from
  "../shared/generated/validators/deleteEventHostPhotoInput";
import {validateListEventHostPhotosCallablePayload} from
  "../shared/generated/validators/listEventHostPhotosInput";
import {validateEventHostPhotoCallableResponse} from
  "../shared/generated/validators/eventHostPhotoOutput";
import {validateEventHostPhotosCallableResponse} from
  "../shared/generated/validators/eventHostPhotosOutput";
import {validateDeleteEventHostPhotoCallableResponse} from
  "../shared/generated/validators/deleteEventHostPhotoOutput";
import {validateEventHostPhotoDocument} from
  "../shared/generated/validators/eventHostPhotoDocument";

// Host photos for checked-in guests. The host team stages one original per
// photo at events/{eventId}/hostPhotoUploads/{photoId}/original.{ext} (the
// Storage rules allow only organizer owners and managers, once the event has
// started, JPEG or PNG up to 8 MB). addEventHostPhoto re-encodes it into a
// display JPEG and a thumbnail JPEG without EXIF, GPS or any other metadata,
// deletes the staged original and records the photo. Every direct read of
// either folder is denied; listEventHostPhotos hands checked-in guests and
// the host team short-lived signed URLs without download tokens.

export const EVENT_HOST_PHOTOS_COLLECTION = "eventHostPhotos";
/** The most photos one event can share. */
export const MAX_EVENT_HOST_PHOTOS = 100;
export const MAX_HOST_PHOTO_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_TYPES = new Set(["image/jpeg", "image/png"]);
const UPLOAD_FILE_NAMES = ["original.jpg", "original.jpeg", "original.png"];
const DISPLAY_EDGE = 2048;
const THUMBNAIL_EDGE = 480;
const MAX_INPUT_PIXELS = 40_000_000;
/** Signed read URLs live just long enough to render a screen. */
export const HOST_PHOTO_READ_URL_MILLIS = 15 * 60 * 1000;

export type HostPhotoBucket =
  ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

export interface ReencodedHostPhoto {
  display: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
}

export interface EventHostPhotoDeps {
  firestore: () => FirebaseFirestore.Firestore;
  storageBucket: () => HostPhotoBucket;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  reencode: (source: Buffer) => Promise<ReencodedHostPhoto>;
}

export const defaultEventHostPhotoDeps: EventHostPhotoDeps = {
  firestore: () => admin.firestore(),
  storageBucket: () => admin.storage().bucket(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  reencode: reencodeHostPhoto,
};

export function eventHostPhotoDocId(eventId: string, photoId: string): string {
  return `${eventId}_${photoId}`;
}

export function hostPhotoUploadPrefix(eventId: string, photoId: string):
  string {
  return `events/${eventId}/hostPhotoUploads/${photoId}/`;
}

export function hostPhotoPaths(eventId: string, photoId: string): {
  display: string; thumbnail: string;
} {
  const base = `events/${eventId}/hostPhotos/${photoId}`;
  return {display: `${base}/display.jpg`, thumbnail: `${base}/thumbnail.jpg`};
}

/**
 * Decodes an image and writes fresh JPEGs. sharp drops EXIF (GPS included),
 * XMP, IPTC and ICC metadata unless withMetadata() asks for them, so nothing
 * but pixels survives; rotate() first bakes the EXIF orientation in.
 * @param {Buffer} source The staged original.
 * @return {Promise<ReencodedHostPhoto>} Display and thumbnail JPEGs.
 */
export async function reencodeHostPhoto(source: Buffer):
  Promise<ReencodedHostPhoto> {
  const sharp = (await import("sharp")).default;
  let display: {data: Buffer; info: {width: number; height: number}};
  let thumbnail: Buffer;
  try {
    display = await sharp(source, {limitInputPixels: MAX_INPUT_PIXELS})
      .rotate()
      .resize(DISPLAY_EDGE, DISPLAY_EDGE,
        {fit: "inside", withoutEnlargement: true})
      .jpeg({quality: 82, mozjpeg: true})
      .toBuffer({resolveWithObject: true});
    thumbnail = await sharp(display.data)
      .resize(THUMBNAIL_EDGE, THUMBNAIL_EDGE,
        {fit: "inside", withoutEnlargement: true})
      .jpeg({quality: 76, mozjpeg: true})
      .toBuffer();
  } catch {
    throw new HttpsError("invalid-argument",
      "This photo could not be read. Choose another photo.");
  }
  return {display: display.data, thumbnail,
    width: display.info.width, height: display.info.height};
}

interface EventAuthority {
  event: EventDocument;
  organizer: OrganizerDocument;
  organizerId: string;
  isHost: boolean;
}

async function loadEventAuthority(db: FirebaseFirestore.Firestore,
  eventId: string, uid: string): Promise<EventAuthority> {
  const eventSnap = await db.collection("events").doc(eventId).get();
  const event = eventSnap.data() as EventDocument | undefined;
  if (!event) throw new HttpsError("not-found", "Event not found.");
  const organizerId = event.organizerId;
  if (!organizerId) {
    throw new HttpsError("failed-precondition", "Event has no organizer.");
  }
  const organizerSnap = await db.collection("organizers").doc(organizerId)
    .get();
  const organizer = organizerSnap.data() as OrganizerDocument | undefined;
  if (!organizer) throw new HttpsError("not-found", "Organizer not found.");
  return {event, organizer, organizerId,
    isHost: isOrganizerManager(organizer, uid)};
}

function requireHost(authority: EventAuthority): void {
  if (!authority.isHost) {
    throw new HttpsError("permission-denied",
      "Only the event's host team can manage its photos.");
  }
}

function startMillis(event: EventDocument): number | null {
  const start = event.startTime as unknown;
  if (start && typeof start === "object" &&
      typeof (start as {toMillis?: unknown}).toMillis === "function") {
    return (start as FirebaseFirestore.Timestamp).toMillis();
  }
  return null;
}

/**
 * Mirrors hasCheckedInEventSuccessAccess in firestore.rules: an attended
 * Catch booking, or a ready runtime participant whose linked roster row is
 * checked in.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId Event id.
 * @param {string} uid Caller.
 * @return {Promise<boolean>} Whether the caller checked in.
 */
export async function hasCheckedIn(db: FirebaseFirestore.Firestore,
  eventId: string, uid: string): Promise<boolean> {
  const [participationSnap, runtimeSnap] = await Promise.all([
    db.collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid)).get(),
    db.collection("eventRuntimeParticipants").doc(`${eventId}_${uid}`).get(),
  ]);
  const participation = participationSnap.data();
  if (participation?.status === "attended") return true;
  const runtime = runtimeSnap.data();
  if (!runtime || runtime.eventId !== eventId || runtime.uid !== uid ||
      runtime.accessStatus !== "ready" ||
      typeof runtime.eventAttendeeId !== "string") {
    return false;
  }
  const attendee = (await db.collection("eventAttendees")
    .doc(runtime.eventAttendeeId).get()).data();
  return attendee?.eventId === eventId && attendee.linkedUid === uid &&
    attendee.status === "checkedIn";
}

async function signedUrl(bucket: HostPhotoBucket, path: string,
  expiresAtMillis: number): Promise<string> {
  const [url] = await bucket.file(path)
    .getSignedUrl({action: "read", expires: expiresAtMillis});
  return url;
}

async function photoItem(bucket: HostPhotoBucket,
  photo: EventHostPhotoDocument, expiresAtMillis: number) {
  const [thumbnailUrl, displayUrl] = await Promise.all([
    signedUrl(bucket, photo.thumbnailStoragePath, expiresAtMillis),
    signedUrl(bucket, photo.displayStoragePath, expiresAtMillis),
  ]);
  return {photoId: photo.photoId, thumbnailUrl, displayUrl,
    width: photo.width, height: photo.height,
    uploadedByUid: photo.uploadedByUid,
    createdAtMillis: photo.createdAtMillis};
}

function requireValid<T>(validate: (value: unknown) => boolean, value: T,
  label: string): T {
  if (!validate(value)) throw new HttpsError("internal", `Invalid ${label}.`);
  return value;
}

interface StagedUpload {
  path: string;
  sizeBytes: number;
}

/** Finds the caller's staged original and checks its binding. A staged
 *  object that breaks the upload policy is deleted and rejected. */
async function requireStagedUpload(bucket: HostPhotoBucket, eventId: string,
  photoId: string, uid: string): Promise<StagedUpload> {
  for (const fileName of UPLOAD_FILE_NAMES) {
    const path = hostPhotoUploadPrefix(eventId, photoId) + fileName;
    const file = bucket.file(path);
    let metadata: import("@google-cloud/storage").FileMetadata;
    try {
      [metadata] = await file.getMetadata();
    } catch {
      continue;
    }
    const sizeBytes = Number(metadata.size);
    const ok = Number.isSafeInteger(sizeBytes) && sizeBytes >= 1 &&
      sizeBytes <= MAX_HOST_PHOTO_UPLOAD_BYTES &&
      typeof metadata.contentType === "string" &&
      UPLOAD_TYPES.has(metadata.contentType) &&
      metadata.metadata?.uploaderUid === uid;
    if (!ok) {
      await file.delete({ignoreNotFound: true});
      throw new HttpsError("failed-precondition",
        "The uploaded photo did not match its upload.");
    }
    return {path, sizeBytes};
  }
  throw new HttpsError("failed-precondition", "Upload the photo first.");
}

/** Shares one staged photo with the event's checked-in guests. */
export async function addEventHostPhotoHandler(
  request: CallableRequest<unknown>,
  deps: EventHostPhotoDeps = defaultEventHostPhotoDeps,
): Promise<EventHostPhotoCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<AddEventHostPhotoCallablePayload>(
    request, validateAddEventHostPhotoCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "addEventHostPhoto",
    {maxRequests: 120, windowMs: 60 * 1000});
  const authority = await loadEventAuthority(db, data.eventId, uid);
  requireHost(authority);
  const nowMillis = deps.now().toMillis();
  const start = startMillis(authority.event);
  if (start === null || start > nowMillis) {
    throw new HttpsError("failed-precondition",
      "Photos can be shared once the event has started.");
  }
  const bucket = deps.storageBucket();
  const ref = db.collection(EVENT_HOST_PHOTOS_COLLECTION)
    .doc(eventHostPhotoDocId(data.eventId, data.photoId));
  const expiresAtMillis = nowMillis + HOST_PHOTO_READ_URL_MILLIS;
  const respond = async (photo: EventHostPhotoDocument) =>
    requireValid(validateEventHostPhotoCallableResponse, {
      eventId: data.eventId,
      photo: await photoItem(bucket, photo, expiresAtMillis),
      urlsExpireAtMillis: expiresAtMillis,
    }, "host photo");

  const existing = (await ref.get()).data() as
    EventHostPhotoDocument | undefined;
  if (existing) return respond(existing);

  const staged = await requireStagedUpload(bucket, data.eventId,
    data.photoId, uid);
  const shared = await db.collection(EVENT_HOST_PHOTOS_COLLECTION)
    .where("eventId", "==", data.eventId)
    .limit(MAX_EVENT_HOST_PHOTOS).get();
  if (shared.size >= MAX_EVENT_HOST_PHOTOS) {
    await bucket.file(staged.path).delete({ignoreNotFound: true});
    throw new HttpsError("resource-exhausted",
      `An event can share up to ${MAX_EVENT_HOST_PHOTOS} photos.`);
  }
  const [source] = await bucket.file(staged.path).download();
  let reencoded: ReencodedHostPhoto;
  try {
    reencoded = await deps.reencode(source);
  } catch (error) {
    await bucket.file(staged.path).delete({ignoreNotFound: true});
    throw error;
  }
  const paths = hostPhotoPaths(data.eventId, data.photoId);
  await Promise.all([
    bucket.file(paths.display).save(reencoded.display,
      {resumable: false, contentType: "image/jpeg"}),
    bucket.file(paths.thumbnail).save(reencoded.thumbnail,
      {resumable: false, contentType: "image/jpeg"}),
  ]);
  const next: EventHostPhotoDocument = {
    eventId: data.eventId,
    organizerId: authority.organizerId,
    photoId: data.photoId,
    displayStoragePath: paths.display,
    thumbnailStoragePath: paths.thumbnail,
    width: reencoded.width,
    height: reencoded.height,
    sizeBytes: reencoded.display.length,
    uploadedByUid: uid,
    createdAtMillis: nowMillis,
  };
  const stored = await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      EventHostPhotoDocument | undefined;
    if (current) return current;
    tx.set(ref, requireValid(validateEventHostPhotoDocument, next,
      "host photo document"));
    return next;
  });
  await bucket.file(staged.path).delete({ignoreNotFound: true});
  return respond(stored);
}

/** The event's shared host photos for checked-in guests and the host team. */
export async function listEventHostPhotosHandler(
  request: CallableRequest<unknown>,
  deps: EventHostPhotoDeps = defaultEventHostPhotoDeps,
): Promise<EventHostPhotosCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ListEventHostPhotosCallablePayload>(
    request, validateListEventHostPhotosCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "listEventHostPhotos",
    {maxRequests: 60, windowMs: 60 * 1000});
  const authority = await loadEventAuthority(db, data.eventId, uid);
  const access = authority.isHost ? "host" :
    await hasCheckedIn(db, data.eventId, uid) ? "guest" : "none";
  const expiresAtMillis = deps.now().toMillis() + HOST_PHOTO_READ_URL_MILLIS;
  let photos: Awaited<ReturnType<typeof photoItem>>[] = [];
  if (access !== "none") {
    const snap = await db.collection(EVENT_HOST_PHOTOS_COLLECTION)
      .where("eventId", "==", data.eventId)
      .limit(MAX_EVENT_HOST_PHOTOS).get();
    const docs = snap.docs.map((doc) => doc.data() as EventHostPhotoDocument)
      .filter((photo) => photo.organizerId === authority.organizerId)
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis ||
        a.photoId.localeCompare(b.photoId));
    const bucket = deps.storageBucket();
    photos = await Promise.all(docs.map((photo) =>
      photoItem(bucket, photo, expiresAtMillis)));
  }
  const organizerName = typeof authority.organizer.name === "string" &&
    authority.organizer.name.trim().length > 0 ?
    authority.organizer.name.trim().slice(0, 200) : null;
  return requireValid(validateEventHostPhotosCallableResponse, {
    eventId: data.eventId,
    organizerName,
    access,
    maxPhotos: MAX_EVENT_HOST_PHOTOS,
    photos,
    urlsExpireAtMillis: expiresAtMillis,
  }, "host photos");
}

/** Removes a shared host photo and its files. */
export async function deleteEventHostPhotoHandler(
  request: CallableRequest<unknown>,
  deps: EventHostPhotoDeps = defaultEventHostPhotoDeps,
): Promise<DeleteEventHostPhotoCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<DeleteEventHostPhotoCallablePayload>(
    request, validateDeleteEventHostPhotoCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "deleteEventHostPhoto",
    {maxRequests: 120, windowMs: 60 * 1000});
  const authority = await loadEventAuthority(db, data.eventId, uid);
  requireHost(authority);
  const ref = db.collection(EVENT_HOST_PHOTOS_COLLECTION)
    .doc(eventHostPhotoDocId(data.eventId, data.photoId));
  const removed = await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      EventHostPhotoDocument | undefined;
    if (!current) return null;
    if (current.eventId !== data.eventId ||
        current.organizerId !== authority.organizerId) {
      throw new HttpsError("permission-denied",
        "Only the event's host team can manage its photos.");
    }
    tx.delete(ref);
    return current;
  });
  const bucket = deps.storageBucket();
  const paths = removed ?
    [removed.displayStoragePath, removed.thumbnailStoragePath] :
    Object.values(hostPhotoPaths(data.eventId, data.photoId));
  await Promise.all(paths.map((path) =>
    bucket.file(path).delete({ignoreNotFound: true})));
  return requireValid(validateDeleteEventHostPhotoCallableResponse, {
    eventId: data.eventId, photoId: data.photoId, deleted: removed !== null,
  }, "deleted host photo");
}

const reencodeLimits = {timeoutSeconds: 120, memory: "1GiB" as const,
  maxInstances: 20};
const readLimits = {timeoutSeconds: 60, maxInstances: 20};

export const addEventHostPhoto = onCall(
  appCheckCallableOptionsWithLimits(reencodeLimits),
  (request) => addEventHostPhotoHandler(request),
);
export const listEventHostPhotos = onCall(
  appCheckCallableOptionsWithLimits(readLimits),
  (request) => listEventHostPhotosHandler(request),
);
export const deleteEventHostPhoto = onCall(
  appCheckCallableOptionsWithLimits(readLimits),
  (request) => deleteEventHostPhotoHandler(request),
);
