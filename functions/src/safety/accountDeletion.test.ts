import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {eventBroadcastDeliveryKey} from "../shared/eventBroadcasts";
import {deriveEventSeatPolicy} from
  "../events/seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash,
  seatVerifiedPhoneProofId} from "../events/seatIdentityAuthority";
import {deleteAccountEventParticipations} from "./accountDeletionSeats";
import {communityMembershipRows} from
  "../memberships/communityMembershipFixture";
import {
  requestAccountDeletionHandler,
  storagePathFromDownloadUrl,
} from "./accountDeletion";

test(
  "storagePathFromDownloadUrl extracts Firebase Storage object paths",
  () => {
    assert.equal(
      storagePathFromDownloadUrl(
        "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/" +
          "users%2Frunner-1%2Fphotos%2F0_123.jpg?alt=media&token=abc"
      ),
      "users/runner-1/photos/0_123.jpg"
    );
  }
);

test("storagePathFromDownloadUrl returns null for invalid urls", () => {
  assert.equal(storagePathFromDownloadUrl("not a url"), null);
});

test("Host-only deletion removes identity and preserves shared business data",
  async () => {
    const seed: Record<string, FakeDocumentData> = {
      "hostProfiles/host1": {displayName: "Private name", bio: "Private bio",
        avatarUrl: "https://firebasestorage.googleapis.com/v0/b/demo/o/" +
          "users%2Fhost1%2Favatar.jpg?alt=media"},
      "hostProfiles/host2": {displayName: "Other host"},
      "organizers/shared": {ownerUserId: "host1", hostUserId: "host1",
        hostName: "Private name", hostAvatarUrl: "private-avatar",
        hostUserIds: ["host1", "host2"], hostProfiles: [
          {uid: "host1", displayName: "Private name"},
          {uid: "host2", displayName: "Other host"},
        ], name: "Shared organizer", email: "business@example.com",
        status: "active"},
      "events/retained": {organizerId: "shared", title: "Shared event"},
    };
    const harness = createAccountDeletionHarness({seed, now: "now"});
    await requestAccountDeletionHandler({auth: {uid: "host1"}} as
      Parameters<typeof requestAccountDeletionHandler>[0], harness.deps);
    assert.ok(harness.deletedPublicDocs.includes("hostProfiles/host1"));
    assert.ok(!harness.deletedPublicDocs.includes("hostProfiles/host2"));
    assert.ok(harness.deletedStorageFiles.includes("users/host1/avatar.jpg"));
    const organizer = seed["organizers/shared"];
    assert.equal(organizer.ownerUserId, null);
    assert.equal(organizer.hostUserId, null);
    assert.equal(organizer.hostName, null);
    assert.equal(organizer.hostAvatarUrl, null);
    assert.deepEqual(organizer.hostUserIds, ["host2"]);
    assert.deepEqual(organizer.hostProfiles, [
      {uid: "host2", displayName: "Other host"},
    ]);
    assert.equal(organizer.name, "Shared organizer");
    assert.equal(organizer.email, "business@example.com");
    assert.equal(organizer.status, "active");
    assert.ok(!harness.deletedPublicDocs.includes("events/retained"));
    assert.deepEqual(harness.deletedAuthUsers, ["host1"]);
  });

test("Host deletion preserves foreign avatars and transferred ownership",
  async () => {
    const seed: Record<string, FakeDocumentData> = {
      "hostProfiles/host1": {avatarUrl:
        "https://firebasestorage.googleapis.com/v0/b/demo/o/" +
          "users%2Fhost2%2Favatar.jpg?alt=media"},
      "organizers/shared": {ownerUserId: "host1", hostUserId: "host2",
        hostName: "Other host", hostAvatarUrl: "other-avatar",
        hostUserIds: ["host1", "host2"], hostProfiles: [
          {uid: "host1", displayName: "Private name"},
          {uid: "host2", displayName: "Other host"},
        ]},
    };
    const harness = createAccountDeletionHarness({seed, now: "now",
      beforeTransaction: () => {
        seed["organizers/shared"].ownerUserId = "host2";
      }});
    await requestAccountDeletionHandler({auth: {uid: "host1"}} as
      Parameters<typeof requestAccountDeletionHandler>[0], harness.deps);
    assert.deepEqual(harness.deletedStorageFiles, []);
    assert.equal(seed["organizers/shared"].ownerUserId, "host2");
    assert.equal(seed["organizers/shared"].hostName, "Other host");
    assert.equal(seed["organizers/shared"].hostAvatarUrl, "other-avatar");
  });

