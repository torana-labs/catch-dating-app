// Firestore rules: participant success metrics. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  authedDb,
  describe,
  doc,
  getDoc,
  it,
  seed,
  setDoc,
  swipe,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("participant success metrics", () => {
    it("keeps raw participant signal facts server-owned", async () => {
      await seed(["participantSignalFacts", "fact-1"], {
        uid: "runner-1",
        type: "incoming_like",
        source: "swipe",
      });

      await assertFails(
        getDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-2"), {
          uid: "runner-1",
        }),
      );
    });

  });
});
