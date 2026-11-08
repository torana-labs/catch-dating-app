import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import {householdRsvpSecret} from "../programRsvp/householdRsvp";
import {verifyHouseholdToken} from "../programRsvp/rsvpLinkTokens";
import {verifyWebLinkToken} from "./programWebLinks";
import type {CreateProgramAssetUploadCallablePayload} from
  "../shared/generated/createProgramAssetUploadCallablePayload";
import type {ProgramAssetUploadCallableResponse} from
  "../shared/generated/programAssetUploadCallableResponse";
import {validateCreateProgramAssetUploadCallablePayload} from
  "../shared/generated/validators/createProgramAssetUploadInput";

// Programme files (guest IDs, hamper photos, function photos, the
// branding cover) live at programs/{programId}/{folder}/{assetId}.
// storage.rules denies every direct client read and write there: uploads
// go through one short-lived backend-signed POST policy whose metadata
// binds the object to its programme, kind and subject, and reads go
// through short-lived signed URLs minted by the reads that are allowed to
// show them. The retention sweep deletes the whole programs/{programId}/
// prefix.

export type ProgramAssetKind = "guestId" | "hamper" | "photo" | "cover";

const FOLDERS: Record<ProgramAssetKind, string> = {
  guestId: "guestIds",
  hamper: "hampers",
  photo: "photos",
  cover: "branding",
};

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UPLOAD_MILLIS = 15 * 60 * 1000;
/** Signed read URLs live just long enough to render a screen. */
export const READ_URL_MILLIS = 10 * 60 * 1000;

export type ProgramBucket =
  ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

export interface ProgramAssetDeps {
  firestore: () => FirebaseFirestore.Firestore;
  storageBucket: () => ProgramBucket;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  secret: () => string;
}