test("requestAccountDeletionHandler anonymizes retained user doc", async () => {
  const now = {kind: "serverTimestamp"};
  const runnerDeliveryKey = eventBroadcastDeliveryKey("runner-1");
  const otherDeliveryKey = eventBroadcastDeliveryKey("runner-2");
  const subjectMemberships = {
    ...communityMembershipRows("club-1", "runner-1"),
    ...communityMembershipRows("club-2", "runner-1", "revoked"),
  };
  const otherMemberships = Object.fromEntries(Object.entries(
    communityMembershipRows("club-1", "runner-2")
  ).map(([key, row]) => [key, key.startsWith(
    "organizerCommunityMembershipDecisions/"
  ) ? {...row, actorUid: "runner-1"} : row]));
  const harness = createAccountDeletionHarness({
    seed: {
      ...subjectMemberships, ...otherMemberships,
      "users/runner-1": {
        profilePhotos: [{
          id: "grouped-photo",
          url:
            "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/" +
            "users%2Frunner-1%2Fphotos%2Fgrouped.jpg" +
            "?alt=media&token=abc",
          thumbnailUrl:
            "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/" +
            "users%2Frunner-1%2FphotoThumbnails%2Fgrouped.jpg" +
            "?alt=media&token=abc",
          storagePath: "users/runner-1/photos/grouped.jpg",
          thumbnailStoragePath:
            "users/runner-1/photoThumbnails/grouped.jpg",
          position: 0,
        }],
        name: "Asha Runner",
        dateOfBirth: admin.firestore.Timestamp.fromDate(
          new Date("1995-01-01T00:00:00.000Z")
        ),
        phoneNumber: "+919876543210",
        languages: ["english"],
        activityPreferences: {
          running: {
            paceMinSecsPerKm: 300,
            paceMaxSecsPerKm: 420,
            preferredDistances: ["tenK"],
            runningReasons: ["community"],
            preferredRunTimes: ["morning"],
            version: 1,
          },
        },
      },
      "organizerMemberships/club-1_runner-1": {
        organizerId: "club-1",
        uid: "runner-1",
        role: "member",
        status: "active",
        pushNotificationsEnabled: true,
      },
      "organizerFollows/club-1_runner-1": {
        organizerId: "club-1",
        uid: "runner-1",
        status: "active",
        pushNotificationsEnabled: true,
      },
      "organizerCommunicationPreferences/club-1_runner-1": {
        organizerId: "club-1",
        uid: "runner-1",
        whatsapp: {status: "optedIn"},
        sms: {status: "unknown"},
      },
      "organizerCommunicationPermissionReceipts/receipt-1": {
        organizerId: "club-1",
        uid: "runner-1",
        channel: "whatsapp",
      },
      "eventChatMessages/message-1": {uid: "runner-1", text: "Private"},
      "eventChatMessages/message-other": {uid: "runner-2", text: "Other"},
      "eventChatReactions/reaction-1": {uid: "runner-1"},
      "eventChatReactions/reaction-other": {uid: "runner-2"},
      "eventChatProfileShares/share-1": {uid: "runner-1"},
      "eventChatProfileShares/share-other": {uid: "runner-2"},
      "eventAssignmentFeatureConsents/consent-1": {uid: "runner-1"},
      "eventAssignmentFeatureConsents/consent-other": {uid: "runner-2"},
      "eventChatPresence/presence-1": {uid: "runner-1"},
      "eventChatPresence/presence-other": {uid: "runner-2"},
      "eventChatMemberships/member-1": {uid: "runner-1"},
      "eventChatMemberships/member-other": {uid: "runner-2"},
      "eventChatAccessReceipts/action-1": {uid: "runner-1"},
      "eventChatAccessReceipts/action-other": {uid: "runner-2"},
      "participantOrganizerCards/response-1": {uid: "runner-1"},
      "participantOrganizerCards/response-other": {uid: "runner-2"},
      "participantProfileClaimReceipts/receipt-1": {uid: "runner-1"},
      "participantProfileClaimReceipts/receipt-other": {uid: "runner-2"},
      "participantFormProfileProposals/response-1": {
        uid: "runner-1", organizerId: "club-1",
      },
      "participantFormProfileProposals/other-response": {
        uid: "runner-2", organizerId: "club-1",
      },
      "catchCommunicationPreferences/runner-1": {
        uid: "runner-1", whatsapp: {status: "optedIn"},
      },
      "catchCommunicationPermissionReceipts/catch-receipt-1": {
        uid: "runner-1", channel: "whatsapp", sourceOrganizerId: "club-1",
      },
      "organizerContactOrigins/origin-1": {
        organizerId: "club-1",
        actorUid: "runner-1",
      },
      "onboarding_drafts/runner-1": {
        firstName: "Asha",
        phoneNumber: "9876543210",
        countryCode: "+91",
        step: 1,
        draftVersion: 2,
      },
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        status: "signedUp",
        genderAtSignup: "woman",
      },
      "events/event-1": {organizerId: "club-1", bookedCount: 1},
      "eventAttendees/attendee-1": {
        eventId: "event-1",
        organizerId: "club-1",
        linkedUid: "runner-1",
        phoneE164: "+919876543210",
      },
      "organizerContacts/contact-1": {
        organizerId: "club-1",
        linkedUid: "runner-1",
        identityState: "verified",
      },
      "organizerContactEventEdges/attendee-1": {
        organizerId: "club-1",
        contactId: "contact-1",
        linkedUid: "runner-1",
      },
      "organizerContactIdentityLinks/evidence-uid": {
        organizerId: "club-1",
        contactId: "contact-1",
        kind: "uid",
        identityHash: "a".repeat(64),
      },
      "eventCrossPathsConsents/event-1_runner-1": {
        eventId: "event-1",
        uid: "runner-1",
        enabled: true,
        termsVersion: 1,
      },
      "crossPathsShowcaseEligibility/runner-1": {
        status: "eligible",
        profileFingerprint: "a".repeat(64),
      },
      "crossPathsSuggestionExposures/viewed": {
        viewerUid: "runner-1",
        candidateUid: "runner-2",
      },
      "crossPathsSuggestionExposures/shown": {
        viewerUid: "runner-2",
        candidateUid: "runner-1",
      },
      "crossPathsInvitations/invitation-1": {
        senderUid: "runner-2",
        recipientUid: "runner-1",
        participantIds: ["runner-2", "runner-1"],
      },
      "savedEvents/runner-1_run-1": {uid: "runner-1", eventId: "event-1"},
      "profileDecisions/runner-1/outgoing/runner-2": {
        swiperId: "runner-1",
        targetId: "runner-2",
      },
      "profileDecisions/runner-2/outgoing/runner-1": {
        swiperId: "runner-2",
        targetId: "runner-1",
      },
      "matches/match-1": {
        participantIds: ["runner-1", "runner-2"],
        user1Id: "runner-1",
        user2Id: "runner-2",
      },
      "reviews/event-1~runner-1": {reviewerUserId: "runner-1"},
      "payments/payment-1": {userId: "runner-1"},
      "notifications/runner-1/items/item-1": {uid: "runner-1"},
      "eventBroadcasts/authored": {
        actorUid: "runner-1",
        targetUids: ["runner-2"],
        deliveries: {},
      },
      "eventBroadcasts/targeted": {
        actorUid: "host-1",
        targetUids: ["runner-1", "runner-2"],
        deliveries: {
          [runnerDeliveryKey]: {
            activityStatus: "created",
            pushStatus: "accepted",
          },
          [otherDeliveryKey]: {
            activityStatus: "created",
            pushStatus: "ineligible",
          },
        },
      },
      "hostAnalyticsSnapshots/runner-1_cached": {
        uid: "runner-1",
        scopeHash: "cached",
      },
      "blocks/runner-1__runner-2": {
        blockerUserId: "runner-1",
        blockedUserId: "runner-2",
      },
      "reports/report-1": {
        reporterUserId: "runner-2",
        reportedUserId: "runner-1",
      },
    },
    now,
  });

  await requestAccountDeletionHandler(
    {auth: {uid: "runner-1"}} as Parameters<
      typeof requestAccountDeletionHandler
    >[0],
    harness.deps
  );

  const retainedUserWrite = harness.setWrites.find(
    (write) => write.path === "users/runner-1"
  );
  assert.ok(retainedUserWrite);
  assert.deepEqual(retainedUserWrite.options, {merge: true});

  const data = retainedUserWrite.data;
  assert.equal(data.deleted, true);
  assert.equal(data.deletedAt, now);
  assert.equal(data.name, "Deleted user");
  assert.equal(data.firstName, "");
  assert.equal(data.lastName, "");
  assert.equal(data.displayName, "Deleted user");
  assert.equal(
    (data.dateOfBirth as FirebaseFirestore.Timestamp).toMillis(),
    0
  );
  assert.equal(data.phoneNumber, "");
  assert.deepEqual(data.profilePhotos, []);
  assert.deepEqual(data.activityPreferences, {
    running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: [],
      runningReasons: [],
      preferredRunTimes: [],
      version: 1,
    },
  });

  for (const field of [
    "city",
    "height",
    "occupation",
    "company",
    "education",
    "religion",
    "relationshipGoal",
    "drinking",
    "smoking",
    "workout",
    "diet",
    "children",
    "paceMinSecsPerKm",
    "paceMaxSecsPerKm",
    "preferredDistances",
    "runningReasons",
    "preferredRunTimes",
    "runPreferencesVersion",
    "prefsShowInCrossPaths",
    "prefsCrossPathsInvitations",
    "fcmToken",
  ]) {
    assert.equal(hasOwn(data, field), true);
  }

  assert.ok(harness.deletedPublicDocs.includes("publicProfiles/runner-1"));
  assert.ok(
    harness.deletedPublicDocs.includes(
      "crossPathsShowcaseEligibility/runner-1"
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "organizerFollows/club-1_runner-1" &&
      write.data.status === "inactive"
    )
  );
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "organizers/club-1" &&
      write.data.followerCount !== undefined
    )
  );
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "organizerContacts/contact-1" &&
      write.data.linkedUid === null &&
      write.data.whatsappStatus === "unknown"
    )
  );
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "organizerContactEventEdges/attendee-1" &&
      write.data.linkedUid === null
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "organizerContactIdentityLinks/evidence-uid"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      `organizerContactIdentityClaims/ocic_${"a".repeat(48)}`
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "eventParticipations/event-1_runner-1" &&
      write.data.status === "deleted"
    )
  );
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "events/event-1" &&
      write.data.bookedCount !== undefined
    )
  );
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "eventAttendees/attendee-1" &&
      write.data.linkedUid === null &&
      write.data.linkedAt === null &&
      write.data.updatedAt === now
    )
  );
  for (const key of Object.keys(subjectMemberships)) {
    assert.ok(harness.deletedPublicDocs.includes(key));
  }
  for (const [key, value] of Object.entries(otherMemberships)) {
    assert.equal(harness.deletedPublicDocs.includes(key), false);
    assert.equal(
      harness.updateWrites.some((write) => write.path === key), false
    );
    assert.equal(harness.setWrites.some((write) => write.path === key), false);
    if (key.startsWith("organizerCommunityMembershipDecisions/")) {
      assert.equal(value.actorUid, "runner-1");
    }
  }
  assert.ok(
    harness.deletedPublicDocs.includes("savedEvents/runner-1_run-1")
  );
  assert.ok(
    harness.deletedPublicDocs.includes("onboarding_drafts/runner-1")
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "organizerCommunicationPreferences/club-1_runner-1"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "organizerCommunicationPermissionReceipts/receipt-1"
    )
  );
  assert.ok(harness.updateWrites.some((write) =>
    write.path === "eventChatMessages/message-1" && write.data.uid === null &&
    write.data.text === null && write.data.status === "removed"));
  assert.equal(harness.updateWrites.some((write) =>
    write.path === "eventChatMessages/message-other"), false);
  for (const path of ["eventChatProfileShares/share-1",
    "eventAssignmentFeatureConsents/consent-1",
    "eventChatReactions/reaction-1",
    "eventChatPresence/presence-1", "eventChatMemberships/member-1",
    "eventChatAccessReceipts/action-1", "participantOrganizerCards/response-1",
    "participantProfileClaimReceipts/receipt-1"]) {
    assert.ok(harness.deletedPublicDocs.includes(path));
  }
  for (const path of ["eventChatProfileShares/share-other",
    "eventAssignmentFeatureConsents/consent-other",
    "eventChatReactions/reaction-other",
    "eventChatPresence/presence-other", "eventChatMemberships/member-other",
    "eventChatAccessReceipts/action-other",
    "participantOrganizerCards/response-other",
    "participantProfileClaimReceipts/receipt-other"]) {
    assert.equal(harness.deletedPublicDocs.includes(path), false);
  }
  assert.ok(harness.deletedPublicDocs.includes(
    "participantFormProfileProposals/response-1"));
  assert.equal(harness.deletedPublicDocs.includes(
    "participantFormProfileProposals/other-response"), false);
  assert.ok(harness.deletedPublicDocs.includes(
    "catchCommunicationPreferences/runner-1"));
  assert.ok(harness.deletedPublicDocs.includes(
    "catchCommunicationPermissionReceipts/catch-receipt-1"));
  assert.ok(
    harness.updateWrites.some((write) =>
      write.path === "organizerContactOrigins/origin-1" &&
      write.data.actorUid === null
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "eventCrossPathsConsents/event-1_runner-1"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "crossPathsSuggestionExposures/viewed"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "crossPathsSuggestionExposures/shown"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "crossPathsInvitations/invitation-1"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "profileDecisions/runner-1/outgoing/runner-2"
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes(
      "profileDecisions/runner-2/outgoing/runner-1"
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "matches/match-1" &&
      write.data.status === "blocked"
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "reviews/event-1~runner-1" &&
      write.data.reviewerDeleted === true
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "payments/payment-1" &&
      write.data.userDeleted === true
    )
  );
  assert.ok(
    harness.deletedPublicDocs.includes("notifications/runner-1/items/item-1")
  );
  assert.ok(harness.deletedPublicDocs.includes("eventBroadcasts/authored"));
  assert.ok(
    harness.deletedPublicDocs.includes(
      "hostAnalyticsSnapshots/runner-1_cached"
    )
  );
  const targetedBroadcastUpdate = harness.updateWrites.find(
    (write) => write.path === "eventBroadcasts/targeted"
  );
  assert.ok(targetedBroadcastUpdate);
  assert.deepEqual(targetedBroadcastUpdate.data.targetUids, ["runner-2"]);
  assert.equal(
    hasOwn(
      targetedBroadcastUpdate.data.deliveries as FakeDocumentData,
      runnerDeliveryKey
    ),
    false
  );
  assert.equal(targetedBroadcastUpdate.data.recipientCount, 1);
  assert.equal(targetedBroadcastUpdate.data.activityAvailableCount, 1);
  assert.ok(
    harness.deletedPublicDocs.includes("blocks/runner-1__runner-2")
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "reports/report-1" &&
      write.data.hasDeletedUser === true
    )
  );
  assert.deepEqual(harness.deletedAuthUsers, ["runner-1"]);
  assert.deepEqual(harness.deletedStorageFiles, [
    "users/runner-1/photos/grouped.jpg",
    "users/runner-1/photoThumbnails/grouped.jpg",
  ]);
  assert.equal(harness.commits, 1);
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "deletedUsers/runner-1" &&
      write.data.status === "processing"
    )
  );
  assert.ok(
    harness.setWrites.some((write) =>
      write.path === "deletedUsers/runner-1" &&
      write.data.status === "completed"
    )
  );
});

