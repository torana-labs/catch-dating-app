import {computeAge} from "./dates";
import type {
  ActivityPreferences,
  PhotoPromptAnswer,
  ProfilePromptAnswer,
  PublicProfileDocument,
  UserProfileDocument,
} from "./generated/firestoreAdminTypes";
import {DemoMetadata, demoMetadataFromSources} from "./demoMetadata";
import {profilePhotoPolicy} from "./generated/catalogs/profilePhotoPolicy";

export type PublicProfileProjection = PublicProfileDocument & DemoMetadata;

interface StoredProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  storagePath: string;
  thumbnailStoragePath: string;
  prompt?: PhotoPromptAnswer | null;
  moderation?: {
    status: "pending" | "approved" | "rejected";
    reason?: string | null;
    reviewedAt?: FirebaseFirestore.Timestamp | null;
  } | null;
  position: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

type UserProfileWithPhotos = UserProfileDocument & {
  profilePhotos?: StoredProfilePhoto[];
};

type RunningPreferencesProjection = ActivityPreferences["running"];

const maxProfilePhotos = profilePhotoPolicy.maxPhotos;

/**
 * Returns the public-safe display name for denormalized app surfaces.
 * @param {UserProfileDocument} user Private user profile document.
 * @return {string} Editable public display name, with first-name fallback.
 */
export function publicDisplayName(user: UserProfileDocument): string {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;

  const firstName = user.firstName?.trim();
  if (firstName) return firstName;

  const fullName = user.name?.trim();
  if (!fullName) return "Runner";
  return fullName.split(/\s+/)[0];
}

/**
 * Returns the best public avatar URL for denormalized host/profile surfaces.
 * @param {UserProfileDocument} user Private user profile document.
 * @return {string | null} Thumbnail-first avatar URL.
 */
export function publicAvatarUrl(user: UserProfileDocument): string | null {
  const primaryPhoto = normalizeProfilePhotos(user)[0];
  return primaryPhoto?.thumbnailUrl ??
    primaryPhoto?.url ??
    null;
}

/**
 * Projects a private users/{uid} profile into the publicProfiles/{uid} shape.
 *
 * This function is intentionally pure so Functions triggers, tests, and seed
 * tooling can verify the same public-profile contract without duplicating
 * display-name, prompt, photo, running, and demo-metadata decisions.
 * @param {UserProfileDocument} user Private profile document.
 * @return {PublicProfileProjection} Public profile projection.
 */
export function publicProfileFromUserProfileDoc(
  user: UserProfileDocument
): PublicProfileProjection {
  if (!user.dateOfBirth || !user.gender) {
    throw new Error(
      "Social profile projection requires birth date and gender.");
  }
  const profilePhotos = normalizeProfilePhotos(user);
  const running = runningPreferencesFromUserProfileDoc(user);
  return {
    ...demoMetadataFromSources(user),
    name: publicDisplayName(user),
    age: computeAge(user.dateOfBirth.toDate()),
    profilePrompts: normalizeProfilePrompts(user),
    gender: user.gender,
    profilePhotos,
    ...(user.city && {city: user.city}),
    ...(user.height !== undefined && {height: user.height}),
    ...(user.occupation && {occupation: user.occupation}),
    ...(user.company && {company: user.company}),
    ...(user.education && {education: user.education}),
    ...(user.religion && {religion: user.religion}),
    ...(user.languages?.length && {languages: user.languages}),
    ...(user.relationshipGoal && {relationshipGoal: user.relationshipGoal}),
    ...(user.drinking && {drinking: user.drinking}),
    ...(user.smoking && {smoking: user.smoking}),
    ...(user.workout && {workout: user.workout}),
    ...(user.diet && {diet: user.diet}),
    ...(user.children && {children: user.children}),
    activityPreferences: {running},
  };
}

/**
 * Returns the nested running preferences, with product defaults for a profile
 * that has not set them. The retired root-level fields are not read.
 * @param {UserProfileDocument} user Private profile document.
 * @return {RunningPreferencesProjection} Running preference projection.
 */
export function runningPreferencesFromUserProfileDoc(
  user: UserProfileDocument
): RunningPreferencesProjection {
  const nested = user.activityPreferences?.running;
  return {
    paceMinSecsPerKm: nested?.paceMinSecsPerKm ?? 300,
    paceMaxSecsPerKm: nested?.paceMaxSecsPerKm ?? 420,
    preferredDistances: nested?.preferredDistances ?? [],
    runningReasons: nested?.runningReasons ?? [],
    preferredRunTimes: nested?.preferredRunTimes ?? [],
    version: nested?.version ?? 0,
  };
}

/**
 * Normalizes stored profile prompts. Legacy bios were copied into prompt one
 * by the profile-bio-prompts migration; bio is no longer read.
 * @param {UserProfileDocument} user Private user profile document.
 * @return {ProfilePromptAnswer[]} Public prompt answers.
 */
export function normalizeProfilePrompts(
  user: UserProfileDocument
): ProfilePromptAnswer[] {
  const prompts = (user.profilePrompts ?? [])
    .map((prompt) => ({
      promptId: prompt.promptId.trim(),
      prompt: prompt.prompt.trim(),
      answer: collapseStackedPromptBlankLines(prompt.answer).trim(),
    }))
    .filter((prompt) =>
      prompt.promptId.length > 0 &&
      prompt.prompt.length > 0 &&
      prompt.answer.length > 0
    );

  return prompts.slice(0, 3);
}

