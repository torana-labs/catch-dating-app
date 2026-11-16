// Firestore rules: events. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  event,
  eventStaffGrant,
  externalEvent,
  getDoc,
  getDocs,
  it,
  limit,
  or,
  orderBy,
  organizer,
  query,
  seed,
  setDoc,
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("events", () => {
    it("protects private event reads by manager and active staff authority", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({publicationState: "private", setupRevision: 1}));
      const anonymous = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anonymous, "events", "event-1")));
      await assertFails(getDoc(doc(authedDb("foreign-host"), "events", "event-1")));
      await assertSucceeds(getDoc(doc(authedDb("host-1"), "events", "event-1")));
      await seed(["eventStaffGrants", "event-1__operator-1"], eventStaffGrant());
      await assertSucceeds(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seed(["eventStaffGrants", "event-1__operator-1"], eventStaffGrant({status: "revoked"}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seed(["eventStaffGrants", "event-1__operator-1"], eventStaffGrant({expiresAt: Timestamp.fromMillis(1)}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seed(["deletedUsers", "host-1"], {});
      await assertFails(getDoc(doc(authedDb("host-1"), "events", "event-1")));
    });

    it("direct reads allow published events and deny private or unlabelled ones", async () => {
      const anonymous = testEnv.unauthenticatedContext().firestore();
      await seed(["events", "published"], event());
      await seed(["events", "private"], event({publicationState: "private"}));
      const {publicationState: _omitted, ...unlabelled} = event();
      await seed(["events", "unlabelled"], unlabelled);
      await seed(["events", "malformed"], event({publicationState: null}));
      await assertSucceeds(getDoc(doc(anonymous, "events", "published")));
      for (const id of ["private", "unlabelled", "malformed"]) {
        await assertFails(getDoc(doc(anonymous, "events", id)));
      }
    });

    it("requires publication-constrained lists even for organizers", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "published"], event());
      await seed(["events", "private"], event({publicationState: "private"}));
      const {publicationState: _omitted, ...unlabelled} = event();
      await seed(["events", "unlabelled"], unlabelled);
      for (const db of [testEnv.unauthenticatedContext().firestore(),
        authedDb("guest-1"), authedDb("host-1"), authedDb("foreign-host")]) {
        await assertFails(getDocs(collection(db, "events")));
        await assertFails(getDocs(query(collection(db, "events"),
          where("organizerId", "==", "club-1"))));
        await assertFails(getDocs(query(collection(db, "events"),
          where("publicationState", "==", "private"))));
        const published = await assertSucceeds(getDocs(query(
          collection(db, "events"), where("publicationState", "==", "published"))));
        assert.deepEqual(published.docs.map((row) => row.id), ["published"]);
        const owned = await assertSucceeds(getDocs(query(collection(db, "events"),
          where("organizerId", "==", "club-1"), where("publicationState", "==", "published"))));
        assert.equal(owned.size, 1);
      }
    });

    it("private event cannot be bookmarked by guessing its ID", async () => {
      await seed(["events", "public"], event({publicationState: "published"}));
      await assertSucceeds(setDoc(doc(authedDb("guest-1"), "savedEvents", "guest-1_public"), {
        uid: "guest-1", eventId: "public", savedAt: Timestamp.now(),
      }));
      await seed(["events", "private"], event({publicationState: "private", setupRevision: 1}));
      await assertFails(setDoc(doc(authedDb("guest-1"), "savedEvents", "guest-1_private"), {
        uid: "guest-1", eventId: "private", savedAt: Timestamp.now(),
      }));
    });

    it("denies direct event creates because creation is callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());

      await assertFails(
        setDoc(doc(authedDb("host-1"), "events", "event-new"), event()),
      );
    });

    it("denies direct host event detail edits because updates are callable-owned", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());

      await assertFails(
        updateDoc(doc(authedDb("host-1"), "events", "event-1"), {
          startTime: Timestamp.fromDate(new Date("2026-05-02T02:00:00.000Z")),
          endTime: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
          meetingPoint: "Joggers Park gate",
          startingPointLat: 19.0701,
          startingPointLng: 72.8267,
          locationDetails: "Meet by the main entrance.",
          distanceKm: 6,
          pace: "moderate",
          description: "Updated route and timing.",
        }),
      );
    });

    it("denies hosts changing booking-sensitive or ownership event fields", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());

      const runRef = doc(authedDb("host-1"), "events", "event-1");

      await assertFails(updateDoc(runRef, {organizerId: "club-2"}));
      await assertFails(updateDoc(runRef, {capacityLimit: 50}));
      await assertFails(updateDoc(runRef, {priceInPaise: 10000}));
      await assertFails(updateDoc(runRef, {constraints: {gender: "woman"}}));
      await assertFails(updateDoc(runRef, {bookedCount: 1}));
      await assertFails(updateDoc(runRef, {waitlistedCount: 1}));
      await assertFails(updateDoc(runRef, {checkedInCount: 1}));
      await assertFails(updateDoc(runRef, {genderCounts: {woman: 1}}));
    });

    it("denies direct event aggregate rewrites because roster actions are callable-owned", async () => {
      await seed(["events", "event-1"], event());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "events", "event-1"),
          event({bookedCount: 1, waitlistedCount: 1}),
        ),
      );
    });

    it("denies direct event deletes", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());

      await assertFails(
        deleteDoc(doc(authedDb("host-1"), "events", "event-1")),
      );
    });

    it("allows only public active external event reads", async () => {
      await seed(["externalEvents", "external-public"], externalEvent({
        eventId: "external-public",
      }));
      await seed(["externalEvents", "external-draft"], externalEvent({
        eventId: "external-draft",
        publicationStatus: "draft",
      }));
      await seed(["externalEvents", "external-cancelled"], externalEvent({
        eventId: "external-cancelled",
        status: "cancelled",
      }));

      const db = authedDb("runner-1");
      await assertSucceeds(getDoc(doc(db, "externalEvents", "external-public")));
      await assertFails(getDoc(doc(db, "externalEvents", "external-draft")));
      await assertFails(getDoc(doc(db, "externalEvents", "external-cancelled")));
      await assertSucceeds(getDocs(query(
        collection(db, "externalEvents"),
        where("publicationStatus", "==", "public"),
        where("status", "==", "active"),
        orderBy("startTime"),
        limit(10),
      )));
      await assertFails(getDocs(query(
        collection(db, "externalEvents"),
        where("publicationStatus", "==", "draft"),
      )));
      await assertFails(
        setDoc(doc(db, "externalEvents", "external-new"), externalEvent({
          eventId: "external-new",
        })),
      );
      await assertFails(updateDoc(doc(db, "externalEvents", "external-public"), {
        title: "Client edit",
      }));
      await assertFails(deleteDoc(doc(db, "externalEvents", "external-public")));
    });

    it("lets a guest get an event's guest entry and only their own status", async () => {
      const entry = {schemaVersion: 1, eventId: "event-1", organizerId: "club-1",
        open: true, startAtMillis: 1, publicFormId: null,
        registration: {guest: "bookPaid", member: "bookPaid"}, updatedAtMillis: 1};
      const status = (uid) => ({schemaVersion: 1, eventId: "event-1", uid,
        organizerId: "club-1", booking: "registered", ambiguous: false,
        runtimeId: null, publicPaymentId: null, paymentRecoverable: false,
        offerPaymentId: null, offerGrantId: null, offerExpiresAtMillis: null,
        offerAdmissible: true, offerAmbiguous: false, applicationStatus: null,
        updatedAtMillis: 1});
      await seed(["eventGuestEntries", "event-1"], entry);
      await seed(["guestEventStatuses", "event-1_guest-1"], status("guest-1"));
      await seed(["guestEventStatuses", "event-1_guest-2"], status("guest-2"));
      const guest = authedDb("guest-1");
      await assertSucceeds(getDoc(doc(guest, "eventGuestEntries", "event-1")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "eventGuestEntries", "event-1")));
      await assertFails(getDocs(collection(guest, "eventGuestEntries")));
      await assertFails(setDoc(doc(guest, "eventGuestEntries", "event-1"), entry));
      await assertSucceeds(getDoc(doc(guest, "guestEventStatuses", "event-1_guest-1")));
      // A guest with no record of their own reads a missing row.
      await assertSucceeds(getDoc(doc(guest, "guestEventStatuses", "event-2_guest-1")));
      await assertFails(getDoc(doc(guest, "guestEventStatuses", "event-1_guest-2")));
      // The booking lists read the guest's own rows, never anyone else's.
      await assertSucceeds(getDocs(query(collection(guest, "guestEventStatuses"),
        where("uid", "==", "guest-1"))));
      await assertSucceeds(getDocs(query(collection(guest, "guestEventStatuses"),
        where("uid", "==", "guest-1"), where("participationStatus", "==", "signedUp"),
        orderBy("eventCard.startTimeMillis"))));
      await assertFails(getDocs(query(collection(guest, "guestEventStatuses"),
        where("uid", "==", "guest-2"))));
      await assertFails(getDocs(collection(guest, "guestEventStatuses")));
      await assertFails(setDoc(doc(guest, "guestEventStatuses", "event-1_guest-1"),
        status("guest-1")));
      await seed(["deletedUsers", "guest-1"], {deletedAt: Timestamp.now()});
      await assertFails(getDoc(doc(guest, "guestEventStatuses", "event-1_guest-1")));
      await assertFails(getDocs(query(collection(guest, "guestEventStatuses"),
        where("uid", "==", "guest-1"))));
    });
  });
});