test("requestAccountDeletionHandler rate limits before destructive work",
  async () => {
    const harness = createAccountDeletionHarness({
      seed: {
        "users/runner-1": {
          profilePhotos: [{
            id: "photo-1",
            url: "https://example.com/photo.jpg",
            thumbnailUrl: "https://example.com/thumb.jpg",
            storagePath: "users/runner-1/photos/0_123.jpg",
            thumbnailStoragePath: "users/runner-1/photoThumbnails/0_123.jpg",
            position: 0,
          }],
        },
      },
      now: {kind: "serverTimestamp"},
    });

    await assert.rejects(
      requestAccountDeletionHandler(
        {auth: {uid: "runner-1"}} as Parameters<
          typeof requestAccountDeletionHandler
        >[0],
        {
          ...harness.deps,
          checkRateLimit: async (_db, uid, action) => {
            assert.equal(uid, "runner-1");
            assert.equal(action, "requestAccountDeletion");
            throw new HttpsError(
              "resource-exhausted",
              "Too many account deletion requests."
            );
          },
        }
      ),
      (error) => error instanceof HttpsError &&
        error.code === "resource-exhausted"
    );

    assert.deepEqual(harness.setWrites, []);
    assert.deepEqual(harness.deletedPublicDocs, []);
    assert.deepEqual(harness.deletedAuthUsers, []);
    assert.deepEqual(harness.deletedStorageFiles, []);
    assert.equal(harness.commits, 0);
  }
);

