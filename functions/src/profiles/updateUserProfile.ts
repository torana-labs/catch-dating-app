import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {ValidateFunction} from "ajv";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import {
  profilePhotoPolicy,
} from "../shared/generated/catalogs/profilePhotoPolicy";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateUpdateUserProfileCallablePayload,
} from "../shared/generated/validators/updateUserProfileInput";
import type {
  UpdateUserProfileCallablePayload,
} from "../shared/generated/updateUserProfileCallablePayload";

interface UpdateUserProfileDeps {
  firestore: () => FirebaseFirestore.Firestore;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
  deleteStoragePaths?: (paths: string[]) => Promise<void>;
}

const defaultDeps: UpdateUserProfileDeps = {
  firestore: () => admin.firestore(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  checkRateLimit: defaultCheckRateLimit,
  deleteStoragePaths: deleteProfilePhotoStoragePaths,
};

type UserProfilePatch = UpdateUserProfileCallablePayload["fields"];
type ProfilePatchField = keyof UserProfilePatch;

const trimmedStringFields: ProfilePatchField[] = [
  "name",
  "displayName",
  "email",
  "city",
];
const nullableTrimmedStringFields: ProfilePatchField[] = [
  "occupation",
  "company",
];
const trimmedStringArrayFields: ProfilePatchField[] = [
  "interestedInGenders",
  "languages",
];

/**
 * Applies a validated owner profile patch to users/{uid}.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {UpdateUserProfileDeps} deps Injectable dependencies for tests.
 */
export async function updateUserProfileHandler(
  request: CallableRequest<unknown>,
  deps: UpdateUserProfileDeps = defaultDeps
): Promise<{updated: boolean}> {
  const uid = requireAuth(request);
  const {fields} = validateUpdateUserProfilePayload(request.data);
  // storagePath/thumbnailStoragePath are client-supplied and are later used as
  // admin-SDK deletion targets (here and in account deletion), so a path
  // outside the caller's own users/{uid}/ prefix must never be accepted.
  assertProfilePhotoStoragePathsOwned(uid, fields.profilePhotos);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "updateUserProfile", {
    maxRequests: 60, windowMs: 60 * 1000,
  });

  const userRef = db.collection("users").doc(uid);
  const deletedUserRef = db.collection("deletedUsers").doc(uid);
  const updateFields = toFirestorePatch(fields, deps);

  const removedStoragePaths = await db.runTransaction(async (tx) => {
    const [userSnap, deletedUserSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(deletedUserRef),
    ]);

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }
    if (deletedUserSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot update its profile."
      );
    }

    const currentData = userSnap.data() ?? {};
    assertMinimumProfilePhotosForCompletedProfile(
      currentData,
      updateFields
    );
    const removedPaths = collectRemovedProfilePhotoStoragePaths(
      uid,
      currentData.profilePhotos,
      updateFields.profilePhotos
    );
    tx.update(userRef, {...updateFields,
      profileRevision: Number(currentData.profileRevision ?? 0) + 1});
    return removedPaths;
  });
  if (removedStoragePaths.length > 0) {
    await deps.deleteStoragePaths?.(removedStoragePaths);
  }

  return {updated: true};
}

/**
 * Rejects profile photos whose Storage paths fall outside the caller's own
 * users/{uid}/ prefix. These paths are persisted verbatim and later deleted via
 * the admin SDK, so accepting a foreign path would allow cross-user Storage
 * deletion.
 * @param {string} uid Authenticated owner uid.
 * @param {unknown} photos Candidate profilePhotos patch value.
 */
function assertProfilePhotoStoragePathsOwned(
  uid: string,
  photos: unknown
): void {
  if (!Array.isArray(photos)) return;
  const isOwnedPathOrEmpty = (value: unknown): boolean => {
    if (value === undefined || value === null) return true;
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed.length === 0 || trimmed.startsWith(`users/${uid}/`);
  };
  for (const photo of photos) {
    if (!isRecord(photo)) continue;
    if (
      !isOwnedPathOrEmpty(photo.storagePath) ||
      !isOwnedPathOrEmpty(photo.thumbnailStoragePath)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Profile photo storage paths must belong to your own account."
      );
    }
  }
}

