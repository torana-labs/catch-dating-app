import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";

// Staged host photo originals live at
// events/{eventId}/hostPhotoUploads/{photoId}/original.{ext} until
// addEventHostPhoto re-encodes them and deletes them. An original whose add
// never runs (the app was killed mid-upload, the host lost signal) still
// carries its EXIF and GPS data, so it must not sit in the bucket forever.
// The bucket is not managed by infra/, so this sweep stands in for a Storage
// lifecycle rule on that prefix.

export const HOST_PHOTO_STAGING_GLOB = "events/*/hostPhotoUploads/**";
/** A staged original older than this is abandoned. */
export const HOST_PHOTO_STAGING_MAX_AGE_MILLIS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
/** Bounds one run; the next run continues where the backlog remains. */
const MAX_PAGES_PER_RUN = 20;

export interface StagedObject {
  name: string;
  metadata: {timeCreated?: string};
  delete: (options: {ignoreNotFound: boolean}) => Promise<unknown>;
}

export interface StagingBucket {
  getFiles: (query: {
    matchGlob: string;
    maxResults: number;
    autoPaginate: false;
    pageToken?: string;
  }) => Promise<[StagedObject[], {pageToken?: string} | null | undefined,
    unknown?]>;
}

export interface StagingCleanupResult {
  scanned: number;
  deleted: number;
  failed: number;
  truncated: boolean;
}

/**
 * Deletes staged host photo originals created more than a day before [now].
 * A failed delete is logged and retried by the next run.
 * @param {StagingBucket} bucket The default Storage bucket.
 * @param {number} nowMillis The run's clock.
 * @return {Promise<StagingCleanupResult>} What the run did.
 */
export async function cleanUpStagedHostPhotos(bucket: StagingBucket,
  nowMillis: number): Promise<StagingCleanupResult> {
  const cutoff = nowMillis - HOST_PHOTO_STAGING_MAX_AGE_MILLIS;
  const result: StagingCleanupResult =
    {scanned: 0, deleted: 0, failed: 0, truncated: false};
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const [files, next] = await bucket.getFiles({
      matchGlob: HOST_PHOTO_STAGING_GLOB,
      maxResults: PAGE_SIZE,
      autoPaginate: false,
      ...(pageToken ? {pageToken} : {}),
    });
    for (const file of files) {
      result.scanned++;
      if (!isStagedOriginal(file.name)) continue;
      const created = Date.parse(file.metadata.timeCreated ?? "");
      if (!Number.isFinite(created) || created > cutoff) continue;
      try {
        await file.delete({ignoreNotFound: true});
        result.deleted++;
      } catch (error) {
        result.failed++;
        logger.warn("Staged host photo delete failed",
          {name: file.name, error});
      }
    }
    pageToken = next?.pageToken;
    if (!pageToken) return result;
  }
  result.truncated = true;
  return result;
}

/** Only objects directly under a photo's staging folder. */
export function isStagedOriginal(name: string): boolean {
  const parts = name.split("/");
  return parts.length === 5 && parts[0] === "events" &&
    parts[2] === "hostPhotoUploads" && parts[3].length > 0 &&
    parts[4].length > 0;
}

export const cleanUpStagedHostPhotosDaily = onSchedule(
  {schedule: "every day 04:10", timeZone: "Asia/Kolkata"},
  async () => {
    const result = await cleanUpStagedHostPhotos(
      admin.storage().bucket() as unknown as StagingBucket, Date.now());
    logger.info("Staged host photo cleanup", result);
  }
);
