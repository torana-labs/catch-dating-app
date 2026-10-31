import assert from "node:assert/strict";
import {createRequire} from "node:module";
import test from "node:test";
import {publicProfileFromUserDoc} from "../demo/seed_demo_data.mjs";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url)
);
const {
  publicProfileFromUserProfileDoc,
} = requireFromFunctions("./lib/shared/profileProjection.js");

test("seed public profile projection matches Functions projection helper", () => {
  const userDoc = validUserProfileDoc();

  assert.deepEqual(
    publicProfileFromUserDoc(userDoc),
    publicProfileFromUserProfileDoc(userDoc)
  );
});

function validUserProfileDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_beta_2026",
    scenario: "smoke",
    name: "Asha Runner",
    firstName: "Asha",
    lastName: "Runner",
    displayName: "Asha Host",
    dateOfBirth: fakeTimestamp("1996-01-01T00:00:00.000Z"),
    gender: "woman",
    phoneNumber: "+919900000001",
    profileComplete: true,
    email: "asha@example.test",
    profilePrompts: [{
      promptId: "perfectRun",
      prompt: "A perfect event with me looks like...",
      answer: "Morning runner",
    }],
    profilePhotos: [{
      id: "photo-1",
      url: "https://example.test/full.jpg",
      thumbnailUrl: "https://example.test/thumb.jpg",
      storagePath: "users/asha/photos/photo-1.jpg",
      thumbnailStoragePath: "users/asha/photoThumbnails/photo-1.jpg",
      prompt: {
      photoIndex: 0,
      promptId: "proofIRun",
      prompt: "Proof I actually event",
      caption: "Race morning.",
      },
      moderation: null,
      position: 0,
      createdAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
      updatedAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
    }],
    city: "in-mh-mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    interestedInGenders: ["man"],
    minAgePreference: 24,
    maxAgePreference: 42,
    height: 168,
    occupation: "Designer",
    company: "Stride Labs",
    education: "bachelors",
    religion: "nonReligious",
    languages: ["english", "hindi"],
    relationshipGoal: "relationship",
    drinking: "socially",
    smoking: "never",
    workout: "often",
    diet: "omnivore",
    children: "dontHave",
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: ["fiveK", "tenK"],
        runningReasons: ["fitness", "social"],
        preferredRunTimes: ["morning"],
        version: 1,
      },
    },
    prefsNewCatches: true,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: true,
    prefsOrganizerUpdates: true,
    prefsWeeklyDigest: false,
    prefsShowOnMap: true,
  };
}

function fakeTimestamp(iso) {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}
