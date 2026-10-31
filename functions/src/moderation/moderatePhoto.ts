/**
 * Photo moderation via Google Cloud Vision SafeSearch.
 *
 * Triggered automatically on every Storage object finalize event. Downloads
 * the uploaded image bytes, events SafeSearch detection, and takes one of
 * three actions:
 *
 *   **Allow** — No adult/violent/racy content detected. The upload proceeds
 *   normally; no moderation doc is written.
 *
 *   **Flag (likely)** — Elevated but not certain detection. The image is
 *   left in place and a `moderationFlags` doc is written with status
 *   `"pending"` for human review.
 *
 *   **Block (very likely)** — High-confidence detection of explicit or
 *   violent content. The image is deleted from Storage, a moderation flag
 *   is written with status `"pending"`, and (for profile photos) the
 *   photo object is removed from the user's `profilePhotos` array.
 *
 * ## Storage paths moderated
 *
 *   - `users/{uid}/photos/{fileName}` — profile photos
 *   - `users/{uid}/hostedMedia/{fileName}` — legacy hosted club/event media
 *   - `organizers/{organizerId}/photos/{fileName}` — organizer gallery photos
 *   - `organizers/{organizerId}/logo/{fileName}` — organizer logos
 *   - `clubs/{organizerId}/photos/{fileName}` — club gallery photos
 *   - `clubs/{organizerId}/logo/{fileName}` — club logos
 *   - `events/{eventId}/photos/{fileName}` — event photos
 *   - `matches/{matchId}/images/{messageId}` — chat images
 *
 * ## Costs
 *
 * Cloud Vision SafeSearch pricing (as of 2026):
 *   - First 1000 units / month: free
 *   - 1001–5M units / month: $1.50 per 1000
 *   Each image analysed = 1 unit.
 *
 * ## Cold-start behaviour
 *
 * The ImageAnnotatorClient is instantiated on first use so the Vision
 * dependency stays out of the shared cold-start module graph, and the same
 * client is reused across warm invocations. Application Default Credentials
 * are auto-discovered via the admin SDK's service account — no explicit key
 * needed.
 */

import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type {ImageAnnotatorClient} from "@google-cloud/vision";
import type {
  ModerationFlagDocument,
} from "../shared/generated/firestoreAdminTypes";
import {isModeratedPhotoPath} from "./moderatedPhotoPath";

// ── Client ─────────────────────────────────────────────────────────────────

let visionClient: ImageAnnotatorClient | null = null;

