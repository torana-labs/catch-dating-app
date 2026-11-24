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
  seedEventStaffGrant,
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
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant());
      await assertSucceeds(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant({status: "revoked"}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant({expiresAt: Timestamp.fromMillis(1)}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seed(["deletedUsers", "host-1"], {});
      await assertFails(getDoc(doc(authedDb("host-1"), "events", "event-1")));
    });

    it("only the organizer's team and the event's staff get a published event", async () => {
      // Issue #1666: the canonical event carries gender and cohort counts,
      // a hidden price and internal fields, so guests read publicEvents.
      const anonymous = testEnv.unauthenticatedContext().firestore();
      await seed(["organizers", "club-1"], organizer({hostUserIds: ["cohost-1"]}));
      await seed(["organizerTeamMemberships", "club-1_team-1"],
        {organizerId: "club-1", uid: "team-1", role: "staff", status: "active"});
      await seed(["organizerTeamMemberships", "club-1_former-1"],
        {organizerId: "club-1", uid: "former-1", role: "staff", status: "removed"});
      await seed(["events", "event-1"], event({genderCounts: {man: 3, woman: 1},
        priceHiddenUntilBookingOpens: true, priceInPaise: 50000}));
      await seed(["events", "private"], event({publicationState: "private"}));
      const {publicationState: _omitted, ...unlabelled} = event();
      await seed(["events", "unlabelled"], unlabelled);
      await seed(["events", "malformed"], event({publicationState: null}));

      for (const db of [anonymous, authedDb("guest-1"), authedDb("foreign-host"),
        authedDb("former-1"), authedDb("operator-1")]) {
        await assertFails(getDoc(doc(db, "events", "event-1")));
      }
      for (const uid of ["host-1", "cohost-1", "team-1"]) {
        await assertSucceeds(getDoc(doc(authedDb(uid), "events", "event-1")));
      }
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant({permissions: ["setAttendance"]}));
      await assertSucceeds(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant({status: "revoked"}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      await seedEventStaffGrant("event-1__operator-1", eventStaffGrant({organizerId: "other-club"}));
      await assertFails(getDoc(doc(authedDb("operator-1"), "events", "event-1")));
      for (const id of ["private", "unlabelled", "malformed"]) {
        await assertFails(getDoc(doc(anonymous, "events", id)));
      }
      await seed(["deletedUsers", "host-1"], {});
      await assertFails(getDoc(doc(authedDb("host-1"), "events", "event-1")));
    });

    it("lists events only for one organizer the reader manages", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["organizers", "club-2"], organizer({hostUserId: "foreign-host"}));
      await seed(["events", "published"], event());
      await seed(["events", "link-only"], event({listing: "link"}));
      await seed(["events", "private"], event({publicationState: "private"}));
      await seed(["events", "foreign"], event({organizerId: "club-2"}));
      const {publicationState: _omitted, ...unlabelled} = event();
      await seed(["events", "unlabelled"], unlabelled);
      const published = (db, organizerId) => query(collection(db, "events"),
        where("organizerId", "==", organizerId),
        where("publicationState", "==", "published"));
      for (const db of [testEnv.unauthenticatedContext().firestore(),
        authedDb("guest-1"), authedDb("host-1"), authedDb("foreign-host")]) {
        await assertFails(getDocs(collection(db, "events")));
        await assertFails(getDocs(query(collection(db, "events"),
          where("publicationState", "==", "published"))));
        await assertFails(getDocs(query(collection(db, "events"),
          where("publicationState", "==", "published"), where("listing", "==", "link"))));
        await assertFails(getDocs(query(collection(db, "events"),
          where("organizerId", "==", "club-1"))));
        await assertFails(getDocs(query(collection(db, "events"),
          where("publicationState", "==", "private"))));
      }
      for (const db of [testEnv.unauthenticatedContext().firestore(), authedDb("guest-1"),
        authedDb("foreign-host")]) {
        await assertFails(getDocs(published(db, "club-1")));
      }
      // The Host app's own query shape (Catch Host 1.0.5) keeps working,
      // link-only events included.
      const owned = await assertSucceeds(getDocs(published(authedDb("host-1"), "club-1")));
      assert.deepEqual(owned.docs.map((row) => row.id).sort(), ["link-only", "published"]);
      await assertSucceeds(getDocs(query(collection(authedDb("host-1"), "events"),
        where("organizerId", "==", "club-1"), where("publicationState", "==", "published"),
        where("status", "==", "active"), orderBy("startTime"), limit(10))));
      await assertSucceeds(getDocs(published(authedDb("foreign-host"), "club-2")));
      // Event rehearsal in Catch Host 1.0.5 asks for its own organizer with
      // an "in" filter; naming another organizer too is denied.
      await assertSucceeds(getDocs(query(collection(authedDb("host-1"), "events"),
        where("publicationState", "==", "published"), where("organizerId", "in", ["club-1"]),
        orderBy("startTime"), limit(10))));
      await assertFails(getDocs(query(collection(authedDb("host-1"), "events"),
        where("publicationState", "==", "published"),
        where("organizerId", "in", ["club-1", "club-2"]))));
    });

    it("anyone gets a public event copy by id, and lists only listed ones", async () => {
      const anonymous = testEnv.unauthenticatedContext().firestore();
      const copy = (overrides = {}) => ({...event(), listing: "listed", ...overrides});
      await seed(["publicEvents", "listed"], copy());
      await seed(["publicEvents", "link-only"], copy({listing: "link"}));
      for (const db of [anonymous, authedDb("guest-1")]) {
        // A link-only event still opens for people with its link.
        await assertSucceeds(getDoc(doc(db, "publicEvents", "link-only")));
        await assertSucceeds(getDoc(doc(db, "publicEvents", "listed")));
        await assertFails(getDocs(collection(db, "publicEvents")));
        await assertFails(getDocs(query(collection(db, "publicEvents"),
          where("publicationState", "==", "published"))));
        await assertFails(getDocs(query(collection(db, "publicEvents"),
          where("listing", "==", "link"))));
        const listed = await assertSucceeds(getDocs(query(collection(db, "publicEvents"),
          where("listing", "==", "listed"))));
        assert.deepEqual(listed.docs.map((row) => row.id), ["listed"]);
        await assertSucceeds(getDocs(query(collection(db, "publicEvents"),
          where("listing", "==", "listed"), where("organizerId", "==", "club-1"),
          where("publicationState", "==", "published"))));
      }
      await assertFails(setDoc(doc(authedDb("host-1"), "publicEvents", "listed"), copy()));
      await assertFails(updateDoc(doc(authedDb("host-1"), "publicEvents", "listed"),
        {bookedCount: 1}));
      await assertFails(deleteDoc(doc(authedDb("host-1"), "publicEvents", "listed")));
      await assertFails(setDoc(doc(anonymous, "publicEvents", "new"), copy()));
    });

    it("the copy a guest reads carries no gender counts and no hidden price or counts", async () => {
      // The rules test builds the copy with the Functions projection the
      // events trigger runs, so what anonymous readers get is the real thing.
      const {projectPublicEvent} = require("../../lib/events/publicEventProjection");
      const anonymous = testEnv.unauthenticatedContext().firestore();
      await seed(["organizers", "club-1"], organizer());
      const canonical = event({genderCounts: {man: 3, woman: 1},
        cohortCounts: {menInterestedInWomen: 3}, waitlistedCohortCounts: {womenInterestedInMen: 1},
        crossPathsPairHeldCount: 1, priceInPaise: 50000, priceHiddenUntilBookingOpens: true,
        publicRegistrationEnabled: false, showGuestList: false, bookedCount: 4,
        checkedInCount: 2, waitlistedCount: 1, adminSearch: {tokens: ["sunset"]}});
      await seed(["events", "event-1"], canonical);
      await seed(["publicEvents", "event-1"], projectPublicEvent(canonical));
      await assertFails(getDoc(doc(anonymous, "events", "event-1")));
      const read = (await assertSucceeds(getDoc(doc(anonymous, "publicEvents", "event-1")))).data();
      for (const field of ["genderCounts", "cohortCounts", "waitlistedCohortCounts",
        "crossPathsPairHeldCount", "priceInPaise", "checkedInCount", "waitlistedCount",
        "adminSearch"]) {
        assert.equal(field in read, false, field);
      }
      assert.equal(read.priceHiddenUntilBookingOpens, true);
      assert.equal(read.listing, "listed");
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

    it("denies every client write to the trigger-owned organizerSummary", async () => {
      const summary = {
        name: "Sandbar Run Club", location: "mumbai", area: "Bandra",
        hostName: null, tags: [], rating: 0, synthetic: false,
        appVisibility: "discoverable", status: "active", archived: false,
      };
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event({organizerSummary: summary}));
      const hostRef = doc(authedDb("host-1"), "events", "event-1");
      const guestRef = doc(authedDb("runner-1"), "events", "event-1");

      // The organizer's hosts read it, guests read publicEvents; nobody may
      // change it.
      await assertSucceeds(getDoc(hostRef));
      await assertFails(getDoc(guestRef));
      await assertFails(updateDoc(hostRef, {organizerSummary: {...summary, appVisibility: "hidden"}}));
      await assertFails(updateDoc(guestRef, {"organizerSummary.rating": 5}));
      await assertFails(updateDoc(hostRef, {organizerSummary: null}));
      await assertFails(setDoc(doc(authedDb("host-1"), "events", "event-new"), event({organizerSummary: summary})));
      await assertFails(setDoc(hostRef, event({organizerSummary: summary})));
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
