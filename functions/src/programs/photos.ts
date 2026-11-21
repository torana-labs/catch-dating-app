import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
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
  requireValid,
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
import type {SignProgramPhotoUrlsCallablePayload} from
  "../shared/generated/signProgramPhotoUrlsCallablePayload";
import type {ProgramPhotoUrlsCallableResponse} from
  "../shared/generated/programPhotoUrlsCallableResponse";
import {validateUpsertProgramPhotoCallablePayload} from
  "../shared/generated/validators/upsertProgramPhotoInput";
import {validateSignProgramPhotoUrlsCallablePayload} from
  "../shared/generated/validators/signProgramPhotoUrlsInput";
import {validateProgramPhotoUrlsCallableResponse} from
  "../shared/generated/validators/programPhotoUrlsOutput";

import {validateProgramPhotoCallableResponse} from
  "../shared/generated/validators/programPhotoOutput";
import {validateProgramPhotoDocument} from
  "../shared/generated/validators/programPhotoDocument";
// Programme photos (#1582 item 8): function albums in private Storage,
// shown to the planner's team through short-lived signed URLs.

export const PROGRAM_PHOTOS_COLLECTION = "programPhotos";

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
    tx.set(ref, requireValid(validateProgramPhotoDocument, next, "photo"));
    return next;
  });
  return requireValid(validateProgramPhotoCallableResponse,
    {programId: data.programId, photoId: stored.photoId,
      functionId: stored.functionId, status: stored.status,
      revision: stored.revision}, "photo result");
}

/**
 * Signs read URLs for photos the phone already lists from programPhotos
 * (manager and communications rules), and the cover when asked. Metadata is
 * read directly; the URL is the one thing a phone cannot make, so this is the
 * only server step in reading programme photos. The server reads each photo
 * itself and signs only this programme's own files; it never signs a path the
 * phone names.
 */
export async function signProgramPhotoUrlsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramPhotoUrlsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<SignProgramPhotoUrlsCallablePayload>(
    request, validateSignProgramPhotoUrlsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "signProgramPhotoUrls",
    {maxRequests: 120, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requirePhotoAccess(access);
  const organizerId = access.program.organizerId;
  const snaps = await Promise.all(data.photoIds.map((photoId) =>
    db.collection(PROGRAM_PHOTOS_COLLECTION)
      .doc(programPhotoDocId(data.programId, photoId)).get()));
  const photos = snaps.flatMap((snap) => {
    const photo = snap.data() as ProgramPhotoDocument | undefined;
    return photo && photo.programId === data.programId &&
      photo.organizerId === organizerId ? [photo] : [];
  });
  const bucket = deps.storageBucket();
  const urlsExpireAtMillis = deps.now().toMillis() + READ_URL_MILLIS;
  const sign = (path: string | null | undefined) =>
    signedReadUrl(bucket, path, urlsExpireAtMillis);
  const urls = await Promise.all(photos.map(async (photo) =>
    ({photoId: photo.photoId, url: await sign(photo.storagePath)})));
  return requireValid(validateProgramPhotoUrlsCallableResponse, {
    programId: data.programId,
    urls: urls.flatMap(({photoId, url}) => url ? [{photoId, url}] : []),
    coverUrl: data.includeCover ?
      await sign(access.program.branding?.coverImagePath ?? null) : null,
    urlsExpireAtMillis,
  }, "photo urls");
}

const photoLimits = {timeoutSeconds: 60, maxInstances: 20};

export const upsertProgramPhoto = onCall(
  appCheckCallableOptionsWithLimits(photoLimits),
  (request) => upsertProgramPhotoHandler(request),
);
export const signProgramPhotoUrls = onCall(
  appCheckCallableOptionsWithLimits(photoLimits),
  (request) => signProgramPhotoUrlsHandler(request),
);