async function getVisionClient(): Promise<ImageAnnotatorClient> {
  if (!visionClient) {
    const vision = await import("@google-cloud/vision");
    visionClient = new vision.ImageAnnotatorClient();
  }
  return visionClient;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Likelihood values from Cloud Vision SafeSearch, ordered from least to
 * most severe. We block at VERY_LIKELY and flag at LIKELY.
 */
type Likelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE"
  | "LIKELY" | "VERY_LIKELY";

const BLOCK_LIKELIHOODS: ReadonlySet<Likelihood> = new Set([
  "VERY_LIKELY",
]);

const FLAG_LIKELIHOODS: ReadonlySet<Likelihood> = new Set([
  "LIKELY",
  "VERY_LIKELY",
]);

interface SafeSearchCategory {
  name: string;
  likelihood: Likelihood;
}

/**
 * Returns the highest SafeSearch severity across all categories.
 * @param {SafeSearchCategory[]} categories SafeSearch results.
 * @return {"block"|"flag"|"allow"} The highest severity found.
 */
function highestSeverity(
  categories: SafeSearchCategory[]
): "block" | "flag" | "allow" {
  let worst: "block" | "flag" | "allow" = "allow";
  for (const cat of categories) {
    if (BLOCK_LIKELIHOODS.has(cat.likelihood)) return "block";
    if (FLAG_LIKELIHOODS.has(cat.likelihood)) worst = "flag";
  }
  return worst;
}

/**
 * Extracts uid from a `users/{uid}/photos/...` Storage path.
 * @param {string} filePath The Storage object path.
 * @return {string|null} The uid, or null if not a user photo path.
 */
function uidFromPath(filePath: string): string | null {
  const parts = filePath.split("/");
  if (parts[0] === "users" && parts[1]) return parts[1];
  return null;
}

/**
 * Checks whether a Firebase download URL references a Storage object path.
 * @param {string} url The stored download URL.
 * @param {string} filePath The Storage object path.
 * @return {boolean} True when the URL points at that object.
 */
function downloadUrlContainsPath(url: string, filePath: string) {
  const encodedPath = encodeURIComponent(filePath);
  return url.includes(encodedPath) || url.includes(filePath);
}

/**
 * Removes a blocked profile photo from the grouped ProfilePhoto array.
 * @param {object} input Removal input.
 * @param {unknown} input.profilePhotos Stored profilePhotos value.
 * @param {number|null} input.photoIndex Legacy slot index.
 * @param {string} input.filePath Blocked Storage object path.
 * @return {unknown[] | null} Updated photos, or null when absent.
 */
function removeBlockedProfilePhoto({
  profilePhotos,
  filePath,
}: {
  profilePhotos: unknown;
  filePath: string;
}): unknown[] | null {
  if (!Array.isArray(profilePhotos)) return null;
  const remaining = profilePhotos.filter((photo) => {
    if (!isRecord(photo)) return true;
    const storagePath = typeof photo.storagePath === "string" ?
      photo.storagePath :
      undefined;
    const url = typeof photo.url === "string" ? photo.url : undefined;
    return storagePath !== filePath &&
      (url === undefined || !downloadUrlContainsPath(url, filePath));
  });
  return compactGroupedProfilePhotos(remaining);
}

/**
 * Re-densifies grouped profile photo positions after a removal.
 * @param {unknown[]} profilePhotos Remaining grouped photo records.
 * @return {unknown[]} Photos with compact positions and prompt photoIndex.
 */
function compactGroupedProfilePhotos(profilePhotos: unknown[]): unknown[] {
  return profilePhotos
    .map((photo) => isRecord(photo) ? photo : null)
    .filter((photo): photo is Record<string, unknown> => photo !== null)
    .sort((a, b) => numericPosition(a) - numericPosition(b))
    .map((photo, position) => {
      const prompt = isRecord(photo.prompt) ?
        {...photo.prompt, photoIndex: position} :
        photo.prompt;
      return {
        ...photo,
        position,
        prompt,
        updatedAt: admin.firestore.Timestamp.now(),
      };
    });
}

/**
 * Returns a sortable profile photo position.
 * @param {Record<string, unknown>} photo Grouped profile photo.
 * @return {number} Position or a high fallback.
 */
function numericPosition(photo: Record<string, unknown>): number {
  return typeof photo.position === "number" &&
    Number.isInteger(photo.position) ?
    photo.position :
    Number.MAX_SAFE_INTEGER;
}

/**
 * Derives the generated thumbnail path for a source profile photo path.
 * @param {string} filePath Source profile photo Storage path.
 * @return {string | null} Thumbnail path, or null for non-profile paths.
 */
function thumbnailPathForProfilePhoto(filePath: string): string | null {
  const parts = filePath.split("/");
  if (parts.length !== 4 || parts[0] !== "users" || parts[2] !== "photos") {
    return null;
  }
  const sourceName = parts[3].replace(/\.[^.]+$/, "");
  return `users/${parts[1]}/photoThumbnails/${sourceName}.jpg`;
}

/**
 * Checks for a plain object record.
 * @param {unknown} value Candidate value.
 * @return {boolean} True for non-array object records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// ── Handler ────────────────────────────────────────────────────────────────

/**
 * Storage finalize handler that events SafeSearch on every uploaded image.
 *
 * When a photo is blocked (VERY_LIKELY explicit/violent), this handler
 * deletes the Storage object and removes the grouped photo record so the
 * client does not show a broken reference.
 */
export const moderatePhotoOnUpload = onObjectFinalized(
  async (event) => {
    const filePath = event.data.name;
    if (!filePath) return;

    // Profile and chat classification also controls the moderation flag source.
    const isProfilePhoto = filePath.startsWith("users/") &&
      filePath.includes("/photos/");
    const isChatImage = filePath.startsWith("matches/");

    if (!isModeratedPhotoPath(filePath)) return;

    const bucket = admin.storage().bucket(event.data.bucket);
    const file = bucket.file(filePath);

    try {
      const [exists] = await file.exists();
      if (!exists) return;

      // Download just enough bytes for SafeSearch (the Vision API
      // accepts up to 20 MB; Storage limit is 8 MB for our rules).
      const [buffer] = await file.download();

      const [result] = await (await getVisionClient()).safeSearchDetection({
        image: {content: buffer},
      });

      const safeSearch = result.safeSearchAnnotation;
      if (!safeSearch) return;

      const categories: SafeSearchCategory[] = [
        {name: "adult", likelihood: safeSearch.adult as Likelihood},
        {name: "violence", likelihood: safeSearch.violence as Likelihood},
        {name: "racy", likelihood: safeSearch.racy as Likelihood},
        {name: "medical", likelihood: safeSearch.medical as Likelihood},
      ];

      const severity = highestSeverity(categories);

      if (severity === "allow") return;

      // ── Build moderation flag ──────────────────────────────────────────

      const flagData = {
        targetUserId: uidFromPath(filePath) ?? "unknown",
        flagType: "explicit_photo" as const,
        source: (
          isProfilePhoto ? "profile_photo" :
            isChatImage ? "chat_message" : "organizer_image"
        ) as ModerationFlagDocument["source"],
        status: "pending" as const,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        contextId: filePath,
        safeSearchResults: Object.fromEntries(
          categories.map((c) => [c.name, c.likelihood])
        ),
      };

      // Deterministic id keyed on the uploaded object path so retries of this
      // at-least-once Storage trigger don't create duplicate moderation flags.
      const flagId = `photo_${filePath.replace(/[^A-Za-z0-9_-]/g, "_")}`;
      const flagRef = admin.firestore()
        .collection("moderationFlags")
        .doc(flagId);
      try {
        await flagRef.create(flagData);
      } catch (error) {
        // ALREADY_EXISTS (gRPC code 6) means a prior retried delivery already
        // flagged this object — continue idempotently.
        if ((error as {code?: number} | null)?.code !== 6) {
          throw error;
        }
      }

      // ── Block: delete the photo ────────────────────────────────────────

      if (severity === "block") {
        const thumbnailPath = thumbnailPathForProfilePhoto(filePath);
        await Promise.all([
          file.delete(),
          ...(thumbnailPath ?
            [bucket.file(thumbnailPath).delete({ignoreNotFound: true})] :
            []),
        ]);

        // Remove the grouped profile photo if it's a profile photo.
        if (isProfilePhoto) {
          const uid = uidFromPath(filePath);
          if (uid) {
            const userRef = admin.firestore().collection("users").doc(uid);
            await admin.firestore().runTransaction(async (tx) => {
              const userSnap = await tx.get(userRef);
              if (!userSnap.exists) return;
              const data = userSnap.data() ?? {};
              const profilePhotos = removeBlockedProfilePhoto({
                profilePhotos: data.profilePhotos,
                filePath,
              });
              if (profilePhotos) {
                tx.update(userRef, {
                  profilePhotos,
                });
              }
            });
          }
        }

        logger.info(
          `[moderation] BLOCKED photo ${filePath} → flag ${flagRef.id}`
        );
      } else {
        logger.info(
          `[moderation] FLAGGED photo ${filePath} → flag ${flagRef.id}`
        );
      }
    } catch (err) {
      // SafeSearch or download failure should not break the upload flow.
      // The photo stays; the error is logged for ops visibility.
      logger.error(
        `[moderation] SafeSearch failed for ${filePath}:`,
        err
      );
    }
  }
);
