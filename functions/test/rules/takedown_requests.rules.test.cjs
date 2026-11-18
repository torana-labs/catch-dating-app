// Firestore rules: structured listing requests. Shared fixtures and the
// emulator lifecycle live in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  authedDb,
  deleteDoc,
  describe,
  doc,
  getDoc,
  getDocs,
  collection,
  it,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

const requestId = `lr-${"a".repeat(40)}`;

function takedownRequest(overrides = {}) {
  const at = Timestamp.fromDate(new Date("2026-11-18T06:00:00.000Z"));
  return {
    schemaVersion: 1,
    requestId,
    reference: "LR-ABCDEFGH",
    clientRequestId: "0f3c2a9e5b1d4c7e8a6b2d9f1e3c5a70",
    requestHash: "b".repeat(64),
    requestType: "removeAndDoNotList",
    target: {kind: "organizer", id: "lantern-lane-social", path: null},
    requester: {name: "Asha Verma", role: "owner", email: "asha@lanternlane.example",
      phone: null, organisation: "Lantern Lane Social"},
    verification: {proofMethod: "domainEmail", officialDomain: "lanternlane.example"},
    declarations: {accurate: true, authorised: true, contactConsent: true},
    context: null,
    consent: {purpose: "listingRequest", version: "listing-request-v1", decidedAt: at},
    sourcePage: "/listings/request/",
    status: "received",
    outcome: null,
    declineReason: null,
    caseId: null,
    infoRequests: [],
    appeal: null,
    deciderUid: null,
    acknowledgedAt: null,
    ackDueAt: at,
    actionDueAt: at,
    resolveDueAt: at,
    decidedAt: null,
    closedAt: null,
    history: [],
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("takedown requests", () => {
    it("keeps takedownRequests server-only for every client, staff claims included", async () => {
      await seed(["takedownRequests", requestId], takedownRequest());
      for (const db of [
        authedDb("visitor-1"),
        authedDb("owner-1", {email: "asha@lanternlane.example"}),
        authedDb("staff-1", {admin: true, adminOwner: true, support: true}),
      ]) {
        const ref = doc(db, "takedownRequests", requestId);
        await assertFails(getDoc(ref));
        await assertFails(getDocs(collection(db, "takedownRequests")));
        await assertFails(updateDoc(ref, {status: "actioned"}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(db, "takedownRequests", `lr-${"c".repeat(40)}`),
          takedownRequest({requestId: `lr-${"c".repeat(40)}`})));
      }
    });
  });
});
