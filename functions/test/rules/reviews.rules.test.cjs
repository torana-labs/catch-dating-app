// Firestore rules: reviews. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  eventReviewId,
  getDoc,
  getDocs,
  it,
  orderBy,
  query,
  review,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

const publishedId = eventReviewId("event-1", "runner-1");
const pendingId = eventReviewId("event-1", "runner-2");
const rejectedId = eventReviewId("event-1", "runner-3");

async function seedModeratedReviews() {
  await seed(["reviews", publishedId],
    review({moderationStatus: "published"}));
  await seed(["reviews", pendingId], review({
    reviewerUserId: "runner-2",
    reviewerName: "Runner Two",
    moderationStatus: "pending",
  }));
  await seed(["reviews", rejectedId], review({
    reviewerUserId: "runner-3",
    reviewerName: "Runner Three",
    moderationStatus: "rejected",
  }));
}

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("reviews", () => {
    it("lets a signed-in stranger get a published review", async () => {
      await seedModeratedReviews();

      await assertSucceeds(getDoc(doc(
        authedDb("stranger-1"), "reviews", publishedId)));
    });

    it("hides pending, rejected and unmoderated reviews from strangers",
      async () => {
        await seedModeratedReviews();
        await seed(["reviews", "event-1~runner-4"], review({
          reviewerUserId: "runner-4",
        }));
        const strangerDb = authedDb("stranger-1");

        await assertFails(getDoc(doc(strangerDb, "reviews", pendingId)));
        await assertFails(getDoc(doc(strangerDb, "reviews", rejectedId)));
        await assertFails(getDoc(doc(
          strangerDb, "reviews", "event-1~runner-4")));
      });

    it("lets the author get their own pending or rejected review",
      async () => {
        await seedModeratedReviews();

        await assertSucceeds(getDoc(doc(
          authedDb("runner-2"), "reviews", pendingId)));
        await assertSucceeds(getDoc(doc(
          authedDb("runner-3"), "reviews", rejectedId)));
      });

    it("lets the author watch their event review id before it exists",
      async () => {
        await assertSucceeds(getDoc(doc(
          authedDb("runner-1"), "reviews", eventReviewId("event-9", "runner-1"))));
        await assertFails(getDoc(doc(
          authedDb("stranger-1"),
          "reviews",
          eventReviewId("event-9", "runner-1"),
        )));
        await assertFails(getDoc(doc(
          authedDb("runner-1"), "reviews", "event-9~runner-1~extra")));
      });

    it("grants Admin role claims no direct read of hidden reviews",
      async () => {
        await seedModeratedReviews();

        await assertFails(getDoc(doc(
          authedDb("staff-1", {safetyReviewer: true, admin: true}),
          "reviews",
          pendingId,
        )));
      });

    it("denies an unfiltered list and allows the published-only list",
      async () => {
        await seedModeratedReviews();
        const strangerDb = authedDb("stranger-1");

        await assertFails(getDocs(query(
          collection(strangerDb, "reviews"),
          where("organizerId", "==", "club-1"),
          orderBy("createdAt", "desc"),
        )));
        await assertFails(getDocs(query(
          collection(strangerDb, "reviews"),
          where("eventId", "==", "event-1"),
        )));

        const organizerReviews = await assertSucceeds(getDocs(query(
          collection(strangerDb, "reviews"),
          where("organizerId", "==", "club-1"),
          where("moderationStatus", "==", "published"),
          orderBy("createdAt", "desc"),
        )));
        const eventReviews = await assertSucceeds(getDocs(query(
          collection(strangerDb, "reviews"),
          where("eventId", "==", "event-1"),
          where("moderationStatus", "==", "published"),
          orderBy("createdAt", "desc"),
        )));
        assert.deepEqual(
          organizerReviews.docs.map((snapshot) => snapshot.id), [publishedId]);
        assert.deepEqual(
          eventReviews.docs.map((snapshot) => snapshot.id), [publishedId]);
      });

    it("lets a reviewer list their own reviews and nobody else's",
      async () => {
        await seedModeratedReviews();

        const own = await assertSucceeds(getDocs(query(
          collection(authedDb("runner-2"), "reviews"),
          where("reviewerUserId", "==", "runner-2"),
          orderBy("createdAt", "desc"),
        )));
        assert.deepEqual(
          own.docs.map((snapshot) => snapshot.id), [pendingId]);
        await assertFails(getDocs(query(
          collection(authedDb("stranger-1"), "reviews"),
          where("reviewerUserId", "==", "runner-2"),
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