test("requestAccountDeletionHandler short-circuits when already deleted",
  async () => {
    const harness = createAccountDeletionHarness({
      seed: {
        "deletedUsers/runner-1": {
          uid: "runner-1",
          retainedFor: ["safety", "payments", "fraud"],
        },
        "users/runner-1": {deleted: true},
        // A stale active membership must NOT be re-cleaned / re-decremented.
        "organizerMemberships/club-1_runner-1": {
          organizerId: "club-1",
          uid: "runner-1",
          status: "active",
        },
      },
      now: {kind: "serverTimestamp"},
    });

    const result = await requestAccountDeletionHandler(
      {auth: {uid: "runner-1"}} as Parameters<
        typeof requestAccountDeletionHandler
      >[0],
      harness.deps
    );

    assert.deepEqual(result, {deleted: true});
    // No cleanup re-ran: no batch commit, no membership/count rewrites.
    assert.equal(harness.commits, 0);
    assert.deepEqual(harness.setWrites, []);
    assert.deepEqual(harness.updateWrites, []);
    assert.deepEqual(harness.deletedPublicDocs, []);
    // The Auth user is still ensured-gone on the retry.
    assert.deepEqual(harness.deletedAuthUsers, ["runner-1"]);
  }
);

test("requestAccountDeletionHandler resumes a processing tombstone",
  async () => {
    const subjectMemberships = communityMembershipRows("club-1", "runner-1");
    const harness = createAccountDeletionHarness({
      seed: {
        ...subjectMemberships,
        "deletedUsers/runner-1": {
          uid: "runner-1",
          status: "processing",
          deletedAt: {kind: "oldTimestamp"},
        },
        "users/runner-1": {name: "Asha"},
      },
      now: {kind: "serverTimestamp"},
    });

    const result = await requestAccountDeletionHandler(
      {auth: {uid: "runner-1"}} as Parameters<
        typeof requestAccountDeletionHandler
      >[0],
      harness.deps
    );

    assert.deepEqual(result, {deleted: true});
    for (const key of Object.keys(subjectMemberships)) {
      assert.ok(harness.deletedPublicDocs.includes(key));
    }
    assert.equal(harness.commits, 1);
    assert.ok(
      harness.setWrites.some((write) =>
        write.path === "deletedUsers/runner-1" &&
        write.data.status === "completed"
      )
    );
  }
);

