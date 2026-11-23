// Firestore rules: the guest event day read models (#2306). Shared fixtures
// and the emulator lifecycle live in rulesHarness.cjs.
const {
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  event,
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

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("Guest event day views", () => {
    // getEventSuccessSpatialLayout admitted the event's organizer managers
    // and a guest whose own booking was signed up or attended, or whose own
    // runtime participant row was ready: exactly those get the view.
    it("lets the event's managers and booked guests get its room layout " +
      "and nothing else", async () => {
      await seed(["organizers", "club-1"], organizer({hostUserIds: ["manager"]}));
      await seed(["events", "event-1"], event());
      const view = {eventId: "event-1", organizerId: "club-1",
        layout: {layoutId: "hall", label: "Main hall", units: []},
        version: 1};
      await seed(["eventSuccessLayoutViews", "event-1"], view);
      const booking = (uid, status) => seed(["eventBookings",
        `event-1_${uid}`], {eventId: "event-1", organizerId: "club-1", uid,
        status});
      await booking("signed-up", "signedUp");
      await booking("attended", "attended");
      await booking("waitlisted", "waitlisted");
      await booking("cancelled", "cancelled");
      await seed(["eventRuntimeParticipants", "event-1_walk-in"], {
        eventId: "event-1", uid: "walk-in", accessStatus: "ready"});
      await seed(["eventRuntimeParticipants", "event-1_pending"], {
        eventId: "event-1", uid: "pending", accessStatus: "pending"});
      const get = (uid) => getDoc(doc(authedDb(uid), "eventSuccessLayoutViews",
        "event-1"));
      for (const uid of ["host-1", "manager", "signed-up", "attended",
        "walk-in"]) {
        await assertSucceeds(get(uid));
      }
      for (const uid of ["waitlisted", "cancelled", "pending", "stranger"]) {
        await assertFails(get(uid));
      }
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "eventSuccessLayoutViews", "event-1")));
      const missing = await assertSucceeds(getDoc(doc(authedDb("stranger"),
        "eventSuccessLayoutViews", "event-2")));
      assert.equal(missing.exists(), false);
      await assertFails(getDocs(query(collection(authedDb("host-1"),
        "eventSuccessLayoutViews"), where("eventId", "==", "event-1"))));
      await assertFails(setDoc(doc(authedDb("host-1"),
        "eventSuccessLayoutViews", "event-1"), view));
      await assertFails(deleteDoc(doc(authedDb("host-1"),
        "eventSuccessLayoutViews", "event-1")));
    });

    // The roster link travels on the guest's own status row: only that
    // guest gets or lists it.
    it("keeps a guest's roster link to that guest", async () => {
      const row = {schemaVersion: 1, eventId: "event-1", uid: "guest-1",
        organizerId: "club-1", booking: "none",
        rosterLink: {kind: "linked", attendeeId: "row-1"}};
      await seed(["guestEventStatuses", "event-1_guest-1"], row);
      await assertSucceeds(getDoc(doc(authedDb("guest-1"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDoc(doc(authedDb("guest-2"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDocs(query(collection(authedDb("guest-2"),
        "guestEventStatuses"), where("uid", "==", "guest-1"))));
      await assertFails(setDoc(doc(authedDb("guest-1"),
        "guestEventStatuses", "event-1_guest-1"), row));
    });
  });
});