/**
 * Normalizes photo prompt selections into public profile prompt records.
 * @param {PhotoPromptAnswer[] | undefined} prompts Stored prompt selections.
 * @return {PhotoPromptAnswer[]} Public photo prompt selections.
 */
export function normalizePhotoPrompts(
  prompts: PhotoPromptAnswer[] | undefined
): PhotoPromptAnswer[] {
  return (prompts ?? [])
    .map((prompt) => ({
      photoIndex: prompt.photoIndex,
      promptId: prompt.promptId.trim(),
      prompt: prompt.prompt.trim(),
      ...(prompt.caption !== undefined && {
        caption: collapseStackedPromptBlankLines(prompt.caption ?? "").trim(),
      }),
    }))
    .filter((prompt) =>
      Number.isInteger(prompt.photoIndex) &&
      prompt.photoIndex >= 0 &&
      prompt.photoIndex < maxProfilePhotos &&
      prompt.promptId.length > 0 &&
      prompt.prompt.length > 0
    )
    .slice(0, maxProfilePhotos);
}

/**
 * Normalizes grouped profile photos.
 * @param {UserProfileDocument} user Private user profile document.
 * @return {StoredProfilePhoto[]} Ordered profile photos.
 */
export function normalizeProfilePhotos(
  user: UserProfileDocument
): StoredProfilePhoto[] {
  const userWithPhotos = user as UserProfileWithPhotos;
  const groupedPhotos = (userWithPhotos.profilePhotos ?? [])
    .filter(isStoredProfilePhoto)
    .map((photo) => ({
      ...photo,
      id: photo.id.trim(),
      url: photo.url.trim(),
      thumbnailUrl: photo.thumbnailUrl.trim() || photo.url.trim(),
      storagePath: photo.storagePath.trim(),
      thumbnailStoragePath: photo.thumbnailStoragePath.trim(),
      prompt: normalizeProfilePhotoPrompt(photo.prompt, photo.position),
      position: photo.position,
    }))
    .filter((photo) =>
      photo.id.length > 0 &&
      isPublicPhotoUri(photo.url) &&
      isPublicPhotoUri(photo.thumbnailUrl) &&
      photo.storagePath.length > 0 &&
      photo.thumbnailStoragePath.length > 0 &&
      Number.isInteger(photo.position) &&
      photo.position >= 0 &&
      photo.position < maxProfilePhotos
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, maxProfilePhotos);
  return groupedPhotos;
}

/**
 * Normalizes user-supplied photo URL arrays into public-safe URI strings.
 * @param {string[] | undefined} urls Stored full-size or thumbnail URLs.
 * @return {string[]} Trimmed valid URI strings.
 */
export function normalizePhotoUrls(urls: string[] | undefined): string[] {
  return (urls ?? [])
    .map((url) => url.trim())
    .filter((url) => isPublicPhotoUri(url))
    .slice(0, maxProfilePhotos);
}

/**
 * Checks whether an unknown value has the minimum shape of a stored
 * ProfilePhoto object.
 * @param {unknown} value Candidate value.
 * @return {boolean} True when the value is a stored profile photo.
 */
function isStoredProfilePhoto(value: unknown): value is StoredProfilePhoto {
  if (value === null || typeof value !== "object") return false;
  const photo = value as Partial<StoredProfilePhoto>;
  return typeof photo.id === "string" &&
    typeof photo.url === "string" &&
    typeof photo.thumbnailUrl === "string" &&
    typeof photo.storagePath === "string" &&
    typeof photo.thumbnailStoragePath === "string" &&
    Number.isInteger(photo.position) &&
    isTimestampLike(photo.createdAt) &&
    isTimestampLike(photo.updatedAt);
}

/**
 * Normalizes a grouped photo prompt selection.
 * @param {PhotoPromptAnswer | null | undefined} prompt Stored prompt.
 * @param {number} position Photo position.
 * @return {PhotoPromptAnswer | null} Normalized prompt or null.
 */
function normalizeProfilePhotoPrompt(
  prompt: PhotoPromptAnswer | null | undefined,
  position: number
): PhotoPromptAnswer | null {
  if (!prompt) return null;
  const normalized = normalizePhotoPrompts([
    {...prompt, photoIndex: position},
  ]);
  return normalized[0] ?? null;
}

/**
 * Checks for Firestore Timestamp-like values.
 * @param {unknown} value Candidate timestamp.
 * @return {boolean} True when a toDate method exists.
 */
function isTimestampLike(
  value: unknown
): value is FirebaseFirestore.Timestamp {
  return value !== null &&
    typeof value === "object" &&
    typeof (value as {toDate?: unknown}).toDate === "function";
}

/**
 * Collapses excessive blank lines in prompt text.
 * @param {string} value Raw prompt text.
 * @return {string} Prompt text with at most one empty line in a row.
 */
export function collapseStackedPromptBlankLines(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}

/**
 * Checks whether a string can safely be published as a profile photo URI.
 * @param {string} value Candidate URL or URI string.
 * @return {boolean} True when the value is a bounded absolute URI.
 */
function isPublicPhotoUri(value: string): boolean {
  if (value.length === 0 || value.length > 2048) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