test("requestAccountDeletionHandler tolerates an already-removed Auth user",
  async () => {
    const harness = createAccountDeletionHarness({
      seed: {"users/runner-1": {}},
      now: {kind: "serverTimestamp"},
    });

    const result = await requestAccountDeletionHandler(
      {auth: {uid: "runner-1"}} as Parameters<
        typeof requestAccountDeletionHandler
      >[0],
      {
        ...harness.deps,
        auth: () => ({
          deleteUser: async () => {
            throw Object.assign(new Error("no user"), {
              code: "auth/user-not-found",
            });
          },
        }) as unknown as admin.auth.Auth,
      }
    );

    assert.deepEqual(result, {deleted: true});
    // The tombstone is still written so a later retry short-circuits.
    assert.ok(
      harness.setWrites.some((write) => write.path === "deletedUsers/runner-1")
    );
  }
);

type FakeDocumentData = Record<string, unknown>;

interface FakeDocumentReference {
  id: string;
  path: string;
  collectionPath: string;
  docId: string;
  ref: FakeDocumentReference;
  data: () => FakeDocumentData | undefined;
  get: () => Promise<{
    exists: boolean;
    data: () => FakeDocumentData | undefined;
  }>;
  set: (data: FakeDocumentData, options?: {merge: boolean}) => Promise<void>;
}

interface SetWrite {
  path: string;
  data: FakeDocumentData;
  options?: {merge: boolean};
}

interface UpdateWrite {
  path: string;
  data: FakeDocumentData;
}

