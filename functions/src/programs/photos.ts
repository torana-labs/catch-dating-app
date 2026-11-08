import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import {
  defaultProgramAssetDeps,
  READ_URL_MILLIS,
  requireProgramAsset,
  signedReadUrl,
  type ProgramAssetDeps,
} from "./programAssets";
import type {
  ProgramPhotoDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramPhotoCallablePayload} from
  "../shared/generated/upsertProgramPhotoCallablePayload";
import type {ProgramPhotoCallableResponse} from
  "../shared/generated/programPhotoCallableResponse";
import type {ListProgramPhotosCallablePayload} from
  "../shared/generated/listProgramPhotosCallablePayload";
import type {ProgramPhotosCallableResponse} from
  "../shared/generated/programPhotosCallableResponse";
import {validateUpsertProgramPhotoCallablePayload} from
  "../shared/generated/validators/upsertProgramPhotoInput";
import {validateListProgramPhotosCallablePayload} from
  "../shared/generated/validators/listProgramPhotosInput";

// Programme photos (#1582 item 8): function albums in private Storage,
// shown to the planner's team through short-lived signed URLs.

export const PROGRAM_PHOTOS_COLLECTION = "programPhotos";
const PHOTO_LIMIT = 2000;
const PHOTOS_SHOWN = 60;

export function programPhotoDocId(programId: string, photoId: string):
  string {
  return `${programId}_${photoId}`;
}

function requirePhotoAccess(access: ProgramAccess): void {
  if (access.role !== "manager") requireProgramDuty(access, "communications");
}

/** Adds a photo or changes its album, caption or visibility. */
export async function upsertProgramPhotoHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramPhotoCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramPhotoCallablePayload>(
    request, validateUpsertProgramPhotoCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramPhoto",
    {maxRequests: 240, windowMs: 60 * 1000});
  const requestHash = hashRequest({op: "upsertProgramPhoto",
    programId: data.programId, photoId: data.photoId,
    functionId: data.functionId, caption: data.caption,
    status: data.status ?? null, expectedRevision: data.expectedRevision});
  const ref = db.collection(PROGRAM_PHOTOS_COLLECTION)
    .doc(programPhotoDocId(data.programId, data.photoId));
  // A new photo's object is verified before the transaction.
  const existing = (await ref.get()).exists;
  const asset = existing ? null : await requireProgramAsset({
    bucket: deps.storageBucket(), programId: data.programId, kind: "photo",
    assetId: data.photoId, subject: "planner"});
  const stored = await db.runTransaction(async (tx):
    Promise<ProgramPhotoDocument> => {
    const access = await requireProgramAccess({db, programId: data.programId,
      actorUid, now: deps.now(), transaction: tx});
    requirePhotoAccess(access);
    requireProgramMutable(access.program);
    const functionRef = data.functionId ?
      db.collection("programFunctions").doc(data.functionId) : null;
    const [currentSnap, functionSnap] = await Promise.all([
      tx.get(ref), functionRef ? tx.get(functionRef) : Promise.resolve(null),
    ]);
    const current = currentSnap.data() as ProgramPhotoDocument | undefined;
    if (current && current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return current;
    }
    if ((current?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this photo.",
        {reason: "staleRevision", revision: current?.revision ?? 0});
    }
    const fn = functionSnap?.data() as Record<string, unknown> | undefined;
    if (functionSnap && (!fn || fn.programId !== data.programId ||
        fn.organizerId !== access.program.organizerId)) {
      throw new HttpsError("not-found", "Function not found.");
    }
    if (!current && !asset) {
      throw new HttpsError("failed-precondition",
        "Upload the photo first.");
    }
    const nowMillis = deps.now().toMillis();
    const next: ProgramPhotoDocument = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      photoId: data.photoId,
      functionId: data.functionId !== undefined ? data.functionId :
        current?.functionId ?? null,
      storagePath: current?.storagePath ?? asset!.storagePath,
      contentType: current?.contentType ??
        asset!.contentType as ProgramPhotoDocument["contentType"],
      sizeBytes: current?.sizeBytes ?? asset!.sizeBytes,
      caption: data.caption !== undefined ? data.caption :
        current?.caption ?? null,
      status: data.status ?? current?.status ?? "visible",
      uploadedByUid: current?.uploadedByUid ?? actorUid,
      createdAtMillis: current?.createdAtMillis ?? nowMillis,
      updatedAtMillis: nowMillis,
      revision: (current?.revision ?? 0) + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    tx.set(ref, next);
    return next;
  });
  return {programId: data.programId, photoId: stored.photoId,
    functionId: stored.functionId, status: stored.status,
    revision: stored.revision};
}

