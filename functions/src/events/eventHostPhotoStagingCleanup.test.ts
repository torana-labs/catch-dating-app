import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanUpStagedHostPhotos,
  HOST_PHOTO_STAGING_GLOB,
  isStagedOriginal,
  type StagedObject,
  type StagingBucket,
} from "./eventHostPhotoStagingCleanup";

const NOW = Date.parse("2026-11-12T10:00:00Z");
const HOUR = 60 * 60 * 1000;

function bucket(pages: {name: string; ageHours: number; fails?: boolean}[][]) {
  const deleted: string[] = [];
  const queries: {matchGlob: string; pageToken?: string}[] = [];
  const fake: StagingBucket = {
    getFiles: async (query) => {
      queries.push(query);
      const index = query.pageToken ? Number(query.pageToken) : 0;
      const files: StagedObject[] = pages[index].map((file) => ({
        name: file.name,
        metadata: {timeCreated: new Date(NOW - file.ageHours * HOUR)
          .toISOString()},
        delete: async () => {
          if (file.fails) throw new Error("storage unavailable");
          deleted.push(file.name);
        },
      }));
      const next = index + 1 < pages.length ? String(index + 1) : undefined;
      return [files, next ? {pageToken: next} : null];
    },
  };
  return {fake, deleted, queries};
}

const staged = (event: string, photo: string, ext = "jpg") =>
  `events/${event}/hostPhotoUploads/${photo}/original.${ext}`;

test("deletes staged originals older than a day across pages", async () => {
  const {fake, deleted, queries} = bucket([
    [
      {name: staged("e1", "old0000000000000001"), ageHours: 30},
      {name: staged("e1", "new0000000000000001"), ageHours: 2},
    ],
    [
      {name: staged("e2", "old0000000000000002", "png"), ageHours: 25},
      {name: staged("e2", "edge000000000000001"), ageHours: 23.9},
    ],
  ]);

  const result = await cleanUpStagedHostPhotos(fake, NOW);

  assert.deepEqual(deleted, [
    staged("e1", "old0000000000000001"),
    staged("e2", "old0000000000000002", "png"),
  ]);
  assert.deepEqual(result,
    {scanned: 4, deleted: 2, failed: 0, truncated: false});
  assert.equal(queries.length, 2);
  assert.ok(queries.every((query) =>
    query.matchGlob === HOST_PHOTO_STAGING_GLOB));
  assert.equal(queries[1].pageToken, "1");
});

test("never touches shared photos or other event media", async () => {
  const {fake, deleted} = bucket([[
    {name: "events/e1/hostPhotos/p1/display.jpg", ageHours: 100},
    {name: "events/e1/media/m1/original.jpg", ageHours: 100},
    {name: "events/e1/hostPhotoUploads/stray.jpg", ageHours: 100},
  ]]);

  const result = await cleanUpStagedHostPhotos(fake, NOW);

  assert.deepEqual(deleted, []);
  assert.equal(result.deleted, 0);
});

test("a failed delete is counted and the sweep carries on", async () => {
  const {fake, deleted} = bucket([[
    {name: staged("e1", "fail000000000000001"), ageHours: 48, fails: true},
    {name: staged("e1", "old0000000000000003"), ageHours: 48},
  ]]);

  const result = await cleanUpStagedHostPhotos(fake, NOW);

  assert.deepEqual(deleted, [staged("e1", "old0000000000000003")]);
  assert.equal(result.failed, 1);
});

test("a run stops after its page budget and reports the backlog", async () => {
  const pages = Array.from({length: 25}, (_, index) =>
    [{name: staged("e1", `old${String(index).padStart(16, "0")}`),
      ageHours: 48}]);
  const {fake, deleted} = bucket(pages);

  const result = await cleanUpStagedHostPhotos(fake, NOW);

  assert.equal(deleted.length, 20);
  assert.equal(result.truncated, true);
});

test("recognises only staged original paths", () => {
  assert.equal(isStagedOriginal(staged("e1", "p1")), true);
  assert.equal(isStagedOriginal("events/e1/hostPhotos/p1/display.jpg"), false);
  assert.equal(isStagedOriginal("events/e1/hostPhotoUploads/p1"), false);
});