function createAccountDeletionHarness(params: {
  seed: Record<string, FakeDocumentData>;
  now: unknown;
  beforeTransaction?: () => void;
}) {
  const setWrites: SetWrite[] = [];
  const updateWrites: UpdateWrite[] = [];
  const deletedPublicDocs: string[] = [];
  const deletedAuthUsers: string[] = [];
  const deletedStorageFiles: string[] = [];
  let commits = 0;
  const seed = params.seed;

  const docFor = (
    collectionPath: string,
    docId: string
  ): FakeDocumentReference => {
    const path = `${collectionPath}/${docId}`;
    const ref = {
      id: docId,
      path,
      collectionPath,
      docId,
      data: () => seed[path],
      get: async () => ({
        exists: seed[path] !== undefined,
        data: () => seed[path],
      }),
      set: async (data: FakeDocumentData, options?: {merge: boolean}) => {
        setWrites.push({path, data, options});
        seed[path] = options?.merge ? {...seed[path], ...data} : data;
      },
    } as FakeDocumentReference;
    ref.ref = ref;
    return ref;
  };

  const queryFor = (
    collectionPath: string,
    docs: FakeDocumentReference[] = allDocs(collectionPath)
  ) => ({
    where: (field: string, op: string, value: unknown) => {
      assert.ok(op === "==" || op === "array-contains");
      return queryFor(
        collectionPath,
        docs.filter((doc) => {
          const fieldValue = seed[doc.path]?.[field];
          if (op === "array-contains") {
            return Array.isArray(fieldValue) && fieldValue.includes(value);
          }
          return fieldValue === value;
        })
      );
    },
    get: async () => ({
      docs,
      forEach: (callback: (doc: FakeDocumentReference) => void) => {
        docs.forEach(callback);
      },
    }),
    limit: (count: number) => queryFor(collectionPath,
      docs.slice(0, count)),
  });

  const allDocs = (collectionPath: string): FakeDocumentReference[] =>
    Object.keys(seed)
      .filter((path) => path.startsWith(`${collectionPath}/`))
      .filter((path) => {
        const rest = path.substring(collectionPath.length + 1);
        return !rest.includes("/");
      })
      .map((path) => {
        const segments = path.split("/");
        return docFor(collectionPath, segments[segments.length - 1]);
      });

  const collectionGroupDocs = (collectionId: string): FakeDocumentReference[] =>
    Object.keys(seed)
      .filter((path) => {
        const segments = path.split("/");
        return segments.length >= 2 &&
          segments[segments.length - 2] === collectionId;
      })
      .map((path) => {
        const segments = path.split("/");
        return docFor(
          segments.slice(0, segments.length - 1).join("/"),
          segments[segments.length - 1]
        );
      });

  const firestore = {
    collection: (collectionPath: string) => ({
      doc: (docId: string) => ({
        ...docFor(collectionPath, docId),
        collection: (subcollectionPath: string) => queryFor(
          `${collectionPath}/${docId}/${subcollectionPath}`
        ),
      }),
      where: queryFor(collectionPath).where,
      get: queryFor(collectionPath).get,
    }),
    collectionGroup: (collectionId: string) =>
      queryFor(collectionId, collectionGroupDocs(collectionId)),
    runTransaction: async <T>(callback: (
      tx: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> => {
      params.beforeTransaction?.();
      const pending: Array<() => void> = [];
      const tx = {
        get: async (source: {get: () => Promise<unknown>}) => {
          assert.equal(pending.length, 0, "transaction reads precede writes");
          return source.get();
        },
        set: (ref: FakeDocumentReference, data: FakeDocumentData,
          options?: {merge: boolean}) => pending.push(() => {
          setWrites.push({path: ref.path, data, options});
          seed[ref.path] = options?.merge ? {...seed[ref.path], ...data} : data;
        }),
        update: (ref: FakeDocumentReference, data: FakeDocumentData) =>
          pending.push(() => {
            assert.ok(seed[ref.path]);
            updateWrites.push({path: ref.path, data});
            seed[ref.path] = {...seed[ref.path], ...data};
          }),
        create: (ref: FakeDocumentReference, data: FakeDocumentData) =>
          pending.push(() => {
            assert.equal(seed[ref.path], undefined);
            setWrites.push({path: ref.path, data});
            seed[ref.path] = data;
          }),
      } as unknown as FirebaseFirestore.Transaction;
      const result = await callback(tx);
      pending.forEach((write) => write());
      return result;
    },
    batch: () => ({
      set: (
        ref: FakeDocumentReference,
        data: FakeDocumentData,
        options?: {merge: boolean}
      ) => setWrites.push({path: ref.path, data, options}),
      update: (
        ref: FakeDocumentReference,
        data: FakeDocumentData
      ) => updateWrites.push({path: ref.path, data}),
      delete: (ref: FakeDocumentReference) => deletedPublicDocs.push(ref.path),
      commit: async () => {
        commits += 1;
      },
    }),
  } as unknown as FirebaseFirestore.Firestore;

  const auth = {
    deleteUser: async (uid: string) => {
      deletedAuthUsers.push(uid);
    },
  } as unknown as admin.auth.Auth;

  const storageBucket = {
    file: (path: string) => ({
      delete: async () => {
        deletedStorageFiles.push(path);
      },
    }),
  } as unknown as ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

  return {
    deps: {
      auth: () => auth,
      firestore: () => firestore,
      storageBucket: () => storageBucket,
      serverTimestamp: () => params.now as FirebaseFirestore.FieldValue,
    },
    setWrites,
    updateWrites,
    deletedPublicDocs,
    deletedAuthUsers,
    deletedStorageFiles,
    rows: seed,
    get commits() {
      return commits;
    },
  };
}

function hasOwn(data: FakeDocumentData, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field);
}

function seatReservationPath(key: string): string {
  const id = createHash("sha256").update(["event1", key]
    .join("\u001f")).digest("hex");
  return `eventSeatReservations/${id}`;
}

function readySeatSeed(options: {host?: boolean; catchMirror?: boolean;
  status?: "signedUp" | "attended"} = {}): Record<string, FakeDocumentData> {
  const uid = "runner1";
  const key = "canonical_runner1";
  const event = {organizerId: "org1", status: "active",
    capacityLimit: 5, constraints: {}, bookedCount: 1,
    genderCounts: {woman: 1}, checkedInCount: options.status === "attended" ?
      1 : 0, waitlistedCount: 0};
  const policy = deriveEventSeatPolicy(event);
  const seed: Record<string, FakeDocumentData> = {
    "events/event1": event,
    "eventParticipations/event1_runner1": {eventId: "event1",
      organizerId: "org1", uid,
      status: options.status ?? "signedUp", genderAtSignup: "woman"},
    "eventSeatMigrationFences/event1": {eventId: "event1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event1": {eventId: "event1", capacity: 5,
      occupied: 1, revision: 1, capacityRevision: 1,
      policyVersion: policy.policyVersion, policyHash: policy.policyHash,
      migrationRevision: 1, state: "ready"},
    [seatReservationPath(key)]: {eventId: "event1", canonicalKey: key,
      identityRevision: 1, active: true, revision: 1,
      reservedAtMillis: 100, releasedAtMillis: null},
    [`eventSeatIdentityAliases/${seatIdentityAliasId("event1",
      "uid", uid)}`]: {eventId: "event1", organizerId: "org1",
      kind: "uid", valueHash: seatIdentityValueHash("uid", uid),
      canonicalKey: key, identityRevision: 1,
      migrationRevision: 1, state: "ready"},
    [`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId("event1",
      uid)}`]: {eventId: "event1", organizerId: "org1", uid,
      phoneE164: null, migrationRevision: 1, state: "current"},
  };
  const source = options.host ? "hostImport" : "catchBooking";
  if (options.host || options.catchMirror) {
    seed["eventAttendees/att1"] = {eventId: "event1",
      organizerId: "org1", source, status: "registered", linkedUid: uid,
      phoneE164: null, externalReference: null};
    seed[`eventSeatIdentityAliases/${seatIdentityAliasId("event1",
      "attendee", "att1")}`] = {eventId: "event1", organizerId: "org1",
      kind: "attendee", valueHash: seatIdentityValueHash("attendee",
        "att1"), canonicalKey: key, identityRevision: 1,
      migrationRevision: 1, state: "ready"};
  }
  return seed;
}

test("ready account deletion releases the last seat exactly once", async () => {
  const h = createAccountDeletionHarness({seed: readySeatSeed({
    catchMirror: true, status: "attended"}), now: {kind: "serverTimestamp"}});
  const command = {db: h.deps.firestore(), uid: "runner1",
    now: admin.firestore.FieldValue.serverTimestamp(),
    nowMillis: 1000};
  await deleteAccountEventParticipations(command);
  assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 0);
  assert.equal(h.rows["eventSeatLedgers/event1"].revision, 2);
  assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
    false);
  assert.equal(h.rows["events/event1"].bookedCount, 0);
  assert.equal(h.rows["events/event1"].checkedInCount, 0);
  assert.equal(h.rows["eventAttendees/att1"].status, "cancelled");
  assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
    "event1", "uid", "runner1")}`].state, "retired");
  assert.equal(h.rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
    "event1", "runner1")}`].state, "revoked");
  assert.equal(h.rows["eventParticipations/event1_runner1"].status,
    "deleted");
  assert.equal(Object.keys(h.rows).filter((path) =>
    path.startsWith("eventSeatRequestReceipts/")).length, 1);
  await deleteAccountEventParticipations(command);
  assert.equal(h.rows["eventSeatLedgers/event1"].revision, 2);
  assert.equal(Object.keys(h.rows).filter((path) =>
    path.startsWith("eventSeatRequestReceipts/")).length, 1);
});

