// Firestore rules: clubs. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  authedDb,
  deleteDoc,
  describe,
  doc,
  increment,
  it,
  organizer,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

describe("firestore.rules", () => {
  useRulesEnvironment();

  describe("clubs", () => {
    it("denies direct club creates because creation is callable-owned", async () => {
      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubs", "club-1"), organizer()),
      );
    });

    it("denies direct host profile edits because updates are callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        updateDoc(doc(authedDb("host-1"), "clubs", "club-1"), {
          description: "Updated city loops.",
          tags: ["easy"],
          instagramHandle: "@sunsetstriders",
        }),
      );
    });

    it("rejects the older incomplete Club schema", async () => {
      const legacyOrganizer = {
        name: "Legacy Club",
        description: "Old shape.",
        location: "mumbai",
        hostUserId: "host-1",
        createdAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
        imageUrl: null,
        rating: 0,
        reviewCount: 0,
      };

      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubs", "club-legacy"), legacyOrganizer),
      );
    });

    it("denies direct member joins because membership is callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects member updates that tamper with club profile fields", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            hostName: "Mallory",
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member count repairs", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member leaves because membership is callable-owned", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects members changing aggregate membership count", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          organizer({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies joining via direct aggregate updates", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "clubs", "club-1"), {
          memberCount: increment(1),
        }),
      );
    });

    it("denies leaving via direct aggregate updates", async () => {
      await seed(
        ["organizers", "club-1"],
        organizer({
          memberCount: 3,
        }),
      );

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "clubs", "club-1"), {
          memberCount: increment(-1),
        }),
      );
    });

    it("denies direct club deletes", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        deleteDoc(doc(authedDb("host-1"), "clubs", "club-1")),
      );
    });
  });
});
