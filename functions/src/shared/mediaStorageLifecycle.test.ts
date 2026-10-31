import assert from "node:assert/strict";
import test from "node:test";
import {
  referencedMediaStoragePaths,
  removedMediaStoragePaths,
} from "./mediaStorageLifecycle";

test("organizer cleanup returns removed originals and thumbnails", () => {
  const retained = {
    storagePath: "organizers/org-1/media/keep/original.jpg",
    thumbnailStoragePath: "organizers/org-1/media/keep/thumbnail.jpg",
  };
  const removed = {
    storagePath: "organizers/org-1/media/remove/original.jpg",
    thumbnailStoragePath: "organizers/org-1/media/remove/thumbnail.jpg",
  };

  assert.deepEqual(removedMediaStoragePaths({
    before: {organizerPhotos: [retained, removed]},
    after: {organizerPhotos: [retained]},
    owner: {kind: "organizer", id: "org-1"},
  }), [
    "organizers/org-1/media/remove/original.jpg",
    "organizers/org-1/media/remove/thumbnail.jpg",
  ]);
});

test("cleanup rejects a path outside the exact owning namespace", () => {
  assert.deepEqual([...referencedMediaStoragePaths({
    eventPhotos: [
      {storagePath: "events/event-2/media/stolen/original.jpg"},
      {storagePath: "events/event-1/../event-2/original.jpg"},
      {storagePath: "events/event-1/media/owned/original.jpg"},
    ],
  }, {kind: "event", id: "event-1"})], [
    "events/event-1/media/owned/original.jpg",
  ]);
});

test("legacy organizer media remains eligible for lifecycle cleanup", () => {
  assert.deepEqual([...referencedMediaStoragePaths({
    organizerPhotos: [{storagePath: "clubs/org-1/photos/0_old.jpg"}],
    logoPhoto: {
      storagePath: "organizers/org-1/logo/old.jpg",
      thumbnailStoragePath:
        "organizers/org-1/logoThumbnails/old.jpg",
    },
  }, {kind: "organizer", id: "org-1"})].sort(), [
    "clubs/org-1/photos/0_old.jpg",
    "organizers/org-1/logo/old.jpg",
    "organizers/org-1/logoThumbnails/old.jpg",
  ]);
});
