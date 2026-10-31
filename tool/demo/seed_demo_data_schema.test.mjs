import assert from "node:assert/strict";
import test from "node:test";
import {
  photoPromptCatalog,
  profilePromptCatalog,
} from "../contracts/generated/schema_contract_registry.mjs";
import {validateSeedDocuments} from "./seed_demo_data.mjs";

const profilePrompt = profilePromptCatalog.prompts[0];
const photoPrompt = photoPromptCatalog.prompts[0];
const dateOfBirthIso = "1990-01-01T00:00:00.000Z";

test("seed document validation accepts valid profile and event docs", () => {
  const result = validateSeedDocuments({
    docs: [
      {path: "users/runner-1", data: validUserProfileDoc()},
      {path: "publicProfiles/runner-1", data: validPublicProfileDoc()},
      {path: "clubs/club-1", data: validOrganizerDoc()},
      {
        path: "organizerMemberships/club-1_runner-1",
        data: validOrganizerMembershipDoc(),
      },
      {path: "events/event-1", data: validEventDoc()},
      {
        path: "eventParticipations/event-1_runner-1",
        data: validEventParticipationDoc(),
      },
      {path: "savedEvents/runner-1_run-1", data: validSavedEventDoc()},
    ],
  });

  assert.deepEqual(result, {
    users: 1,
    publicProfiles: 1,
    organizers: 1,
    organizerMemberships: 1,
    events: 1,
    eventParticipations: 1,
    eventSuccessPlans: 0,
    eventSuccessPreferences: 0,
    eventSuccessCompatibilityResponses: 0,
    eventSuccessWingmanRequests: 0,
    eventSuccessAssignments: 0,
    eventSuccessFeedback: 0,
    eventSuccessScorecards: 0,
    organizerScheduleLocks: 0,
    userEventScheduleLocks: 0,
    savedEvents: 1,
    payments: 0,
    profileDecisions: 0,
    matches: 0,
    chatMessages: 0,
    reviews: 0,
    activityNotifications: 0,
    seedManifests: 0,
    profilePromptAnswers: 2,
    photoPromptAnswers: 2,
    projectionPairs: 1,
  });
});

test("seed profile validation rejects legacy bio fields", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "users/runner-1",
          data: {...validUserProfileDoc(), bio: "legacy freeform bio"},
        },
      ],
    }),
    /users\/runner-1 failed schema validation/
  );
});

test("seed profile validation rejects stale prompt ids before writes", () => {
  const user = validUserProfileDoc();
  user.profilePrompts = [
    {
      promptId: "deletedPrompt",
      prompt: profilePrompt.title,
      answer: "An answer that should not be written.",
    },
  ];

  assert.throws(
    () => validateSeedDocuments({
      docs: [{path: "users/runner-1", data: user}],
    }),
    /uses unknown profile prompt id: deletedPrompt/
  );
});

test("seed profile validation rejects overlong prompt answers", () => {
  const user = validUserProfileDoc();
  user.profilePrompts = [
    {
      promptId: profilePrompt.id,
      prompt: profilePrompt.title,
      answer: "a".repeat(301),
    },
  ];

  assert.throws(
    () => validateSeedDocuments({
      docs: [{path: "users/runner-1", data: user}],
    }),
    /users\/runner-1\.profilePrompts\[0\] failed schema validation/
  );
});

test("seed profile validation rejects mismatched public projections", () => {
  const publicProfile = validPublicProfileDoc();
  publicProfile.name = "Wrong Name";

  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {path: "users/runner-1", data: validUserProfileDoc()},
        {path: "publicProfiles/runner-1", data: publicProfile},
      ],
    }),
    /publicProfiles\/runner-1 projection mismatch/
  );
});

test("seed event validation rejects stale enum values before writes", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "events/event-1",
          data: {...validEventDoc(), pace: "walk"},
        },
      ],
    }),
    /events\/event-1 failed schema validation/
  );
});

test("seed event validation rejects missing discovery projection fields", () => {
  const event = validEventDoc();
  delete event.discoveryCityName;

  assert.throws(
    () => validateSeedDocuments({
      docs: [{path: "events/event-1", data: event}],
    }),
    /events\/event-1 failed schema validation/
  );
});

test("seed event validation rejects stale discovery projection fields", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "events/event-1",
          data: {
            ...validEventDoc(),
            discoveryAvailability: "full",
          },
        },
      ],
    }),
    /events\/event-1 synthetic event discovery projection is stale/
  );
});

