// Firestore rules: event success. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  event,
  eventParticipation,
  eventRuntimeParticipant,
  eventSuccessArrivalMission,
  eventSuccessAssignment,
  eventSuccessCompatibilityResponse,
  eventSuccessConversationGraph,
  eventSuccessFeedback,
  eventSuccessPlan,
  eventSuccessPreference,
  eventSuccessWingmanRequest,
  getDoc,
  getDocs,
  it,
  or,
  organizer,
  query,
  seed,
  serverTimestamp,
  setDoc,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("event success", () => {
    it("allows host setup writes but keeps live control callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({
        startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
      }));

      const planRef = doc(authedDb("host-1"), "eventSuccessPlans", "event-1");

      await assertSucceeds(setDoc(planRef, eventSuccessPlan()));
      await assertSucceeds(updateDoc(planRef, {
        hostGoal: "Keep the event welcoming.",
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(updateDoc(planRef, {
        conversationGraphConsentMode: "optOut",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(updateDoc(planRef, {
        conversationGraphConsentMode: "preselectedForever",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(updateDoc(planRef, {
        activeStepIndex: 1,
        status: "live",
        compatibilityAffectsRanking: true,
        revealStatus: "countingDown",
        activeRevealRoundIndex: 0,
        revealStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        frozenAt: serverTimestamp(),
      }));
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessPlans", "event-1"),
          eventSuccessPlan(),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-2"),
          eventSuccessPlan({eventId: "event-1"}),
        ),
      );
      await assertFails(
        updateDoc(planRef, {
          liveControlRevision: 1,
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 3,
              resourceLabelId: "court",
              seatsPerUnit: null,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 3,
              resourceLabelId: "court",
              seatsPerUnit: 2,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 0,
              resourceLabelId: "court",
              seatsPerUnit: null,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "neighbour",
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          selectedModuleIds: Array.from({length: 25}, (_, index) => `m-${index}`),
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 2,
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          revealStatus: "spoiled",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          compatibilityAffectsRanking: "yes",
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it("freezes event success setup after participant activity or event start", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({
        startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        bookedCount: 1,
      }));
      await seed(["events", "event-started"], event({
        organizerId: "club-1",
        startTime: Timestamp.fromDate(new Date("2026-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
      }));

      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-1"),
          eventSuccessPlan(),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-started"),
          eventSuccessPlan({
            eventId: "event-started",
          }),
        ),
      );

      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      const planRef = doc(authedDb("host-1"), "eventSuccessPlans", "event-1");

      await assertFails(
        updateDoc(planRef, {
          hostGoal: "Late rewrite.",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          activeStepIndex: 1,
          status: "live",
          updatedAt: serverTimestamp(),
          frozenAt: serverTimestamp(),
        }),
      );
    });

    it("keeps run-of-show steps, pause and crawl changes callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({
        startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
      }));
      const planRef = doc(authedDb("host-1"), "eventSuccessPlans", "event-1");
      const step = {stepId: "host-1", title: "Quiz", durationMinutes: 10};

      await assertFails(setDoc(planRef, eventSuccessPlan({
        stepOverrides: [step],
      })));
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan({
        stepOverrides: [step],
        stepStartedAtMs: null,
        pausedAtMs: null,
        crawlStopChanges: [],
      }));
      // A plan the server edited still takes the host's setup saves.
      await assertSucceeds(updateDoc(planRef, {
        hostGoal: "Keep the event welcoming.",
        updatedAt: serverTimestamp(),
      }));
      for (const field of [
        {stepOverrides: [{...step, title: "Forged"}]},
        {pausedAtMs: 1},
        {stepStartedAtMs: 1},
        {crawlStopChanges: [{stopId: "s", title: "T", address: null,
          changedAtMs: 1}]},
      ]) {
        await assertFails(updateDoc(planRef, {
          ...field,
          updatedAt: serverTimestamp(),
        }));
      }
    });

    it("keeps close-out, live receipts and guest history server-written", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventCloseOuts", "event-1"], {
        eventId: "event-1", organizerId: "club-1", revision: 1,
        thankYou: null, openStayInTouchPicks: true, noShowNote: false,
        updatedByUid: "host-1", updatedAtMs: 1,
      });
      await seed(["eventLiveCommandReceipts", "receipt-1"], {
        eventId: "event-1", actorUid: "host-1", command: "setEventCloseOut",
      });
      await seed(["eventSuccessGuestHistory", "event-1_runner-1"], {
        eventId: "event-1", organizerId: "club-1", uid: "runner-1",
        unitOutcome: "score", standingsRevision: 1, rounds: [],
        finalStanding: null, updatedAtMs: 1,
      });

      const host = authedDb("host-1");
      await assertSucceeds(getDoc(doc(host, "eventCloseOuts", "event-1")));
      await seed(["events", "event-3"], event());
      await assertSucceeds(getDoc(doc(host, "eventCloseOuts", "event-3")));
      await assertFails(getDoc(doc(authedDb("runner-1"), "eventCloseOuts",
        "event-1")));
      await assertFails(updateDoc(doc(host, "eventCloseOuts", "event-1"), {
        noShowNote: true,
      }));
      await assertFails(getDocs(collection(host, "eventCloseOuts")));
      await assertFails(getDoc(doc(host, "eventLiveCommandReceipts",
        "receipt-1")));
      await assertFails(setDoc(doc(host, "eventLiveCommandReceipts",
        "forged"), {eventId: "event-1"}));

      await assertSucceeds(getDoc(doc(authedDb("runner-1"),
        "eventSuccessGuestHistory", "event-1_runner-1")));
      await assertFails(getDoc(doc(authedDb("runner-2"),
        "eventSuccessGuestHistory", "event-1_runner-1")));
      await assertFails(getDoc(doc(host, "eventSuccessGuestHistory",
        "event-1_runner-1")));
      await assertFails(setDoc(doc(authedDb("runner-1"),
        "eventSuccessGuestHistory", "event-1_runner-1"), {uid: "runner-1"}));
    });

    it("allows hosts and active participants to read event success plans", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "cancelled",
          cancelledAt: Timestamp.fromDate(new Date("2026-05-01T11:00:00.000Z")),
        }),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventSuccessPlans", "event-1")),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventSuccessPlans", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessPlans", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-3"), "eventSuccessPlans", "event-1")),
      );
    });

    it("keeps the plan to hosts when guests are not to see it", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({planVisibleToGuests: false}));
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventSuccessPlans", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventSuccessPlans", "event-1")),
      );
    });

    it("grants Event Success to a ready external runtime identity", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-1"],
        eventRuntimeParticipant(),
      );
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-2"],
        eventRuntimeParticipant({
          uid: "runner-2",
          accessStatus: "needsInput",
          readyAt: null,
        }),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessPlans",
        "event-1",
      )));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessPreferences",
        "event-1_runner-1",
      ), eventSuccessPreference()));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessCompatibilityResponses",
        "event-1_runner-1",
      ), eventSuccessCompatibilityResponse()));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "eventSuccessPlans",
        "event-1",
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-2"),
        "eventSuccessPreferences",
        "event-1_runner-2",
      ), eventSuccessPreference({uid: "runner-2"})));
    });

    it("allows attended users to submit feedback only after the event has ended", async () => {
      await seed(["organizers", "club-1"], organizer());
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
          status: "signedUp",
        }),
      );

      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1"),
          eventSuccessFeedback(),
        ),
      );
      await assertSucceeds(
        updateDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1"),
          {
            privateNote: "Even better after the second loop.",
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "eventSuccessFeedback", "event-1_runner-2"),
          eventSuccessFeedback({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-2"),
          eventSuccessFeedback(),
        ),
      );

      await seed(
        ["events", "event-future"],
        event({
          startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
          endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-future_runner-1"],
        eventParticipation({
          eventId: "event-future",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        }),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-future_runner-1"),
          eventSuccessFeedback({eventId: "event-future"}),
        ),
      );
    });

    it("keeps raw attendee feedback private from hosts and unrelated users", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventSuccessFeedback", "event-1_runner-1"],
        eventSuccessFeedback(),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("host-1"), "eventSuccessFeedback", "event-1_runner-1")),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessFeedback"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessFeedback", "event-1_runner-1")),
      );
    });

    it("keeps conversation graph edges attendee-private and server-written", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventSuccessConversationGraphs", "event-1_runner-1"],
        eventSuccessConversationGraph(),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("host-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "eventSuccessConversationGraphs"),
        where("eventId", "==", "event-1"),
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      ), eventSuccessConversationGraph()));
    });

    it("keeps event safety reports server-owned", async () => {
      await seed(["eventSafetyReports", "event-1_runner-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        reporterUserId: "runner-1",
        feedbackId: "event-1_runner-1",
        source: "event_success_feedback",
        status: "open",
        createdAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
      });

      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventSafetyReports", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("host-1"), "eventSafetyReports", "event-1_runner-1")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSafetyReports", "event-1_runner-2"),
          {
            eventId: "event-1",
            organizerId: "club-1",
            reporterUserId: "runner-1",
            feedbackId: "event-1_runner-1",
            source: "event_success_feedback",
            status: "open",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("allows participants to manage only their own event-success preferences", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "cancelled"}),
      );

      const preferenceRef = doc(
        authedDb("runner-1"),
        "eventSuccessPreferences",
        "event-1_runner-1",
      );

      await assertSucceeds(setDoc(preferenceRef, eventSuccessPreference()));
      await assertSucceeds(updateDoc(preferenceRef, {
        microPodsOptedOut: false,
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessPreferences",
            "event-1_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessPreferences"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessPreferences",
            "event-1_runner-2",
          ),
          eventSuccessPreference({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessPreferences",
            "event-1_runner-2",
          ),
          eventSuccessPreference({uid: "runner-2"}),
        ),
      );
    });

    it("lets participants manage private compatibility answers without host read access", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "cancelled"}),
      );

      const responseRef = doc(
        authedDb("runner-1"),
        "eventSuccessCompatibilityResponses",
        "event-1_runner-1",
      );

      await assertSucceeds(
        setDoc(responseRef, eventSuccessCompatibilityResponse()),
      );
      await assertSucceeds(updateDoc(responseRef, {
        answerIds: ["event_energy_playful_competition"],
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(
              authedDb("host-1"),
              "eventSuccessCompatibilityResponses",
            ),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-2",
          ),
          eventSuccessCompatibilityResponse({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-2",
          ),
          eventSuccessCompatibilityResponse({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          responseRef,
          eventSuccessCompatibilityResponse({
            answerIds: Array.from({length: 9}, (_, index) => `answer-${index}`),
          }),
        ),
      );
    });

    it("keeps wingman requests server-owned and host-visible", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-3"],
        eventParticipation({
          uid: "runner-3",
          status: "signedUp",
        }),
      );

      await seed(
        ["eventSuccessWingmanRequests", "event-1_runner-1"],
        eventSuccessWingmanRequest(),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessWingmanRequests"),
            where("eventId", "==", "event-1"),
            where("status", "==", "active"),
            where("hostVisibleConsent", "==", true),
          ),
        ),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await seed(
        ["eventSuccessWingmanRequests", "event-1_runner-1"],
        eventSuccessWingmanRequest({
          status: "withdrawn",
          updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:05:00.000Z")),
        }),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest(),
        ),
      );
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          {status: "active", updatedAt: serverTimestamp()},
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest({hostVisibleConsent: false}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest({targetUid: "runner-3"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-3"),
            "eventSuccessWingmanRequests",
            "event-1_runner-3",
          ),
          eventSuccessWingmanRequest({
            requesterUid: "runner-3",
            targetUid: "runner-1",
          }),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-2",
          ),
          eventSuccessWingmanRequest(),
        ),
      );
    });

    it("keeps First Hello arrival missions server-owned and attendee-private", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "attended"}),
      );
      await seed(
        ["eventSuccessArrivalMissions", "event-1_runner-1"],
        eventSuccessArrivalMission(),
      );

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-1"), "eventSuccessArrivalMissions"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
          eventSuccessArrivalMission(),
        ),
      );
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
          {status: "completed", updatedAt: serverTimestamp()},
        ),
      );
      await seed(
        ["eventSuccessArrivalMissions", "event-1_runner-2"],
        eventSuccessArrivalMission({observerUid: "runner-2"}),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-2",
          ),
        ),
      );
    });

    it("keeps event-success assignments server-owned and scoped to the attendee", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "signedUp"}),
      );
      await seed(
        ["eventSuccessAssignments", "event-1_micro_pods_runner-1"],
        eventSuccessAssignment(),
      );

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "micro_pods"),
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "guided_rotations"),
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "micro_pods"),
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-2",
          ),
          eventSuccessAssignment({uid: "runner-2"}),
        ),
      );
    });

    it("keeps prepared rotation drafts host-only and server-owned", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventSuccessAssignmentDrafts", "event-1_guided_rotations_runner-1"],
        {
          eventId: "event-1",
          organizerId: "club-1",
          uid: "runner-1",
          moduleId: "guided_rotations",
          roundIndex: 0,
          baseAssignmentRevision: 1,
          assignment: eventSuccessAssignment({
            moduleId: "guided_rotations",
          }),
          createdAt: Timestamp.fromDate(new Date("2026-05-02T01:00:00.000Z")),
          updatedAt: Timestamp.fromDate(new Date("2026-05-02T01:00:00.000Z")),
        },
      );

      const draftRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessAssignmentDrafts",
        "event-1_guided_rotations_runner-1",
      );
      await assertSucceeds(getDoc(draftRef("host-1")));
      await assertFails(getDoc(draftRef("runner-1")));
      await assertFails(setDoc(draftRef("host-1"), {
        eventId: "event-1",
      }));
    });

    it("keeps event matching answer decisions callable-only", async () => {
      await seed(["eventAssignmentFeatureConsents", "consent-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        featureId: "feature-1",
        status: "granted",
      });
      for (const uid of ["runner-1", "host-1", "other-1"]) {
        const ref = doc(authedDb(uid),
          "eventAssignmentFeatureConsents", "consent-1");
        await assertFails(getDoc(ref));
        await assertFails(setDoc(ref, {status: "withdrawn"}));
        await assertFails(deleteDoc(ref));
      }
      await assertFails(getDocs(collection(authedDb("runner-1"),
        "eventAssignmentFeatureConsents")));
    });

    it("keeps presence manager-only and scopes late-arrival outcomes", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "attended"}),
      );
      const timestamp = Timestamp.fromDate(
        new Date("2026-05-02T01:45:00.000Z"),
      );
      await seed(["eventSuccessPresence", "event-1_runner-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        surface: "flutter",
        heartbeatAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await seed(["eventSuccessLateArrivals", "event-1_runner-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        resolvedByUid: "host-1",
        status: "heldForNextRound",
        targetRoundIndex: 2,
        assignmentDraftRevision: 4,
        reason: "The prepared units are full. You will join the next round.",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const presenceRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessPresence",
        "event-1_runner-1",
      );
      await assertFails(getDoc(presenceRef("runner-1")));
      await assertSucceeds(getDoc(presenceRef("host-1")));
      await assertFails(setDoc(presenceRef("runner-1"), {
        eventId: "event-1",
      }));
      await assertFails(setDoc(presenceRef("host-1"), {
        eventId: "event-1",
      }));

      const resolutionRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessLateArrivals",
        "event-1_runner-1",
      );
      await assertSucceeds(getDoc(resolutionRef("runner-1")));
      await assertSucceeds(getDoc(resolutionRef("host-1")));
      await assertFails(getDoc(resolutionRef("runner-2")));
      await assertFails(setDoc(resolutionRef("host-1"), {
        eventId: "event-1",
      }));
      // A list must name the organizer whose managers it is for.
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "eventSuccessLateArrivals"),
        where("eventId", "==", "event-1"),
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "eventSuccessLateArrivals"),
        where("organizerId", "==", "club-1"),
        where("eventId", "==", "event-1"),
      )));
    });

    it("keeps outcome facts Host-only and shares standings with participants", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-2"],
        eventRuntimeParticipant({uid: "runner-2"}),
      );
      const timestamp = Timestamp.fromDate(
        new Date("2026-05-02T03:00:00.000Z"),
      );
      const outcomes = {
        eventId: "event-1",
        organizerId: "club-1",
        unitOutcome: "score",
        revision: 1,
        rounds: [{
          roundIndex: 0,
          entries: [
            {unitId: "team-a", unitLabel: "Team A", score: 12},
          ],
        }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const standings = {
        eventId: "event-1",
        organizerId: "club-1",
        unitOutcome: "score",
        revision: 1,
        latestRoundIndex: 0,
        rounds: [{
          roundIndex: 0,
          entries: [{
            unitId: "team-a",
            unitLabel: "Team A",
            position: 1,
            value: 12,
            roundsRecorded: 1,
          }],
        }],
        entries: [{
          unitId: "team-a",
          unitLabel: "Team A",
          position: 1,
          value: 12,
          roundsRecorded: 1,
        }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await seed(["eventSuccessUnitOutcomes", "event-1"], outcomes);
      await seed(["eventSuccessStandings", "event-1"], standings);

      await assertSucceeds(getDoc(doc(
        authedDb("host-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      )));
      for (const uid of ["host-1", "runner-1", "runner-2"]) {
        await assertSucceeds(getDoc(doc(
          authedDb(uid),
          "eventSuccessStandings",
          "event-1",
        )));
      }
      await assertFails(getDoc(doc(
        authedDb("runner-3"),
        "eventSuccessStandings",
        "event-1",
      )));
      await assertFails(getDocs(collection(
        authedDb("runner-1"),
        "eventSuccessStandings",
      )));
      await assertFails(setDoc(doc(
        authedDb("host-1"),
        "eventSuccessStandings",
        "event-1",
      ), standings));
      await assertFails(setDoc(doc(
        authedDb("host-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      ), outcomes));
    });

    it("exposes event scorecards only to the event host", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(["eventSuccessScorecards", "event-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        feedbackCount: 2,
        updatedAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
      });

      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessScorecards", "event-1"),
          {eventId: "event-1"},
        ),
      );
    });
  });
});