test("deletion retains an independently imported occupied Host seat",
  async () => {
    const h = createAccountDeletionHarness({seed: readySeatSeed({host: true}),
      now: {kind: "serverTimestamp"}});
    await requestAccountDeletionHandler({auth: {uid: "runner1"}} as
      Parameters<typeof requestAccountDeletionHandler>[0], h.deps);
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
    assert.equal(h.rows["eventSeatLedgers/event1"].revision, 1);
    assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
      true);
    assert.equal(h.rows["events/event1"].bookedCount, 1);
    assert.equal(h.rows["eventAttendees/att1"].status, "registered");
    assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event1", "uid", "runner1")}`].state, "retired");
    assert.equal(h.updateWrites.some((row) =>
      row.path === "eventAttendees/att1" && row.data.linkedUid === null),
    true);
  });

test("attendee-only Host seat unlinks within the ready transaction",
  async () => {
    const seed = readySeatSeed({host: true});
    delete seed["eventParticipations/event1_runner1"];
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}});
    const command = {db: h.deps.firestore(), uid: "runner1",
      now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000};
    await deleteAccountEventParticipations(command);
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
    assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
      true);
    assert.equal(h.rows["eventAttendees/att1"].linkedUid, null);
    assert.equal(h.rows["eventAttendees/att1"].status, "registered");
    assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event1", "uid", "runner1")}`].state, "retired");
    await deleteAccountEventParticipations(command);
    assert.equal(h.rows["eventSeatLedgers/event1"].revision, 1);
  });

test("an independent checked-in Host row retains its event check-in",
  async () => {
    const seed = readySeatSeed({host: true, status: "attended"});
    seed["eventAttendees/att1"].status = "checkedIn";
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}});
    await deleteAccountEventParticipations({db: h.deps.firestore(),
      uid: "runner1", now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000});
    assert.equal(h.rows["events/event1"].checkedInCount, 1);
    assert.equal(h.rows["eventAttendees/att1"].status, "checkedIn");
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
  });

test("a Host link created after discovery is included in the seat decision",
  async () => {
    const seed = readySeatSeed();
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}, beforeTransaction: () => {
        seed["eventAttendees/att1"] = {eventId: "event1",
          organizerId: "org1", source: "hostImport", status: "registered",
          linkedUid: "runner1", phoneE164: null,
          externalReference: null};
        seed[`eventSeatIdentityAliases/${seatIdentityAliasId(
          "event1", "attendee", "att1")}`] = {eventId: "event1",
          organizerId: "org1", kind: "attendee",
          valueHash: seatIdentityValueHash("attendee", "att1"),
          canonicalKey: "canonical_runner1", identityRevision: 1,
          migrationRevision: 1, state: "ready"};
      }});
    await deleteAccountEventParticipations({db: h.deps.firestore(),
      uid: "runner1", now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000});
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
    assert.equal(h.rows["eventAttendees/att1"].linkedUid, null);
  });

test("deletion releases only the Catch seat beside an imported guest",
  async () => {
    const seed = readySeatSeed();
    seed["eventSeatLedgers/event1"].occupied = 2;
    seed["eventAttendees/guest2"] = {eventId: "event1",
      organizerId: "org1", source: "hostImport", status: "registered",
      linkedUid: null};
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}});
    await deleteAccountEventParticipations({db: h.deps.firestore(),
      uid: "runner1", now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000});
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
    assert.equal(h.rows["events/event1"].bookedCount, 1);
    assert.equal(h.rows["eventAttendees/guest2"].status, "registered");
    assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
      false);
  });

test("locked migration and unresolved UID deny deletion without seat writes",
  async () => {
    for (const broken of ["locked", "missingAlias"]) {
      const seed = readySeatSeed();
      if (broken === "locked") {
        seed["eventSeatMigrationFences/event1"].state = "locked";
      } else {
        delete seed[`eventSeatIdentityAliases/${seatIdentityAliasId(
          "event1", "uid", "runner1")}`];
      }
      const h = createAccountDeletionHarness({seed,
        now: {kind: "serverTimestamp"}});
      await assert.rejects(deleteAccountEventParticipations({
        db: h.deps.firestore(), uid: "runner1",
        now: admin.firestore.FieldValue.serverTimestamp(),
        nowMillis: 1000}));
      assert.equal(h.rows["eventParticipations/event1_runner1"].status,
        "signedUp");
      assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
      assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
        true);
    }
  });

test("a linked Host attendee on another canonical seat blocks deletion",
  async () => {
    const seed = readySeatSeed({host: true});
    const alias = seed[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event1", "attendee", "att1")}`];
    alias.canonicalKey = "another_seat";
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}});
    await assert.rejects(deleteAccountEventParticipations({
      db: h.deps.firestore(), uid: "runner1",
      now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000}), /reconcile identity/u);
    assert.equal(h.rows["eventParticipations/event1_runner1"].status,
      "signedUp");
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
  });

