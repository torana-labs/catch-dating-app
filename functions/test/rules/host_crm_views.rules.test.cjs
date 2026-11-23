// Firestore rules: the audience source and duplicate candidate read models
// (#2306). Shared fixtures and the emulator lifecycle live in
// rulesHarness.cjs.
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

  describe("Host CRM views", () => {
    // listOrganizerSavedAudiences and listOrganizerContactMergeCandidates
    // admitted the organizer's current owner and managers
    // (requireOrganizerManager): exactly those read the views.
    async function seedOrganizers() {
      await seed(["organizers", "org"], organizer({status: "active",
        archived: false, hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], organizer({status: "active",
        archived: false, hostUserId: "other-host"}));
    }

    it("lets managers get an organizer's audience sources and nothing else",
      async () => {
        await seedOrganizers();
        const row = (organizerId) => ({organizerId, forms: [], questions: [],
          events: [], tags: [], unavailableReason: null, version: 1});
        await seed(["hostAudienceSourceViews", "org"], row("org"));
        await seed(["hostAudienceSourceViews", "other"], row("other"));
        for (const uid of ["host-1", "manager"]) {
          await assertSucceeds(getDoc(doc(authedDb(uid),
            "hostAudienceSourceViews", "org")));
        }
        const db = authedDb("host-1");
        const missing = await assertSucceeds(getDoc(doc(db,
          "hostAudienceSourceViews", "not-written")));
        assert.equal(missing.exists(), false);
        await assertFails(getDoc(doc(db, "hostAudienceSourceViews", "other")));
        await assertFails(getDoc(doc(authedDb("stranger"),
          "hostAudienceSourceViews", "org")));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), "hostAudienceSourceViews", "org")));
        await assertFails(getDocs(query(collection(db,
          "hostAudienceSourceViews"), where("organizerId", "==", "org"))));
        await assertFails(setDoc(doc(db, "hostAudienceSourceViews", "org"),
          row("org")));
        await assertFails(deleteDoc(doc(db, "hostAudienceSourceViews",
          "org")));
        await assertFails(getDoc(doc(db, "organizerContactTagVocabularies",
          "org")));
      });

    it("lets managers list their organizer's duplicate candidates and " +
      "nothing else", async () => {
      await seedOrganizers();
      const row = (organizerId, candidateId, updatedAtMillis) => ({
        organizerId, candidateId, contactIds: ["a", "b"], contacts: [],
        matchKinds: ["sameEmail"], confidence: "proposed",
        sourceKinds: ["hostImport"], sharedEventIds: [], sharedEventCount: 0,
        updatedAtMillis, decisionState: "none", decisionRevision: null,
        reviewedByUid: null, version: 1});
      await seed(["hostContactMergeCandidateViews", "ocmc_1"],
        row("org", "ocmc_1", 1));
      await seed(["hostContactMergeCandidateViews", "ocmc_2"],
        row("org", "ocmc_2", 2));
      await seed(["hostContactMergeCandidateViews", "ocmc_foreign"],
        row("other", "ocmc_foreign", 3));
      const page = (uid, organizerId = "org") => getDocs(query(
        collection(authedDb(uid), "hostContactMergeCandidateViews"),
        where("organizerId", "==", organizerId),
        orderBy("updatedAtMillis", "desc"), limit(21)));
      for (const uid of ["host-1", "manager"]) {
        const rows = await assertSucceeds(page(uid));
        assert.deepEqual(rows.docs.map((item) => item.id),
          ["ocmc_2", "ocmc_1"]);
        await assertSucceeds(getDoc(doc(authedDb(uid),
          "hostContactMergeCandidateViews", "ocmc_1")));
      }
      await assertFails(page("other-host"));
      await assertFails(page("stranger"));
      await assertFails(page("host-1", "other"));
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, "hostContactMergeCandidateViews",
        "ocmc_foreign")));
      await assertFails(getDocs(query(collection(db,
        "hostContactMergeCandidateViews"), limit(5))));
      await assertFails(setDoc(doc(db, "hostContactMergeCandidateViews",
        "ocmc_3"), row("org", "ocmc_3", 4)));
      await assertFails(updateDoc(doc(db, "hostContactMergeCandidateViews",
        "ocmc_1"), {decisionState: "differentPeople"}));
      await assertFails(deleteDoc(doc(db, "hostContactMergeCandidateViews",
        "ocmc_1")));
      await assertFails(getDoc(doc(db, "organizerContactIdentityClaims",
        "claim-1")));
    });
  });
});
