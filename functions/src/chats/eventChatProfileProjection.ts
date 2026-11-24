import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  UserProfileDocument as User,
  ProfilePhoto,
} from "../shared/generated/firestoreAdminTypes";
import type {GetEventChatProfileSharingCallableResponse as Settings} from
  "../shared/generated/getEventChatProfileSharingCallableResponse";
import {personFieldCatalog} from
  "../shared/generated/catalogs/personFieldCatalog";
import {normalizeFormPhotoPreview} from "../profiles/formProfilePhoto";

export const eventProfileCoreIds = [
  "age",
  "gender",
  "city",
  "heightCm",
  "occupation",
  "company",
  "education",
  "languages",
  "relationshipGoal",
  "drinking",
  "smoking",
  "workout",
  "diet",
  "children",
] as const;

/**
 * Whether the guest hid this answer with its hide switch (#2493, FIX-8).
 * Religion is hidden unless the guest turned it on; it is not a core field
 * today, so only the others apply here.
 * @param {User} user The guest.
 * @param {string} fieldId Core field id.
 * @return {boolean} Whether to leave it out.
 */
function hiddenByGuest(user: User, fieldId: string): boolean {
  switch (fieldId) {
  case "relationshipGoal": return user.prefsHideRelationshipGoal === true;
  case "drinking": return user.prefsHideDrinking === true;
  case "smoking": return user.prefsHideSmoking === true;
  case "children": return user.prefsHideChildren === true;
  default: return false;
  }
}

/** Explicit selectable values, never a projection of the complete profile. */
export function eventProfileCoreFields(
  user: User | null,
  now: Date,
): Settings["coreFields"] {
  if (!user) return [];
  const result: Settings["coreFields"] = [];
  for (const fieldId of eventProfileCoreIds) {
    // A hidden answer is offered to and shown to no one (#2493).
    if (hiddenByGuest(user, fieldId)) continue;
    let value: unknown;
    if (fieldId === "age") {
      const birth = user.dateOfBirth?.toDate();
      if (!birth || !Number.isFinite(birth.getTime())) continue;
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      if (
        now.getUTCMonth() < birth.getUTCMonth() ||
        (now.getUTCMonth() === birth.getUTCMonth() &&
          now.getUTCDate() < birth.getUTCDate())
      ) {
        age--;
      }
      if (age < 18 || age > 120) continue;
      value = age;
    } else {
      const field = personFieldCatalog.fields.find(
        (item) => item.id === fieldId,
      );
      if (!field?.privateProfilePath) continue;
      value = user[field.privateProfilePath as keyof User];
    }
    if (typeof value === "string" && value.trim() && value.length <= 10_000) {
      result.push({fieldId, value: value.trim()});
    } else if (typeof value === "number" && Number.isFinite(value)) {
      result.push({fieldId, value});
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.length <= 100 &&
      value.every((item) => typeof item === "string" && item.length <= 10_000)
    ) {
      result.push({fieldId, value: value as string[]});
    }
  }
  return result;
}

/** Only reviewed, owned profile media can be offered for event sharing. */
export function eventProfilePhotos(
  user: User | null,
  uid: string,
): ProfilePhoto[] {
  return (user?.profilePhotos ?? [])
    .filter(
      (photo) =>
        photo.moderation?.status === "approved" &&
        /^[A-Za-z0-9_-]{1,80}$/u.test(photo.id) &&
        photo.storagePath === `users/${uid}/photos/${photo.id}.jpg` &&
        photo.thumbnailStoragePath ===
          `users/${uid}/photoThumbnails/${photo.id}.jpg`,
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, 12);
}

/** No reusable Storage URL or original metadata leaves the protected reader. */
export async function readEventProfilePhoto(photo: ProfilePhoto) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(photo.thumbnailStoragePath);
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (
    !metadata.generation ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 256 * 1024 ||
    metadata.contentType !== "image/jpeg"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This profile photo is unavailable.",
    );
  }
  const [bytes] = await bucket
    .file(photo.thumbnailStoragePath, {generation: metadata.generation})
    .download({start: 0, end: size});
  if (bytes.length !== size) {
    throw new HttpsError(
      "failed-precondition",
      "This profile photo is unavailable.",
    );
  }
  return normalizeFormPhotoPreview(bytes);
}
