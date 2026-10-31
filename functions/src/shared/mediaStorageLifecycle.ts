import * as admin from "firebase-admin";

type MediaOwner =
  | {kind: "organizer"; id: string}
  | {kind: "event"; id: string};

/**
 * Returns Storage objects that disappeared from an attached media document.
 * Only paths inside the exact organizer/event namespace are returned.
 */
export function removedMediaStoragePaths({
  before,
  after,
  owner,
}: {
  before: unknown;
  after: unknown;
  owner: MediaOwner;
}): string[] {
  const previous = referencedMediaStoragePaths(before, owner);
  const next = referencedMediaStoragePaths(after, owner);
  return [...previous].filter((path) => !next.has(path)).sort();
}

/** Returns all safe media paths referenced by one document-like value. */
export function referencedMediaStoragePaths(
  value: unknown,
  owner: MediaOwner
): Set<string> {
  if (!isRecord(value)) return new Set();
  const candidates: unknown[] = owner.kind === "organizer" ? [
    value.organizerPhotos,
    value.organizerPhotos,
    value.logoPhoto,
  ] : [value.eventPhotos];
  const paths = new Set<string>();
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      candidate.forEach((photo) => addPhotoPaths(paths, photo, owner));
    } else {
      addPhotoPaths(paths, candidate, owner);
    }
  }
  return paths;
}

/** Deletes Storage objects after their owning Firestore transaction commits. */
export async function deleteMediaStoragePaths(paths: string[]): Promise<void> {
  const bucket = admin.storage().bucket();
  await Promise.all(paths.map(async (path) => {
    await bucket.file(path).delete({ignoreNotFound: true});
  }));
}

function addPhotoPaths(
  output: Set<string>,
  value: unknown,
  owner: MediaOwner
) {
  if (!isRecord(value)) return;
  for (const key of ["storagePath", "thumbnailStoragePath"] as const) {
    const path = value[key];
    if (typeof path === "string" && isSafeMediaPath(path, owner)) {
      output.add(path);
    }
  }
}

function isSafeMediaPath(path: string, owner: MediaOwner): boolean {
  if (path.includes("..") || path.startsWith("/")) return false;
  const parts = path.split("/");
  if (owner.kind === "event") {
    return parts[0] === "events" &&
      parts[1] === owner.id &&
      (parts[2] === "media" || parts[2] === "photos" ||
        parts[2] === "photoThumbnails");
  }
  const inOrganizerNamespace =
    (parts[0] === "organizers" || parts[0] === "clubs") &&
    parts[1] === owner.id;
  return inOrganizerNamespace && [
    "media",
    "photos",
    "photoThumbnails",
    "logo",
    "logoThumbnails",
  ].includes(parts[2]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
