// Firestore rules: the organizer account read models (#2306): the owner's
// billing view, and the team's entitlement and owner page views. Shared
// fixtures and the emulator lifecycle live in rulesHarness.cjs.
const {
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  describe,
  doc,
  getDoc,
  getDocs,
  it,
  organizer,
  query,
  seed,
  setDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment(() => {});

  describe("organizer account views", () => {
    async function setup() {
      // org: ownerUserId owner, primary host host-1, manager manager.
      await seed(["organizers", "org"], organizer({hostUserId: "host-1",
        ownerUserId: "owner", hostUserIds: ["manager"]}));
      // legacy: no ownerUserId, so the primary host owns it.
      await seed(["organizers", "legacy"], organizer({hostUserId: "host-1"}));
      for (const id of ["org", "legacy"]) {
        await seed(["hostOrganizerBillingViews", id], {organizerId: id,
          trial: {days: 30, anchor: null, startsAtMillis: null,
            endsAtMillis: null},
          plan: {plan: "ticketing", status: "none", startsAtMillis: null,
            endsAtMillis: null}, version: 1});
      }
      await seed(["hostOrganizerEntitlementViews", "org"], {
        organizerId: "org", catalogVersion: 1, revision: 1, grants: [],
        meters: {flightDaysUsed: 0, waConversationsUsed: 0}, version: 1});
      await seed(["hostOrganizerOwnerViews", "org"], {organizerId: "org",
        ownerUid: "owner", version: 1});
      await seed(["deletedUsers", "gone"], {deletedAt: new Date()});
      await seed(["organizers", "gone-org"], organizer({hostUserId: "gone"}));
    }

    it("lets only the organizer's owner get its billing view", async () => {
      await setup();
      const get = (uid, id = "org") => getDoc(doc(authedDb(uid),
        "hostOrganizerBillingViews", id));
      const snap = await assertSucceeds(get("owner"));
      assert.equal(snap.data().trial.days, 30);
      // With an owner recorded, the primary host is not the owner.
      await assertFails(get("host-1"));
      await assertFails(get("manager"));
      await assertFails(get("stranger"));
      // Without one, the primary host owns it.
      await assertSucceeds(get("host-1", "legacy"));
      await assertFails(getDocs(query(collection(authedDb("owner"),
        "hostOrganizerBillingViews"), where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(authedDb("owner"),
        "hostOrganizerBillingViews", "org"), {organizerId: "org"}));
    });

    it("lets the organizer's managers get its entitlement view", async () => {
      await setup();
      const get = (uid, id = "org") => getDoc(doc(authedDb(uid),
        "hostOrganizerEntitlementViews", id));
      for (const uid of ["owner", "host-1", "manager"]) {
        await assertSucceeds(get(uid));
      }
      // An organizer without entitlements reads as missing to its team.
      const missing = await assertSucceeds(get("host-1", "legacy"));
      assert.equal(missing.exists(), false);
      await assertFails(get("stranger"));
      await assertFails(get("gone", "gone-org"));
      await assertFails(getDocs(query(collection(authedDb("owner"),
        "hostOrganizerEntitlementViews"), where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(authedDb("owner"),
        "hostOrganizerEntitlementViews", "org"), {organizerId: "org"}));
    });

    it("lets the organizer's managers get its owner view", async () => {
      await setup();
      const get = (uid) => getDoc(doc(authedDb(uid), "hostOrganizerOwnerViews",
        "org"));
      for (const uid of ["owner", "host-1", "manager"]) {
        await assertSucceeds(get(uid));
      }
      await assertFails(get("stranger"));
      await assertFails(getDocs(query(collection(authedDb("owner"),
        "hostOrganizerOwnerViews"), where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(authedDb("manager"),
        "hostOrganizerOwnerViews", "org"), {organizerId: "org"}));
    });
  });
});
