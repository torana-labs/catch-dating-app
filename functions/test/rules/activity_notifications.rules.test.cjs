// Firestore rules: activity notifications. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  activityNotification,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  describe,
  doc,
  getDocs,
  it,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("activity notifications", () => {
    it("allows users to read only their own notification timeline", async () => {
      await seed(
        ["notifications", "runner-1", "items", "notification-1"],
        activityNotification(),
      );

      await assertSucceeds(
        getDocs(collection(authedDb("runner-1"), "notifications", "runner-1", "items")),
      );
      await assertFails(
        getDocs(collection(authedDb("runner-2"), "notifications", "runner-1", "items")),
      );
    });

    it("allows users to mark notifications read but not edit content", async () => {
      await seed(
        ["notifications", "runner-1", "items", "notification-1"],
        activityNotification(),
      );
      const notificationRef = doc(
        authedDb("runner-1"),
        "notifications",
        "runner-1",
        "items",
        "notification-1",
      );

      await assertSucceeds(updateDoc(notificationRef, {readAt: serverTimestamp()}));
      await assertFails(updateDoc(notificationRef, {title: "Updated"}));
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-2"),
            "notifications",
            "runner-1",
            "items",
            "notification-1",
          ),
          {readAt: serverTimestamp()},
        ),
      );
    });

    it("denies client-created notification timeline items", async () => {
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "notifications",
            "runner-1",
            "items",
            "notification-1",
          ),
          activityNotification(),
        ),
      );
    });
  });
});
