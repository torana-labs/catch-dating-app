// Firestore rules: launch access applications. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  assertSucceeds,
  authedDb,
  describe,
  doc,
  getDoc,
  it,
  launchAccessApplication,
  review,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("launch access applications", () => {
    it("allows a signed-in owner to create and read a valid application", async () => {
      const application = {
        ...launchAccessApplication(),
        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          application,
        ),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "accessApplications", "runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "accessApplications", "runner-1")),
      );
    });

    it("allows owner edits only while editable and increments submissionCount", async () => {
      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication(),
      );

      await assertSucceeds(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            role: "both",
            wantsToHost: true,
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("rejects path impersonation and client-owned review fields", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "accessApplications", "runner-1"),
          {
            ...launchAccessApplication(),
            createdAt: serverTimestamp(),
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            ...launchAccessApplication({reviewerUid: "runner-1"}),
            createdAt: serverTimestamp(),
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("rejects status spoofing, invalid shapes, and locked edits", async () => {
      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication(),
      );

      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            status: "approvedForProfile",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            city: "mumbai",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );

      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication({status: "approvedForProfile"}),
      );
      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            whyCatch: "I would like to change my approved application.",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });
  });
});
