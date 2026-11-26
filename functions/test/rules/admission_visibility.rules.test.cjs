// Firestore rules: what an event's admission policy lets its organiser read
// about a guest beyond the card (#2493, FIX-19). The disclosure is readable
// by the event's organiser managers, one guest at a time, until it expires.
// No guest, stranger or other organiser reads it, and no client writes it.
// Shared fixtures and the emulator lifecycle live in rulesHarness.cjs.
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

function disclosure(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    format: "balancedSingles",
    fields: {gender: "woman"},
    grantKey: null,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("eventGuestDisclosures", () => {
    it("lets the event's organiser manager get a live disclosure", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventGuestDisclosures", "event-1__runner-1"],
        disclosure());

      await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "eventGuestDisclosures", "event-1__runner-1")));
    });

    it("refuses an expired disclosure, a grant-gated one and any list",
      async () => {
        await seed(["organizers", "club-1"], organizer());
        await seed(["events", "event-1"], event());
        await seed(["eventGuestDisclosures", "event-1__runner-1"],
          disclosure({expiresAt: Timestamp.fromDate(
            new Date("2026-01-01T00:00:00.000Z"))}));
        await seed(["eventGuestDisclosures", "event-1__runner-2"],
          disclosure({uid: "runner-2", grantKey: "share-1"}));

        await assertFails(getDoc(doc(authedDb("host-1"),
          "eventGuestDisclosures", "event-1__runner-1")));
        await assertFails(getDoc(doc(authedDb("host-1"),
          "eventGuestDisclosures", "event-1__runner-2")));
        await assertFails(getDocs(query(collection(authedDb("host-1"),
          "eventGuestDisclosures"), where("eventId", "==", "event-1"))));
      });

    it("lets no guest, stranger or other organiser read it, and no client " +
      "write it", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventGuestDisclosures", "event-1__runner-1"],
        disclosure());

      for (const reader of ["runner-1", "runner-2", "host-2"]) {
        await assertFails(getDoc(doc(authedDb(reader),
          "eventGuestDisclosures", "event-1__runner-1")));
      }
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "eventGuestDisclosures", "event-1__runner-1")));
      for (const writer of ["host-1", "runner-1"]) {
        await assertFails(setDoc(doc(authedDb(writer),
          "eventGuestDisclosures", "event-1__runner-3"),
        disclosure({uid: "runner-3"})));
        await assertFails(deleteDoc(doc(authedDb(writer),
          "eventGuestDisclosures", "event-1__runner-1")));
      }
    });
  });
});