/** Albums per function, one album's photos and the guest page cover. */
export async function listProgramPhotosHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramPhotosCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListProgramPhotosCallablePayload>(
    request, validateListProgramPhotosCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramPhotos",
    {maxRequests: 60, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requirePhotoAccess(access);
  const organizerId = access.program.organizerId;
  const [functionSnap, photoSnap] = await Promise.all([
    db.collection("programFunctions")
      .where("programId", "==", data.programId).limit(50).get(),
    db.collection(PROGRAM_PHOTOS_COLLECTION)
      .where("programId", "==", data.programId).limit(PHOTO_LIMIT).get(),
  ]);
  const photos = photoSnap.docs.map((doc) => doc.data() as
    ProgramPhotoDocument).filter((photo) => photo.organizerId === organizerId)
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis ||
      a.photoId.localeCompare(b.photoId));
  const bucket = deps.storageBucket();
  const urlsExpireAtMillis = deps.now().toMillis() + READ_URL_MILLIS;
  const sign = (path: string | null | undefined) =>
    signedReadUrl(bucket, path, urlsExpireAtMillis);
  const functions = functionSnap.docs.flatMap((doc) => {
    const fn = doc.data();
    return fn.organizerId === organizerId && fn.status !== "cancelled" ?
      [{functionId: doc.id, name: String(fn.name ?? ""),
        startsAtMillis: staffTimestampMillis(fn.startsAt)}] : [];
  }).sort((a, b) => a.startsAtMillis - b.startsAtMillis);
  const visible = photos.filter((photo) => photo.status === "visible");
  const albumOf = (functionId: string | null) =>
    visible.filter((photo) => photo.functionId === functionId);
  const unfiled = albumOf(null);
  const albums = await Promise.all([
    ...functions.map(async (fn) => {
      const album = albumOf(fn.functionId);
      return {functionId: fn.functionId, name: fn.name,
        startsAtMillis: fn.startsAtMillis, photoCount: album.length,
        coverUrl: await sign(album[0]?.storagePath)};
    }),
    ...(unfiled.length > 0 ? [(async () => ({functionId: null, name: null,
      startsAtMillis: null, photoCount: unfiled.length,
      coverUrl: await sign(unfiled[0].storagePath)}))()] : []),
  ]);
  const shown = (data.functionId ?
    photos.filter((photo) => photo.functionId === data.functionId) : photos)
    .slice(0, PHOTOS_SHOWN);
  const coverPath = access.program.branding?.coverImagePath ?? null;
  return {
    programId: data.programId,
    functionId: data.functionId ?? null,
    coverUrl: await sign(coverPath),
    albums,
    photos: await Promise.all(shown.map(async (photo) => ({
      photoId: photo.photoId,
      functionId: photo.functionId,
      caption: photo.caption,
      status: photo.status,
      url: await sign(photo.storagePath),
      createdAtMillis: photo.createdAtMillis,
      revision: photo.revision,
    }))),
    urlsExpireAtMillis,
  };
}

const photoLimits = {timeoutSeconds: 60, maxInstances: 20};

export const upsertProgramPhoto = onCall(
  appCheckCallableOptionsWithLimits(photoLimits),
  (request) => upsertProgramPhotoHandler(request),
);
export const listProgramPhotos = onCall(
  appCheckCallableOptionsWithLimits(photoLimits),
  (request) => listProgramPhotosHandler(request),
);
