const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  or,
  query,
  serverTimestamp,
  startAfter,
  documentId,
  setDoc,
  updateDoc,
  where,
} = require("firebase/firestore");

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const firestoreRules = fs.readFileSync(
  path.join(projectRoot, "firestore.rules"),
  "utf8",
);

const projectId = "demo-catch-rules";

let testEnv;

function authedDb(uid, token = {}) {
  return testEnv.authenticatedContext(uid, {
    phone_number: "+919999999999",
    ...token,
  }).firestore();
}

function organizer(overrides = {}) {
  return {
    name: "Sunset Striders",
    description: "Easy city loops.",
    location: "mumbai",
    area: "Bandra",
    hostUserId: "host-1",
    hostName: "Priya",
    hostAvatarUrl: null,
    createdAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
    imageUrl: null,
    tags: [],
    memberCount: 1,
    rating: 0,
    reviewCount: 0,
    nextEventAt: null,
    nextEventLabel: null,
    ...overrides,
  };
}

function event(overrides = {}) {
  return {
    publicationState: "published",
    setupRevision: 1,
    organizerId: "club-1",
    startTime: Timestamp.fromDate(new Date("2026-05-02T01:30:00.000Z")),
    endTime: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
    meetingPoint: "Carter Road",
    startingPointLat: null,
    startingPointLng: null,
    locationDetails: null,
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy seaside event.",
    priceInPaise: 0,
    constraints: {},
    genderCounts: {},
    ...overrides,
  };
}

function eventStaffGrant(overrides = {}) {
  const now = Timestamp.fromDate(new Date("2026-08-12T10:00:00.000Z"));
  return {
    organizerId: "club-1",
    eventId: "event-1",
    uid: "operator-1",
    displayName: "Casey",
    phoneLastFour: "3210",
    role: "checkInOperator",
    permissions: ["viewRoster", "setAttendance", "reviewRuntimeClaims"],
    status: "active",
    createdBy: "host-1",
    createdAt: now,
    expiresAt: Timestamp.fromDate(new Date("2030-08-12T10:00:00.000Z")),
    revokedBy: null,
    revokedAt: null,
    updatedAt: now,
    revision: 1,
    ...overrides,
  };
}

function externalEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: "external-event-1",
    canonicalHostId: "host-afterfly",
    title: "External mixer",
    description: "Reviewed external supply.",
    startTime: Timestamp.fromDate(new Date("2026-06-26T14:30:00.000Z")),
    endTime: Timestamp.fromDate(new Date("2026-06-26T16:30:00.000Z")),
    timezone: "Asia/Kolkata",
    meetingPoint: "Bandra Amphitheatre",
    meetingLocation: {
      name: "Bandra Amphitheatre",
      address: "Bandra, Mumbai",
      placeId: null,
      latitude: 19.05,
      longitude: 72.82,
      notes: null,
    },
    locationDetails: null,
    photoUrl: null,
    activity: {
      version: 1,
      activityKind: "singlesMixer",
      interactionModel: "freeFormMixer",
      source: "admin",
    },
    price: {
      displayText: null,
      parsedPriceInPaise: 0,
      currency: "INR",
    },
    status: "active",
    publicationStatus: "public",
    booking: {
      mode: "external_outbound_only",
      catchBookingEnabled: false,
      catchPaymentsEnabled: false,
      catchReservationsEnabled: false,
      catchWaitlistEnabled: false,
      externalLinks: [{
        platform: "luma",
        url: "https://luma.com/e",
        linkType: "booking_or_event_page",
        sourceEventKey: "external-event-1",
        candidateId: "candidate-external-event-1",
        primary: true,
      }],
    },
    discovery: {
      citySlug: "mumbai",
      countryCode: "IN",
      availability: "read_only_external",
      manualApprovalRequired: true,
    },
    dedupe: {
      normalizedEventKey: "external-event-1",
      primaryCandidateId: "candidate-external-event-1",
      duplicateCandidateIds: [],
      conflictPolicy: "single_read_only_event_with_multiple_outbound_links",
    },
    externalSource: {
      candidateId: "candidate-external-event-1",
      sourceEventKey: "external-event-1",
      sourceEventId: "external-event-1",
      platform: "luma",
      eventUrl: "https://luma.com/e",
      sourceUrl: "https://example.com/source",
    },
    review: {
      eventReviewBatchId: "batch-1",
      reviewer: "ops",
      decidedAt: "2026-06-25",
      note: null,
      importPolicyAcknowledged: true,
      ownerSafeCopyReviewed: true,
    },
    createdAt: Timestamp.fromDate(new Date("2026-06-25T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-06-25T10:00:00.000Z")),
    ...overrides,
  };
}

