// Firestore rules: chat and match writes. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  describe,
  doc,
  event,
  getDoc,
  it,
  match,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("chat and match writes", () => {
    it("allows participants to create messages but keeps match previews server-owned", async () => {
      await seed(["matches", "match-1"], match());

      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-1",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "image-message-1",
          ),
          {
            senderId: "runner-1",
            text: "",
            imageUrl: "https://storage.test/chat-image.jpg",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          lastMessagePreview: "client-owned preview",
        }),
      );
    });

    it("denies messages from an account under a messaging hold until it ends", async () => {
      await seed(["matches", "match-1"], match());
      const message = (id) => setDoc(
        doc(authedDb("runner-1"), "matches", "match-1", "messages", id),
        {senderId: "runner-1", text: "hello", sentAt: serverTimestamp()},
      );
      await seed(["accountSafetyStates", "runner-1"], {
        uid: "runner-1",
        messaging: {held: true, until: null},
      });
      await assertFails(message("held-indefinitely"));
      await seed(["accountSafetyStates", "runner-1"], {
        uid: "runner-1",
        messaging: {held: true, until: Timestamp.fromDate(new Date(Date.now() + 86400000))},
      });
      await assertFails(message("held-until-tomorrow"));
      await seed(["accountSafetyStates", "runner-1"], {
        uid: "runner-1",
        messaging: {held: true, until: Timestamp.fromDate(new Date(Date.now() - 60000))},
      });
      await assertSucceeds(message("hold-ended"));
      await assertSucceeds(getDoc(doc(authedDb("runner-1"), "accountSafetyStates", "runner-1")));
      await assertFails(getDoc(doc(authedDb("runner-2"), "accountSafetyStates", "runner-1")));
      await assertFails(setDoc(doc(authedDb("runner-1"), "accountSafetyStates", "runner-1"), {
        uid: "runner-1", messaging: {held: false, until: null},
      }));
    });

    it("denies messages from non-participants and blocked matches", async () => {
      await seed(["matches", "match-1"], match());
      await seed(["matches", "blocked-match"], match({status: "blocked"}));

      await assertFails(
        setDoc(
          doc(
            authedDb("runner-3"),
            "matches",
            "match-1",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-3",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "blocked-match",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-1",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "empty-message",
          ),
          {
            senderId: "runner-1",
            text: "",
            sentAt: serverTimestamp(),
          },
        ),
      );
    });

    it("denies messages after a Cross Paths event plan expires", async () => {
      await seed(["matches", "expired-plan"], match({
        conversationType: "crossPathsEventPlan",
        eventPlanExpiresAt: Timestamp.fromMillis(Date.now() - 60_000),
      }));
      await seed(["matches", "open-plan"], match({
        conversationType: "crossPathsEventPlan",
        eventPlanExpiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
      }));
      const message = {
        senderId: "runner-1",
        text: "See you there",
        sentAt: serverTimestamp(),
      };
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "matches",
        "expired-plan",
        "messages",
        "message-1",
      ), message));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "matches",
        "open-plan",
        "messages",
        "message-1",
      ), message));
    });

    it("allows participants to reset only their own unread count", async () => {
      await seed(["matches", "match-1"], match());

      await assertSucceeds(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          "unreadCounts.runner-1": 0,
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          "unreadCounts.runner-2": 0,
        }),
      );
    });
  });
});
