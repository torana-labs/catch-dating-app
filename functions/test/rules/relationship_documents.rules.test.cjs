// Firestore rules: relationship documents. Shared fixtures and the emulator lifecycle live
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
  eventParticipation,
  eventRuntimeClaimRequest,
  eventRuntimeParticipant,
  eventStaffGrant,
  getDoc,
  getDocs,
  it,
  limit,
  organizer,
  query,
  review,
  savedEvent,
  seed,
  serverTimestamp,
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

  describe("relationship documents", () => {
    it("keeps club host claims server-only", async () => {
      await seed(["organizerHostClaims", "host-1"], {
        uid: "host-1",
        organizerId: "club-1",
        createdAt: Timestamp.fromDate(new Date("2026-05-08T00:00:00.000Z")),
      });

      await assertFails(
        getDoc(doc(authedDb("host-1"), "organizerHostClaims", "host-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("host-1"), "organizerHostClaims", "host-1"), {
          uid: "host-1",
          organizerId: "club-2",
        }),
      );
    });

    it("scopes provider payment accounts to their owning host", async () => {
      await seed(["hostPaymentAccounts", "host-1_razorpay"], {
        userId: "host-1",
        provider: "razorpay",
      });
      await seed(["hostPaymentAccounts", "host-1_stripe"], {
        userId: "host-1",
        provider: "stripe",
      });
      await seed(["hostPaymentAccounts", "host-2_razorpay"], {
        userId: "host-2",
        provider: "razorpay",
      });

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "hostPaymentAccounts",
            "host-1_razorpay",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "hostPaymentAccounts"),
            where("userId", "==", "host-1"),
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-2"),
            "hostPaymentAccounts",
            "host-1_stripe",
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("host-2"), "hostPaymentAccounts"),
            where("userId", "==", "host-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("host-1"),
            "hostPaymentAccounts",
            "host-1_razorpay",
          ),
          {userId: "host-1", provider: "razorpay"},
        ),
      );
    });

    it("allows only participants and hosts to read event participation edges", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation(),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventParticipations", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-3"), "eventParticipations", "event-1_runner-1")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1"),
          eventParticipation(),
        ),
      );
    });

    it("allows users to query their own missing event participation edge", async () => {
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("runner-1"), "eventParticipations"),
            where("eventId", "==", "event-404"),
            where("uid", "==", "runner-1"),
          ),
        ),
      );
    });

    it("keeps operational attendee contacts host-only and server-written", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        displayName: "Asha Shah",
        phoneE164: "+919876543210",
        linkedUid: "runner-1",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendeeImports", "import-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uploadedBy: "host-1",
      });

      await assertSucceeds(
        getDocs(query(
          collection(authedDb("host-1"), "eventAttendees"),
          where("eventId", "==", "event-1"),
        )),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventAttendeeImports", "import-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventAttendees", "attendee-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventAttendeeImports", "import-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("host-1"), "eventAttendees", "attendee-2"), {
          eventId: "event-1",
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("host-1"), "eventAttendees", "attendee-1"), {
          accountabilityResolution: "departed",
          accountabilityResolvedForCheckInAt: Timestamp.now(),
        }),
      );
    });

    it("keeps the roster pointer index server-only", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventAttendeeIndex", "event-1_runner-1"], {
        eventId: "event-1",
        uid: "runner-1",
        attendeeId: "attendee-1",
      });
      for (const db of [authedDb("runner-1"), authedDb("host-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        const ref = doc(db, "eventAttendeeIndex", "event-1_runner-1");
        await assertFails(getDoc(ref));
        await assertFails(updateDoc(ref, {attendeeId: "attendee-2"}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(db, "eventAttendeeIndex", "event-1_runner-2"), {
          eventId: "event-1", uid: "runner-2", attendeeId: "attendee-2",
        }));
        await assertFails(getDocs(query(collection(db, "eventAttendeeIndex"),
          where("eventId", "==", "event-1"))));
      }
    });

    it("keeps Host roster intake sessions and receipts server-only", async () => {
      await seed(["hostRosterIntakeSessions", "session-1"], {
        draft: {hostUid: "host-1", eventId: "event-1"},
      });
      await seed([
        "hostRosterIntakeSessions", "session-1", "receipts", "apply",
      ], {importId: "import-1"});
      for (const db of [authedDb("host-1"), authedDb("runner-1"),
        testEnv.unauthenticatedContext().firestore()]) {
        await assertFails(getDoc(doc(db,
          "hostRosterIntakeSessions", "session-1")));
        await assertFails(getDoc(doc(db,
          "hostRosterIntakeSessions", "session-1", "receipts", "apply")));
        await assertFails(setDoc(doc(db,
          "hostRosterIntakeSessions", "session-2"), {eventId: "event-1"}));
      }
    });

    it("limits event staff to one event's live operational surfaces", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["events", "event-2"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        displayName: "Asha Shah",
        phoneE164: "+919876543210",
        linkedUid: "runner-1",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendees", "attendee-2"], {
        eventId: "event-2",
        organizerId: "club-1",
        displayName: "Bea Shah",
        phoneE164: "+919876543211",
        linkedUid: "runner-2",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendeeImports", "import-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uploadedBy: "host-1",
      });
      await seed(
        ["eventRuntimeClaimRequests", "event-1_runner-1"],
        eventRuntimeClaimRequest(),
      );
      await seed(
        ["eventStaffGrants", "event-1__operator-1"],
        eventStaffGrant(),
      );

      await assertSucceeds(getDocs(query(
        collection(authedDb("operator-1"), "eventAttendees"),
        where("eventId", "==", "event-1"),
      )));
      await assertSucceeds(getDocs(query(
        collection(authedDb("operator-1"), "eventRuntimeClaimRequests"),
        where("eventId", "==", "event-1"),
      )));
      await assertSucceeds(getDoc(doc(
        authedDb("operator-1"),
        "eventStaffGrants",
        "event-1__operator-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("operator-1"), "eventAttendees"),
        where("eventId", "==", "event-2"),
      )));
      await assertFails(getDoc(doc(
        authedDb("operator-1"),
        "eventAttendeeImports",
        "import-1",
      )));
      await assertFails(getDocs(collection(
        authedDb("operator-1"),
        "eventStaffGrants",
      )));
      await assertFails(setDoc(doc(
        authedDb("operator-1"),
        "eventStaffGrants",
        "event-2__operator-1",
      ), eventStaffGrant({eventId: "event-2"})));
    });

    it("lets an event's managers and roster staff list who is on the door", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["events", "event-2"], event());
      await seed(
        ["eventStaffGrants", "event-1__operator-1"],
        eventStaffGrant(),
      );
      const presence = (eventId, uid) => ({
        schemaVersion: 1,
        eventId,
        organizerId: "club-1",
        uid,
        displayName: "Kabir",
        role: "operator",
        lastSeenAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 120_000),
      });
      await seed(["eventStaffPresence", "event-1_operator-1"],
        presence("event-1", "operator-1"));
      await seed(["eventStaffPresence", "event-2_host-1"],
        presence("event-2", "host-1"));

      for (const uid of ["host-1", "operator-1"]) {
        await assertSucceeds(getDocs(query(
          collection(authedDb(uid), "eventStaffPresence"),
          where("eventId", "==", "event-1"),
        )));
      }
      await assertFails(getDocs(query(
        collection(authedDb("operator-1"), "eventStaffPresence"),
        where("eventId", "==", "event-2"),
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "eventStaffPresence"),
        where("eventId", "==", "event-1"),
      )));
      for (const uid of ["host-1", "operator-1"]) {
        await assertFails(setDoc(doc(authedDb(uid), "eventStaffPresence",
          `event-1_${uid}`), presence("event-1", uid)));
      }
    });

    it("fails closed for revoked, expired, and wrong-organizer staff grants", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        displayName: "Asha Shah",
        phoneE164: "+919876543210",
        linkedUid: "runner-1",
        source: "hostImport",
        status: "registered",
      });
      for (const [uid, overrides] of [
        ["revoked-operator", {status: "revoked"}],
        ["expired-operator", {
          expiresAt: Timestamp.fromDate(new Date("2020-08-12T10:00:00.000Z")),
        }],
        ["wrong-organizer", {organizerId: "club-2"}],
      ]) {
        await seed(
          ["eventStaffGrants", `event-1__${uid}`],
          eventStaffGrant({uid, ...overrides}),
        );
        await assertFails(getDocs(query(
          collection(authedDb(uid), "eventAttendees"),
          where("eventId", "==", "event-1"),
        )));
      }
    });

    it("keeps live operator positions server-only", async () => {
      const position = {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "host-1",
        role: "host",
        latitude: 19.076,
        longitude: 72.8777,
        accuracyMeters: 8,
        headingDegrees: 90,
        recordedAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await seed(["eventLivePositions", "event-1__host-1"], position);

      for (const uid of ["host-1", "operator-1", "runner-1"]) {
        await assertFails(getDoc(doc(
          authedDb(uid),
          "eventLivePositions",
          "event-1__host-1",
        )));
        await assertFails(setDoc(doc(
          authedDb(uid),
          "eventLivePositions",
          `event-1__${uid}`,
        ), {...position, uid}));
      }
    });

    it("keeps runtime identity owner-private and claim review host-only", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-1"],
        eventRuntimeParticipant(),
      );
      await seed(
        ["eventRuntimeClaimRequests", "event-1_runner-1"],
        eventRuntimeClaimRequest(),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "eventRuntimeParticipants",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "eventRuntimeParticipants",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("host-1"),
        "eventRuntimeParticipants",
        "event-1_runner-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "eventRuntimeParticipants"),
        where("eventId", "==", "event-1"),
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "eventRuntimeParticipants",
        "event-1_runner-1",
      ), eventRuntimeParticipant()));

      for (const collectionName of [
        "eventRuntimeDataRequests",
        "eventRuntimeDataRequestReceipts",
      ]) {
        await seed([collectionName, "runtime-data-1"], {
          eventId: "event-1",
          organizerId: "club-1",
          attendeeId: "attendee-1",
          uid: "runner-1",
        });
        for (const uid of ["runner-1", "host-1"]) {
          await assertFails(getDoc(doc(
            authedDb(uid), collectionName, "runtime-data-1",
          )));
          await assertFails(setDoc(doc(
            authedDb(uid), collectionName, "runtime-data-2",
          ), {eventId: "event-1", uid}));
        }
        await assertFails(getDocs(query(
          collection(authedDb("runner-1"), collectionName),
          where("eventId", "==", "event-1"),
        )));
      }

      await assertSucceeds(getDoc(doc(
        authedDb("host-1"),
        "eventRuntimeClaimRequests",
        "event-1_runner-1",
      )));
      await assertSucceeds(getDocs(query(
        collection(authedDb("host-1"), "eventRuntimeClaimRequests"),
        where("eventId", "==", "event-1"),
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "eventRuntimeClaimRequests",
        "event-1_runner-1",
      )));
      await assertFails(updateDoc(doc(
        authedDb("host-1"),
        "eventRuntimeClaimRequests",
        "event-1_runner-1",
      ), {status: "approved"}));
    });

    it("keeps Cross Paths consent private and callable-owned", async () => {
      const consent = {
        eventId: "event-1",
        uid: "runner-1",
        enabled: true,
        termsVersion: 1,
        consentedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        revokedAt: null,
        source: "event_detail",
      };
      await seed(
        ["eventCrossPathsConsents", "event-1_runner-1"],
        consent,
      );

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventCrossPathsConsents",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventCrossPathsConsents",
            "event-1_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("runner-2"), "eventCrossPathsConsents"),
            where("eventId", "==", "event-404"),
            where("uid", "==", "runner-2"),
            limit(1),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventCrossPathsConsents",
            "event-1_runner-1",
          ),
          consent,
        ),
      );
    });

    it("keeps Cross Paths invitations participant-only and callable-owned",
      async () => {
        const invitation = {
          eventId: "event-1",
          senderUid: "runner-1",
          recipientUid: "runner-2",
          participantIds: ["runner-1", "runner-2"],
          status: "pending",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
        };
        await seed(["crossPathsInvitations", "invitation-1"], invitation);

        await assertSucceeds(getDoc(doc(
          authedDb("runner-1"),
          "crossPathsInvitations",
          "invitation-1",
        )));
        await assertSucceeds(getDoc(doc(
          authedDb("runner-2"),
          "crossPathsInvitations",
          "invitation-1",
        )));
        await assertFails(getDoc(doc(
          authedDb("runner-3"),
          "crossPathsInvitations",
          "invitation-1",
        )));
        await assertSucceeds(getDocs(query(
          collection(authedDb("runner-1"), "crossPathsInvitations"),
          where("senderUid", "==", "runner-1"),
        )));
        await assertSucceeds(getDocs(query(
          collection(authedDb("runner-2"), "crossPathsInvitations"),
          where("recipientUid", "==", "runner-2"),
        )));
        await assertFails(setDoc(doc(
          authedDb("runner-1"),
          "crossPathsInvitations",
          "invitation-2",
        ), invitation));
        await assertFails(updateDoc(doc(
          authedDb("runner-2"),
          "crossPathsInvitations",
          "invitation-1",
        ), {status: "accepted"}));
      });

    it("keeps Cross Paths pair holds participant-only and server-owned",
      async () => {
        const hold = {
          eventId: "event-1",
          invitationId: "invitation-1",
          requesterUid: "runner-1",
          attendeeUid: "runner-2",
          participantIds: ["runner-1", "runner-2"],
          status: "active",
          expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
        };
        await seed(["crossPathsPairHolds", "hold-1"], hold);

        await assertSucceeds(getDoc(doc(
          authedDb("runner-1"),
          "crossPathsPairHolds",
          "hold-1",
        )));
        await assertSucceeds(getDoc(doc(
          authedDb("runner-2"),
          "crossPathsPairHolds",
          "hold-1",
        )));
        await assertFails(getDoc(doc(
          authedDb("runner-3"),
          "crossPathsPairHolds",
          "hold-1",
        )));
        await assertFails(getDocs(collection(
          authedDb("runner-1"),
          "crossPathsPairHolds",
        )));
        await assertFails(updateDoc(doc(
          authedDb("runner-1"),
          "crossPathsPairHolds",
          "hold-1",
        ), {status: "confirmed"}));
      });

    it("denies all client access to Cross Paths showcase eligibility", async () => {
      const eligibility = {
        status: "eligible",
        reasonCodes: [],
        ruleVersion: 1,
        reviewVersion: 1,
        profileFingerprint: "a".repeat(64),
        reviewChecklist: {
          primaryPortraitClear: true,
          profileRepresentsCurrentMember: true,
          showcasePolicyReviewed: true,
        },
        reviewNote: "Launch review complete.",
        reviewedByUid: "reviewer-1",
        reviewedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
      };
      await seed(
        ["crossPathsShowcaseEligibility", "runner-1"],
        eligibility,
      );

      await assertFails(
        getDoc(doc(
          authedDb("runner-1"),
          "crossPathsShowcaseEligibility",
          "runner-1",
        )),
      );
      await assertFails(
        getDocs(collection(
          authedDb("runner-1"),
          "crossPathsShowcaseEligibility",
        )),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "crossPathsShowcaseEligibility",
            "runner-1",
          ),
          eligibility,
        ),
      );
    });

    it("keeps Cross Paths suggestion exposures server-only", async () => {
      const exposure = {
        viewerUid: "runner-1",
        candidateUid: "runner-2",
        eventId: "event-1",
        sessionIdHash: "a".repeat(64),
        rankingVersion: 1,
        shownAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        expiresAt: Timestamp.fromDate(new Date("2026-05-31T10:00:00.000Z")),
      };
      await seed(["crossPathsSuggestionExposures", "exposure-1"], exposure);

      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "crossPathsSuggestionExposures",
        "exposure-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "crossPathsSuggestionExposures"),
        where("viewerUid", "==", "runner-1"),
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "crossPathsSuggestionExposures",
        "exposure-1",
      ), exposure));
    });

    it("keeps organizer follower delivery receipts server-only", async () => {
      await seed(["organizerPostDeliveryOperations", "post-1"], {
        organizerId: "organizer-1",
        postId: "post-1",
        authorUid: "host-1",
        status: "pending",
      });
      await seed(["organizerPostDeliveryRecipients", "receipt-1"], {
        organizerId: "organizer-1",
        postId: "post-1",
        activityStatus: "created",
        pushStatus: "accepted",
      });

      for (const collectionName of [
        "organizerPostDeliveryOperations",
        "organizerPostDeliveryRecipients",
      ]) {
        await assertFails(getDoc(doc(
          authedDb("host-1"),
          collectionName,
          collectionName.endsWith("Operations") ? "post-1" : "receipt-1",
        )));
        await assertFails(getDocs(collection(
          authedDb("host-1"),
          collectionName,
        )));
        await assertFails(setDoc(doc(
          authedDb("host-1"),
          collectionName,
          "new-receipt",
        ), {organizerId: "organizer-1", postId: "post-1"}));
      }
    });

    it("keeps event broadcast receipts and organizer summaries server-only", async () => {
      await seed(["eventBroadcasts", "broadcast-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        actorUid: "host-1",
        targetUids: ["runner-1"],
        deliveries: {hashed: {pushStatus: "accepted"}},
      });
      await seed(["organizerBroadcastSummaries", "broadcast-1"], {
        organizerId: "club-1",
        broadcastId: "broadcast-1",
        eventId: "event-1",
        recipientContactIds: ["contact-1"],
      });

      await assertFails(
        getDoc(doc(authedDb("host-1"), "eventBroadcasts", "broadcast-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventBroadcasts", "broadcast-1")),
      );
      await assertFails(
        getDocs(collection(authedDb("host-1"), "eventBroadcasts")),
      );
      await assertFails(getDoc(doc(
        authedDb("host-1"),
        "organizerBroadcastSummaries",
        "broadcast-1",
      )));
      await assertFails(getDocs(collection(
        authedDb("host-1"),
        "organizerBroadcastSummaries",
      )));
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventBroadcasts", "broadcast-2"),
          {eventId: "event-1"},
        ),
      );
      await assertFails(
        updateDoc(
          doc(authedDb("host-1"), "eventBroadcasts", "broadcast-1"),
          {status: "completed"},
        ),
      );
      await assertFails(
        deleteDoc(
          doc(authedDb("host-1"), "eventBroadcasts", "broadcast-1"),
        ),
      );
      await assertFails(setDoc(doc(
        authedDb("host-1"),
        "organizerBroadcastSummaries",
        "broadcast-2",
      ), {organizerId: "club-1"}));
    });

    it("keeps invite secrets, touches, share intents, and attribution server-only", async () => {
      const paths = [
        ["eventInviteLinkSecrets", "invite-1"],
        ["eventInviteTouches", "touch-1"],
        ["eventShareIntents", "intent-1"],
        ["eventInviteAttributions", "attribution-1"],
        ["eventAttendeeAttendanceReceipts", "receipt-1"],
        ["eventVenueSessions", "session-1"],
        ["eventVenueSessionRedemptions", "redemption-1"],
        ["organizerProviderConnections", "connection-1"],
        ["organizerCommunicationPermissionReceipts", "permission-1"],
        ["catchCommunicationPreferences", "runner-1"],
        ["participantFormProfileProposals", "response-1"],
        ["participantOrganizerCards", "response-1"],
        ["eventChatMessages", "message-1"],
        ["eventChatReactions", "reaction-1"],
        ["eventChatPresence", "presence-1"],
        ["eventChatProfileShares", "share-1"],
        ["eventChatRooms", "event-1"],
        ["eventChatMemberships", "member-1"],
        ["eventChatAccessReceipts", "receipt-1"],
        ["participantProfileClaimReceipts", "receipt-1"],
        ["catchCommunicationPermissionReceipts", "permission-1"],
        ["organizerContactOrigins", "origin-1"],
        ["organizerSavedAudiences", "audience-1"],
        ["organizerManualSendTasks", "task-1"],
        ["providerSyncRuns", "sync-1"],
        ["organizerApplicationForms", "form-1"],
        ["organizerApplicationFormVersions", "version-1"],
        ["organizerApplications", "application-1"],
        ["organizerApplicationResponses", "response-1"],
        ["organizerApplicationImportReceipts", "receipt-1"],
        ["participantIntakeProfiles", "profile-1"],
        ["participantOrganizerDataGrants", "grant-1"],
      ];
      for (const path of paths) {
        await seed(path, {eventId: "event-1", organizerId: "club-1"});
        for (const uid of ["host-1", "runner-1"]) {
          await assertFails(getDoc(doc(authedDb(uid), ...path)));
          await assertFails(setDoc(doc(authedDb(uid), ...path), {
            eventId: "event-1",
          }));
        }
        await assertFails(getDoc(doc(
          testEnv.unauthenticatedContext().firestore(),
          ...path,
        )));
      }
    });

    it("keeps approval notification contacts and authority server-only", async () => {
      for (const suffix of ["Preferences", "Receipts", "Settings", "Budgets", "Messages", "Dispatches"]) {
        const path = ["eventApprovalNotification" + suffix, "private-1"];
        await seed(path, {uid: "runner-1", organizerId: "club-1"});
        for (const db of [authedDb("host-1"), authedDb("runner-1"),
          testEnv.unauthenticatedContext().firestore()]) {
          await assertFails(getDoc(doc(db, ...path)));
          await assertFails(setDoc(doc(db, ...path), {enabled: true}));
        }
      }
    });

    it("keeps organizer communication preferences server-only", async () => {
      await seed(["organizerCommunicationPreferences", "club-1_runner-1"], {
        organizerId: "club-1",
        uid: "runner-1",
        phoneE164: "+919876543210",
        whatsapp: {status: "optedIn"},
        sms: {status: "unknown"},
      });

      for (const uid of ["host-1", "runner-1"]) {
        await assertFails(
          getDoc(doc(
            authedDb(uid),
            "organizerCommunicationPreferences",
            "club-1_runner-1",
          )),
        );
        await assertFails(
          getDocs(collection(
            authedDb(uid),
            "organizerCommunicationPreferences",
          )),
        );
      }
      await assertFails(
        getDoc(doc(
          testEnv.unauthenticatedContext().firestore(),
          "organizerCommunicationPreferences",
          "club-1_runner-1",
        )),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "organizerCommunicationPreferences",
            "club-1_runner-1",
          ),
          {organizerId: "club-1", uid: "runner-1"},
        ),
      );
      await assertFails(
        updateDoc(
          doc(
            authedDb("host-1"),
            "organizerCommunicationPreferences",
            "club-1_runner-1",
          ),
          {sms: {status: "optedIn"}},
        ),
      );
      await assertFails(
        deleteDoc(doc(
          authedDb("host-1"),
          "organizerCommunicationPreferences",
          "club-1_runner-1",
        )),
      );
    });

    for (const name of ["catchWhatsappOperatorSetupOperations",
      "catchWhatsappOperatorSetupAudits"]) {
      it(`keeps ${name} permanently server-only`, async () => {
        await seed([name, "synthetic-permanent-slot"], {
          schemaVersion: 1, syntheticReceipt: true,
        });
        const clients = [authedDb("operator", {adminOwner: true}),
          authedDb("support", {support: true}), authedDb("recipient"),
          authedDb("host-1"), testEnv.unauthenticatedContext().firestore()];
        for (const client of clients) {
          const ref = doc(client, name, "synthetic-permanent-slot");
          await assertFails(getDoc(ref));
          await assertFails(getDocs(collection(client, name)));
          await assertFails(setDoc(doc(client, name, "new-slot"),
            {schemaVersion: 1, syntheticReceipt: true}));
          await assertFails(setDoc(ref, {schemaVersion: 1, reset: true}));
          await assertFails(updateDoc(ref, {reset: true}));
          await assertFails(deleteDoc(ref));
        }
      });
    }

    it("keeps Catch WhatsApp webhook receipts server-only", async () => {
      await seed(["catchWhatsappWebhookEvents", "receipt-1"], {
        eventKind: "inbound", text: "private inbound message",
      });
      const clients = [authedDb("host-1"), authedDb("runner-1"),
        testEnv.unauthenticatedContext().firestore()];
      for (const client of clients) {
        const ref = doc(client, "catchWhatsappWebhookEvents", "receipt-1");
        await assertFails(getDoc(ref));
        await assertFails(getDocs(collection(client,
          "catchWhatsappWebhookEvents")));
        await assertFails(setDoc(ref, {text: "forged"}));
        await assertFails(updateDoc(ref, {text: "changed"}));
        await assertFails(deleteDoc(ref));
      }
    });

    it("keeps host analytics snapshots server-only", async () => {
      const snapshotId = `host-1_${"a".repeat(64)}`;
      await seed(["hostAnalyticsSnapshots", snapshotId], {
        uid: "host-1",
        scopeHash: "a".repeat(64),
        response: {},
        expiresAt: Timestamp.fromDate(new Date("2026-07-17T00:15:00.000Z")),
      });

      await assertFails(
        getDoc(doc(authedDb("host-1"), "hostAnalyticsSnapshots", snapshotId)),
      );
      await assertFails(
        getDocs(collection(authedDb("host-1"), "hostAnalyticsSnapshots")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "hostAnalyticsSnapshots", snapshotId),
          {uid: "host-1"},
        ),
      );
      await assertFails(
        deleteDoc(
          doc(authedDb("host-1"), "hostAnalyticsSnapshots", snapshotId),
        ),
      );
    });

    it("denies attendee-roster queries to unrelated authenticated users", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({uid: "runner-1", status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "waitlisted",
          signedUpAt: null,
          waitlistedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        }),
      );

      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-3"), "eventParticipations"),
            where("eventId", "==", "event-1"),
            where("status", "in", ["signedUp", "waitlisted", "attended"]),
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventParticipations"),
            where("eventId", "==", "event-1"),
            where("status", "in", ["signedUp", "waitlisted", "attended"]),
          ),
        ),
      );
    });

    it("keeps cancelled event participation edges private", async () => {
      await seed(["organizers", "club-1"], organizer());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "cancelled",
          signedUpAt: null,
          cancelledAt: Timestamp.fromDate(new Date("2026-05-01T11:00:00.000Z")),
        }),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-3"), "eventParticipations", "event-1_runner-1")),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-3"), "eventParticipations"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
    });

    it("lets users own saved-event edges with deterministic document ids", async () => {
      await seed(["events", "event-1"], event());

      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "savedEvents", "runner-1_event-1"),
          {
            uid: "runner-1",
            eventId: "event-1",
            savedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "savedEvents", "runner-2_event-1"),
          {
            uid: "runner-2",
            eventId: "event-1",
            savedAt: serverTimestamp(),
          },
        ),
      );

      await seed(["savedEvents", "runner-1_event-2"], savedEvent({eventId: "event-2"}));

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "savedEvents", "runner-1_event-2")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "savedEvents", "runner-1_event-2")),
      );
      await assertSucceeds(
        deleteDoc(doc(authedDb("runner-1"), "savedEvents", "runner-1_event-2")),
      );
      await seed(["savedEvents", "runner-1_event-3"], savedEvent({eventId: "event-3"}));
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "savedEvents", "runner-1_event-3"), {
          savedAt: serverTimestamp(),
        }),
      );
    });

    it("allows users to query their own missing saved-event edge", async () => {
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("runner-1"), "savedEvents"),
            where("uid", "==", "runner-1"),
            where("eventId", "==", "event-404"),
          ),
        ),
      );
    });
  });
});
