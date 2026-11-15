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
    it("keeps raw and admin participant metrics server-owned", async () => {
      await seed(["participantSignalFacts", "fact-1"], {
        uid: "runner-1",
        type: "incoming_like",
        source: "swipe",
      });
      await seed(["participantMetricCounters", "runner-1"], {
        uid: "runner-1",
        counters: {incoming_like: 1},
      });

      await assertFails(
        getDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "participantMetricCounters", "runner-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-2"), {
          uid: "runner-1",
        }),
      );
    });

  });
});
