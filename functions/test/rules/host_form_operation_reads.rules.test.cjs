// Firestore rules: Host form operation reads (by-hand queue, automations,
// form payments). Shared fixtures and the emulator lifecycle live in
// rulesHarness.cjs.
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

  describe("Host form operation reads", () => {
    const managed = (overrides = {}) =>
      organizer({status: "active", archived: false, ...overrides});
    async function organizers() {
      await seed(["organizers", "org"], managed({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], managed({hostUserId: "other-host"}));
    }
    // Every view and the manual-send queue deny the same readers and writes.
    async function deniesOthers(collectionName, ownId, foreignId) {
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, collectionName, foreignId)));
      await assertFails(getDocs(collection(db, collectionName)));
      await assertFails(getDocs(query(collection(db, collectionName),
        where("organizerId", "==", "other"))));
      await assertFails(getDocs(query(collection(authedDb("operator-1"),
        collectionName), where("organizerId", "==", "org"))));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        collectionName, ownId)));
      await assertFails(setDoc(doc(db, collectionName, "injected"),
        {organizerId: "org"}));
      await assertFails(updateDoc(doc(db, collectionName, ownId),
        {organizerId: "org", version: 2}));
      await assertFails(deleteDoc(doc(db, collectionName, ownId)));
      await seed(["deletedUsers", "manager"], {deletedAt: Timestamp.now()});
      await assertFails(getDoc(doc(authedDb("manager"), collectionName, ownId)));
    }

    it("lets current managers list the by-hand queue and never write it", async () => {
      await organizers();
      const task = (organizerId, active, updatedAt) => ({organizerId,
        taskId: "t", contactId: "c1", status: "queued", active,
        endpointE164Snapshot: "+15555550100", prefillText: "See you Friday",
        updatedAt: Timestamp.fromMillis(updatedAt),
        expiresAt: Timestamp.fromMillis(updatedAt + 1000)});
      await seed(["organizerManualSendTasks", "t1"], task("org", true, 2));
      await seed(["organizerManualSendTasks", "t2"], task("org", false, 3));
      await seed(["organizerManualSendTasks", "t3"], task("org", true, 1));
      await seed(["organizerManualSendTasks", "foreign"], task("other", true, 1));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const queue = await assertSucceeds(getDocs(query(
          collection(db, "organizerManualSendTasks"),
          where("organizerId", "==", "org"), where("active", "==", true),
          orderBy("updatedAt", "desc"), limit(51))));
        assert.deepEqual(queue.docs.map((row) => row.id), ["t1", "t3"]);
        await assertSucceeds(getDoc(doc(db, "organizerManualSendTasks", "t2")));
      }
      await deniesOthers("organizerManualSendTasks", "t1", "foreign");
    });

    it("lets current managers list automation rule and run views and nothing else", async () => {
      await organizers();
      const ruleView = (organizerId, ruleId, formId) => ({organizerId, ruleId,
        formId, row: {ruleId, name: "Welcome note"}, version: 1});
      const runView = (organizerId, runId, formId, createdAtMillis) => ({
        organizerId, runId, ruleId: "r1", formId, createdAtMillis,
        ruleName: "Welcome note", row: {runId}, version: 1});
      await seed(["hostFormAutomationRuleViews", "r1"], ruleView("org", "r1", "f1"));
      await seed(["hostFormAutomationRuleViews", "r2"], ruleView("org", "r2", null));
      await seed(["hostFormAutomationRuleViews", "foreign"],
        ruleView("other", "foreign", "f1"));
      await seed(["hostFormAutomationRunViews", "run1"], runView("org", "run1", "f1", 2));
      await seed(["hostFormAutomationRunViews", "run2"], runView("org", "run2", "f2", 1));
      await seed(["hostFormAutomationRunViews", "foreign"],
        runView("other", "foreign", "f1", 3));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const rules = await assertSucceeds(getDocs(query(
          collection(db, "hostFormAutomationRuleViews"),
          where("organizerId", "==", "org"), orderBy("ruleId"), limit(1001))));
        assert.deepEqual(rules.docs.map((row) => row.id), ["r1", "r2"]);
        const formRules = await assertSucceeds(getDocs(query(
          collection(db, "hostFormAutomationRuleViews"),
          where("organizerId", "==", "org"), where("formId", "==", "f1"),
          orderBy("ruleId"), limit(1001))));
        assert.deepEqual(formRules.docs.map((row) => row.id), ["r1"]);
        const runs = await assertSucceeds(getDocs(query(
          collection(db, "hostFormAutomationRunViews"),
          where("organizerId", "==", "org"), orderBy("createdAtMillis", "desc"),
          limit(51))));
        assert.deepEqual(runs.docs.map((row) => row.id), ["run1", "run2"]);
        const formRuns = await assertSucceeds(getDocs(query(
          collection(db, "hostFormAutomationRunViews"),
          where("organizerId", "==", "org"), where("formId", "==", "f2"),
          orderBy("createdAtMillis", "desc"), limit(51))));
        assert.deepEqual(formRuns.docs.map((row) => row.id), ["run2"]);
      }
      await deniesOthers("hostFormAutomationRuleViews", "r1", "foreign");
      await deniesOthers("hostFormAutomationRunViews", "run1", "foreign");
      // The sources, which hold webhook secrets and leases, stay server-only.
      await seed(["organizerFormAutomationRules", "r1"], {organizerId: "org"});
      await seed(["organizerFormAutomationRuns", "run1"], {organizerId: "org"});
      await assertFails(getDoc(doc(authedDb("host-1"),
        "organizerFormAutomationRules", "r1")));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "organizerFormAutomationRuns", "run1")));
    });

    it("lets current managers list form payment views and nothing else", async () => {
      await organizers();
      const view = (organizerId, paymentId, formId, status, createdAtMillis) => ({
        organizerId, paymentId, formId, status, createdAtMillis,
        row: {paymentId, status}, version: 1});
      const id = (digit) => `fp_${digit.repeat(32)}`;
      await seed(["hostFormPaymentViews", id("a")], view("org", id("a"), "f1", "submitted", 3));
      await seed(["hostFormPaymentViews", id("b")], view("org", id("b"), "f1", "refunded", 2));
      await seed(["hostFormPaymentViews", id("c")], view("org", id("c"), "f2", "submitted", 1));
      await seed(["hostFormPaymentViews", id("d")], view("other", id("d"), "f1", "submitted", 1));
      for (const uid of ["host-1", "manager"]) {
        const db = authedDb(uid);
        const all = await assertSucceeds(getDocs(query(
          collection(db, "hostFormPaymentViews"),
          where("organizerId", "==", "org"), where("formId", "==", "f1"),
          orderBy("createdAtMillis", "desc"), limit(51))));
        assert.deepEqual(all.docs.map((row) => row.id), [id("a"), id("b")]);
        const refunds = await assertSucceeds(getDocs(query(
          collection(db, "hostFormPaymentViews"),
          where("organizerId", "==", "org"), where("formId", "==", "f1"),
          where("status", "in", ["refundPending", "refunded"]),
          orderBy("createdAtMillis", "desc"), limit(51))));
        assert.deepEqual(refunds.docs.map((row) => row.id), [id("b")]);
      }
      await deniesOthers("hostFormPaymentViews", id("a"), id("d"));
      // The ledger document, with the guest's identity, stays server-only.
      await seed(["guestPayments", id("a")], {purpose: "form", organizerId: "org"});
      await assertFails(getDoc(doc(authedDb("host-1"), "guestPayments", id("a"))));
    });
  });
});
