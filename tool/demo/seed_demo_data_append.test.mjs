import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAppendDocsForValidRelationships,
  normalizeAppendParticipationsForCapacity,
  publicProfileFromUserDoc,
  thumbnailUrlForPhoto,
} from "./seed_demo_data.mjs";

test("append filter drops profile decisions and match artifacts without attended edges",
  async () => {
    const firestore = fakeFirestore({
      eventBookings: {
        run_1_new: {eventId: "run_1", uid: "new", status: "attended"},
        run_1_target: {eventId: "run_1", uid: "target", status: "signedUp"},
      },
    });
    const docs = [
      participationDoc("run_1", "new", "attended"),
      swipeDoc("new", "target", "run_1"),
      swipeDoc("target", "new", "run_1"),
      {path: "matches/new_target", data: {user1Id: "new", user2Id: "target"}},
      {path: "matches/new_target/messages/one", data: {text: "hello"}},
      {
        path: "notifications/new/items/match_new_target",
        data: {matchId: "new_target", type: "match"},
      },
      {
        path: "notifications/new/items/run_reminder",
        data: {eventId: "run_1", type: "eventReminder"},
      },
    ];

    const result = await filterAppendDocsForValidRelationships(
      firestore,
      docs
    );

    assert.deepEqual(result.docs.map((doc) => doc.path).sort(), [
      "eventBookings/run_1_new",
      "notifications/new/items/run_reminder",
    ]);
    assert.deepEqual(result.skippedPaths.sort(), [
      "matches/new_target",
      "matches/new_target/messages/one",
      "notifications/new/items/match_new_target",
      "profileDecisions/new/outgoing/target",
      "profileDecisions/target/outgoing/new",
    ]);
  }
);

test("append filter keeps swipe relationships when both users attended",
  async () => {
    const firestore = fakeFirestore({
      eventBookings: {
        run_1_target: {eventId: "run_1", uid: "target", status: "attended"},
      },
    });
    const docs = [
      participationDoc("run_1", "new", "attended"),
      swipeDoc("new", "target", "run_1"),
      swipeDoc("target", "new", "run_1"),
      {path: "matches/new_target", data: {user1Id: "new", user2Id: "target"}},
      {path: "matches/new_target/messages/one", data: {text: "hello"}},
    ];

    const result = await filterAppendDocsForValidRelationships(
      firestore,
      docs
    );

    assert.deepEqual(result.docs.map((doc) => doc.path).sort(), [
      "eventBookings/run_1_new",
      "matches/new_target",
      "matches/new_target/messages/one",
      "profileDecisions/new/outgoing/target",
      "profileDecisions/target/outgoing/new",
    ]);
    assert.deepEqual(result.skippedPaths, []);
  }
);

test("append normalization downgrades attended edges for future events",
  async () => {
    const firestore = fakeFirestore({
      events: {
        run_1: {
          capacityLimit: 10,
          bookedCount: 0,
          startTime: fakeTimestamp("2099-05-14T03:10:00.000Z"),
        },
      },
    });
    const docs = [
      {
        path: "eventBookings/run_1_new",
        data: {
          eventId: "run_1",
          uid: "new",
          status: "attended",
          attendedAt: fakeTimestamp("2099-05-14T04:15:00.000Z"),
        },
      },
    ];

    const result = await normalizeAppendParticipationsForCapacity(
      firestore,
      docs
    );

    assert.equal(result[0].data.status, "signedUp");
    assert.equal(result[0].data.attendedAt, null);
  }
);

test("seed public profiles carry thumbnail URLs for tiny avatar surfaces", () => {
  const fullPhoto =
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
  const userDoc = {
    synthetic: true,
    seedPrefix: "demo",
    scenario: "smoke",
    name: "Aditi Rao",
    firstName: "Aditi",
    displayName: "Aditi Rao",
    dateOfBirth: fakeTimestamp("1998-05-14T00:00:00.000Z"),
    profilePrompts: [{
      promptId: "perfectRun",
      prompt: "A perfect event with me looks like...",
      answer: "Easy kilometres.",
    }],
    gender: "woman",
    profilePhotos: [profilePhoto({
      url: fullPhoto,
      thumbnailUrl: thumbnailUrlForPhoto(fullPhoto),
      prompt: {
        photoIndex: 0,
        promptId: "proofIRun",
        prompt: "Proof I actually event",
      },
    })],
    activityPreferences: activityPreferences({preferredRunTimes: ["morning"]}),
  };

  const publicProfile = publicProfileFromUserDoc(userDoc);

  assert.equal(Object.hasOwn(publicProfile, "bio"), false);
  assert.deepEqual(publicProfile.profilePrompts, userDoc.profilePrompts);
  assert.deepEqual(publicProfile.profilePhotos[0].url, fullPhoto);
  assert.deepEqual(publicProfile.profilePhotos[0].prompt, userDoc.profilePhotos[0].prompt);
  assert.deepEqual(
    publicProfile.activityPreferences.running.preferredRunTimes,
    ["morning"]
  );
  assert.equal(publicProfile.profilePhotos.length, 1);
  const thumbnail = new URL(publicProfile.profilePhotos[0].thumbnailUrl);
  assert.equal(thumbnail.hostname, "images.unsplash.com");
  assert.equal(thumbnail.searchParams.get("w"), "160");
  assert.equal(thumbnail.searchParams.get("h"), "160");
  assert.equal(thumbnail.searchParams.get("crop"), "faces");
});

test("seed thumbnail normalization preserves existing thumbnails", () => {
  const userDoc = {
    name: "Kabir Mehta",
    firstName: "Kabir",
    dateOfBirth: fakeTimestamp("1996-05-14T00:00:00.000Z"),
    profilePrompts: [],
    gender: "man",
    profilePhotos: [profilePhoto({
      url: "https://example.test/full.jpg",
      thumbnailUrl: "https://example.test/thumb.jpg",
    })],
  };

  const publicProfile = publicProfileFromUserDoc(userDoc);

  assert.equal(
    publicProfile.profilePhotos[0].thumbnailUrl,
    "https://example.test/thumb.jpg"
  );
});

test("thumbnailUrlForPhoto leaves non-Unsplash URLs usable", () => {
  assert.equal(
    thumbnailUrlForPhoto("https://example.test/full.jpg"),
    "https://example.test/full.jpg"
  );
});

function participationDoc(eventId, uid, status) {
  return {
    path: `eventBookings/${eventId}_${uid}`,
    data: {eventId, uid, status},
  };
}

function fakeTimestamp(iso) {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function swipeDoc(swiperId, targetId, eventId) {
  return {
    path: `profileDecisions/${swiperId}/outgoing/${targetId}`,
    data: {swiperId, targetId, eventId, direction: "like"},
  };
}

function profilePhoto({url, thumbnailUrl, prompt = null}) {
  return {
    id: "photo-1",
    url,
    thumbnailUrl,
    storagePath: "users/demo/photos/photo-1.jpg",
    thumbnailStoragePath: "users/demo/photoThumbnails/photo-1.jpg",
    prompt,
    moderation: null,
    position: 0,
    createdAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
  };
}

function activityPreferences(overrides = {}) {
  return {
    running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: [],
      runningReasons: [],
      preferredRunTimes: [],
      version: 1,
      ...overrides,
    },
  };
}

function fakeFirestore(initialData) {
  const data = initialData;
  return {
    collection: (collectionName) => ({
      doc: (docId) => ({
        get: async () => {
          const doc = data[collectionName]?.[docId];
          return {
            exists: doc !== undefined,
            data: () => doc,
          };
        },
      }),
    }),
  };
}
