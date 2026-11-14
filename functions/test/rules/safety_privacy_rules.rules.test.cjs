// Firestore rules: safety privacy rules. Shared fixtures and the emulator lifecycle live
// in rulesHarness.cjs.
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
  match,
  orderBy,
  query,
  seed,
  setDoc,
  useRulesEnvironment,
  userProfile,
  where,
} = require("./rulesHarness.cjs");

let testEnv;

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("safety privacy rules", () => {
    it("keeps private profiles owner-only while public profiles remain readable", async () => {
      await seed(["users", "target-1"], userProfile({name: "Target"}));
      await seed(["publicProfiles", "target-1"], {name: "Target"});

      await assertSucceeds(getDoc(doc(authedDb("target-1"), "users", "target-1")));
      await assertFails(getDoc(doc(authedDb("viewer-1"), "users", "target-1")));
      await assertSucceeds(
        getDoc(doc(authedDb("viewer-1"), "publicProfiles", "target-1")),
      );
    });

    it("denies profile reads after either user blocks the other", async () => {
      await seed(["users", "target-1"], {name: "Target"});
      await seed(["publicProfiles", "target-1"], {name: "Target"});
      await seed(["blocks", "target-1__viewer-1"], {
        blockerUserId: "target-1",
        blockedUserId: "viewer-1",
      });

      await assertFails(getDoc(doc(authedDb("viewer-1"), "users", "target-1")));
      await assertFails(
        getDoc(doc(authedDb("viewer-1"), "publicProfiles", "target-1")),
      );
    });

    it("denies reads for deleted private and public profiles", async () => {
      await seed(["users", "target-1"], {name: "Target"});
      await seed(["publicProfiles", "target-1"], {name: "Target"});
      await seed(["deletedUsers", "target-1"], {
        uid: "target-1",
        deletedAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      });

      await assertFails(getDoc(doc(authedDb("viewer-1"), "users", "target-1")));
      await assertFails(
        getDoc(doc(authedDb("viewer-1"), "publicProfiles", "target-1")),
      );
    });

    it("allows users to read only block edges involving themselves", async () => {
      await seed(["blocks", "user-1__user-2"], {
        blockerUserId: "user-1",
        blockedUserId: "user-2",
      });

      await assertSucceeds(
        getDoc(doc(authedDb("user-1"), "blocks", "user-1__user-2")),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("user-2"), "blocks", "user-1__user-2")),
      );
      await assertFails(
        getDoc(doc(authedDb("user-3"), "blocks", "user-1__user-2")),
      );
    });

    it("keeps reports, deletion tombstones, and event receipts server-owned", async () => {
      await seed(["reports", "report-1"], {reportedUserId: "target-1"});
      await seed(["deletedUsers", "target-1"], {uid: "target-1"});
      await seed(["functionEventReceipts", "event-1"], {
        handler: "onMessageCreated",
      });

      await assertFails(getDoc(doc(authedDb("user-1"), "reports", "report-1")));
      await assertFails(
        setDoc(doc(authedDb("user-1"), "reports", "report-2"), {
          reportedUserId: "target-1",
        }),
      );
      await assertFails(
        getDoc(doc(authedDb("target-1"), "deletedUsers", "target-1")),
      );
      await assertFails(
        deleteDoc(doc(authedDb("target-1"), "deletedUsers", "target-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("user-1"), "functionEventReceipts", "event-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("user-1"), "functionEventReceipts", "event-2"), {
          handler: "onMessageCreated",
        }),
      );
    });

    it("keeps event-service messages private to trusted workers", async () => {
      for (const collectionName of ["eventAssistanceMessages",
        "eventAssistanceOperationalNoticeQuotas",
        "eventAssistanceOperationalNoticePublications",
        "eventAssistanceSettings", "eventAssistanceSettingReceipts",
        "eventAssistanceRuntimeConfigs", "eventAssistanceRuntimeConfigReceipts",
        "eventAssistanceParticipationReceipts", "eventAssistanceStaffReceipts",
        "eventAssistanceAccountabilityReceipts",
        "eventAssistanceMemberships", "eventAssistanceMembershipReceipts",
        "eventAssistanceGroupProgress", "eventAssistanceProgressReceipts",
        "eventAssistanceDepartureRosters",
        "eventAssistanceCheckpoints", "eventAssistanceCheckpointReceipts",
        "eventAssistanceGuests", "eventAssistanceThreads",
        "eventAssistanceGuestGrants", "eventAssistanceCases",
        "eventAssistanceCaseReceipts", "eventAssistanceDeliveryRepairs",
        "eventAssistanceRcsCallbacks", "eventAssistanceRcsCallbackIdentities",
        "eventAssistanceRcsSubscriptions",
        "eventAssistanceRcsBudgets", "eventAssistanceRcsDispatches",
        "eventAssistanceRcsCallbackReceipts",
        "eventAssistanceRcsSenders", "eventAssistanceRcsPermissions",
        "eventAssistanceRcsConsentReceipts", "eventAssistanceRcsWithdrawalGrants",
        "eventAssistanceSmsSenders", "eventAssistanceSmsPermissions",
        "eventAssistanceSmsBudgets", "eventAssistanceSmsDispatches",
        "eventAssistanceSmsConsentReceipts",
        "eventAssistanceSmsWithdrawalGrants",
        "eventAssistanceWhatsappWithdrawalGrants",
        "eventAssistanceWhatsappReplyBindings",
        "eventAssistanceWhatsappPolicies",
        "eventAssistanceWhatsappBudgets",
        "eventAssistanceWhatsappDispatches",
        "organizerWhatsappEndpointStops",

        "eventAssistanceWhatsappPermissions",
        "eventAssistanceWhatsappConsentReceipts"]) {
        await seed([collectionName, "record-1"], {schemaVersion: 1});
        for (const client of [testEnv.unauthenticatedContext().firestore(),
          authedDb("host-1"), authedDb("admin-1", {admin: true})]) {
          const reference = doc(client, collectionName, "record-1");
          await assertFails(getDoc(reference));
          await assertFails(setDoc(reference, {schemaVersion: 1}));
          await assertFails(deleteDoc(reference));
        }
      }
    });

    it("keeps attendance closeout decisions callable-only", async () => {
      for (const collectionName of ["eventAttendanceDispositions",
        "eventAttendanceDispositionReceipts"]) {
        await seed([collectionName, "record-1"], {revision: 1});
        for (const client of [testEnv.unauthenticatedContext().firestore(),
          authedDb("host-1"), authedDb("guest-1"),
          authedDb("admin-1", {admin: true})]) {
          const reference = doc(client, collectionName, "record-1");
          await assertFails(getDoc(reference));
          await assertFails(setDoc(reference, {revision: 2}));
          await assertFails(deleteDoc(reference));
        }
      }
    });

    it("keeps durable operations records server-owned", async () => {
      const collections = [
        "operationRuns",
        "operationWorkItems",
        "operationActionReceipts",
        "operationLeases",
        "adminActionExecutions",
        "adminInboxItems",
        "adminInboxJourney",
        "adminPeopleIndex",
        "eventMessagingBudgetDecisions",
        "eventMessagingBudgetDecisionReceipts",
        "eventMessagingBudgetApplicationReceipts",
        "supplyIntakeRequests",
        "supplyIntakeUsage",
      ];
      for (const collectionName of collections) {
        await seed([collectionName, "record-1"], {schemaVersion: 1});
        const reference = doc(
          authedDb("user-1"),
          collectionName,
          "record-1",
        );
        await assertFails(getDoc(reference));
        await assertFails(setDoc(reference, {schemaVersion: 1}));
      }
    });

    it("keeps all dress rehearsal collections callable-only", async () => {
      const collections = [
        "eventRehearsals",
        "eventRehearsalActors",
        "eventRehearsalActions",
        "eventRehearsalGuestViews",
        "eventRehearsalMessages",
        "eventRehearsalMovements",
        "eventRehearsalRouteDecisions",
        "eventRehearsalCases",
      ];
      for (const collectionName of collections) {
        await seed([collectionName, "practice-1"], {sessionId: "practice-1"});
        const reference = doc(
          authedDb("host-1", {admin: true}),
          collectionName,
          "practice-1",
        );
        await assertFails(getDoc(reference));
        await assertFails(setDoc(reference, {sessionId: "practice-1"}));
      }
    });

    it("hides blocked matches from participants", async () => {
      await seed(["matches", "match-1"], {
        user1Id: "user-1",
        user2Id: "user-2",
        participantIds: ["user-1", "user-2"],
        status: "blocked",
      });

      await assertFails(getDoc(doc(authedDb("user-1"), "matches", "match-1")));
    });

    it("allows participants to query their active matches by user fields", async () => {
      await seed(["matches", "match-1"], {
        user1Id: "user-1",
        user2Id: "user-2",
        participantIds: ["user-1", "user-2"],
        status: "active",
        createdAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      });

      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("user-1"), "matches"),
            where("user1Id", "==", "user-1"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("user-2"), "matches"),
            where("user2Id", "==", "user-2"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("user-3"), "matches"),
            where("user1Id", "==", "user-1"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
          ),
        ),
      );
    });
  });
});