function launchAccessApplication(overrides = {}) {
  const now = Timestamp.fromDate(new Date("2026-08-10T10:00:00.000Z"));
  return {
    applicationVersion: 1,
    status: "pending",
    city: "in-mh-mumbai",
    role: "member",
    eventTypes: ["coffee", "culture"],
    availabilityWindows: ["saturdayEvenings"],
    wantsToHost: false,
    inviteCode: null,
    instagramHandle: null,
    referralSource: null,
    whyCatch: "I want to meet people through thoughtful local events.",
    submissionCount: 1,
    createdAt: now,
    submittedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function eventParticipation(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    status: "attended",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T01:30:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
    attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
    ...overrides,
  };
}

function eventRuntimeParticipant(overrides = {}) {
  const now = Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z"));
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    eventAttendeeId: "attendee-1",
    identityVersion: 1,
    claimMethod: "verifiedPhone",
    accessStatus: "ready",
    requiredFieldIds: ["displayName"],
    completedFieldIds: ["displayName"],
    runtimeProfile: {
      displayName: "Runner One",
      gender: null,
      interestedInGenders: [],
      relationshipGoal: null,
      dateOfBirth: null,
    },
    consents: {
      runtimeTermsVersion: "event-runtime-v1",
      sensitiveDataTermsVersion: null,
      saveAsCatchPrefill: false,
    },
    claimedAt: now,
    readyAt: now,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function eventRuntimeClaimRequest(overrides = {}) {
  const now = Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z"));
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    displayName: "Runner One",
    phoneLastFour: "9999",
    candidateAttendeeIds: ["attendee-1"],
    status: "pending",
    reviewedBy: null,
    reviewReason: null,
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    ...overrides,
  };
}

function userProfile(overrides = {}) {
  return {
    name: "Runner One",
    firstName: "Runner",
    lastName: "One",
    displayName: "Runner",
    email: "",
    profilePrompts: [],
    instagramHandle: null,
    phoneNumber: "+919999999999",
    dateOfBirth: Timestamp.fromDate(new Date("1998-01-01T00:00:00.000Z")),
    gender: "woman",
    profileComplete: true,
    profilePhotos: [],
    city: "in-mh-mumbai",
    latitude: null,
    longitude: null,
    interestedInGenders: ["man"],
    minAgePreference: 24,
    maxAgePreference: 34,
    height: null,
    occupation: null,
    company: null,
    education: null,
    religion: null,
    languages: [],
    relationshipGoal: null,
    drinking: null,
    smoking: null,
    workout: null,
    diet: null,
    children: null,
    activityPreferences: activityPreferences(),
    prefsNewCatches: true,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: true,
    prefsOrganizerUpdates: true,
    prefsWeeklyDigest: false,
    prefsShowOnMap: true,
    ...overrides,
  };
}

function activityPreferences(overrides = {}) {
  return {
    running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: [],
      runningReasons: [],
      preferredRunTimes: [],
      version: 1,
      ...overrides,
    },
  };
}

function match(overrides = {}) {
  return {
    user1Id: "runner-1",
    user2Id: "runner-2",
    participantIds: ["runner-1", "runner-2"],
    eventId: "event-1",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderId: null,
    unreadCounts: { "runner-1": 2, "runner-2": 1 },
    status: "active",
    blockedBy: null,
    blockedAt: null,
    ...overrides,
  };
}

