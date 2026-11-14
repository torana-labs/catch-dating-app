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
