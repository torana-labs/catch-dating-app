// Firestore rules: eventGuestProfiles is a guest's dating profile as the other
// guests of one event see it (#2493, FIX-8, owner decision OQ-1). A reader
// gets a copy only while both their booking and the subject's are signedUp or
// attended; organisers, strangers and blocked guests never do. Shared
// fixtures and the emulator lifecycle live in rulesHarness.cjs.
const {
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

const copy = {
  eventId: "event-1",
  uid: "runner-1",
  name: "Asha",
  age: 28,
  gender: "woman",
  religion: "hindu",
  relationshipGoal: "longTerm",
  profilePrompts: [],
  profilePhotos: [],
  activityPreferences: {},
};

async function seedEvent({subject = "attended", reader = "attended"} = {}) {
  await seed(["organizers", "club-1"], organizer());
  await seed(["events", "event-1"], event());
  await seed(["eventBookings", "event-1_runner-1"],
    eventParticipation({status: subject}));
  await seed(["eventBookings", "event-1_runner-2"],
    eventParticipation({uid: "runner-2", status: reader}));
  await seed(["eventGuestProfiles", "event-1__runner-1"], copy);
}

const read = (uid) => getDoc(doc(authedDb(uid), "eventGuestProfiles",
  "event-1__runner-1"));

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("eventGuestProfiles", () => {
    it("lets a co-guest read a guest's event profile", async () => {
      await seedEvent();
      await assertSucceeds(read("runner-2"));
      await seed(["eventBookings", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "signedUp"}));
      await assertSucceeds(read("runner-2"));
    });

    it("denies the organiser, strangers and signed-out visitors", async () => {
      await seedEvent();
      // host-1 manages the event; runner-3 has no booking.
      for (const reader of ["host-1", "runner-3"]) {
        await assertFails(read(reader));
      }
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "eventGuestProfiles", "event-1__runner-1")));
    });

    it("stops the moment either booking leaves the event", async () => {
      await seedEvent({reader: "cancelled"});
      await assertFails(read("runner-2"));
      await seedEvent({subject: "cancelled"});
      await assertFails(read("runner-2"));
      await seedEvent({reader: "waitlisted"});
      await assertFails(read("runner-2"));
    });

    it("denies a co-guest either side blocked", async () => {
      await seedEvent();
      await seed(["blocks", "runner-1__runner-2"],
        {blockerUserId: "runner-1", blockedUserId: "runner-2"});
      await assertFails(read("runner-2"));
    });

    it("denies a copy whose id names someone else", async () => {
      await seedEvent();
      await seed(["eventGuestProfiles", "event-1__runner-9"], copy);
      await assertFails(getDoc(doc(authedDb("runner-2"),
        "eventGuestProfiles", "event-1__runner-9")));
    });

    it("never lists and never takes a client write", async () => {
      await seedEvent();
      await assertFails(getDocs(query(collection(authedDb("runner-2"),
        "eventGuestProfiles"), where("eventId", "==", "event-1"))));
      await assertFails(setDoc(doc(authedDb("runner-1"),
        "eventGuestProfiles", "event-1__runner-1"), copy));
    });
  });
});
