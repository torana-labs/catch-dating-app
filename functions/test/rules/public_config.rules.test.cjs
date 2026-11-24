// Firestore rules: public config. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  assertSucceeds,
  authedDb,
  describe,
  doc,
  getDoc,
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

  describe("public config", () => {
    it("allows public reads of config/cities and denies other config docs", async () => {
      await seed(["config", "cities"], {
        version: 2,
        cityNames: ["in-mh-mumbai", "in-mp-indore"],
        marketIds: ["in-mh-mumbai", "in-mp-indore"],
        launchMarketIds: ["in-mh-mumbai", "in-mp-indore"],
        cities: [],
        markets: [],
      });
      await seed(["config", "private"], {secret: true});

      await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "cities")));
      await assertFails(getDoc(doc(authedDb("runner-1"), "config", "private")));
    });

    it("allows public reads of config/brand and denies client writes", async () => {
      await seed(["config", "brand"], {name: "Lumen", stores: {host: {ios: null, android: null}}});

      await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "brand")));
      await assertSucceeds(getDoc(doc(authedDb("runner-1"), "config", "brand")));
      await assertFails(setDoc(doc(authedDb("runner-1"), "config", "brand"), {name: "Spoof"}));
      await assertFails(updateDoc(doc(authedDb("runner-1"), "config", "brand"), {name: "Spoof"}));
      await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "brand"), {name: "Spoof"}));
    });

    it("denies clients the discovery indexing override", async () => {
      await seed(["config", "discoveryIndexing"], {forceNoindex: true, reason: "Pause trigger"});

      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "discoveryIndexing")));
      await assertFails(getDoc(doc(authedDb("runner-1"), "config", "discoveryIndexing")));
      await assertFails(setDoc(doc(authedDb("runner-1"), "config", "discoveryIndexing"), {forceNoindex: false}));
      await assertFails(updateDoc(doc(authedDb("runner-1"), "config", "discoveryIndexing"), {forceNoindex: false}));
    });

    it("denies clients the guest data visibility floor", async () => {
      await seed(["config", "guestDataVisibility"], {groupSizeFloor: 10, reason: "Launch default"});

      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "guestDataVisibility")));
      await assertFails(getDoc(doc(authedDb("host-1"), "config", "guestDataVisibility")));
      await assertFails(setDoc(doc(authedDb("host-1"), "config", "guestDataVisibility"), {groupSizeFloor: 2}));
      await assertFails(updateDoc(doc(authedDb("host-1"), "config", "guestDataVisibility"), {groupSizeFloor: 2}));
    });
  });
});
