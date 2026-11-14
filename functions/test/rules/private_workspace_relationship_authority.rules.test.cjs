// Firestore rules: private workspace relationship authority. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  getDoc,
  getDocs,
  it,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("private workspace relationship authority", () => {
    it("denies direct access for guests, managers and unauthenticated viewers",
      async () => {
        const collections = ["workspaceFieldAssertions", "workspaceFieldDecisions",
          "programLodgingProposals", "programLodgingWorkflows", "programLodgingReceipts", "programLodgingSourceVersions", "programLodgingConfigs", "workspaceMembershipAssertions", "workspaceMembershipDecisions",
          "organizerCommunityMemberships", "organizerCommunityMembershipDecisions"];
        for (const name of collections) {
          await seed([name, "doc-1"], {uid: "guest-1", organizerId: "club-1"});
          for (const db of [authedDb("guest-1"), authedDb("host-1"),
            testEnv.unauthenticatedContext().firestore()]) {
            const ref = doc(db, name, "doc-1");
            await assertFails(getDoc(ref));
            await assertFails(getDocs(collection(db, name)));
            await assertFails(setDoc(ref, {uid: "guest-1", organizerId: "club-1"}));
            await assertFails(updateDoc(ref, {state: "active"}));
            await assertFails(deleteDoc(ref));
          }
        }
      });
  });
});
