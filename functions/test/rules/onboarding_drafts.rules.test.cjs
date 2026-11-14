// Firestore rules: onboarding drafts. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  describe,
  doc,
  getDoc,
  it,
  setDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("onboarding drafts", () => {
    it("allows only the owner to read, write, and delete their draft", async () => {
      const draft = {
        step: 2,
        draftVersion: 0,
        firstName: "Runner",
        lastName: "One",
        dateOfBirth: null,
        phoneNumber: "9999999999",
        countryCode: "+91",
        gender: "woman",
        interestedInGenders: ["man"],
        instagramHandle: null,
      };

      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1"), draft),
      );
      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1"), {
          ...draft,
          futureStepPayload: {canEvolveWithoutRulesDeploy: true},
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "onboarding_drafts", "runner-1")),
      );
      await assertSucceeds(
        deleteDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1")),
      );
    });
  });
});
