import assert from "node:assert/strict";
import test from "node:test";
import type {
  UserProfileDocument,
} from "./generated/firestoreAdminTypes";
import {
  publicDisplayName,
  publicAvatarUrl,
  publicProfileFromUserProfileDoc,
} from "./profileProjection";
import {profilePromptCatalog} from "./generated/catalogs/profilePromptCatalog";


function timestamp(date: Date) {
  return {toDate: () => date} as FirebaseFirestore.Timestamp;
}

function completeUser(
  overrides: Partial<UserProfileDocument> = {}
): UserProfileDocument {
  return {
    profileComplete: true,
    name: "Asha Runner",
    firstName: "Asha",
    lastName: "Runner",
    displayName: "Asha Host",
    dateOfBirth: timestamp(new Date("1996-01-01T00:00:00.000Z")),
    gender: "woman",
    phoneNumber: "+919900000001",
    countryCode: "+91",
    email: "asha@example.test",
    profilePrompts: [{
      promptId: " perfectRun ",
      prompt: " A perfect event with me looks like... ",
      answer: "Morning runner\n\n\nCoffee after.",
    }],
    profilePhotos: [{
      id: "photo_0",
      url: " https://example.test/full.jpg ",
      thumbnailUrl: " https://example.test/thumb.jpg ",
      storagePath: "users/runner-1/photos/0.jpg",
      thumbnailStoragePath: "users/runner-1/photoThumbnails/0.jpg",
      position: 0,
      prompt: {
        photoIndex: 0,
        promptId: " proofIRun ",
        prompt: " Proof I actually event ",
        caption: "Race morning\n\n\nFinish-line smile.",
      },
      moderation: null,
      createdAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
      updatedAt: timestamp(new Date("2026-01-01T00:00:00.000Z")),
    }],
    city: "in-mh-mumbai",
    interestedInGenders: ["man"],
    minAgePreference: 24,
    maxAgePreference: 42,
    languages: ["english"],
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: ["fiveK"],
        runningReasons: ["fitness"],
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
    ...overrides,
  };
}

test("publicDisplayName uses editable display name with safe fallbacks", () => {
  assert.equal(publicDisplayName(completeUser()), "Asha Host");
  assert.equal(
    publicDisplayName(completeUser({displayName: " ", firstName: "Asha"})),
    "Asha"
  );
  assert.equal(
    publicDisplayName(completeUser({
      displayName: " ",
      firstName: " ",
      name: "Asha Runner",
    })),
    "Asha"
  );
});

test("publicAvatarUrl reads grouped profile photo thumbnails", () => {
  assert.equal(
    publicAvatarUrl(completeUser({
      profilePhotos: [{
        ...completeUser().profilePhotos[0],
        thumbnailUrl: "",
      }],
    })),
    "https://example.test/full.jpg"
  );
});

test("publicProfileFromUserProfileDoc drops invalid grouped photos", () => {
  const profile = publicProfileFromUserProfileDoc(completeUser({
    profilePhotos: [
      {...completeUser().profilePhotos[0], url: "not a url"},
      completeUser().profilePhotos[0],
    ],
  }));

  assert.equal(profile.profilePhotos.length, 1);
  assert.equal(profile.profilePhotos[0].url, "https://example.test/full.jpg");
});

test(
  "publicProfileFromUserProfileDoc projects public fields and metadata",
  () => {
    const profile = publicProfileFromUserProfileDoc(completeUser({
      synthetic: true,
      seedPrefix: "demo_beta_2026",
      scenario: "smoke",
      height: 168,
      occupation: "Designer",
      company: "Stride Labs",
      city: "in-dl-delhi-ncr",
      relationshipGoal: "relationship",
    } as Partial<UserProfileDocument>));

    assert.equal(profile.name, "Asha Host");
    assert.equal(profile.synthetic, true);
    assert.equal(profile.seedPrefix, "demo_beta_2026");
    assert.equal(profile.scenario, "smoke");
    assert.equal(Object.hasOwn(profile, "demoOps"), false);
    assert.deepEqual(profile.profilePrompts, [{
      promptId: "perfectRun",
      prompt: "A perfect event with me looks like...",
      answer: "Morning runner\n\nCoffee after.",
    }]);
    assert.deepEqual(profile.profilePhotos[0].prompt, {
      photoIndex: 0,
      promptId: "proofIRun",
      prompt: "Proof I actually event",
      caption: "Race morning\n\nFinish-line smile.",
    });
    assert.equal(profile.height, 168);
    assert.equal(profile.occupation, "Designer");
    assert.equal(profile.company, "Stride Labs");
    assert.equal(profile.city, "in-dl-delhi-ncr");
    assert.equal(profile.relationshipGoal, "relationship");
    assert.deepEqual(
      profile.activityPreferences.running.preferredRunTimes,
      ["morning"]
    );
    assert.equal(profile.activityPreferences.running.version, 1);
  }
);

test("publicProfileFromUserProfileDoc migrates legacy bio via catalog fallback",
  () => {
    const defaultPrompt = profilePromptCatalog.prompts.find(
      (prompt) => prompt.id === profilePromptCatalog.defaultPromptIds[0]
    ) ?? profilePromptCatalog.prompts[0];
    const profile = publicProfileFromUserProfileDoc(completeUser({
      profilePrompts: [],
      bio: "Old bio\n\n\nstill useful",
    } as Partial<UserProfileDocument>));

    assert.deepEqual(profile.profilePrompts, [{
      promptId: defaultPrompt.id,
      prompt: defaultPrompt.title,
      answer: "Old bio\n\nstill useful",
    }]);
  }
);
