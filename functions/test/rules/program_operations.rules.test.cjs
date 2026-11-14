// Firestore rules: program operations. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
const {
  Timestamp,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  describe,
  doc,
  getDoc,
  getDocs,
  it,
  seed,
  setDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("program operations", () => {
    const serverOnlyCollections = [
      "organizerPrograms",
      "programFunctions",
      "programGuests",
      "programHouseholds",
      "programStaffInvites",
      "programPickupPoints",
      "programHotels",
      "programAlerts",
      "programGuestIds",
      "programHampers",
      "programPhotos",
      "programWhatsappEndpointIndex",
      "programWhatsappThreads",
      "programWhatsappMessages",
      "programWhatsappReplyOperations",
      "programWhatsappCannedReplies",
      "programAssistantSettings",
      "programVendorBills",
      "programAssistantRuns",
      "programAssistantBudgets",
      "programTravelLegs",
      "programTravelParties",
      "transportVendors",
      "transportTrips",
      "transportActiveAssignments",
      "transportVehicleAssignments",
      "transportOperationReceipts",
    ];

    function programStaffGrant(overrides = {}) {
      const now = Timestamp.fromDate(new Date("2026-09-22T10:00:00.000Z"));
      return {
        organizerId: "club-1",
        programId: "program-1",
        uid: "greeter-1",
        displayName: "Priya",
        phoneLastFour: "3210",
        duties: [
          {duty: "airportGreeter", pickupPointIds: ["pickup-1"], hotelIds: []},
        ],
        status: "active",
        createdBy: "host-1",
        createdAt: now,
        expiresAt: Timestamp.fromDate(new Date("2030-09-22T10:00:00.000Z")),
        revokedBy: null,
        revokedAt: null,
        updatedAt: now,
        revision: 1,
        ...overrides,
      };
    }

    it("denies every direct read and write on program operational data", async () => {
      await seed(
        ["programStaffGrants", "program-1__greeter-1"],
        programStaffGrant(),
      );
      for (const name of serverOnlyCollections) {
        await assertFails(getDoc(doc(authedDb("greeter-1"), name, "doc-1")));
        await assertFails(getDocs(collection(authedDb("greeter-1"), name)));
        await assertFails(setDoc(
          doc(authedDb("greeter-1"), name, "doc-1"),
          {programId: "program-1"},
        ));
        await assertFails(getDoc(doc(
          testEnv.unauthenticatedContext().firestore(),
          name,
          "doc-1",
        )));
      }
    });

    it("lets staff read only their own grant by derived id", async () => {
      await seed(
        ["programStaffGrants", "program-1__greeter-1"],
        programStaffGrant(),
      );
      await assertSucceeds(getDoc(doc(
        authedDb("greeter-1"),
        "programStaffGrants",
        "program-1__greeter-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("greeter-1"),
        "programStaffGrants",
        "program-2__greeter-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("greeter-2"),
        "programStaffGrants",
        "program-1__greeter-1",
      )));
      await assertFails(getDocs(collection(
        authedDb("greeter-1"),
        "programStaffGrants",
      )));
      await assertFails(setDoc(
        doc(authedDb("greeter-1"), "programStaffGrants", "program-1__greeter-1"),
        programStaffGrant({status: "revoked"}),
      ));
    });
  });
});
