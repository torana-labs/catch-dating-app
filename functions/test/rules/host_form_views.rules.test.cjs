// Firestore rules: the form editor, analytics and share-link funnel read
// models (#2306). Shared fixtures and the emulator lifecycle live in
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

  describe("Host form views", () => {
    async function seedOrganizers() {
      await seed(["organizers", "org"], organizer({status: "active",
        archived: false, hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], organizer({status: "active",
        archived: false, hostUserId: "other-host"}));
    }

    // getOrganizerFormEditor and getOrganizerFormAnalytics admitted the
    // organizer's current owner and managers (requireOrganizerManager):
    // exactly those get the views, by id, and nobody lists or writes them.
    async function assertManagerGetOnly(collectionName, id, foreignId, row) {
      for (const uid of ["host-1", "manager"]) {
        await assertSucceeds(getDoc(doc(authedDb(uid), collectionName, id)));
      }
      const db = authedDb("host-1");
      const missing = await assertSucceeds(getDoc(doc(db, collectionName,
        "not-written")));
      assert.equal(missing.exists(), false);
      await assertFails(getDoc(doc(db, collectionName, foreignId)));
      await assertFails(getDoc(doc(authedDb("other-host"), collectionName,
        id)));
      await assertFails(getDoc(doc(authedDb("stranger"), collectionName, id)));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), collectionName, id)));
      await assertFails(getDocs(query(collection(db, collectionName),
        where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(db, collectionName, "new-row"), row));
      await assertFails(updateDoc(doc(db, collectionName, id),
        {organizerId: "other"}));
      await assertFails(deleteDoc(doc(db, collectionName, id)));
    }

    it("lets managers get a form's editor view and nothing else",
      async () => {
        await seedOrganizers();
        const row = (organizerId, formId) => ({organizerId, formId,
          form: {organizerId, formId}, definition: {title: "Intake"},
          validationIssues: [], version: 1});
        await seed(["hostFormEditorViews", "form-1"], row("org", "form-1"));
        await seed(["hostFormEditorViews", "foreign"], row("other",
          "foreign"));
        await assertManagerGetOnly("hostFormEditorViews", "form-1",
          "foreign", row("org", "new-row"));
        await assertFails(getDoc(doc(authedDb("host-1"), "organizerFormDrafts",
          "form-1")));
      });

    it("lets managers get a version's analytics view and nothing else",
      async () => {
        await seedOrganizers();
        const row = (organizerId, versionId) => ({organizerId,
          formId: "form-1", versionId, formVersion: 1, opens: 3, starts: 2,
          submissions: 1, withdrawals: 0, completionRate: 0.5,
          medianCompletionMillis: null, questions: [], privacyThreshold: 5,
          version: 1});
        await seed(["hostFormAnalyticsViews", "form-1_v1"], row("org",
          "form-1_v1"));
        await seed(["hostFormAnalyticsViews", "foreign_v1"], row("other",
          "foreign_v1"));
        await assertManagerGetOnly("hostFormAnalyticsViews", "form-1_v1",
          "foreign_v1", row("org", "new-row"));
        await assertFails(getDoc(doc(authedDb("host-1"),
          "organizerFormAggregates", "form-1_v1_version")));
      });

    it("lets managers get a form's share-link funnel view and nothing else",
      async () => {
        await seedOrganizers();
        const row = (organizerId, formId) => ({organizerId, formId,
          sources: [{sourceLinkId: "link-1", label: "Poster", opens: 3,
            starts: 2, submissions: 1}], version: 1});
        await seed(["hostFormSourceViews", "form-1"], row("org", "form-1"));
        await seed(["hostFormSourceViews", "foreign"], row("other",
          "foreign"));
        await assertManagerGetOnly("hostFormSourceViews", "form-1", "foreign",
          row("org", "new-row"));
        await assertFails(getDoc(doc(authedDb("host-1"),
          "organizerFormShareLinks", "link-1")));
      });
  });
});
