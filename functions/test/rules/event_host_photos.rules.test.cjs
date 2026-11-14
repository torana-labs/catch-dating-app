// Firestore rules: event host photos. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
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
  updateDoc,
  useRulesEnvironment,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("event host photos", () => {
    const photoId = "event-1_hostPhoto0000000001";

    function hostPhoto(overrides = {}) {
      return {
        eventId: "event-1",
        organizerId: "club-1",
        photoId: "hostPhoto0000000001",
        displayStoragePath: "events/event-1/hostPhotos/hostPhoto0000000001/display.jpg",
        thumbnailStoragePath: "events/event-1/hostPhotos/hostPhoto0000000001/thumbnail.jpg",
        width: 2048,
        height: 1536,
        sizeBytes: 412000,
        uploadedByUid: "host-1",
        createdAtMillis: 1800000000000,
        ...overrides,
      };
    }

    async function seedHostPhotoEvent() {
      await seed(["organizers", "club-1"], organizer({
        ownerUserId: "host-1",
        hostUserIds: ["host-1", "manager-1"],
      }));
      await seed(["events", "event-1"], event());
      await seed(["eventHostPhotos", photoId], hostPhoto());
      await seed(["eventParticipations", "event-1_attended-1"], {
        eventId: "event-1", uid: "attended-1", status: "attended",
      });
      await seed(["eventParticipations", "event-1_booked-1"], {
        eventId: "event-1", uid: "booked-1", status: "signedUp",
      });
      await seed(["eventParticipations", "event-1_waitlisted-1"], {
        eventId: "event-1", uid: "waitlisted-1", status: "waitlisted",
      });
      await seed(["eventRuntimeParticipants", "event-1_door-1"], {
        eventId: "event-1", uid: "door-1", accessStatus: "ready",
        eventAttendeeId: "attendee-1",
      });
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1", linkedUid: "door-1", status: "checkedIn",
      });
      await seed(["eventRuntimeParticipants", "event-1_door-2"], {
        eventId: "event-1", uid: "door-2", accessStatus: "ready",
        eventAttendeeId: "attendee-2",
      });
      await seed(["eventAttendees", "attendee-2"], {
        eventId: "event-1", linkedUid: "door-2", status: "expected",
      });
    }

    it("lets checked-in guests and the host team read an event's photos", async () => {
      await seedHostPhotoEvent();

      for (const uid of ["host-1", "manager-1", "attended-1", "door-1"]) {
        await assertSucceeds(getDoc(doc(authedDb(uid), "eventHostPhotos", photoId)));
        await assertSucceeds(getDocs(query(
          collection(authedDb(uid), "eventHostPhotos"),
          where("eventId", "==", "event-1"),
        )));
      }
    });

    it("denies guests who did not check in, strangers and signed-out readers", async () => {
      await seedHostPhotoEvent();

      for (const uid of ["booked-1", "waitlisted-1", "door-2", "stranger-1"]) {
        await assertFails(getDoc(doc(authedDb(uid), "eventHostPhotos", photoId)));
        await assertFails(getDocs(query(
          collection(authedDb(uid), "eventHostPhotos"),
          where("eventId", "==", "event-1"),
        )));
      }
      await assertFails(getDoc(doc(
        testEnv.unauthenticatedContext().firestore(),
        "eventHostPhotos",
        photoId,
      )));
    });

    it("denies a checked-in guest of another event", async () => {
      await seedHostPhotoEvent();
      await seed(["events", "event-2"], event());
      await seed(["eventParticipations", "event-2_other-1"], {
        eventId: "event-2", uid: "other-1", status: "attended",
      });

      await assertFails(getDoc(doc(authedDb("other-1"), "eventHostPhotos", photoId)));
      await assertFails(getDocs(collection(authedDb("attended-1"), "eventHostPhotos")));
    });

    it("keeps every client write behind the callables, hosts included", async () => {
      await seedHostPhotoEvent();

      for (const uid of ["host-1", "manager-1", "attended-1"]) {
        const db = authedDb(uid);
        await assertFails(setDoc(
          doc(db, "eventHostPhotos", "event-1_hostPhoto0000000002"),
          hostPhoto({photoId: "hostPhoto0000000002", uploadedByUid: uid}),
        ));
        await assertFails(updateDoc(doc(db, "eventHostPhotos", photoId), {width: 10}));
        await assertFails(deleteDoc(doc(db, "eventHostPhotos", photoId)));
      }
    });
  });
});
