// Firestore rules: the guest's own guestEventStatuses rows and the roster
// link they carry (#2306 batch E). Shared fixtures and the emulator
// lifecycle live in rulesHarness.cjs.
const {
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  doc,
  describe,
  getDoc,
  getDocs,
  it,
  query,
  seed,
  setDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

const row = (uid, patch = {}) => ({schemaVersion: 1, eventId: "event-1",
  uid, organizerId: "club-1", booking: "none",
  rosterLink: {kind: "linked", attendeeId: `row-${uid}`}, ...patch});

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("guestEventStatuses", () => {
    // The roster link travels on the guest's own status row: only that
    // guest gets or lists it.
    it("keeps a guest's roster link to that guest", async () => {
      await seed(["guestEventStatuses", "event-1_guest-1"], row("guest-1"));
      await assertSucceeds(getDoc(doc(authedDb("guest-1"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDoc(doc(authedDb("guest-2"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDocs(query(collection(authedDb("guest-2"),
        "guestEventStatuses"), where("uid", "==", "guest-1"))));
      await assertFails(setDoc(doc(authedDb("guest-1"),
        "guestEventStatuses", "event-1_guest-1"), row("guest-1")));
    });

    // Authority comes from the document id the server chose, never from the
    // uid field a trigger wrote (audit FIX-10): a row whose field names
    // someone else stays readable only by the guest its id names.
    it("authorises a get by the id's uid, not the stored uid field",
      async () => {
        await seed(["guestEventStatuses", "event-1_guest-1"],
          row("guest-2"));
        await assertSucceeds(getDoc(doc(authedDb("guest-1"),
          "guestEventStatuses", "event-1_guest-1")));
        await assertFails(getDoc(doc(authedDb("guest-2"),
          "guestEventStatuses", "event-1_guest-1")));
        // An event id may hold underscores; the last part is the uid.
        await seed(["guestEventStatuses", "event_two_guest-1"],
          row("guest-1", {eventId: "event_two"}));
        await assertSucceeds(getDoc(doc(authedDb("guest-1"),
          "guestEventStatuses", "event_two_guest-1")));
        await assertFails(getDoc(doc(authedDb("two_guest-1"),
          "guestEventStatuses", "event_two_guest-1")));
        // An id that is only the uid, or names no event, is nobody's row.
        for (const id of ["guest-1", "_guest-1"]) {
          const missing = getDoc(doc(authedDb("guest-1"),
            "guestEventStatuses", id));
          await assertFails(missing);
        }
        // A missing own row reads as missing, as the website expects.
        const absent = await assertSucceeds(getDoc(doc(authedDb("guest-1"),
          "guestEventStatuses", "event-9_guest-1")));
        assert.equal(absent.exists(), false);
      });
  });
});
