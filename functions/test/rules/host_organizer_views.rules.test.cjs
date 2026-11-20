// Firestore rules: the Organiser screen's direct reads (tracking settings,
// the owner's bills, the page journey). Shared fixtures and the emulator
// lifecycle live in rulesHarness.cjs.
const {
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  getDoc,
  getDocs,
  it,
  limit,
  orderBy,
  organizer,
  query,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("Organiser screen direct reads", () => {
    async function setup() {
      await seed(["organizers", "org"], organizer({hostUserId: "host-1",
        ownerUserId: "owner", hostUserIds: ["manager"]}));
      await seed(["organizers", "legacy"], organizer({hostUserId: "host-1"}));
      await seed(["organizers", "other"], organizer({hostUserId: "other-host"}));
    }

    it("lets current managers get tracking settings and nothing else",
      async () => {
        await setup();
        await seed(["organizerTrackingSettings", "org"], {
          organizerId: "org", revision: 3, metaPixelId: "123456",
          googleMeasurementId: null, enabled: false, updatedByUid: "manager",
          updatedAtMillis: 1,
        });
        await seed(["organizerTrackingSettings", "other"], {
          organizerId: "other", revision: 1, metaPixelId: null,
          googleMeasurementId: null, enabled: false,
          updatedByUid: "other-host", updatedAtMillis: 1,
        });
        for (const uid of ["owner", "manager", "host-1"]) {
          const snap = await assertSucceeds(getDoc(doc(authedDb(uid),
            "organizerTrackingSettings", "org")));
          assert.equal(snap.data().revision, 3);
        }
        // A manager reads a document never saved as missing; a manager of
        // another organizer cannot.
        const missing = await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "organizerTrackingSettings", "legacy")));
        assert.equal(missing.exists(), false);
        await assertFails(getDoc(doc(authedDb("manager"),
          "organizerTrackingSettings", "legacy")));
        const manager = authedDb("manager");
        await assertFails(getDoc(doc(manager, "organizerTrackingSettings",
          "other")));
        await assertFails(getDoc(doc(authedDb("stranger"),
          "organizerTrackingSettings", "org")));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), "organizerTrackingSettings", "org")));
        await assertFails(getDocs(collection(manager,
          "organizerTrackingSettings")));
        await assertFails(getDocs(query(collection(manager,
          "organizerTrackingSettings"), where("organizerId", "==", "org"))));
        const ref = doc(manager, "organizerTrackingSettings", "org");
        await assertFails(updateDoc(ref, {revision: 4}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(manager, "organizerTrackingSettings",
          "forged"), {organizerId: "org", revision: 1}));
        await seed(["deletedUsers", "manager"], {uid: "manager"});
        await assertFails(getDoc(ref));
      });

    it("lets only the organizer's owner list its bill views", async () => {
      await setup();
      await seed(["hostOrganizerBillViews", "org_2026-10"], {
        organizerId: "org", billId: "org_2026-10", periodEndMillis: 2,
        month: "2026-10", bill: {billId: "org_2026-10"}, version: 1,
      });
      await seed(["hostOrganizerBillViews", "org_2026-09"], {
        organizerId: "org", billId: "org_2026-09", periodEndMillis: 1,
        month: "2026-09", bill: {billId: "org_2026-09"}, version: 1,
      });
      await seed(["hostOrganizerBillViews", "legacy_2026-10"], {
        organizerId: "legacy", billId: "legacy_2026-10", periodEndMillis: 2,
        month: "2026-10", bill: {billId: "legacy_2026-10"}, version: 1,
      });
      await seed(["hostOrganizerBillViews", "other_2026-10"], {
        organizerId: "other", billId: "other_2026-10", periodEndMillis: 2,
        month: "2026-10", bill: {billId: "other_2026-10"}, version: 1,
      });
      const ownerPage = await assertSucceeds(getDocs(query(
        collection(authedDb("owner"), "hostOrganizerBillViews"),
        where("organizerId", "==", "org"),
        orderBy("periodEndMillis", "desc"), orderBy("month", "desc"),
        limit(50))));
      assert.deepEqual(ownerPage.docs.map((item) => item.id),
        ["org_2026-10", "org_2026-09"]);
      await assertSucceeds(getDoc(doc(authedDb("owner"),
        "hostOrganizerBillViews", "org_2026-10")));
      // Without ownerUserId the primary host owns the organizer.
      await assertSucceeds(getDocs(query(
        collection(authedDb("host-1"), "hostOrganizerBillViews"),
        where("organizerId", "==", "legacy"), limit(50))));
      // Managers who are not the owner, strangers and foreign bills fail.
      for (const uid of ["manager", "host-1", "stranger"]) {
        await assertFails(getDoc(doc(authedDb(uid), "hostOrganizerBillViews",
          "org_2026-10")));
        await assertFails(getDocs(query(collection(authedDb(uid),
          "hostOrganizerBillViews"), where("organizerId", "==", "org"),
        limit(50))));
      }
      const owner = authedDb("owner");
      await assertFails(getDoc(doc(owner, "hostOrganizerBillViews",
        "other_2026-10")));
      await assertFails(getDocs(collection(owner, "hostOrganizerBillViews")));
      await assertFails(setDoc(doc(owner, "hostOrganizerBillViews", "forged"),
        {organizerId: "org"}));
      await assertFails(deleteDoc(doc(owner, "hostOrganizerBillViews",
        "org_2026-10")));
      await seed(["organizers", "org"], organizer({hostUserId: "host-1",
        ownerUserId: "new-owner", hostUserIds: ["owner"]}));
      await assertFails(getDoc(doc(owner, "hostOrganizerBillViews",
        "org_2026-10")));
    });

    it("lets each reader get only their own journey view", async () => {
      await setup();
      const journey = (uid, waitingClaim) => ({organizerId: "org", uid,
        waitingClaim, journey: {organizerId: "org", organizerName: "Run",
          waitingClaim, steps: [], next: "runYourPage"}, version: 1});
      await seed(["hostOrganizerJourneyViews", "org_manager"],
        journey("manager", false));
      await seed(["hostOrganizerJourneyViews", "org_owner"],
        journey("owner", false));
      await seed(["hostOrganizerJourneyViews", "org_claimant"],
        journey("claimant", true));
      await seed(["hostOrganizerJourneyViews", "org_former"],
        journey("former", false));
      await assertSucceeds(getDoc(doc(authedDb("manager"),
        "hostOrganizerJourneyViews", "org_manager")));
      await assertSucceeds(getDoc(doc(authedDb("claimant"),
        "hostOrganizerJourneyViews", "org_claimant")));
      // Another manager's view, and a stale view of someone no longer a
      // manager, stay closed.
      await assertFails(getDoc(doc(authedDb("manager"),
        "hostOrganizerJourneyViews", "org_owner")));
      await assertFails(getDoc(doc(authedDb("former"),
        "hostOrganizerJourneyViews", "org_former")));
      await assertFails(getDoc(doc(authedDb("manager"),
        "hostOrganizerJourneyViews", "org_claimant")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "hostOrganizerJourneyViews", "org_claimant")));
    });

    it("lets a claimant list only their own waiting journeys", async () => {
      await setup();
      const journey = (organizerId, uid, waitingClaim) => ({organizerId, uid,
        waitingClaim, journey: {organizerId, organizerName: "Run",
          waitingClaim, steps: [], next: "runYourPage"}, version: 1});
      await seed(["hostOrganizerJourneyViews", "org_claimant"],
        journey("org", "claimant", true));
      await seed(["hostOrganizerJourneyViews", "other_claimant"],
        journey("other", "claimant", true));
      await seed(["hostOrganizerJourneyViews", "org_manager"],
        journey("org", "manager", false));
      const claimant = authedDb("claimant");
      const waiting = await assertSucceeds(getDocs(query(
        collection(claimant, "hostOrganizerJourneyViews"),
        where("uid", "==", "claimant"), where("waitingClaim", "==", true),
        limit(5))));
      assert.equal(waiting.size, 2);
      await assertFails(getDocs(query(collection(claimant,
        "hostOrganizerJourneyViews"), where("uid", "==", "claimant"),
      limit(5))));
      await assertFails(getDocs(query(collection(claimant,
        "hostOrganizerJourneyViews"), where("uid", "==", "manager"),
      where("waitingClaim", "==", true), limit(5))));
      await assertFails(getDocs(collection(claimant,
        "hostOrganizerJourneyViews")));
      await assertFails(setDoc(doc(claimant, "hostOrganizerJourneyViews",
        "org_claimant"), journey("org", "claimant", false)));
      await seed(["deletedUsers", "claimant"], {uid: "claimant"});
      await assertFails(getDoc(doc(claimant, "hostOrganizerJourneyViews",
        "org_claimant")));
    });
  });
});
