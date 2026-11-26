// Firestore rules: a guest's booking cohort is their sexual orientation
// (#2493). Organisers read the guest's booking, waitlist offer and event, so
// the cohort lives only in eventBookingPrivateFacts and the per-cohort event
// totals only in eventCohortCounts, which no client reads.
// Shared fixtures and the emulator lifecycle live in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  describe,
  doc,
  event,
  eventParticipation,
  getDoc,
  getDocs,
  it,
  organizer,
  query,
  seed,
  setDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

const facts = {
  eventId: "event-1",
  uid: "runner-1",
  cohortAtSignup: "queerOrOpen",
  cohortAtOffer: "queerOrOpen",
  updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
};

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("eventCohortCounts", () => {
    it("lets no organiser, guest or stranger read an event's cohort totals",
      async () => {
        await seed(["organizers", "club-1"], organizer());
        await seed(["events", "event-1"], event());
        const totals = {eventId: "event-1",
          cohortCounts: {queerOrOpen: 1, womenInterestedInMen: 3},
          waitlistedCohortCounts: {}, crossPathsPairHeldCohortCounts: {},
          updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z"))};
        await seed(["eventCohortCounts", "event-1"], totals);

        // The organiser manager still reads the event itself.
        await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "events", "event-1")));

        for (const reader of ["host-1", "runner-1"]) {
          await assertFails(getDoc(doc(authedDb(reader),
            "eventCohortCounts", "event-1")));
          await assertFails(getDocs(query(collection(authedDb(reader),
            "eventCohortCounts"), where("eventId", "==", "event-1"))));
          await assertFails(setDoc(doc(authedDb(reader),
            "eventCohortCounts", "event-1"), totals));
        }
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), "eventCohortCounts", "event-1")));
      });
  });

  describe("eventBookingPrivateFacts", () => {
    it("lets no organiser, guest or stranger read a booking cohort",
      async () => {
        await seed(["organizers", "club-1"], organizer());
        await seed(["events", "event-1"], event());
        await seed(["eventBookings", "event-1_runner-1"],
          eventParticipation());
        await seed(["eventBookingPrivateFacts", "event-1_runner-1"], facts);

        // The organiser manager still reads the booking itself.
        await assertSucceeds(getDoc(doc(authedDb("host-1"),
          "eventBookings", "event-1_runner-1")));

        for (const reader of ["host-1", "runner-1", "runner-2"]) {
          await assertFails(getDoc(doc(authedDb(reader),
            "eventBookingPrivateFacts", "event-1_runner-1")));
          await assertFails(getDocs(query(collection(authedDb(reader),
            "eventBookingPrivateFacts"), where("eventId", "==", "event-1"))));
          await assertFails(setDoc(doc(authedDb(reader),
            "eventBookingPrivateFacts", "event-1_runner-1"), facts));
        }
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), "eventBookingPrivateFacts", "event-1_runner-1")));
      });
  });
});
