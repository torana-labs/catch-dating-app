const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {Timestamp, doc, setDoc} = require("firebase/firestore");

const projectRoot = path.resolve(__dirname, "..", "..");
const firestoreRules = fs.readFileSync(
  path.join(projectRoot, "firestore.rules"),
  "utf8",
);
const storageRules = fs.readFileSync(
  path.join(projectRoot, "storage.rules"),
  "utf8",
);

const projectId = "demo-catch-rules";
const bucketUrl = `gs://${projectId}.appspot.com`;

let testEnv;

function authedStorage(uid) {
  return testEnv.authenticatedContext(uid).storage(bucketUrl);
}

function unauthenticatedStorage() {
  return testEnv.unauthenticatedContext().storage(bucketUrl);
}

function match(overrides = {}) {
  return {
    user1Id: "runner-1",
    user2Id: "runner-2",
    eventIds: ["event-1"],
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderId: null,
    unreadCounts: {"runner-1": 0, "runner-2": 0},
    status: "active",
    blockedBy: null,
    blockedAt: null,
    ...overrides,
  };
}

async function seedFirestore(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

async function seedStorageFile(objectPath) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .storage(bucketUrl)
      .ref(objectPath)
      .putString("seeded", "raw", {contentType: "image/jpeg"});
  });
}

function uploadImage(
  storage,
  objectPath,
  {contentType = "image/jpeg", data = "image-bytes", customMetadata} = {},
) {
  return storage
    .ref(objectPath)
    .putString(data, "raw", {contentType, customMetadata});
}

function uploadChatImage(storage, objectPath, uploaderUid, options = {}) {
  return uploadImage(storage, objectPath, {
    ...options,
    customMetadata: {uploaderUid},
  });
}

