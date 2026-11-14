// Firestore rules: swipes. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  describe,
  doc,
  event,
  eventParticipation,
  getDoc,
  it,
  seed,
  setDoc,
  swipe,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("swipes", () => {
    it("allows attended users to create valid outgoing swipes", async () => {
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );

      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2",
          ),
          swipe(),
        ),
      );
      await seed(["publicProfiles", "runner-2-reaction"], {name: "Runner R"});
      await seed(
        ["eventParticipations", "event-1_runner-2-reaction"],
        eventParticipation({
          uid: "runner-2-reaction",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2-reaction",
          ),
          swipe({
            targetId: "runner-2-reaction",
            reactionTargetId: "profile-prompt-perfectRun",
            reactionTargetType: "profilePrompt",
            reactionTargetLabel: "A perfect event with me looks like...",
            reactionTargetPreview: "Always up for a sunrise event.",
            comment: "Same here.",
          }),
        ),
      );
      await seed(["publicProfiles", "runner-2-compatibility"], {name: "Runner C"});
      await seed(
        ["eventParticipations", "event-1_runner-2-compatibility"],
        eventParticipation({
          uid: "runner-2-compatibility",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2-compatibility",
          ),
          swipe({
            targetId: "runner-2-compatibility",
            reactionTargetId: "compatibility",
            reactionTargetType: "compatibility",
            reactionTargetLabel: "Why you might click",
            reactionTargetPreview: "Your pace ranges overlap.",
          }),
        ),
      );
    });

    it("denies malformed swipe payloads", async () => {
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );

      const swipeRef = doc(
        authedDb("runner-1"),
        "profileDecisions",
        "runner-1",
        "outgoing",
        "runner-2",
      );

      await assertFails(setDoc(swipeRef, swipe({swiperId: "runner-3"})));
      await assertFails(setDoc(swipeRef, swipe({targetId: "runner-3"})));
      await assertFails(setDoc(swipeRef, swipe({direction: "superlike"})));
      await assertFails(setDoc(swipeRef, swipe({eventId: 123})));
      await assertFails(
        setDoc(swipeRef, swipe({reactionTargetType: "superlike"})),
      );
      await assertFails(
        setDoc(swipeRef, swipe({direction: "pass", comment: "Nope."})),
      );
      await assertFails(setDoc(swipeRef, {...swipe(), extraField: true}));
    });

    it("denies swipes outside the eligible event candidate relationship", async () => {
      await seed(["publicProfiles", "runner-1"], {name: "Runner One"});
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["publicProfiles", "runner-3"], {name: "Runner Three"});
      await seed(["events", "event-1"], event());
      await seed(["events", "event-2"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-2_runner-1"],
        eventParticipation({
          eventId: "event-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-1"),
          swipe({targetId: "runner-1"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-3"),
          swipe({targetId: "runner-3"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-2"),
          swipe({eventId: "event-2"}),
        ),
      );

      await seed(["blocks", "runner-2__runner-1"], {
        blockerUserId: "runner-2",
        blockedUserId: "runner-1",
      });
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-2"),
          swipe(),
        ),
      );
    });
  });
});
