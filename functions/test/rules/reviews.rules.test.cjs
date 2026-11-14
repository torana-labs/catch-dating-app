// Firestore rules: reviews. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assertFails,
  assertSucceeds,
  authedDb,
  deleteDoc,
  describe,
  doc,
  event,
  eventReviewId,
  getDoc,
  it,
  review,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("reviews", () => {
    it("allows authenticated users to read reviews", async () => {
      await seed(
        ["reviews", eventReviewId("event-1", "runner-1")],
        review(),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "reviews",
        eventReviewId("event-1", "runner-1"),
      )));
    });

    it("denies direct review writes because reviews are callable-owned", async () => {
      await seed(
        ["reviews", eventReviewId("event-1", "runner-1")],
        review(),
      );

      const ownReviewRef = doc(
        authedDb("runner-1"),
        "reviews",
        eventReviewId("event-1", "runner-1"),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "reviews", "event-2~runner-1"),
          review({eventId: "event-2"}),
        ),
      );
      await assertFails(updateDoc(ownReviewRef, {
        rating: 4,
        comment: "Updated review.",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(deleteDoc(ownReviewRef));
    });
  });
});
