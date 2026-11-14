// Firestore rules: users. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  activityPreferences,
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  describe,
  doc,
  getDoc,
  it,
  match,
  or,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
  userProfile,
  values,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("users", () => {
    it("allows owners to create the current UserProfile schema without legacy sexualOrientation", async () => {
      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "users", "runner-1"), userProfile()),
      );
    });

    it("requires the initial profile phone to match the verified Auth phone", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({phoneNumber: "+918888888888"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            testEnv.authenticatedContext("runner-2").firestore(),
            "users",
            "runner-2",
          ),
          userProfile(),
        ),
      );
    });

    it("rejects legacy sexualOrientation on profile create", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({sexualOrientation: "straight"}),
        ),
      );
    });

    it("requires a non-empty profile display name on create", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({displayName: "   "}),
        ),
      );
    });

    it("allows account creation without matching preferences", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({interestedInGenders: []}),
        ),
      );
    });

    it("enforces schema-owned profile list bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({profilePhotos: values(6, {})}),
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({
            activityPreferences: activityPreferences({
              preferredRunTimes: values(8, "morning"),
            }),
          }),
        ),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-4"), "users", "runner-4"),
          userProfile({profilePhotos: values(7, {})}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-6"), "users", "runner-6"),
          userProfile({
            activityPreferences: activityPreferences({
              preferredRunTimes: values(9, "morning"),
            }),
          }),
        ),
      );
    });

    it("enforces profile age preference bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({minAgePreference: 18, maxAgePreference: 99}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "users", "runner-2"),
          userProfile({minAgePreference: 17}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({maxAgePreference: 100}),
        ),
      );
    });

    it("enforces profile height bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({height: 120}),
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-2"), "users", "runner-2"),
          userProfile({height: 220}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({height: 119}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-4"), "users", "runner-4"),
          userProfile({height: 221}),
        ),
      );
    });

    it("denies every direct profile edit, the retired fcmToken included", async () => {
      await seed(["users", "runner-1"], userProfile());

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          instagramHandle: "@runnerone",
          prefsWeeklyDigest: true,
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          fcmToken: "token-1",
        }),
      );
    });

    it("keeps retained profiles readable and closed to direct updates", async () => {
      // Profiles written before push installations may still carry fcmToken
      // and lifecycle fields; owners read them, and nobody updates them here.
      await seed(["users", "runner-1"], userProfile({
        deleted: false,
        deletedAt: null,
        fcmToken: "legacy-token",
      }));
      const ownerRef = doc(authedDb("runner-1"), "users", "runner-1");

      await assertSucceeds(getDoc(ownerRef));
      await assertFails(updateDoc(ownerRef, {fcmToken: "token-1"}));
      await assertFails(updateDoc(ownerRef, {prefsWeeklyDigest: true}));
    });

    it("allows owners to persist push installation tokens", async () => {
      await seed(["users", "runner-1"], userProfile());
      const installationRef = doc(
        authedDb("runner-1"),
        "users",
        "runner-1",
        "pushInstallations",
        "host_ios_installation_1",
      );

      await assertSucceeds(
        setDoc(installationRef, {
          token: "token-1",
          appRole: "host",
          environment: "prod",
          platform: "ios",
          appVersion: "1.0.0",
          buildNumber: "42",
          locale: "en-IN",
          timeZone: "IST",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(installationRef, {
          token: "token-2",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(getDoc(installationRef));
      await assertSucceeds(deleteDoc(installationRef));
    });

    it("denies invalid or cross-user push installation writes", async () => {
      await seed(["users", "runner-1"], userProfile());
      const ownerDb = authedDb("runner-1");
      const otherDb = authedDb("runner-2");
      const installationPath = [
        "users",
        "runner-1",
        "pushInstallations",
        "host_ios_installation_1",
      ];

      await assertFails(
        setDoc(doc(ownerDb, ...installationPath), {
          token: "token-1",
          appRole: "admin",
          environment: "prod",
          platform: "ios",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        setDoc(doc(otherDb, ...installationPath), {
          token: "token-1",
          appRole: "host",
          environment: "prod",
          platform: "ios",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(getDoc(doc(otherDb, ...installationPath)));
    });

    it("allows minimal verified identity without age, gender or social photos and keeps it private", async () => {
      const minimal = userProfile({profileComplete: false, interestedInGenders: [], profilePhotos: [], profilePrompts: []});
      delete minimal.dateOfBirth;
      delete minimal.gender;
      const owner = doc(authedDb("runner-1"), "users", "runner-1");
      await assertSucceeds(setDoc(owner, minimal));
      await assertSucceeds(getDoc(owner));
      await assertFails(getDoc(doc(authedDb("other-user"), "users", "runner-1")));
      await assertFails(setDoc(doc(authedDb("runner-2"), "users", "runner-2"), {...minimal, phoneNumber: "+919111111111"}));
    });

    it("rejects malformed optional age and gender on account creation", async () => {
      for (const patch of [
        {dateOfBirth: null},
        {dateOfBirth: "1998-01-01"},
        {gender: null},
        {gender: "unknown"},
      ]) {
        await assertFails(setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile(patch),
        ));
      }
    });

    it("denies direct profile field updates regardless of field shape", async () => {
      await seed(["users", "runner-1"], userProfile());
      const userRef = doc(authedDb("runner-1"), "users", "runner-1");

      await assertFails(updateDoc(userRef, {name: "Runner Updated"}));
      await assertFails(updateDoc(userRef, {photoUrls: ["https://example.test/a.jpg"]}));
      await assertFails(updateDoc(userRef, {prefsWeeklyDigest: true}));
      await assertFails(updateDoc(userRef, {dateOfBirth: "1998-01-01"}));
    });

    it("keeps profile claim metadata server-owned and claimed identities private", async () => {
      const claimed = {profileRevision: 1, profileClaimedAt: Timestamp.now()};
      for (const patch of [{profileRevision: 0}, {profileClaimedAt: Timestamp.now()}]) {
        await assertFails(setDoc(doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile(patch)));
      }
      await seed(["users", "runner-1"], userProfile({...claimed,
        profileComplete: false, interestedInGenders: []}));
      const ownerRef = doc(authedDb("runner-1"), "users", "runner-1");
      await assertSucceeds(getDoc(ownerRef));
      await assertFails(updateDoc(ownerRef, {fcmToken: "token-claim"}));
      await assertFails(updateDoc(ownerRef, {profileRevision: 2}));
      await assertFails(updateDoc(ownerRef, {profileClaimedAt: Timestamp.now()}));
      await assertFails(getDoc(doc(authedDb("other-host"), "users", "runner-1")));
    });

    it("denies client writes to account-deletion lifecycle fields", async () => {
      await seed(["users", "runner-1"], userProfile());

      await assertFails(
        setDoc(doc(authedDb("runner-2"), "users", "runner-2"), userProfile({
          deleted: false,
        })),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          deleted: true,
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          deletedAt: serverTimestamp(),
        }),
      );
    });

    it("denies owner updates after account-deletion tombstone exists", async () => {
      await seed(["users", "runner-1"], userProfile({
        deleted: true,
        deletedAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      }));
      await seed(["deletedUsers", "runner-1"], {
        uid: "runner-1",
        deletedAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      });

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          prefsWeeklyDigest: true,
        }),
      );
    });
  });
});