/**
 * Normalizes the profile update body, then validates it against the generated
 * JSON Schema contract.
 * @param {unknown} data Callable request data.
 * @return {UpdateUserProfileCallablePayload} Validated profile update payload.
 */
function validateUpdateUserProfilePayload(
  data: unknown
): UpdateUserProfileCallablePayload {
  const normalized = normalizeUpdateUserProfilePayload(data);
  if (validateUpdateUserProfileCallablePayload(normalized)) {
    return normalized;
  }
  const issues = schemaErrorMessages(
    validateUpdateUserProfileCallablePayload as ValidateFunction<unknown>
  ).join("; ");
  throw new HttpsError("invalid-argument", issues);
}

/**
 * Keeps input cleanup explicit now that the schema validator is generated.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Payload with profile string fields normalized.
 */
function normalizeUpdateUserProfilePayload(data: unknown): unknown {
  if (!isRecord(data) || !isRecord(data.fields)) return data;
  return {
    ...data,
    fields: normalizeProfilePatchFields(data.fields),
  };
}

/**
 * Normalizes the fields that Zod previously transformed while leaving unknown
 * fields intact so the generated schema can reject them.
 * @param {Record<string, unknown>} fields Raw update fields.
 * @return {Record<string, unknown>} Normalized update fields.
 */
function normalizeProfilePatchFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {...fields};

  for (const field of trimmedStringFields) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  for (const field of nullableTrimmedStringFields) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  if (typeof normalized.instagramHandle === "string") {
    normalized.instagramHandle = normalizeInstagramHandle(
      normalized.instagramHandle
    );
  }
  for (const field of trimmedStringArrayFields) {
    if (field in normalized) {
      normalized[field] = trimStringArrayValues(normalized[field]);
    }
  }
  if ("profilePrompts" in normalized) {
    normalized.profilePrompts = normalizeProfilePromptPayloads(
      normalized.profilePrompts
    );
  }
  if ("profilePhotos" in normalized) {
    normalized.profilePhotos = normalizeProfilePhotoPayloads(
      normalized.profilePhotos
    );
  }
  if ("activityPreferences" in normalized) {
    normalized.activityPreferences = normalizeActivityPreferencesPayload(
      normalized.activityPreferences
    );
  }

  return normalized;
}

/**
 * Normalizes a user-entered Instagram handle for contract validation.
 * @param {string} value Raw handle.
 * @return {string} Trimmed handle without a leading at sign.
 */
function normalizeInstagramHandle(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
}

/**
 * Trims string values inside array payloads.
 * @param {unknown} value Raw field value.
 * @return {unknown} Normalized value.
 */
function trimStringArrayValues(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => typeof item === "string" ? item.trim() : item);
}

/**
 * Trims prompt id/title fields while preserving answer validation semantics.
 * @param {unknown} value Raw profile prompt payloads.
 * @return {unknown} Normalized profile prompt payloads.
 */
function normalizeProfilePromptPayloads(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (!isRecord(item)) return item;
    return {
      ...item,
      promptId: trimIfString(item.promptId),
      prompt: trimIfString(item.prompt),
    };
  });
}

/**
 * Trims profile-photo ids, URLs, Storage paths, and nested prompt display
 * fields while preserving timestamp validation semantics.
 * @param {unknown} value Raw profile-photo payloads.
 * @return {unknown} Normalized profile-photo payloads.
 */
function normalizeProfilePhotoPayloads(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (!isRecord(item)) return item;
    const normalized: Record<string, unknown> = {
      ...item,
      id: trimIfString(item.id),
      url: trimIfString(item.url),
      thumbnailUrl: trimIfString(item.thumbnailUrl),
      storagePath: trimIfString(item.storagePath),
      thumbnailStoragePath: trimIfString(item.thumbnailStoragePath),
    };
    if (isRecord(item.prompt)) {
      normalized.prompt = {
        ...item.prompt,
        promptId: trimIfString(item.prompt.promptId),
        prompt: trimIfString(item.prompt.prompt),
        ...(item.prompt.caption !== undefined && {
          caption: trimIfString(item.prompt.caption),
        }),
      };
    }
    return normalized;
  });
}

