// Firestore rules: hostProfiles/{uid}. The host owns their display name, role
// title and bio. `verified`, `linkedOrganizerIds` and `avatarUrl` are
// server-owned (FIX-11): organizer callables seed the avatar from the host's
// own photo, and nothing on a client writes the other two. Shared fixtures and
// the emulator lifecycle live in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  describe,
  doc,
  getDoc,
  it,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

const SEEDED_AVATAR =
  "https://firebasestorage.googleapis.com/v0/b/demo-catch-rules.appspot.com/o/users%2Fhost-1%2Fphotos%2F0_1.jpg?alt=media";

function seededHostProfile(overrides = {}) {
  const now = Timestamp.fromDate(new Date("2026-11-01T10:00:00.000Z"));
  return {
    displayName: "Rhea Kapoor",
    avatarUrl: SEEDED_AVATAR,
    status: "active",
    verified: false,
    linkedOrganizerIds: ["club-1"],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// HostProfileRepository.ensureHostProfile: a merge set that creates the
// document when it is absent and rewrites these fields when it exists.
function ensureWrite(overrides = {}) {
  return {
    displayName: "Rhea Kapoor",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

// HostProfileRepository.saveHostProfile: a merge set of the editable fields.
function saveWrite(overrides = {}) {
  return {
    displayName: "Rhea K.",
    roleTitle: "Founder",
    bio: "Sunday social runs by the sea.",
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function hostProfileRef(db, uid = "host-1") {
  return doc(db, "hostProfiles", uid);
}

let testEnv;

function unauthedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("host profiles", () => {
    it("stays readable by signed-out visitors and other users", async () => {
      await seed(["hostProfiles", "host-1"], seededHostProfile());

      await assertSucceeds(getDoc(hostProfileRef(unauthedDb())));
      await assertSucceeds(getDoc(hostProfileRef(authedDb("runner-2"))));
    });

    it("lets the host create their profile the way the Host app does", async () => {
      await assertSucceeds(
        setDoc(hostProfileRef(authedDb("host-1")), ensureWrite(), {merge: true}),
      );
    });

    it("lets the host re-run ensure and save on a server-seeded profile", async () => {
      await seed(["hostProfiles", "host-1"], seededHostProfile({verified: true}));
      const db = authedDb("host-1");

      await assertSucceeds(
        setDoc(hostProfileRef(db), ensureWrite(), {merge: true}),
      );
      await assertSucceeds(
        setDoc(hostProfileRef(db), saveWrite(), {merge: true}),
      );
      await assertSucceeds(
        setDoc(hostProfileRef(db), saveWrite({roleTitle: null, bio: null}), {
          merge: true,
        }),
      );
    });

    it("denies another user writing the profile", async () => {
      await seed(["hostProfiles", "host-1"], seededHostProfile());

      await assertFails(
        setDoc(hostProfileRef(authedDb("runner-2")), saveWrite(), {merge: true}),
      );
      await assertFails(
        setDoc(hostProfileRef(unauthedDb()), saveWrite(), {merge: true}),
      );
    });

    it("denies the host marking themselves verified", async () => {
      await assertFails(
        setDoc(hostProfileRef(authedDb("host-1")), ensureWrite({verified: true}), {
          merge: true,
        }),
      );

      await seed(["hostProfiles", "host-1"], seededHostProfile());
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          verified: true,
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        setDoc(hostProfileRef(authedDb("host-1")), saveWrite({verified: true}), {
          merge: true,
        }),
      );
    });

    it("denies the host clearing a verified flag the server set", async () => {
      await seed(["hostProfiles", "host-1"], seededHostProfile({verified: true}));

      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          verified: false,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it("denies the host linking themselves to organizers", async () => {
      await assertFails(
        setDoc(
          hostProfileRef(authedDb("host-1")),
          ensureWrite({linkedOrganizerIds: ["club-9"]}),
          {merge: true},
        ),
      );

      await seed(["hostProfiles", "host-1"], seededHostProfile());
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          linkedOrganizerIds: ["club-1", "club-9"],
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          linkedOrganizerIds: [],
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it("denies the host setting or changing the avatar URL", async () => {
      await assertFails(
        setDoc(
          hostProfileRef(authedDb("host-1")),
          ensureWrite({avatarUrl: "https://tracker.example/pixel.gif"}),
          {merge: true},
        ),
      );

      await seed(["hostProfiles", "host-1"], seededHostProfile());
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          avatarUrl: "https://tracker.example/pixel.gif",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          avatarUrl:
            "https://firebasestorage.googleapis.com/v0/b/demo-catch-rules.appspot.com/o/users%2Frunner-2%2Fphotos%2F0_1.jpg?alt=media",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(hostProfileRef(authedDb("host-1")), {
          avatarUrl: null,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it("keeps profiles undeletable from clients", async () => {
      await seed(["hostProfiles", "host-1"], seededHostProfile());

      await assertFails(deleteDoc(hostProfileRef(authedDb("host-1"))));
    });
  });
});
