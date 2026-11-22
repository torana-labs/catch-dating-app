// Firestore rules: Host summary reads. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  documentId,
  event,
  getDoc,
  getDocs,
  it,
  limit,
  or,
  orderBy,
  organizer,
  query,
  seed,
  setDoc,
  startAfter,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("Host summary reads", () => {
    const summaryOrganizer = (overrides = {}) =>
      organizer({status: "active", archived: false, ...overrides});
    async function setup() {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      for (let index = 0; index < 31; index++) {
        await seed(["hostContactSummaries", `person-${index}`], {
          organizerId: "org", contactId: `person-${index}`, version: 1,
          lastSeenAtMillis: index,
        });
      }
      await seed(["hostContactSummaries", "foreign"], {
        organizerId: "other", contactId: "foreign", version: 1,
      });
    }
    it("authorizes 31 rows using current organizer membership", async () => {
      await setup();
      for (const uid of ["host-1", "manager"]) {
        const page = await assertSucceeds(getDocs(query(
          collection(authedDb(uid), "hostContactSummaries"),
          where("organizerId", "==", "org"),
          orderBy("lastSeenAtMillis", "desc"), limit(31),
        )));
        assert.equal(page.size, 31);
      }
      await seed(["organizers", "org"], summaryOrganizer({hostUserId: "new-host"}));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "hostContactSummaries", "person-0")));
    });
    it("denies foreign IDs, unscoped queries, ordinary staff and all writes", async () => {
      await setup();
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, "hostContactSummaries", "foreign")));
      await assertFails(getDocs(collection(db, "hostContactSummaries")));
      await assertFails(getDocs(query(collection(db, "hostContactSummaries"),
        where("organizerId", "==", "other"))));
      await assertFails(getDoc(doc(authedDb("operator-1"),
        "hostContactSummaries", "person-0")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "hostContactSummaries", "person-0")));
      await assertFails(setDoc(doc(db, "hostContactSummaries", "injected"),
        {organizerId: "org"}));
      await assertFails(updateDoc(doc(db, "hostContactSummaries", "person-0"),
        {organizerId: "other"}));
      await assertFails(deleteDoc(doc(db, "hostContactSummaries", "person-0")));
      await assertFails(getDoc(doc(db, "organizerContacts", "person-0")));
    });
    it("continues tied SDK pages without duplicates or omissions", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      for (const id of ["a", "b", "c"]) {
        await seed(["hostContactSummaries", id], {
          organizerId: "org", lastSeenAtMillis: 10, version: 1,
        });
      }
      const ordered = query(collection(authedDb("host-1"),
        "hostContactSummaries"), where("organizerId", "==", "org"),
      orderBy("lastSeenAtMillis", "desc"), orderBy(documentId(), "desc"));
      const first = await getDocs(query(ordered, limit(2)));
      assert.deepEqual(first.docs.map((row) => row.id), ["c", "b"]);
      const second = await getDocs(query(ordered, startAfter(10, "b"), limit(2)));
      assert.deepEqual(second.docs.map((row) => row.id), ["a"]);
    });
    it("isolates all summary collections and selected Group definitions", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      for (const name of ["hostFormSummaries", "hostEventSummaries",
        "hostGroupSummaries", "hostResponseSummaries", "hostGroupDetails"]) {
        await seed([name, "own"], {organizerId: "org", version: 1});
        await seed([name, "foreign"], {organizerId: "other", version: 1});
        const db = authedDb("host-1");
        await assertSucceeds(getDoc(doc(db, name, "own")));
        await assertFails(getDoc(doc(db, name, "foreign")));
        const scoped = query(collection(db, name),
          where("organizerId", "==", "org"));
        if (name === "hostGroupDetails") await assertFails(getDocs(scoped));
        else await assertSucceeds(getDocs(scoped));
        await assertFails(getDocs(collection(db, name)));
        await assertFails(getDocs(query(collection(db, name),
          where("organizerId", "==", "other"))));
        await assertFails(setDoc(doc(db, name, "injected"),
          {organizerId: "org"}));
        await assertFails(updateDoc(doc(db, name, "own"), {version: 2}));
        await assertFails(deleteDoc(doc(db, name, "own")));
        await assertFails(getDoc(doc(authedDb("operator-1"), name, "own")));
      }
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      for (const name of ["hostFormSummaries", "hostEventSummaries",
        "hostGroupSummaries", "hostResponseSummaries", "hostGroupDetails"]) {
        await assertFails(getDoc(doc(authedDb("host-1"), name, "own")));
      }
    });
    it("lets managers get form version answer filters and nothing else", async () => {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      await seed(["hostFormVersionFilters", "form_v1"], {organizerId: "org",
        formId: "form", versionId: "form_v1", formVersion: 1,
        answerFilterOptions: [], version: 1});
      await seed(["hostFormVersionFilters", "foreign_v1"], {organizerId: "other",
        formId: "foreign", versionId: "foreign_v1", formVersion: 1,
        answerFilterOptions: [], version: 1});
      for (const uid of ["host-1", "manager"]) {
        await assertSucceeds(getDoc(doc(authedDb(uid), "hostFormVersionFilters",
          "form_v1")));
      }
      const db = authedDb("host-1");
      const missing = await assertSucceeds(getDoc(doc(db,
        "hostFormVersionFilters", "form_v9")));
      assert.equal(missing.exists(), false);
      await assertFails(getDoc(doc(db, "hostFormVersionFilters", "foreign_v1")));
      await assertFails(getDoc(doc(authedDb("operator-1"),
        "hostFormVersionFilters", "form_v1")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "hostFormVersionFilters", "form_v1")));
      await assertFails(getDocs(query(collection(db, "hostFormVersionFilters"),
        where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(db, "hostFormVersionFilters", "form_v2"),
        {organizerId: "org"}));
      await assertFails(updateDoc(doc(db, "hostFormVersionFilters", "form_v1"),
        {formVersion: 2}));
      await assertFails(deleteDoc(doc(db, "hostFormVersionFilters", "form_v1")));
      await assertFails(getDoc(doc(db, "organizerFormVersions", "form_v1")));
    });
    it("lets managers list event request views and nothing else", async () => {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      const view = (organizerId, eventId) => ({organizerId, eventId,
        eventEndMillis: 2000, rows: [], complete: true, version: 1});
      await seed(["hostEventRequestViews", "trivia"], view("org", "trivia"));
      await seed(["hostEventRequestViews", "foreign"], view("other", "foreign"));
      for (const uid of ["host-1", "manager"]) {
        await assertSucceeds(getDoc(doc(authedDb(uid), "hostEventRequestViews",
          "trivia")));
        const page = await assertSucceeds(getDocs(query(
          collection(authedDb(uid), "hostEventRequestViews"),
          where("organizerId", "==", "org"),
          where("eventEndMillis", ">", 1000),
          orderBy("eventEndMillis"))));
        assert.deepEqual(page.docs.map((row) => row.id), ["trivia"]);
      }
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, "hostEventRequestViews", "foreign")));
      await assertFails(getDocs(collection(db, "hostEventRequestViews")));
      await assertFails(getDocs(query(collection(authedDb("operator-1"),
        "hostEventRequestViews"), where("organizerId", "==", "org"))));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "hostEventRequestViews", "trivia")));
      await assertFails(setDoc(doc(db, "hostEventRequestViews", "new"),
        view("org", "new")));
      await assertFails(updateDoc(doc(db, "hostEventRequestViews", "trivia"),
        {complete: false}));
      await assertFails(deleteDoc(doc(db, "hostEventRequestViews", "trivia")));
    });
    it("lets current managers get contact, application and attendance report views by id", async () => {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      const views = [
        ["hostContactDetailViews", (organizerId, id) => ({organizerId,
          contactId: id, traits: {}, revenue: {coverage: "exact", amounts: []},
          events: [], eventsTruncated: false, version: 1})],
        ["hostApplicationDetailViews", (organizerId, id) => ({organizerId,
          applicationId: id, detail: {organizerId, applicationId: id,
            answers: []}, version: 1})],
        ["hostEventAttendanceReports", (organizerId, id) => ({organizerId,
          eventId: id, view: {members: []}, version: 1})],
      ];
      for (const [collectionId, view] of views) {
        await seed([collectionId, "own"], view("org", "own"));
        await seed([collectionId, "foreign"], view("other", "foreign"));
        for (const uid of ["host-1", "manager"]) {
          await assertSucceeds(getDoc(doc(authedDb(uid), collectionId, "own")));
          // A view the server has not written yet reads as missing.
          const missing = await assertSucceeds(getDoc(doc(authedDb(uid),
            collectionId, "not-yet")));
          assert.equal(missing.exists(), false);
        }
        const db = authedDb("host-1");
        await assertFails(getDoc(doc(db, collectionId, "foreign")));
        await assertFails(getDocs(query(collection(db, collectionId),
          where("organizerId", "==", "org"))));
        await assertFails(getDoc(doc(authedDb("operator-1"), collectionId,
          "own")));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
          collectionId, "own")));
        await assertFails(setDoc(doc(db, collectionId, "new"), view("org", "new")));
        await assertFails(updateDoc(doc(db, collectionId, "own"), {version: 2}));
        await assertFails(deleteDoc(doc(db, collectionId, "own")));
        await seed(["organizers", "org"], summaryOrganizer({hostUserId: "new-host"}));
        await assertFails(getDoc(doc(authedDb("manager"), collectionId, "own")));
        await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      }
    });
    it("lets current managers read WhatsApp thread views and one thread's messages", async () => {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      await seed(["hostWhatsappThreadViews", "owt_own"], {organizerId: "org",
        threadId: "owt_own", lastMessageAtMillis: 2, version: 1});
      await seed(["hostWhatsappThreadViews", "owt_foreign"], {organizerId: "other",
        threadId: "owt_foreign", lastMessageAtMillis: 1, version: 1});
      for (const id of ["m1", "m2"]) {
        await seed(["organizerWhatsappMessages", id], {organizerId: "org",
          threadId: "owt_own", body: "Private inbound text",
          occurredAt: Timestamp.fromMillis(id === "m1" ? 1 : 2)});
      }
      await seed(["organizerWhatsappMessages", "foreign"], {organizerId: "other",
        threadId: "owt_foreign", body: "Their text", occurredAt: Timestamp.fromMillis(1)});
      const threads = (db) => query(collection(db, "hostWhatsappThreadViews"),
        where("organizerId", "==", "org"), orderBy("lastMessageAtMillis", "desc"),
        limit(20));
      const messages = (db) => query(collection(db, "organizerWhatsappMessages"),
        where("organizerId", "==", "org"), where("threadId", "==", "owt_own"),
        orderBy("occurredAt", "desc"), limit(200));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        assert.equal((await assertSucceeds(getDocs(threads(db)))).size, 1);
        await assertSucceeds(getDoc(doc(db, "hostWhatsappThreadViews", "owt_own")));
        assert.equal((await assertSucceeds(getDocs(messages(db)))).size, 2);
      }
      const db = authedDb("host-1");
      const missing = await assertSucceeds(getDoc(doc(db,
        "hostWhatsappThreadViews", "owt_new")));
      assert.equal(missing.exists(), false);
      await assertFails(getDoc(doc(db, "hostWhatsappThreadViews", "owt_foreign")));
      await assertFails(getDoc(doc(db, "organizerWhatsappMessages", "foreign")));
      await assertFails(getDocs(collection(db, "hostWhatsappThreadViews")));
      await assertFails(getDocs(query(collection(db, "organizerWhatsappMessages"),
        where("threadId", "==", "owt_own"))));
      for (const uid of ["operator-1", "other-host"]) {
        await assertFails(getDocs(threads(authedDb(uid))));
        await assertFails(getDocs(messages(authedDb(uid))));
      }
      await assertFails(getDocs(messages(testEnv.unauthenticatedContext().firestore())));
      await assertFails(setDoc(doc(db, "hostWhatsappThreadViews", "owt_own"),
        {organizerId: "org"}));
      await assertFails(setDoc(doc(db, "organizerWhatsappMessages", "injected"),
        {organizerId: "org", threadId: "owt_own"}));
      await assertFails(deleteDoc(doc(db, "organizerWhatsappMessages", "m1")));
      // The thread store itself stays server-only.
      await seed(["organizerWhatsappThreads", "owt_own"], {organizerId: "org"});
      await assertFails(getDoc(doc(db, "organizerWhatsappThreads", "owt_own")));
      // A manager removed from the organizer, or a deleted account, loses access.
      await seed(["organizers", "org"], summaryOrganizer({hostUserId: "new-host"}));
      await assertFails(getDocs(messages(authedDb("manager"))));
      await assertFails(getDocs(threads(authedDb("host-1"))));
      await seed(["organizers", "org"], summaryOrganizer());
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      await assertFails(getDocs(messages(authedDb("host-1"))));
    });
    it("lets current managers list Sends rows and nothing else", async () => {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      await seed(["hostSendSummaries", "campaign_c1"], {organizerId: "org",
        sendId: "campaign_c1", kind: "campaign", activityAtMillis: 2,
        row: {kind: "campaign", status: "draft"}, version: 1});
      await seed(["hostSendSummaries", "announcement_b1"], {organizerId: "org",
        sendId: "announcement_b1", kind: "announcement", activityAtMillis: 1,
        row: {kind: "announcement"}, version: 1});
      await seed(["hostSendSummaries", "campaign_foreign"], {organizerId: "other",
        sendId: "campaign_foreign", kind: "campaign", activityAtMillis: 1,
        row: {kind: "campaign", status: "draft"}, version: 1});
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const all = await assertSucceeds(getDocs(query(collection(db, "hostSendSummaries"),
          where("organizerId", "==", "org"), orderBy("activityAtMillis", "desc"),
          limit(25))));
        assert.deepEqual(all.docs.map((row) => row.id), ["campaign_c1", "announcement_b1"]);
        const drafts = await assertSucceeds(getDocs(query(
          collection(db, "hostSendSummaries"), where("organizerId", "==", "org"),
          where("kind", "==", "campaign"), where("row.status", "in", ["draft", "previewed"]),
          orderBy("activityAtMillis", "desc"), limit(25))));
        assert.deepEqual(drafts.docs.map((row) => row.id), ["campaign_c1"]);
      }
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, "hostSendSummaries", "campaign_foreign")));
      await assertFails(getDocs(collection(db, "hostSendSummaries")));
      await assertFails(getDocs(query(collection(authedDb("operator-1"), "hostSendSummaries"),
        where("organizerId", "==", "org"))));
      await assertFails(setDoc(doc(db, "hostSendSummaries", "campaign_c2"),
        {organizerId: "org"}));
      await assertFails(updateDoc(doc(db, "hostSendSummaries", "campaign_c1"),
        {activityAtMillis: 9}));
      await assertFails(deleteDoc(doc(db, "hostSendSummaries", "campaign_c1")));
      // The sources stay server-only.
      await seed(["organizerCampaigns", "c1"], {organizerId: "org"});
      await assertFails(getDoc(doc(db, "organizerCampaigns", "c1")));
    });
    it("revokes unpublished Event summary reads when the organizer archives", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      await seed(["hostEventSummaries", "event"], {organizerId: "org"});
      await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostEventSummaries", "event")));
      await seed(["organizers", "org"], summaryOrganizer({status: "archived", archived: true}));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "hostEventSummaries", "event")));
    });
    it("allows only the owner to read a missing cutover marker", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      const snapshot = await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostDirectorySummaries", "org")));
      assert.equal(snapshot.exists(), false);
      await assertFails(getDoc(doc(authedDb("other-host"),
        "hostDirectorySummaries", "org")));
    });
  });
});