test("a participation changed after query is reread before any release",
  async () => {
    const seed = readySeatSeed();
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}, beforeTransaction: () => {
        seed["eventParticipations/event1_runner1"].status = "deleted";
      }});
    await assert.rejects(deleteAccountEventParticipations({
      db: h.deps.firestore(),
      uid: "runner1",
      now: admin.firestore.FieldValue.serverTimestamp(),
      nowMillis: 1000}), /still owns an active seat/u);
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 1);
    assert.equal(h.rows[seatReservationPath("canonical_runner1")].active,
      true);
    assert.equal(h.updateWrites.length, 0);
  });

test("retained Host seats reject corrupt ledger or reservation before unlink",
  async () => {
    for (const field of ["zeroOccupied", "wrongEvent", "badRevision"]) {
      const seed = readySeatSeed({host: true});
      if (field === "zeroOccupied") {
        seed["eventSeatLedgers/event1"].occupied = 0;
      } else if (field === "wrongEvent") {
        seed[seatReservationPath("canonical_runner1")].eventId = "foreign";
      } else {
        seed[seatReservationPath("canonical_runner1")].revision = 0;
      }
      const h = createAccountDeletionHarness({seed,
        now: {kind: "serverTimestamp"}});
      await assert.rejects(deleteAccountEventParticipations({
        db: h.deps.firestore(), uid: "runner1",
        now: h.deps.serverTimestamp(), nowMillis: 1000}));
      assert.deepEqual(h.updateWrites, []);
      assert.deepEqual(h.setWrites, []);
    }
  });

test("account deletion preserves checkout identity before or after deletion",
  async () => {
    for (const status of ["cancelled", "deleted", "noParticipation"]) {
      const seed = readySeatSeed();
      if (status === "noParticipation") {
        delete seed["eventParticipations/event1_runner1"];
      } else {
        seed["eventParticipations/event1_runner1"].status = status;
      }
      seed["eventSeatLedgers/event1"] = {
        ...seed["eventSeatLedgers/event1"], occupied: 0, checkoutHeld: 1};
      seed[seatReservationPath("canonical_runner1")] = {
        ...seed[seatReservationPath("canonical_runner1")], active: false,
        checkoutHold: {paymentId: "payment-one", expiresAtMillis: 900100}};
      const h = createAccountDeletionHarness({seed,
        now: {kind: "serverTimestamp"}});
      await assert.rejects(deleteAccountEventParticipations({
        db: h.deps.firestore(), uid: "runner1",
        now: admin.firestore.FieldValue.serverTimestamp(), nowMillis: 1000}),
      /payment reconciliation/u);
      assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
        "event1", "uid", "runner1")}`].state, "ready");
      assert.equal(h.rows["eventSeatLedgers/event1"].checkoutHeld, 1);
    }
  });


test("payment-only identity is revoked after hold release", async () => {
  const seed = readySeatSeed();
  delete seed["eventParticipations/event1_runner1"];
  seed["eventSeatLedgers/event1"] = {...seed["eventSeatLedgers/event1"],
    occupied: 0, checkoutHeld: 0};
  seed[seatReservationPath("canonical_runner1")] = {
    ...seed[seatReservationPath("canonical_runner1")], active: false,
    releasedAtMillis: 1000};
  const h = createAccountDeletionHarness({seed,
    now: {kind: "serverTimestamp"}});
  const command = {db: h.deps.firestore(), uid: "runner1",
    now: admin.firestore.FieldValue.serverTimestamp(), nowMillis: 1001};
  await deleteAccountEventParticipations(command);
  await deleteAccountEventParticipations(command);
  assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
    "event1", "uid", "runner1")}`].state, "retired");
  assert.equal(h.rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
    "event1", "runner1")}`].state, "revoked");
  assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 0);
});

test("full account deletion releases its pair hold before retiring UID proof",
  async () => {
    const seed = readySeatSeed();
    delete seed["eventParticipations/event1_runner1"];
    seed["users/runner1"] = {name: "Synthetic Guest", profilePhotos: []};
    seed["events/event1"] = {...seed["events/event1"], bookedCount: 0,
      crossPathsPairHeldCount: 1,
      crossPathsPairHeldCohortCounts: {womenInterestedInMen: 1}};
    seed["eventSeatLedgers/event1"] = {...seed["eventSeatLedgers/event1"],
      occupied: 0, temporaryHeld: 1};
    seed[seatReservationPath("canonical_runner1")] = {
      ...seed[seatReservationPath("canonical_runner1")], active: false,
      temporaryHold: {ownerKind: "crossPathsPair", ownerId: "hold1",
        expiresAtMillis: 300100}};
    const now = admin.firestore.Timestamp.fromMillis(100);
    seed["crossPathsPairHolds/hold1"] = {eventId: "event1",
      invitationId: "invitation1", organizerId: "org1", requesterUid: "runner1",
      attendeeUid: "runner2", participantIds: ["runner1", "runner2"],
      status: "active", requesterBookingStatus: "held",
      attendeeBookingStatus: "confirmed",
      requesterCohortId: "womenInterestedInMen",
      attendeeCohortId: "menInterestedInWomen", requesterPriceInPaise: 0,
      attendeePriceInPaise: 0, currency: "INR", createdAt: now, updatedAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(300100),
      confirmedAt: null, releasedAt: null, releaseReason: null,
      paymentId: null, conversationId: null};
    const h = createAccountDeletionHarness({seed,
      now: {kind: "serverTimestamp"}});
    await requestAccountDeletionHandler({auth: {uid: "runner1"}} as
      Parameters<typeof requestAccountDeletionHandler>[0], h.deps);
    assert.equal(h.rows["eventSeatLedgers/event1"].temporaryHeld, 0);
    assert.equal(h.rows["eventSeatLedgers/event1"].occupied, 0);
    assert.equal(h.rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event1", "uid", "runner1")}`].state, "retired");
    assert.ok(h.deletedPublicDocs.includes("crossPathsPairHolds/hold1"));
    assert.deepEqual(h.deletedAuthUsers, ["runner1"]);
  });