/**
 * Trims enum-like string arrays inside nested activity preference payloads.
 * @param {unknown} value Raw activity preference payload.
 * @return {unknown} Normalized activity preference payload.
 */
function normalizeActivityPreferencesPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const normalized: Record<string, unknown> = {...value};
  if (isRecord(value.running)) {
    normalized.running = {
      ...value.running,
      preferredDistances: trimStringArrayValues(
        value.running.preferredDistances
      ),
      runningReasons: trimStringArrayValues(value.running.runningReasons),
      preferredRunTimes: trimStringArrayValues(
        value.running.preferredRunTimes
      ),
    };
  }
  return normalized;
}

/**
 * Trims a value only when it is a string.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed string or original value.
 */
function trimIfString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Checks for an object record.
 * @param {unknown} value Value to inspect.
 * @return {boolean} Whether the value is a plain record-like object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Prevents completed profiles from falling below the canonical photo floor.
 * @param {FirebaseFirestore.DocumentData} currentData Existing profile data.
 * @param {Record<string, unknown>} updateFields Firestore update patch.
 */
function assertMinimumProfilePhotosForCompletedProfile(
  currentData: FirebaseFirestore.DocumentData,
  updateFields: Record<string, unknown>
) {
  const nextProfileComplete =
    updateFields.profileComplete === true ||
    (updateFields.profileComplete === undefined &&
      currentData.profileComplete === true);
  if (!nextProfileComplete) return;

  const photoCount = profilePhotoCountAfterPatch(currentData, updateFields);
  if (photoCount < profilePhotoPolicy.minPhotos) {
    throw new HttpsError(
      "failed-precondition",
      `Add at least ${profilePhotoPolicy.minPhotos} profile photos.`
    );
  }
}

/**
 * Counts the effective photos after a profile update patch.
 * @param {FirebaseFirestore.DocumentData} currentData Existing profile data.
 * @param {Record<string, unknown>} updateFields Firestore update patch.
 * @return {number} Effective photo count.
 */
function profilePhotoCountAfterPatch(
  currentData: FirebaseFirestore.DocumentData,
  updateFields: Record<string, unknown>
): number {
  const profilePhotos = Object.hasOwn(updateFields, "profilePhotos") ?
    updateFields.profilePhotos :
    currentData.profilePhotos;
  return countProfilePhotoRecords(profilePhotos);
}

/**
 * Counts valid grouped profile photo records.
 * @param {unknown} value Candidate profilePhotos value.
 * @return {number} Count of records with usable URLs and positions.
 */
function countProfilePhotoRecords(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value
    .filter(isRecord)
    .filter((photo) =>
      typeof photo.url === "string" &&
      photo.url.trim().length > 0 &&
      Number.isInteger(photo.position) &&
      typeof photo.position === "number" &&
      photo.position >= 0 &&
      photo.position < profilePhotoPolicy.maxPhotos
    )
    .length;
}

/**
 * Computes removed user-owned Storage paths when grouped photos are replaced.
 * @param {string} uid Owner uid.
 * @param {unknown} currentProfilePhotos Stored current grouped photos.
 * @param {unknown} nextProfilePhotos Incoming grouped photos.
 * @return {string[]} User-owned original and thumbnail paths no longer used.
 */
function collectRemovedProfilePhotoStoragePaths(
  uid: string,
  currentProfilePhotos: unknown,
  nextProfilePhotos: unknown
): string[] {
  if (nextProfilePhotos === undefined) return [];
  const currentPaths = profilePhotoStoragePathsFromValue(
    uid,
    currentProfilePhotos
  );
  if (currentPaths.length === 0) return [];
  const nextPaths = new Set(profilePhotoStoragePathsFromValue(
    uid,
    nextProfilePhotos
  ));
  return [...new Set(currentPaths.filter((path) => !nextPaths.has(path)))];
}