function swipe(overrides = {}) {
  return {
    swiperId: "runner-1",
    targetId: "runner-2",
    eventId: "event-1",
    direction: "like",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function review(overrides = {}) {
  return {
    organizerId: "club-1",
    eventId: "event-1",
    reviewerUserId: "runner-1",
    reviewerName: "Runner One",
    rating: 5,
    comment: "Great event.",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T05:00:00.000Z")),
    ...overrides,
  };
}

function organizerMembership(overrides = {}) {
  return {
    organizerId: "club-1",
    uid: "runner-1",
    role: "member",
    status: "active",
    joinedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    leftAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function eventParticipation(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    status: "signedUp",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    signedUpAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    waitlistedAt: null,
    attendedAt: null,
    cancelledAt: null,
    deletedAt: null,
    genderAtSignup: "woman",
    paymentId: null,
    ...overrides,
  };
}

function savedEvent(overrides = {}) {
  return {
    uid: "runner-1",
    eventId: "event-1",
    savedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function activityNotification(overrides = {}) {
  return {
    uid: "runner-1",
    type: "match",
    title: "You picked each other",
    body: "You and Runner Two picked each other. Say hi!",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    readAt: null,
    matchId: "match-1",
    eventId: "event-1",
    organizerId: null,
    actorUid: "runner-2",
    actorName: "Runner Two",
    ...overrides,
  };
}

function eventSuccessPlan(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    playbookId: "run_social",
    selectedModuleIds: ["arrival", "wingman_requests"],
    targetAttendeeCount: 20,
    structureConfig: {
      unitKind: "pods",
      unitSize: 4,
      unitCount: 5,
      revealCountdownSeconds: 10,
    },
    hostGoal: "Help everyone meet three new people.",
    wingmanRequestsEnabled: true,
    contextualOpenersEnabled: true,
    compatibilityAffectsRanking: false,
    activeStepIndex: 0,
    status: "setup",
    revealStatus: "idle",
    activeRevealRoundIndex: 0,
    revealStartedAt: null,
    attendeePrompt: "Look for someone who runs your pace.",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    frozenAt: null,
    completedAt: null,
    ...overrides,
  };
}

function eventSuccessFeedback(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    welcomeRating: 5,
    structureRating: 4,
    metNewPeopleCount: 3,
    safetyConcern: false,
    privateNote: "Good pacing and useful prompts.",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T04:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-02T04:00:00.000Z")),
    ...overrides,
  };
}

function eventSuccessConversationGraph(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    uid: "runner-1",
    status: "submitted",
    selectedUids: ["runner-2"],
    assignedSelectedCount: 1,
    assignedCandidateCount: 2,
    consentMode: "optIn",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T04:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-02T04:00:00.000Z")),
    ...overrides,
  };
}

function eventSuccessAssignment(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    moduleId: "micro_pods",
    label: "Pod A",
    displayTitle: "Pod A",
    displaySubtitle: "4 people in this event pod.",
    peerUids: ["runner-2", "runner-3", "runner-4"],
    source: "server_v1",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function organizerEventSuccessLayout(overrides = {}) {
  const updatedAt = Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z"));
  return {
    organizerId: "organizer-1",
    layoutId: "layout-1",
    label: "Main room",
    units: [
      {
        id: "round-1",
        label: "Table 1",
        shape: "round",
        capacity: 4,
        gridX: 0,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
        order: 0,
      },
    ],
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  };
}

function organizerEventVenue(overrides = {}) {
  const updatedAt = Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z"));
  return {
    organizerId: "organizer-1",
    venueId: "venue-1",
    label: "Bandstand steps",
    meetingLocation: {
      name: "Bandstand steps",
      address: "Bandra West, Mumbai",
      placeId: "place-1",
      latitude: 19.046,
      longitude: 72.819,
      notes: "Meet by the sea-facing gate.",
    },
    defaultEventCapacity: 24,
    status: "active",
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  };
}

function eventSuccessPreference(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    microPodsOptedOut: true,
    guidedRotationsOptedOut: false,
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function eventSuccessCompatibilityResponse(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-1",
    answerIds: [
      "event_energy_new_people",
      "first_conversation_activity",
    ],
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function eventSuccessWingmanRequest(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    requesterUid: "runner-1",
    targetUid: "runner-2",
    status: "active",
    hostVisibleConsent: true,
    note: "Please pair us in a rotation.",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function eventSuccessArrivalMission(overrides = {}) {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    observerUid: "runner-1",
    targetUid: "runner-2",
    targetDisplayName: "Rhea",
    targetContext: "They are checked in and ready for the same room.",
    question: "Ask them: what made this event sound fun?",
    answerOptions: [
      {id: "people", label: "The people"},
      {id: "activity", label: "The activity"},
      {id: "venue", label: "The venue"},
      {id: "friend", label: "A friend"},
    ],
    status: "active",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    ...overrides,
  };
}

function eventReviewId(eventId, reviewerUserId) {
  return `${eventId}~${reviewerUserId}`;
}

async function seed(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

function values(count, value) {
  return Array.from({length: count}, () => value);
}

/**
 * Registers the shared emulator lifecycle in the calling describe block and
 * hands each new test environment to onReady.
 */
function useRulesEnvironment(onReady) {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: firestoreRules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
        port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080),
      },
    });
    onReady?.(testEnv);
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  after(async () => {
    await testEnv.cleanup();
  });
}

module.exports = {
  Timestamp,
  activityNotification,
  activityPreferences,
  assert,
  assertFails,
  assertSucceeds,
  authedDb,
  collection,
  deleteDoc,
  describe,
  doc,
  documentId,
  event,
  eventParticipation,
  eventReviewId,
  eventRuntimeClaimRequest,
  eventRuntimeParticipant,
  eventStaffGrant,
  eventSuccessArrivalMission,
  eventSuccessAssignment,
  eventSuccessCompatibilityResponse,
  eventSuccessConversationGraph,
  eventSuccessFeedback,
  eventSuccessPlan,
  eventSuccessPreference,
  eventSuccessWingmanRequest,
  externalEvent,
  getDoc,
  getDocs,
  increment,
  it,
  launchAccessApplication,
  limit,
  match,
  or,
  orderBy,
  organizer,
  organizerEventSuccessLayout,
  organizerEventVenue,
  organizerMembership,
  query,
  review,
  savedEvent,
  seed,
  serverTimestamp,
  setDoc,
  startAfter,
  swipe,
  updateDoc,
  useRulesEnvironment,
  userProfile,
  values,
  where,
};
