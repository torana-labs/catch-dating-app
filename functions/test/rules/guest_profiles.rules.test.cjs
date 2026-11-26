// Firestore rules: guestProfiles holds a guest's full dating profile,
// sensitive answers included (#2493, FIX-8). Only the matching-feed callables
// read it, with the admin SDK; no client may, not even the guest. Shared
// fixtures and the emulator lifecycle live in rulesHarness.cjs.
const {
  assertFails,
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

const profile = {
  name: "Asha",
  age: 28,
  gender: "woman",
  religion: "hindu",
  relationshipGoal: "longTerm",
  drinking: "socially",
  smoking: "never",
  children: "wantSomeday",
  profilePrompts: [],
  profilePhotos: [],
  activityPreferences: {},
};

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("guestProfiles", () => {
    it("lets no organiser, co-guest, stranger or the guest read it",
      async () => {
        await seed(["organizers", "club-1"], organizer());
        await seed(["events", "event-1"], event());
        await seed(["eventBookings", "event-1_runner-1"],
          eventParticipation());
        await seed(["eventBookings", "event-1_runner-2"],
          eventParticipation({uid: "runner-2"}));
        await seed(["guestProfiles", "runner-1"], profile);

        // host-1 manages the event; runner-2 shares it; runner-3 is a
        // stranger; runner-1 is the guest.
        for (const reader of ["host-1", "runner-2", "runner-3", "runner-1"]) {
          await assertFails(getDoc(doc(authedDb(reader),
            "guestProfiles", "runner-1")));
          await assertFails(getDocs(query(collection(authedDb(reader),
            "guestProfiles"), where("name", "==", "Asha"))));
          await assertFails(setDoc(doc(authedDb(reader),
            "guestProfiles", "runner-1"), profile));
        }
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
          .firestore(), "guestProfiles", "runner-1")));
      });
  });
});