/**
 * Reads user-owned original and thumbnail Storage paths from profile photos.
 * @param {string} uid Owner uid.
 * @param {unknown} value Candidate profilePhotos value.
 * @return {string[]} Safe Storage object paths.
 */
function profilePhotoStoragePathsFromValue(
  uid: string,
  value: unknown
): string[] {
  if (!Array.isArray(value)) return [];
  const paths: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    for (const key of ["storagePath", "thumbnailStoragePath"]) {
      const path = safeProfilePhotoStoragePath(uid, item[key]);
      if (path) paths.push(path);
    }
  }
  return paths;
}

/**
 * Accepts only profile photo paths owned by the authenticated user.
 * @param {string} uid Owner uid.
 * @param {unknown} value Candidate Storage path.
 * @return {string | null} Safe path or null.
 */
function safeProfilePhotoStoragePath(
  uid: string,
  value: unknown
): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (
    path.startsWith(`users/${uid}/photos/`) ||
    path.startsWith(`users/${uid}/photoThumbnails/`)
  ) {
    return path;
  }
  return null;
}

/**
 * Deletes old profile photo Storage objects after Firestore commits.
 * @param {string[]} paths Storage object paths.
 */
async function deleteProfilePhotoStoragePaths(paths: string[]) {
  const bucket = admin.storage().bucket();
  await Promise.all(paths.map(async (path) => {
    try {
      await bucket.file(path).delete({ignoreNotFound: true});
    } catch (error) {
      logger.warn("Failed to delete replaced profile photo object", {
        path,
        error,
      });
    }
  }));
}

/**
 * Converts callable-safe patch values into Firestore update values.
 * @param {UserProfilePatch} fields Validated callable patch.
 * @param {UpdateUserProfileDeps} deps Injectable dependencies.
 * @return {Record<string, unknown>} Firestore update patch.
 */
function toFirestorePatch(
  fields: UserProfilePatch,
  deps: UpdateUserProfileDeps
): Record<string, unknown> {
  const updateFields: Record<string, unknown> = {...fields};
  if (fields.profilePrompts !== undefined) {
    updateFields.profilePrompts = fields.profilePrompts
      .map((prompt) => ({
        ...prompt,
        promptId: prompt.promptId.trim(),
        prompt: prompt.prompt.trim(),
        answer: collapseStackedPromptBlankLines(prompt.answer).trim(),
      }))
      .filter((prompt) => prompt.answer.length > 0);
  }
  if (fields.profilePhotos !== undefined) {
    updateFields.profilePhotos = fields.profilePhotos.map((photo) => {
      const prompt = photo.prompt ?
        {
          ...photo.prompt,
          ...(photo.prompt.caption !== undefined && {
            caption: collapseStackedPromptBlankLines(
              photo.prompt.caption ?? ""
            ).trim(),
          }),
        } :
        photo.prompt;
      return {
        ...photo,
        ...(prompt !== undefined && {prompt}),
        createdAt: deps.timestampFromMillis(photo.createdAt),
        updatedAt: deps.timestampFromMillis(photo.updatedAt),
        ...(photo.moderation?.reviewedAt !== undefined &&
          photo.moderation?.reviewedAt !== null && {
          moderation: {
            ...photo.moderation,
            reviewedAt: deps.timestampFromMillis(photo.moderation.reviewedAt),
          },
        }),
      };
    });
  }
  if (fields.dateOfBirth !== undefined) {
    updateFields.dateOfBirth = deps.timestampFromMillis(fields.dateOfBirth);
  }
  return updateFields;
}

/**
 * Collapses excessive blank lines in prompt text.
 * @param {string} value Raw prompt text.
 * @return {string} Prompt text with at most one empty line in a row.
 */
function collapseStackedPromptBlankLines(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}

export const updateUserProfile = onCall(
  appCheckCallableOptions,
  (request) => updateUserProfileHandler(request)
);