describe("storage.rules", () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: firestoreRules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
        port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080),
      },
      storage: {
        rules: storageRules,
        host: process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
        port: Number(process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(":")[1] ?? 9199),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  describe("organizer form private objects", () => {
    it("denies direct reads and writes for respondent assets and exports", async () => {
      const assetPath = "organizerForms/form-1/draft-1/asset-1";
      const exportPath = "organizer-form-exports/organizer-1/export-1.csv";

      await assertFails(uploadImage(authedStorage("runner-1"), assetPath));
      await assertFails(uploadImage(unauthenticatedStorage(), assetPath));
      await assertFails(uploadImage(authedStorage("host-1"), exportPath));
      await assertFails(uploadImage(unauthenticatedStorage(), exportPath));

      await seedStorageFile(assetPath);
      await seedStorageFile(exportPath);
      await assertFails(
        authedStorage("runner-1").ref(assetPath).getMetadata(),
      );
      await assertFails(
        unauthenticatedStorage().ref(assetPath).getMetadata(),
      );
      await assertFails(
        authedStorage("host-1").ref(exportPath).getMetadata(),
      );
      await assertFails(
        unauthenticatedStorage().ref(exportPath).getMetadata(),
      );
    });
  });

  describe("chat images", () => {
    it("allows active match participants to upload using user1Id/user2Id", async () => {
      await seedFirestore(["matches", "match-1"], match());

      await assertSucceeds(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/match-1/images/message-1_123.jpg",
          "runner-1",
        ),
      );
      await assertSucceeds(
        uploadChatImage(
          authedStorage("runner-2"),
          "matches/match-1/images/message-2_123.jpg",
          "runner-2",
        ),
      );
    });

    it("keeps legacy participantIds working during data backfill", async () => {
      await seedFirestore(
        ["matches", "legacy-match"],
        match({
          user1Id: null,
          user2Id: null,
          participantIds: ["runner-1", "runner-2"],
        }),
      );

      await assertSucceeds(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/legacy-match/images/message-1_123.jpg",
          "runner-1",
        ),
      );
    });

    it("denies non-participants, blocked matches, anonymous users, and non-images", async () => {
      await seedFirestore(["matches", "match-1"], match());
      await seedFirestore(
        ["matches", "blocked-match"],
        match({status: "blocked"}),
      );

      await assertFails(
        uploadChatImage(
          authedStorage("runner-3"),
          "matches/match-1/images/message-1_123.jpg",
          "runner-3",
        ),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/blocked-match/images/message-1_123.jpg",
          "runner-1",
        ),
      );
      await assertFails(
        uploadChatImage(
          unauthenticatedStorage(),
          "matches/match-1/images/message-1_123.jpg",
          "runner-1",
        ),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/match-1/images/message-1_123.txt",
          "runner-1",
          {contentType: "text/plain"},
        ),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/match-1/images/message-1.jpg",
          "runner-1",
        ),
      );
    });

    it("requires uploader-owned metadata and forbids object updates", async () => {
      await seedFirestore(["matches", "match-1"], match());
      const objectPath = "matches/match-1/images/immutable-owner_123.jpg";

      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "matches/match-1/images/missing-metadata_123.jpg",
        ),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/match-1/images/forged-owner_123.jpg",
          "runner-2",
        ),
      );

      await assertSucceeds(
        uploadChatImage(
          authedStorage("runner-1"),
          objectPath,
          "runner-1",
        ),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          objectPath,
          "runner-1",
          {data: "replacement"},
        ),
      );
    });

    it("allows only the active-match uploader to delete a chat image", async () => {
      await seedFirestore(["matches", "match-1"], match());
      const objectPath = "matches/match-1/images/delete-owner_123.jpg";

      await assertSucceeds(
        uploadChatImage(
          authedStorage("runner-1"),
          objectPath,
          "runner-1",
        ),
      );
      await assertFails(authedStorage("runner-2").ref(objectPath).delete());
      await assertSucceeds(
        authedStorage("runner-1").ref(objectPath).delete(),
      );
    });

    it("allows only participants to read chat images", async () => {
      await seedFirestore(["matches", "match-1"], match());
      await seedStorageFile("matches/match-1/images/message-1_123.jpg");

      await assertSucceeds(
        authedStorage("runner-2")
          .ref("matches/match-1/images/message-1_123.jpg")
          .getMetadata(),
      );
      await assertFails(
        authedStorage("runner-3")
          .ref("matches/match-1/images/message-1_123.jpg")
          .getMetadata(),
      );
    });

    it("denies participants from reading or writing when match status is blocked", async () => {
      await seedFirestore(
        ["matches", "blocked-match"],
        match({status: "blocked"}),
      );
      await seedStorageFile("matches/blocked-match/images/message-1_123.jpg");

      await assertFails(
        authedStorage("runner-1")
          .ref("matches/blocked-match/images/message-1_123.jpg")
          .getMetadata(),
      );
      await assertFails(
        uploadChatImage(
          authedStorage("runner-1"),
          "matches/blocked-match/images/message-2_123.jpg",
          "runner-1",
        ),
      );
    });
  });

  describe("profile photos", () => {
    it("allows owner uploads with valid filenames and the exact max size", async () => {
      const maxImageBytes = 8 * 1024 * 1024;

      await assertSucceeds(
        uploadImage(
          authedStorage("runner-1"),
          "users/runner-1/photos/0_123.jpg",
          {data: "a".repeat(maxImageBytes)},
        ),
      );
    });

    it("denies invalid profile photo writes", async () => {
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "users/runner-2/photos/0_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "users/runner-1/photos/6_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "users/runner-1/photos/avatar_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "users/runner-1/photos/1_123.jpg",
          {data: "a".repeat((8 * 1024 * 1024) + 1)},
        ),
      );
    });
  });

  describe("hosted media staging", () => {
    it("denies new client uploads to hosted media", async () => {
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "users/host-1/hostedMedia/club_club-1_profile_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "users/host-1/hostedMedia/club_club-1_profile_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          unauthenticatedStorage(),
          "users/host-1/hostedMedia/club_club-1_profile_123.jpg",
        ),
      );
    });

    it("allows public reads for hosted club and event media", async () => {
      await seedStorageFile(
        "users/host-1/hostedMedia/event_club-1_event-1_123.jpg",
      );

      await assertSucceeds(
        unauthenticatedStorage()
          .ref("users/host-1/hostedMedia/event_club-1_event-1_123.jpg")
          .getMetadata(),
      );
    });

    it("denies retired legacy club and event media paths", async () => {
      await assertFails(
        uploadImage(authedStorage("host-1"), "organizers/club-1/profile.jpg"),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "organizers/club-1/events/event-1/photo.jpg",
        ),
      );
    });
  });

  describe("club and event media", () => {
    it("supports position-independent v2 organizer media and compensation", async () => {
      await seedFirestore(["organizers", "organizer-1"], {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      const paths = [
        "organizers/organizer-1/media/position-0-media01/original.jpg",
        "organizers/organizer-1/media/position-6-media01/original.jpg",
        "organizers/organizer-1/media/position-24-media1/original.jpg",
      ];

      for (const objectPath of paths) {
        await assertSucceeds(uploadImage(authedStorage("manager-1"), objectPath));
      }
      await assertSucceeds(
        uploadImage(
          authedStorage("owner-1"),
          "organizers/organizer-1/logo/stable-logo-00001/original.jpg",
        ),
      );
      await assertFails(
        uploadImage(authedStorage("manager-1"), paths[0], {data: "replacement"}),
      );
      await assertFails(
        uploadImage(
          authedStorage("manager-1"),
          "organizers/organizer-1/media/position-0-media01/thumbnail.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("manager-1"),
          "organizers/organizer-1/media/short/original.jpg",
        ),
      );
      await assertFails(authedStorage("runner-1").ref(paths[1]).delete());
      await assertSucceeds(authedStorage("manager-1").ref(paths[1]).delete());
    });

    it("uses active organizer team edges for v2 organizer and event media", async () => {
      await seedFirestore(["organizers", "organizer-1"], {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1"],
      });
      await seedFirestore(
        ["organizerTeamMemberships", "organizer-1_manager-edge"],
        {
          organizerId: "organizer-1",
          uid: "manager-edge",
          role: "manager",
          status: "active",
        },
      );
      await seedFirestore(
        ["organizerTeamMemberships", "organizer-1_inactive-manager"],
        {
          organizerId: "organizer-1",
          uid: "inactive-manager",
          role: "manager",
          status: "inactive",
        },
      );
      await seedFirestore(["events", "event-1"], {
        organizerId: "organizer-1",
      });

      await assertSucceeds(
        uploadImage(
          authedStorage("manager-edge"),
          "organizers/organizer-1/media/team-media-00001/original.jpg",
        ),
      );
      await assertSucceeds(
        uploadImage(
          authedStorage("manager-edge"),
          "events/event-1/media/team-event-00001/original.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("inactive-manager"),
          "organizers/organizer-1/media/inactive-media-01/original.jpg",
        ),
      );
    });

    it("keeps v2 thumbnails server-only and publicly readable", async () => {
      const original =
        "events/event-1/media/public-event-001/original.jpg";
      const thumbnail =
        "events/event-1/media/public-event-001/thumbnail.jpg";
      await seedStorageFile(original);
      await seedStorageFile(thumbnail);

      await assertSucceeds(
        unauthenticatedStorage().ref(original).getMetadata(),
      );
      await assertSucceeds(
        unauthenticatedStorage().ref(thumbnail).getMetadata(),
      );
      await assertFails(authedStorage("host-1").ref(thumbnail).delete());
    });

    it("allows authorized rollback deletes on released media paths", async () => {
      await seedFirestore(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1"],
      });
      await seedFirestore(["events", "event-1"], {
        organizerId: "organizer-1",
      });
      await seedStorageFile("users/runner-1/photos/0_123.jpg");
      await seedStorageFile("organizers/organizer-1/photos/0_123.jpg");
      await seedStorageFile("events/event-1/photos/0_123.jpg");

      await assertSucceeds(
        authedStorage("runner-1").ref("users/runner-1/photos/0_123.jpg").delete(),
      );
      await assertSucceeds(
        authedStorage("owner-1")
          .ref("organizers/organizer-1/photos/0_123.jpg")
          .delete(),
      );
      await assertSucceeds(
        authedStorage("owner-1").ref("events/event-1/photos/0_123.jpg").delete(),
      );
    });

    it("allows organizer managers to upload canonical organizer media", async () => {
      await seedFirestore(["organizers", "organizer-1"], {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });

      await assertSucceeds(
        uploadImage(
          authedStorage("manager-1"),
          "organizers/organizer-1/photos/0_123.jpg",
        ),
      );
      await assertSucceeds(
        uploadImage(
          authedStorage("owner-1"),
          "organizers/organizer-1/logo/123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "organizers/organizer-1/photos/0_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("manager-1"),
          "organizers/organizer-1/photos/6_123.jpg",
        ),
      );
    });

    it("allows organizer hosts to upload organizer photos and logos", async () => {
      await seedFirestore(["organizers", "club-1"], {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "host-1"],
      });

      await assertSucceeds(
        uploadImage(authedStorage("host-1"), "organizers/club-1/photos/0_123.jpg"),
      );
      await assertSucceeds(
        uploadImage(authedStorage("owner-1"), "organizers/club-1/logo/123.jpg"),
      );
      await assertFails(
        uploadImage(authedStorage("runner-1"), "organizers/club-1/photos/0_123.jpg"),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "organizers/club-1/logo/123.txt",
          {contentType: "text/plain"},
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "organizers/club-1/photos/6_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("owner-1"),
          "organizers/club-1/logo/logo_123.jpg",
        ),
      );
    });

    it("allows event organizer hosts to upload event photos after event creation", async () => {
      await seedFirestore(["organizers", "club-1"], {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "host-1"],
      });
      await seedFirestore(["events", "event-1"], {organizerId: "club-1"});

      await assertSucceeds(
        uploadImage(authedStorage("host-1"), "events/event-1/photos/0_123.jpg"),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "events/missing-event/photos/0_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("runner-1"),
          "events/event-1/photos/0_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "events/event-1/photos/6_123.jpg",
        ),
      );
      await assertFails(
        uploadImage(
          authedStorage("host-1"),
          "events/event-1/photos/photo_123.jpg",
        ),
      );
    });

    it("allows public reads for organizer logos and event photos", async () => {
      await seedStorageFile("organizers/club-1/logo/123.jpg");
      await seedStorageFile("organizers/club-1/logoThumbnails/123.jpg");
      await seedStorageFile("organizers/organizer-1/logo/123.jpg");
      await seedStorageFile(
        "organizers/organizer-1/logoThumbnails/123.jpg",
      );
      await seedStorageFile("events/event-1/photos/0_123.jpg");

      await assertSucceeds(
        unauthenticatedStorage().ref("organizers/club-1/logo/123.jpg").getMetadata(),
      );
      await assertSucceeds(
        unauthenticatedStorage()
          .ref("organizers/club-1/logoThumbnails/123.jpg")
          .getMetadata(),
      );
      await assertSucceeds(
        unauthenticatedStorage()
          .ref("organizers/organizer-1/logo/123.jpg")
          .getMetadata(),
      );
      await assertSucceeds(
        unauthenticatedStorage()
          .ref("organizers/organizer-1/logoThumbnails/123.jpg")
          .getMetadata(),
      );
      await assertSucceeds(
        unauthenticatedStorage()
          .ref("events/event-1/photos/0_123.jpg")
          .getMetadata(),
      );
    });
  });
});