export const defaultProgramAssetDeps: ProgramAssetDeps = {
  firestore: () => admin.firestore(),
  storageBucket: () => admin.storage().bucket(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  secret: () => householdRsvpSecret.value(),
};

export function programAssetPath(programId: string, kind: ProgramAssetKind,
  assetId: string): string {
  return `programs/${programId}/${FOLDERS[kind]}/${assetId}`;
}

/** Prefix the retention sweep deletes for one programme. */
export function programAssetPrefix(programId: string): string {
  return `programs/${programId}/`;
}

export function allowedContentTypes(kind: ProgramAssetKind): Set<string> {
  return kind === "guestId" ?
    new Set([...IMAGE_TYPES, "application/pdf"]) : IMAGE_TYPES;
}

function assetIdFor(kind: ProgramAssetKind, programId: string,
  subject: string, requestId: string): string {
  return `${kind}_` + createHash("sha256")
    .update(`${programId}:${subject}:${requestId}`).digest("hex")
    .slice(0, 40);
}

interface UploadAuthority {
  programId: string;
  /** What the object is bound to: the household (guest IDs), the hotel
   *  (hampers) or "planner" (photos, cover). */
  subject: string;
  rateKey: string;
}

async function resolveUploadAuthority(
  request: CallableRequest<unknown>,
  data: CreateProgramAssetUploadCallablePayload,
  deps: ProgramAssetDeps,
): Promise<UploadAuthority> {
  const nowMillis = deps.now().toMillis();
  if (data.kind === "guestId") {
    const verified = data.token ?
      verifyHouseholdToken(data.token, deps.secret(), nowMillis) : null;
    if (!verified || !verified.ok) {
      throw new HttpsError("unauthenticated",
        "This link is invalid or has expired.");
    }
    const program = (await deps.firestore().collection("organizerPrograms")
      .doc(verified.payload.programId).get()).data();
    if (!program) throw new HttpsError("not-found", "Programme not found.");
    requireProgramMutable(program as {status: "active"});
    return {programId: verified.payload.programId,
      subject: verified.payload.householdId,
      rateKey: `household:${verified.payload.householdId}`};
  }
  if (data.kind === "hamper" && data.token) {
    const verified = verifyWebLinkToken(data.token, "hamperPorter",
      deps.secret(), nowMillis);
    if (!verified.ok) {
      throw new HttpsError("permission-denied", "This link is not valid.");
    }
    return {programId: verified.payload.programId,
      subject: verified.payload.subjectId,
      rateKey: `hamperPorter:${verified.payload.subjectId}`};
  }
  const actorUid = request.auth?.uid;
  if (!actorUid) {
    throw new HttpsError("unauthenticated", "Sign in to upload.");
  }
  if (!data.programId) {
    throw new HttpsError("invalid-argument", "programId is required.");
  }
  const access = await requireProgramAccess({db: deps.firestore(),
    programId: data.programId, actorUid, now: deps.now()});
  requireProgramMutable(access.program);
  if (data.kind === "hamper") {
    if (!data.hotelId) {
      throw new HttpsError("invalid-argument", "hotelId is required.");
    }
    requireProgramDuty(access, "hotelDesk");
    return {programId: data.programId, subject: data.hotelId,
      rateKey: actorUid};
  }
  if (access.role !== "manager") requireProgramDuty(access, "communications");
  return {programId: data.programId, subject: "planner", rateKey: actorUid};
}

/** Signs one upload of a programme file. Nothing is written until the
 *  command that uses the file verifies the stored object. */
export async function createProgramAssetUploadHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramAssetUploadCallableResponse> {
  const data =
    validateCallableWithAjv<CreateProgramAssetUploadCallablePayload>(
      request, validateCreateProgramAssetUploadCallablePayload);
  const kind = data.kind as ProgramAssetKind;
  if (!allowedContentTypes(kind).has(data.contentType)) {
    throw new HttpsError("invalid-argument",
      "This file type is not allowed here.");
  }
  const authority = await resolveUploadAuthority(request, data, deps);
  await deps.checkRateLimit(deps.firestore(), authority.rateKey,
    "createProgramAssetUpload", {maxRequests: 30, windowMs: 60 * 1000});
  const assetId = assetIdFor(kind, authority.programId, authority.subject,
    data.requestId);
  const storagePath = programAssetPath(authority.programId, kind, assetId);
  const expiresAtMillis = deps.now().toMillis() + UPLOAD_MILLIS;
  const [signed] = await deps.storageBucket().file(storagePath)
    .generateSignedPostPolicyV4({
      expires: expiresAtMillis,
      fields: {
        "Content-Type": data.contentType,
        "x-goog-meta-asset-id": assetId,
        "x-goog-meta-program-id": authority.programId,
        "x-goog-meta-subject": authority.subject,
      },
      conditions: [
        ["content-length-range", 1, Math.min(data.sizeBytes, MAX_BYTES)],
        ["eq", "$Content-Type", data.contentType],
        ["eq", "$x-goog-meta-asset-id", assetId],
        ["eq", "$x-goog-meta-program-id", authority.programId],
        ["eq", "$x-goog-meta-subject", authority.subject],
      ],
    });
  return {
    programId: authority.programId,
    kind,
    assetId,
    storagePath,
    uploadUrl: signed.url,
    uploadFields: signed.fields,
    expiresAtMillis,
  };
}

export interface VerifiedProgramAsset {
  storagePath: string;
  contentType: string;
  sizeBytes: number;
}

/** Checks a stored object against the binding its signed policy set.
 *  A mismatching object is deleted and rejected. */
export async function requireProgramAsset(params: {
  bucket: ProgramBucket;
  programId: string;
  kind: ProgramAssetKind;
  assetId: string;
  subject: string;
}): Promise<VerifiedProgramAsset> {
  if (!params.assetId.startsWith(`${params.kind}_`)) {
    throw new HttpsError("invalid-argument", "This file is not for here.");
  }
  const storagePath = programAssetPath(params.programId, params.kind,
    params.assetId);
  const file = params.bucket.file(storagePath);
  let metadata: import("@google-cloud/storage").FileMetadata;
  try {
    [metadata] = await file.getMetadata();
  } catch {
    throw new HttpsError("failed-precondition",
      "The upload has not finished.");
  }
  const sizeBytes = Number(metadata.size);
  const ok = Number.isSafeInteger(sizeBytes) && sizeBytes >= 1 &&
    sizeBytes <= MAX_BYTES &&
    typeof metadata.contentType === "string" &&
    allowedContentTypes(params.kind).has(metadata.contentType) &&
    metadata.metadata?.["asset-id"] === params.assetId &&
    metadata.metadata?.["program-id"] === params.programId &&
    metadata.metadata?.["subject"] === params.subject;
  if (!ok) {
    await file.delete({ignoreNotFound: true});
    throw new HttpsError("failed-precondition",
      "The uploaded file did not match its upload.");
  }
  return {storagePath, contentType: metadata.contentType as string,
    sizeBytes};
}

/** A short-lived read URL, or null for an absent path. */
export async function signedReadUrl(bucket: ProgramBucket,
  path: string | null | undefined, expiresAtMillis: number):
  Promise<string | null> {
  if (!path) return null;
  const [url] = await bucket.file(path)
    .getSignedUrl({action: "read", expires: expiresAtMillis});
  return url;
}

/** Best-effort delete of files a newer write replaced. */
export async function deleteProgramFiles(bucket: ProgramBucket,
  paths: (string | null | undefined)[]): Promise<void> {
  await Promise.all(paths.filter((path): path is string => !!path)
    .map((path) => bucket.file(path).delete({ignoreNotFound: true})
      .catch(() => undefined)));
}

export const createProgramAssetUpload = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret],
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => createProgramAssetUploadHandler(request),
);