test("seed decision validation rejects stale reaction target types", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "profileDecisions/runner-1/outgoing/runner-2",
          data: {
            synthetic: true,
            seedPrefix: "demo_test",
            scenario: "schema-test",
            swiperId: "runner-1",
            targetId: "runner-2",
            eventId: "event-1",
            direction: "like",
            reactionTargetType: "genericCard",
            createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
          },
        },
      ],
    }),
    /profileDecisions\/runner-1\/outgoing\/runner-2 failed schema validation/
  );
});

test("seed document validation accepts valid social and payment docs", () => {
  const result = validateSeedDocuments({
    docs: [
      {path: "payments/pay-1", data: validPaymentDoc()},
      {
        path: "profileDecisions/runner-1/outgoing/runner-2",
        data: validSwipeDoc(),
      },
      {path: "matches/runner-1_runner-2", data: validMatchDoc()},
      {
        path: "matches/runner-1_runner-2/messages/message-1",
        data: validChatMessageDoc(),
      },
      {path: "reviews/event-1~runner-1", data: validReviewDoc()},
      {
        path: "notifications/runner-1/items/match_runner-1_runner-2",
        data: validActivityNotificationDoc(),
      },
    ],
  });

  assert.equal(result.payments, 1);
  assert.equal(result.profileDecisions, 1);
  assert.equal(result.matches, 1);
  assert.equal(result.chatMessages, 1);
  assert.equal(result.reviews, 1);
  assert.equal(result.activityNotifications, 1);
});

test("seed document validation accepts schedule locks and seed manifests", () => {
  const result = validateSeedDocuments({
    docs: [
      {
        path: "organizerScheduleLocks/club-1_494080",
        data: validOrganizerScheduleLockDoc(),
      },
      {
        path: "userEventScheduleLocks/runner-1_494080",
        data: validUserEventScheduleLockDoc(),
      },
    ],
    manifest: validSeedEventManifestDoc(),
  });

  assert.equal(result.organizerScheduleLocks, 1);
  assert.equal(result.userEventScheduleLocks, 1);
  assert.equal(result.seedManifests, 1);
});

test("seed document validation accepts event-success launch docs", () => {
  const result = validateSeedDocuments({
    docs: [
      {
        path: "eventSuccessPlans/event-1",
        data: validEventSuccessPlanDoc(),
      },
      {
        path: "eventSuccessPreferences/event-1_runner-1",
        data: validEventSuccessPreferenceDoc(),
      },
      {
        path: "eventSuccessCompatibilityResponses/event-1_runner-1",
        data: validEventSuccessCompatibilityResponseDoc(),
      },
      {
        path: "eventSuccessWingmanRequests/event-1_runner-1",
        data: validEventSuccessWingmanRequestDoc(),
      },
      {
        path: "eventSuccessAssignments/event-1_guided_rotations_runner-1",
        data: validEventSuccessAssignmentDoc(),
      },
      {
        path: "eventSuccessFeedback/event-1_runner-1",
        data: validEventSuccessFeedbackDoc(),
      },
      {
        path: "eventSuccessScorecards/event-1",
        data: validEventSuccessScorecardDoc(),
      },
    ],
  });

  assert.equal(result.eventSuccessPlans, 1);
  assert.equal(result.eventSuccessPreferences, 1);
  assert.equal(result.eventSuccessCompatibilityResponses, 1);
  assert.equal(result.eventSuccessWingmanRequests, 1);
  assert.equal(result.eventSuccessAssignments, 1);
  assert.equal(result.eventSuccessFeedback, 1);
  assert.equal(result.eventSuccessScorecards, 1);
});

test("seed event-success validation rejects stale assignment modules", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "eventSuccessAssignments/event-1_live_reveal_runner-1",
          data: {
            ...validEventSuccessAssignmentDoc(),
            moduleId: "live_reveal",
          },
        },
      ],
    }),
    /eventSuccessAssignments\/event-1_live_reveal_runner-1 failed schema validation/
  );
});

test("seed document validation rejects stale schedule lock owners", () => {
  assert.throws(
    () => validateSeedDocuments({
      docs: [
        {
          path: "organizerScheduleLocks/club-1_494080",
          data: {...validOrganizerScheduleLockDoc(), ownerType: "user"},
        },
      ],
    }),
    /organizerScheduleLocks\/club-1_494080 failed schema validation/
  );
});

function validPaymentDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    userId: "runner-1",
    orderId: "order-1",
    paymentId: "pay-1",
    eventId: "event-1",
    amount: 29900,
    currency: "INR",
    status: "completed",
    signUpFailed: false,
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
  };
}

function validSwipeDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    swiperId: "runner-1",
    targetId: "runner-2",
    eventId: "event-1",
    direction: "like",
    reactionTargetId: "prompt-perfectRun",
    reactionTargetType: "profilePrompt",
    reactionTargetLabel: "A perfect event with me looks like...",
    reactionTargetPreview: "Easy kilometres and coffee after.",
    comment: "This sounds like my kind of event.",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
  };
}

function validMatchDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    user1Id: "runner-1",
    user2Id: "runner-2",
    eventIds: ["event-1"],
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderId: null,
    unreadCounts: {"runner-1": 0, "runner-2": 0},
    status: "active",
    blockedBy: null,
    blockedAt: null,
    participantIds: ["runner-1", "runner-2"],
  };
}

function validChatMessageDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    senderId: "runner-1",
    text: "Coffee after the weekend event?",
    imageUrl: null,
    sentAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
  };
}

function validReviewDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    organizerId: "club-1",
    eventId: "event-1",
    reviewerUserId: "runner-1",
    reviewerName: "Runner One",
    rating: 5,
    comment: "Well organized event with clear pacing.",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: null,
  };
}

function validActivityNotificationDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    uid: "runner-1",
    type: "match",
    title: "New catch",
    body: "Runner Two liked you back.",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    readAt: null,
    matchId: "runner-1_runner-2",
    eventId: "event-1",
    organizerId: null,
    actorUid: "runner-2",
    actorName: "Runner Two",
  };
}

function validUserProfileDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    name: "Runner One",
    firstName: "Runner",
    lastName: "One",
    displayName: "Runner One",
    dateOfBirth: fakeTimestamp(dateOfBirthIso),
    gender: "woman",
    phoneNumber: "+919900000001",
    profileComplete: true,
    email: "runner.one@example.test",
    profilePrompts: [validProfilePromptAnswer()],
    profilePhotos: validProfilePhotos(),
    city: "in-mh-mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    interestedInGenders: ["man"],
    minAgePreference: 24,
    maxAgePreference: 40,
    height: 168,
    occupation: "Designer",
    company: "Stride Labs",
    education: "bachelors",
    religion: "nonReligious",
    languages: ["english", "hindi"],
    relationshipGoal: "relationship",
    drinking: "socially",
    smoking: "never",
    workout: "often",
    diet: "omnivore",
    children: "dontHave",
    activityPreferences: validActivityPreferences(),
    prefsNewCatches: true,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: true,
    prefsOrganizerUpdates: true,
    prefsWeeklyDigest: false,
    prefsShowOnMap: true,
  };
}

function validPublicProfileDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    name: "Runner One",
    age: ageFromIso(dateOfBirthIso),
    gender: "woman",
    profilePrompts: [validProfilePromptAnswer()],
    profilePhotos: validProfilePhotos(),
    city: "in-mh-mumbai",
    height: 168,
    occupation: "Designer",
    company: "Stride Labs",
    education: "bachelors",
    religion: "nonReligious",
    languages: ["english", "hindi"],
    relationshipGoal: "relationship",
    drinking: "socially",
    smoking: "never",
    workout: "often",
    diet: "omnivore",
    children: "dontHave",
    activityPreferences: validActivityPreferences(),
  };
}

function validOrganizerDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    name: "Race Course Event Collective",
    description: "Social Indore events for easy kilometres and coffee stops.",
    location: "in-mp-indore",
    locationCityId: "in-mp-indore",
    locationMarketId: "in-mp-indore",
    cityName: "Indore",
    regionName: "Madhya Pradesh",
    countryCode: "IN",
    countryName: "India",
    area: "Race Course Road",
    hostUserId: "runner-1",
    hostName: "Runner One",
    hostAvatarUrl: "https://example.test/runner-one.jpg",
    ownerUserId: "runner-1",
    hostUserIds: ["runner-1"],
    hostProfiles: [{
      uid: "runner-1",
      displayName: "Runner One",
      avatarUrl: "https://example.test/runner-one.jpg",
      role: "owner",
    }],
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    imageUrl: "https://example.test/club.jpg",
    profileImageUrl: null,
    tags: ["social", "indore"],
    memberCount: 1,
    rating: 0,
    reviewCount: 0,
    nextEventAt: null,
    nextEventLabel: null,
    instagramHandle: "racecourseevents",
    phoneNumber: "+918800000001",
    email: "race.course@example.test",
    status: "active",
    archived: false,
    archivedAt: null,
    archiveReason: null,
  };
}

function validOrganizerMembershipDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    organizerId: "club-1",
    uid: "runner-1",
    role: "member",
    status: "active",
    pushNotificationsEnabled: true,
    joinedAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    leftAt: null,
    deletedAt: null,
  };
}

function validEventDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    organizerId: "club-1",
    startTime: fakeTimestamp("2026-05-20T01:30:00.000Z"),
    endTime: fakeTimestamp("2026-05-20T02:40:00.000Z"),
    meetingPoint: "Race Course Road gate",
    meetingLocation: {
      name: "Race Course Road gate",
      address: null,
      placeId: null,
      latitude: 22.7196,
      longitude: 75.8577,
      notes: "Meet near the main gate.",
    },
    startingPointLat: 22.7196,
    startingPointLng: 75.8577,
    locationDetails: "Meet near the main gate.",
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      defaultPlaybookId: "social_run_light",
    },
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 12,
    description: "Easy social 5K with coffee after.",
    priceInPaise: 0,
    bookedCount: 1,
    checkedInCount: 0,
    waitlistedCount: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    constraints: {
      minAge: 21,
      maxAge: 45,
      maxMen: 8,
      maxWomen: null,
    },
    genderCounts: {
      woman: 1,
    },
    cohortCounts: {
      womenInterestedInMen: 1,
    },
    waitlistedCohortCounts: {},
    discoveryCityName: "indore",
    discoveryMarketId: "in-mp-indore",
    discoveryActivityKind: "socialRun",
    discoveryGeoCell: "283:948",
    discoveryHasOpenSpots: true,
    discoveryAvailability: "open",
    discoveryOpenCohorts: [
      "menInterestedInWomen",
      "womenInterestedInMen",
      "queerOrOpen",
      "nonBinaryOrOther",
    ],
    discoveryWaitlistCohorts: [],
    discoveryInviteRequired: false,
    discoveryMembershipRequired: false,
    discoveryManualApprovalRequired: false,
    discoveryMinAge: 21,
    discoveryMaxAge: 45,
  };
}

function validEventParticipationDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    status: "signedUp",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
    signedUpAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    waitlistedAt: null,
    attendedAt: null,
    cancelledAt: null,
    deletedAt: null,
    genderAtSignup: "woman",
    paymentId: null,
  };
}

function validSavedEventDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    uid: "runner-1",
    eventId: "event-1",
    savedAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
  };
}

function validEventSuccessPlanDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    playbookId: "algorithmic_mixer_reveal",
    selectedModuleIds: [
      "qr_check_in",
      "guided_rotations",
      "live_reveal",
      "compatibility_questionnaire",
    ],
    targetAttendeeCount: 24,
    structureConfig: {
      unitKind: "pairs",
      unitSize: 2,
      unitCount: 12,
      rotationIntervalMinutes: 12,
      revealCountdownSeconds: 10,
    },
    hostGoal: "Help everyone meet a few promising people.",
    wingmanRequestsEnabled: true,
    contextualOpenersEnabled: true,
    compatibilityAffectsRanking: true,
    questionnaireConfig: {
      templateId: "balanced",
      customTitle: "Quick match clues",
    },
    activeStepIndex: 1,
    status: "live",
    revealStatus: "countingDown",
    activeRevealRoundIndex: 0,
    revealStartedAt: fakeTimestamp("2026-05-01T01:00:00.000Z"),
    attendeePrompt: "Notice who felt easy to talk to.",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
    frozenAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
    completedAt: null,
  };
}

function validEventSuccessPreferenceDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    microPodsOptedOut: false,
    guidedRotationsOptedOut: false,
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
  };
}

function validEventSuccessCompatibilityResponseDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    answerIds: [
      "event_energy_easy_conversation",
      "first_conversation_stories",
    ],
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
  };
}

function validEventSuccessWingmanRequestDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    requesterUid: "runner-1",
    targetUid: "runner-2",
    status: "active",
    hostVisibleConsent: true,
    note: "Could you help us find each other after the reveal?",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
  };
}

function validEventSuccessAssignmentDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    moduleId: "guided_rotations",
    label: "Live reveal rotations",
    displayTitle: "Start with Runner Two",
    displaySubtitle: "Follow the host cue when the reveal opens.",
    peerUids: ["runner-2"],
    rotationSlots: [
      {
        roundIndex: 0,
        label: "Round 1",
        startsAt: fakeTimestamp("2026-05-01T01:00:00.000Z"),
        endsAt: fakeTimestamp("2026-05-01T01:12:00.000Z"),
        peerUid: "runner-2",
        compatibility: "questionnaire_match",
      },
    ],
    source: "server_v1",
    createdAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T00:05:00.000Z"),
  };
}

function validEventSuccessFeedbackDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    welcomeRating: 5,
    structureRating: 4,
    metNewPeopleCount: 3,
    safetyConcern: false,
    privateNote: "The reveal made it easier to follow up.",
    createdAt: fakeTimestamp("2026-05-01T02:00:00.000Z"),
    updatedAt: fakeTimestamp("2026-05-01T02:05:00.000Z"),
  };
}

function validEventSuccessScorecardDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    eventId: "event-1",
    organizerId: "club-1",
    bookedCount: 12,
    checkedInCount: 10,
    feedbackCount: 6,
    attendeesWhoMetTwoPlusPeople: 5,
    catchSentCount: 5,
    attendeesWhoCaughtSomeone: 4,
    catchRecipientCount: 4,
    catchRate: 0.4,
    mutualMatchCount: 3,
    chatStartedCount: 2,
    averageWelcomeRating: 4.5,
    averageStructureRating: 4.2,
    safetyIncidentCount: 0,
    funnel: {
      inviteLinkCount: 2,
      inviteOpenCount: 42,
      totalDemandCount: 18,
      requestCount: 4,
      pendingRequestCount: 1,
      approvedRequestCount: 2,
      declinedRequestCount: 1,
      directSignupCount: 8,
      waitlistJoinCount: 6,
      waitlistOfferCount: 3,
      waitlistOfferActiveCount: 1,
      waitlistOfferAcceptedCount: 1,
      waitlistOfferDeclinedCount: 0,
      waitlistOfferExpiredCount: 1,
      checkoutStartedCount: 9,
      paymentPendingCount: 1,
      paymentCompletedCount: 7,
      paymentFailedCount: 1,
      paymentRefundedCount: 0,
      bookedCount: 12,
      checkedInCount: 10,
      noShowCount: 2,
      catchSentCount: 5,
      attendeesWhoCaughtSomeone: 4,
      mutualMatchCount: 3,
      chatStartedCount: 2,
      repeatAttendeeCount: 4,
    },
    updatedAt: fakeTimestamp("2026-05-01T02:10:00.000Z"),
  };
}

function validOrganizerScheduleLockDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    ownerType: "club",
    ownerId: "club-1",
    slot: 494080,
    eventId: "event-1",
    organizerId: "club-1",
    startTimeMillis: 1778889600000,
    endTimeMillis: 1778893800000,
  };
}

function validUserEventScheduleLockDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    ownerType: "user",
    ownerId: "runner-1",
    slot: 494080,
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    startTimeMillis: 1778889600000,
    endTimeMillis: 1778893800000,
  };
}

function validSeedEventManifestDoc() {
  return {
    synthetic: true,
    seedPrefix: "demo_test",
    scenario: "schema-test",
    seedId: "demo_test_schema-test",
    manifestId: "demo_test_schema-test",
    generatedAt: fakeTimestamp("2026-05-01T00:00:00.000Z"),
    anchorUserIds: ["runner-1"],
    counts: {
      users: 1,
      publicProfiles: 1,
    },
    paths: ["users/runner-1", "publicProfiles/runner-1"],
  };
}

function validProfilePromptAnswer() {
  return {
    promptId: profilePrompt.id,
    prompt: profilePrompt.title,
    answer: "Easy kilometres, good coffee, and a relaxed chat.",
  };
}

function validPhotoPromptAnswer() {
  return {
    photoIndex: 0,
    promptId: photoPrompt.id,
    prompt: photoPrompt.title,
  };
}

function validProfilePhotos() {
  return [{
    id: "runner_one_0",
    url: "https://example.test/runner-one.jpg",
    thumbnailUrl: "https://example.test/runner-one-thumb.jpg",
    storagePath: "users/legacy/photos/0.jpg",
    thumbnailStoragePath: "users/legacy/photoThumbnails/0.jpg",
    prompt: validPhotoPromptAnswer(),
    moderation: null,
    position: 0,
    createdAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
    updatedAt: fakeTimestamp("1970-01-01T00:00:00.000Z"),
  }];
}

function validActivityPreferences() {
  return {
    running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: ["fiveK", "tenK"],
      runningReasons: ["fitness", "social"],
      preferredRunTimes: ["morning"],
      version: 1,
    },
  };
}

function fakeTimestamp(iso) {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function ageFromIso(iso) {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}
