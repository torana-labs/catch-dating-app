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
  query,
  serverTimestamp,
  startAfter,
  documentId,
  setDoc,
  updateDoc,
  where,
} = require("firebase/firestore");

const projectRoot = path.resolve(__dirname, "..", "..");
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

function club(overrides = {}) {
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
    organizerId: "club-1",
    clubId: "club-1",
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
    compatibilityClubId: "club-afterfly",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    prefsClubUpdates: true,
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
    clubId: "club-1",
    eventId: "event-1",
    reviewerUserId: "runner-1",
    reviewerName: "Runner One",
    rating: 5,
    comment: "Great event.",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T05:00:00.000Z")),
    ...overrides,
  };
}

function clubMembership(overrides = {}) {
  return {
    clubId: "club-1",
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
    clubId: "club-1",
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
    title: "It's a catch",
    body: "You and Runner Two matched. Say hi!",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
    readAt: null,
    matchId: "match-1",
    eventId: "event-1",
    clubId: null,
    actorUid: "runner-2",
    actorName: "Runner Two",
    ...overrides,
  };
}

function eventSuccessPlan(overrides = {}) {
  return {
    eventId: "event-1",
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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
    clubId: "club-1",
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

describe("firestore.rules", () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: firestoreRules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
        port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  describe("Host summary reads", () => {
    const summaryOrganizer = (overrides = {}) =>
      club({status: "active", archived: false, ...overrides});
    async function setup() {
      await seed(["organizers", "org"], summaryOrganizer({hostUserIds: ["manager"]}));
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      for (let index = 0; index < 31; index++) {
        await seed(["hostContactSummaries", `person-${index}`], {
          organizerId: "org", contactId: `person-${index}`, version: 1,
          lastSeenAtMillis: index,
        });
      }
      await seed(["hostContactSummaries", "foreign"], {
        organizerId: "other", contactId: "foreign", version: 1,
      });
    }
    it("authorizes 31 rows using current organizer membership", async () => {
      await setup();
      for (const uid of ["host-1", "manager"]) {
        const page = await assertSucceeds(getDocs(query(
          collection(authedDb(uid), "hostContactSummaries"),
          where("organizerId", "==", "org"),
          orderBy("lastSeenAtMillis", "desc"), limit(31),
        )));
        assert.equal(page.size, 31);
      }
      await seed(["organizers", "org"], summaryOrganizer({hostUserId: "new-host"}));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "hostContactSummaries", "person-0")));
    });
    it("denies foreign IDs, unscoped queries, ordinary staff and all writes", async () => {
      await setup();
      const db = authedDb("host-1");
      await assertFails(getDoc(doc(db, "hostContactSummaries", "foreign")));
      await assertFails(getDocs(collection(db, "hostContactSummaries")));
      await assertFails(getDocs(query(collection(db, "hostContactSummaries"),
        where("organizerId", "==", "other"))));
      await assertFails(getDoc(doc(authedDb("operator-1"),
        "hostContactSummaries", "person-0")));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
        "hostContactSummaries", "person-0")));
      await assertFails(setDoc(doc(db, "hostContactSummaries", "injected"),
        {organizerId: "org"}));
      await assertFails(updateDoc(doc(db, "hostContactSummaries", "person-0"),
        {organizerId: "other"}));
      await assertFails(deleteDoc(doc(db, "hostContactSummaries", "person-0")));
      await assertFails(getDoc(doc(db, "organizerContacts", "person-0")));
    });
    it("continues tied SDK pages without duplicates or omissions", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      for (const id of ["a", "b", "c"]) {
        await seed(["hostContactSummaries", id], {
          organizerId: "org", lastSeenAtMillis: 10, version: 1,
        });
      }
      const ordered = query(collection(authedDb("host-1"),
        "hostContactSummaries"), where("organizerId", "==", "org"),
      orderBy("lastSeenAtMillis", "desc"), orderBy(documentId(), "desc"));
      const first = await getDocs(query(ordered, limit(2)));
      assert.deepEqual(first.docs.map((row) => row.id), ["c", "b"]);
      const second = await getDocs(query(ordered, startAfter(10, "b"), limit(2)));
      assert.deepEqual(second.docs.map((row) => row.id), ["a"]);
    });
    it("isolates all summary collections and selected Group definitions", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      await seed(["organizers", "other"], summaryOrganizer({hostUserId: "other-host"}));
      for (const name of ["hostFormSummaries", "hostEventSummaries",
        "hostGroupSummaries", "hostResponseSummaries", "hostGroupDetails"]) {
        await seed([name, "own"], {organizerId: "org", version: 1});
        await seed([name, "foreign"], {organizerId: "other", version: 1});
        const db = authedDb("host-1");
        await assertSucceeds(getDoc(doc(db, name, "own")));
        await assertFails(getDoc(doc(db, name, "foreign")));
        const scoped = query(collection(db, name),
          where("organizerId", "==", "org"));
        if (name === "hostGroupDetails") await assertFails(getDocs(scoped));
        else await assertSucceeds(getDocs(scoped));
        await assertFails(getDocs(collection(db, name)));
        await assertFails(getDocs(query(collection(db, name),
          where("organizerId", "==", "other"))));
        await assertFails(setDoc(doc(db, name, "injected"),
          {organizerId: "org"}));
        await assertFails(updateDoc(doc(db, name, "own"), {version: 2}));
        await assertFails(deleteDoc(doc(db, name, "own")));
        await assertFails(getDoc(doc(authedDb("operator-1"), name, "own")));
      }
      await seed(["deletedUsers", "host-1"], {deletedAt: Timestamp.now()});
      for (const name of ["hostFormSummaries", "hostEventSummaries",
        "hostGroupSummaries", "hostResponseSummaries", "hostGroupDetails"]) {
        await assertFails(getDoc(doc(authedDb("host-1"), name, "own")));
      }
    });
    it("revokes unpublished Event summary reads when the organizer archives", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      await seed(["hostEventSummaries", "event"], {organizerId: "org"});
      await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostEventSummaries", "event")));
      await seed(["organizers", "org"], summaryOrganizer({status: "archived", archived: true}));
      await assertFails(getDoc(doc(authedDb("host-1"),
        "hostEventSummaries", "event")));
    });
    it("allows only the owner to read a missing cutover marker", async () => {
      await seed(["organizers", "org"], summaryOrganizer());
      const snapshot = await assertSucceeds(getDoc(doc(authedDb("host-1"),
        "hostDirectorySummaries", "org")));
      assert.equal(snapshot.exists(), false);
      await assertFails(getDoc(doc(authedDb("other-host"),
        "hostDirectorySummaries", "org")));
    });
  });

  describe("clubs", () => {
    it("denies direct club creates because creation is callable-owned", async () => {
      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubs", "club-1"), club()),
      );
    });

    it("denies direct host profile edits because updates are callable-owned", async () => {
      await seed(["organizers", "club-1"], club());

      await assertFails(
        updateDoc(doc(authedDb("host-1"), "clubs", "club-1"), {
          description: "Updated city loops.",
          tags: ["easy"],
          instagramHandle: "@sunsetstriders",
        }),
      );
    });

    it("rejects the older incomplete Club schema", async () => {
      const legacyClub = {
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
        setDoc(doc(authedDb("host-1"), "clubs", "club-legacy"), legacyClub),
      );
    });

    it("denies direct member joins because membership is callable-owned", async () => {
      await seed(["organizers", "club-1"], club());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          club({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects member updates that tamper with club profile fields", async () => {
      await seed(["organizers", "club-1"], club());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          club({
            hostName: "Mallory",
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member count repairs", async () => {
      await seed(["organizers", "club-1"], club());

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          club({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies direct member leaves because membership is callable-owned", async () => {
      await seed(
        ["organizers", "club-1"],
        club({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          club({
            memberCount: 2,
          }),
        ),
      );
    });

    it("rejects members changing aggregate membership count", async () => {
      await seed(
        ["organizers", "club-1"],
        club({
          memberCount: 3,
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "clubs", "club-1"),
          club({
            memberCount: 2,
          }),
        ),
      );
    });

    it("denies joining via direct aggregate updates", async () => {
      await seed(["organizers", "club-1"], club());

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "clubs", "club-1"), {
          memberCount: increment(1),
        }),
      );
    });

    it("denies leaving via direct aggregate updates", async () => {
      await seed(
        ["organizers", "club-1"],
        club({
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
      await seed(["organizers", "club-1"], club());

      await assertFails(
        deleteDoc(doc(authedDb("host-1"), "clubs", "club-1")),
      );
    });
  });

  describe("organizers", () => {
    it("exposes organizer profiles but keeps profile writes callable-owned", async () => {
      await seed(["organizers", "organizer-1"], club({
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
        organizerType: "club",
        organizerPhotos: [],
        followerCount: 0,
      }));

      await assertSucceeds(
        getDoc(doc(
          testEnv.unauthenticatedContext().firestore(),
          "organizers",
          "organizer-1",
        )),
      );
      await assertFails(
        updateDoc(doc(authedDb("owner-1"), "organizers", "organizer-1"), {
          organizerType: "venue",
        }),
      );
      await assertFails(
        setDoc(doc(authedDb("owner-1"), "organizers", "organizer-2"), {
          name: "Direct organizer",
        }),
      );
      await assertFails(
        deleteDoc(doc(authedDb("owner-1"), "organizers", "organizer-1")),
      );
    });

    it("scopes team and follow reads while keeping writes callable-owned", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(["organizerTeamMemberships", "organizer-1_manager-1"], {
        organizerId: "organizer-1",
        uid: "manager-1",
        role: "manager",
        status: "active",
      });
      await seed(["organizerFollows", "organizer-1_runner-1"], {
        organizerId: "organizer-1",
        uid: "runner-1",
        status: "active",
        pushNotificationsEnabled: true,
      });

      await assertSucceeds(getDoc(doc(
        authedDb("manager-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertSucceeds(getDoc(doc(
        authedDb("owner-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerTeamMemberships",
        "organizer-1_manager-1",
      )));
      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "organizerFollows",
        "organizer-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "organizerFollows",
        "organizer-1_runner-1",
      )));
      await assertFails(updateDoc(doc(
        authedDb("runner-1"),
        "organizerFollows",
        "organizer-1_runner-1",
      ), {status: "inactive"}));
    });

    it("limits reusable Event Success layouts to organizer managers", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(
        ["organizerEventSuccessLayouts", "organizer-1_layout-1"],
        organizerEventSuccessLayout(),
      );

      const managerDb = authedDb("manager-1");
      await assertSucceeds(getDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      )));
      await assertSucceeds(getDocs(query(
        collection(managerDb, "organizerEventSuccessLayouts"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("runner-1"), "organizerEventSuccessLayouts"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(updateDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-1",
      ), {label: "Client edit"}));
      await assertFails(setDoc(doc(
        managerDb,
        "organizerEventSuccessLayouts",
        "organizer-1_layout-2",
      ), organizerEventSuccessLayout({layoutId: "layout-2"})));
    });

    it("limits saved event venues to organizer managers", async () => {
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1", "manager-1"],
      });
      await seed(
        ["organizerEventVenues", "organizer-1_venue-1"],
        organizerEventVenue(),
      );

      const managerDb = authedDb("manager-1");
      await assertSucceeds(getDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-1",
      )));
      await assertSucceeds(getDocs(query(
        collection(managerDb, "organizerEventVenues"),
        where("organizerId", "==", "organizer-1"),
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "organizerEventVenues",
        "organizer-1_venue-1",
      )));
      await assertFails(updateDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-1",
      ), {label: "Client edit"}));
      await assertFails(setDoc(doc(
        managerDb,
        "organizerEventVenues",
        "organizer-1_venue-2",
      ), organizerEventVenue({venueId: "venue-2"})));
    });

    it("keeps contact notes and manual-tag vocabularies callable-only", async () => {
      const createdAt = Timestamp.fromDate(
        new Date("2026-08-16T10:00:00.000Z"),
      );
      await seed(["organizers", "organizer-1"], {
        ownerUserId: "owner-1",
        hostUserId: "owner-1",
        hostUserIds: ["owner-1"],
      });
      await seed(["organizers", "organizer-2"], {
        ownerUserId: "owner-2",
        hostUserId: "owner-2",
        hostUserIds: ["owner-2"],
      });
      await seed(["organizerContactNotes", "note-2"], {
        organizerId: "organizer-2",
        contactId: "contact-2",
        authorUid: "owner-2",
        body: "Brings friends",
        revision: 1,
        createdAt,
        updatedAt: createdAt,
        updatedByUid: "owner-2",
      });
      await seed(["organizerContactTagVocabularies", "organizer-2"], {
        organizerId: "organizer-2",
        tags: [],
        updatedAt: createdAt,
      });
      await seed(["organizerContactOutreach", "outreach-2"], {
        organizerId: "organizer-2",
        contactId: "contact-2",
        authorUid: "owner-2",
        channel: "phoneCall",
        outcome: "noAnswer",
        occurredAt: createdAt,
        revision: 1,
        createdAt,
        updatedAt: createdAt,
        updatedByUid: "owner-2",
      });

      for (const uid of ["owner-2", "owner-1"]) {
        const db = authedDb(uid);
        await assertFails(getDoc(doc(db, "organizerContactNotes", "note-2")));
        await assertFails(getDocs(query(
          collection(db, "organizerContactNotes"),
          where("organizerId", "==", "organizer-2"),
        )));
        await assertFails(getDoc(doc(
          db,
          "organizerContactOutreach",
          "outreach-2",
        )));
        await assertFails(getDocs(query(
          collection(db, "organizerContactOutreach"),
          where("organizerId", "==", "organizer-2"),
        )));
        await assertFails(getDoc(doc(
          db,
          "organizerContactTagVocabularies",
          "organizer-2",
        )));
      }
      await assertFails(setDoc(doc(
        authedDb("owner-2"),
        "organizerContactNotes",
        "note-client",
      ), {
        organizerId: "organizer-2",
        contactId: "contact-2",
        body: "Client write",
      }));
      await assertFails(setDoc(doc(
        authedDb("owner-2"),
        "organizerContactOutreach",
        "outreach-client",
      ), {
        organizerId: "organizer-2",
        contactId: "contact-2",
        channel: "phoneCall",
        outcome: "reached",
      }));
      await assertFails(updateDoc(doc(
        authedDb("owner-2"),
        "organizerContactTagVocabularies",
        "organizer-2",
      ), {tags: ["client-write"]}));
    });

    it("keeps organizer claims and schedule locks server-only", async () => {
      await seed(["organizerClaimRequests", "claim-1"], {
        organizerId: "organizer-1",
        requesterUid: "owner-1",
        status: "pending",
      });
      await seed(["organizerScheduleLocks", "lock-1"], {
        organizerId: "organizer-1",
        eventId: "event-1",
      });

      await assertFails(getDoc(doc(
        authedDb("owner-1"),
        "organizerClaimRequests",
        "claim-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("owner-1"),
        "organizerScheduleLocks",
        "lock-1",
      )));
    });

    it("keeps organizer attention projections server-only", async () => {
      await seed(["organizerAttentionItems", "attention-1"], {
        organizerId: "organizer-1",
        kind: "eventWaitlistReview",
        status: "open",
        dueAt: Timestamp.fromDate(new Date("2026-09-02T10:00:00.000Z")),
      });

      for (const uid of ["owner-1", "owner-2"]) {
        const db = authedDb(uid);
        await assertFails(getDoc(doc(
          db,
          "organizerAttentionItems",
          "attention-1",
        )));
        await assertFails(getDocs(query(
          collection(db, "organizerAttentionItems"),
          where("organizerId", "==", "organizer-1"),
        )));
        await assertFails(setDoc(doc(
          db,
          "organizerAttentionItems",
          `client-${uid}`,
        ), {
          organizerId: "organizer-1",
          kind: "eventWaitlistReview",
          status: "open",
        }));
      }
    });

    it("keeps organizer entitlement state server-only", async () => {
      await seed(["organizerTeamMemberships", "organizer-1_manager-1"], {
        organizerId: "organizer-1",
        uid: "manager-1",
        role: "manager",
        status: "active",
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        removedAt: null,
      });
      await seed(["organizerEntitlements", "organizer-1"], {
        schemaVersion: 1,
        organizerId: "organizer-1",
        grants: [],
        meters: {
          flightDaysUsed: 0,
          waConversationsUsed: 0,
          periodStartsAt:
            Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
        },
        revision: 1,
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
      });
      await seed(["organizerEntitlementReceipts", "organizer-1_op-1"], {
        schemaVersion: 1,
        receiptId: "organizer-1_op-1",
        operationId: "op-1",
        organizerId: "organizer-1",
        actorUid: "admin-1",
        action: "grant",
        contentHash: "sha256:abc123",
        resultRevision: 1,
        grantId: "grant-1",
        createdAt: Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z")),
        expiresAt: Timestamp.fromDate(new Date("2026-10-01T10:00:00.000Z")),
      });

      const clients = [
        testEnv.unauthenticatedContext().firestore(),
        authedDb("guest-1"),
        authedDb("manager-1"),
      ];
      for (const db of clients) {
        await assertFails(getDoc(doc(
          db, "organizerEntitlements", "organizer-1")));
        await assertFails(getDocs(query(
          collection(db, "organizerEntitlements"),
          where("organizerId", "==", "organizer-1"),
        )));
        await assertFails(setDoc(doc(
          db, "organizerEntitlements", "organizer-1"), {
          organizerId: "organizer-1",
          grants: [],
        }));
        await assertFails(getDoc(doc(
          db, "organizerEntitlementReceipts", "organizer-1_op-1")));
        await assertFails(setDoc(doc(
          db, "organizerEntitlementReceipts", "organizer-1_op-2"), {
          organizerId: "organizer-1",
          action: "grant",
        }));
      }
    });

    it("keeps organizer form state server-only", async () => {
      await seed(["organizerForms", "form-1"], {
        organizerId: "organizer-1",
        title: "Private form metadata",
      });
      await seed(["organizerFormDomains", "apply.example.test"], {
        organizerId: "organizer-1", hostname: "apply.example.test",
        ownershipChallenge: "private-challenge",
      });
      await seed(["organizerFormDrafts", "form-1"], {
        organizerId: "organizer-1",
        formId: "form-1",
        revision: 1,
      });
      await seed(["organizerFormVersions", "form-1_v1"], {
        organizerId: "organizer-1",
        formId: "form-1",
        version: 1,
      });

      for (const uid of ["owner-1", "owner-2"]) {
        const db = authedDb(uid);
        for (const [collectionName, documentId] of [
          ["organizerForms", "form-1"],
          ["organizerFormDomains", "apply.example.test"],
          ["organizerFormDrafts", "form-1"],
          ["organizerFormVersions", "form-1_v1"],
        ]) {
          await assertFails(getDoc(doc(db, collectionName, documentId)));
          await assertFails(updateDoc(
            doc(db, collectionName, documentId),
            {title: "Client mutation"},
          ));
        }
      }
      await assertFails(getDocs(query(
        collection(authedDb("owner-1"), "organizerForms"),
        where("organizerId", "==", "organizer-1"),
      )));
    });

    it("keeps organizer tracking settings server-only", async () => {
      await seed(["organizerTrackingSettings", "organizer-1"], {
        organizerId: "organizer-1", revision: 1, metaPixelId: "123456",
      });
      for (const db of [authedDb("owner-1"), authedDb("owner-2"),
        testEnv.unauthenticatedContext().firestore()]) {
        const ref = doc(db, "organizerTrackingSettings", "organizer-1");
        await assertFails(getDoc(ref));
        await assertFails(updateDoc(ref, {revision: 2}));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(db, "organizerTrackingSettings", "forged"), {
          organizerId: "organizer-1", revision: 1,
        }));
        await assertFails(getDocs(collection(db, "organizerTrackingSettings")));
      }
    });

    it("keeps organizer event setup defaults and receipts server-only", async () => {
      for (const collectionName of ["organizerEventSetupDefaults",
        "organizerEventSetupDefaultReceipts", "eventSetupPreferences",
        "eventOfferConfigurationReceipts"]) {
        await seed([collectionName, "organizer-1"], {
          organizerId: "organizer-1", revision: 1,
          eventSetup: {paymentInstructions: "Manager-only instructions"},
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "organizer-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {revision: 2}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", revision: 1,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps atomic form admission ownership and payment receipts server-only", async () => {
      for (const collectionName of ["organizerFormAdmissions",
        "organizerFormAdmissionReceipts", "organizerEventOfferRecipients",
        "organizerEventOfferPayments"]) {
        await seed([collectionName, "receipt-1"], {
          organizerId: "organizer-1", eventId: "event-1",
          responseId: "response-1", actorUid: "owner-1",
          manualPayment: {reviewNote: "Private bank reference"},
        });
        for (const db of [authedDb("owner-1"), authedDb("owner-2"),
          testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, "receipt-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {responseId: "forged"}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", eventId: "event-1",
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps public checkout and registration receipts server-only", async () => {
      for (const collectionName of ["publicEventPayments",
        "publicEventAdmissionReceipts", "eventRegistrationReceipts"]) {
        await seed([collectionName, "receipt-1"], {
          organizerId: "organizer-1", eventId: "event-1",
          responseId: "response-1", actorUid: "owner-1",
          manualPayment: {reviewNote: "Private bank reference"},
        });
        for (const db of [authedDb("owner-1"), authedDb("owner-2"),
          testEnv.unauthenticatedContext().firestore()]) {
          const ref = doc(db, collectionName, "receipt-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {responseId: "forged"}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", eventId: "event-1",
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps event offers and evidence server-only", async () => {
      for (const collectionName of ["organizerEventOffers",
        "organizerEventOfferActionReceipts", "organizerEventOfferBatchReceipts",
        "organizerEventOfferAudits"]) {
        await seed([collectionName, "offer-1"], {
          organizerId: "organizer-1", eventId: "event-1", revision: 1,
          manualPayment: {status: "none"},
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "offer-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {revision: 2}));
          await assertFails(deleteDoc(ref));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", revision: 1,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("organizerId", "==", "organizer-1"))));
        }
      }
    });

    it("keeps private event setup receipts server-only", async () => {
      await seed(["eventSetupReceipts", "receipt-1"], {
        organizerId: "organizer-1", actorUid: "owner-1", eventId: "event-1",
        operation: "create", appliedRevision: 1,
      });
      for (const uid of ["owner-1", "owner-2"]) {
        const db = authedDb(uid);
        const ref = doc(db, "eventSetupReceipts", "receipt-1");
        await assertFails(getDoc(ref));
        await assertFails(deleteDoc(ref));
        await assertFails(updateDoc(ref, {appliedRevision: 2}));
        await assertFails(setDoc(doc(db, "eventSetupReceipts", "forged"), {
          organizerId: "organizer-1", actorUid: uid, appliedRevision: 1,
        }));
      }
    });

    it("keeps form payment state server-only", async () => {
      for (const collectionName of ["paymentRoutingPolicies", "organizerPaymentConnections",
        "organizerPaymentOauthStates", "organizerFormPayments",
        "organizerFormPaymentWebhooks"]) {
        await seed([collectionName, "payment-1"], {
          organizerId: "organizer-1", respondentUid: "owner-1",
          status: "submitted",
        });
        for (const uid of ["owner-1", "owner-2"]) {
          const db = authedDb(uid);
          const ref = doc(db, collectionName, "payment-1");
          await assertFails(getDoc(ref));
          await assertFails(updateDoc(ref, {status: "captured"}));
          await assertFails(setDoc(doc(db, collectionName, "forged"), {
            organizerId: "organizer-1", respondentUid: uid,
          }));
          await assertFails(getDocs(query(collection(db, collectionName),
            where("respondentUid", "==", uid))));
        }
      }
    });

    it("keeps contact merge review decisions callable-only", async () => {
      const reviewedAt = Timestamp.fromDate(
        new Date("2026-08-16T10:00:00.000Z"),
      );
      await seed(["organizerContactMergeReviewDecisions", "decision-1"], {
        schemaVersion: 1,
        decisionId: "decision-1",
        organizerId: "organizer-1",
        contactIds: ["contact-1", "contact-2"],
        state: "differentPeople",
        reviewedByUid: "owner-1",
        reviewedAt,
        reopenedByUid: null,
        reopenedAt: null,
        revision: 1,
        updatedAt: reviewedAt,
      });

      const decisionRef = doc(
        authedDb("owner-1"),
        "organizerContactMergeReviewDecisions",
        "decision-1",
      );
      await assertFails(getDoc(decisionRef));
      await assertFails(updateDoc(decisionRef, {state: "reopened"}));
    });

    it("keeps retained WhatsApp thread bodies callable-only", async () => {
      const db = authedDb("owner-1");
      for (const [collectionName, documentId] of [
        ["organizerWhatsappThreads", "thread-1"],
        ["organizerWhatsappMessages", "message-1"],
        ["organizerWhatsappReplyOperations", "operation-1"],
      ]) {
        await seed([collectionName, documentId], {
          organizerId: "organizer-1",
          body: "Private inbound text",
        });
        const reference = doc(db, collectionName, documentId);
        await assertFails(getDoc(reference));
        await assertFails(setDoc(reference, {organizerId: "organizer-1"}));
      }
    });
  });

  describe("relationship documents", () => {
    it("keeps club host claims server-only", async () => {
      await seed(["clubHostClaims", "host-1"], {
        uid: "host-1",
        clubId: "club-1",
        createdAt: Timestamp.fromDate(new Date("2026-05-08T00:00:00.000Z")),
      });

      await assertFails(
        getDoc(doc(authedDb("host-1"), "clubHostClaims", "host-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("host-1"), "clubHostClaims", "host-1"), {
          uid: "host-1",
          clubId: "club-2",
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
      await seed(["organizers", "club-1"], club());
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
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        clubId: "club-1",
        displayName: "Asha Shah",
        phoneE164: "+919876543210",
        linkedUid: "runner-1",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendeeImports", "import-1"], {
        eventId: "event-1",
        clubId: "club-1",
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
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(["events", "event-2"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        clubId: "club-1",
        displayName: "Asha Shah",
        phoneE164: "+919876543210",
        linkedUid: "runner-1",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendees", "attendee-2"], {
        eventId: "event-2",
        clubId: "club-1",
        displayName: "Bea Shah",
        phoneE164: "+919876543211",
        linkedUid: "runner-2",
        source: "hostImport",
        status: "registered",
      });
      await seed(["eventAttendeeImports", "import-1"], {
        eventId: "event-1",
        clubId: "club-1",
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

    it("fails closed for revoked, expired, and wrong-organizer staff grants", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(["eventAttendees", "attendee-1"], {
        eventId: "event-1",
        clubId: "club-1",
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
        clubId: "club-1",
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
      await seed(["organizers", "club-1"], club());
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
        clubId: "club-1",
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
        ["externalEventMappings", "mapping-1"],
        ["providerSyncRuns", "sync-1"],
        ["organizerApplicationForms", "form-1"],
        ["organizerApplicationFormVersions", "version-1"],
        ["organizerApplications", "application-1"],
        ["organizerApplicationResponses", "response-1"],
        ["organizerApplicationAssets", "asset-1"],
        ["organizerApplicationSourceMappings", "mapping-2"],
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
      await seed(["organizers", "club-1"], club());
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
      await seed(["organizers", "club-1"], club());
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

  describe("public config", () => {
    it("allows public reads of config/cities and denies other config docs", async () => {
      await seed(["config", "cities"], {
        version: 2,
        cityNames: ["in-mh-mumbai", "in-mp-indore"],
        marketIds: ["in-mh-mumbai", "in-mp-indore"],
        launchMarketIds: ["in-mh-mumbai", "in-mp-indore"],
        cities: [],
        markets: [],
      });
      await seed(["config", "private"], {secret: true});

      await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "config", "cities")));
      await assertFails(getDoc(doc(authedDb("runner-1"), "config", "private")));
    });
  });

  describe("users", () => {
    it("allows owners to create the current UserProfile schema without legacy sexualOrientation", async () => {
      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "users", "runner-1"), userProfile()),
      );
    });

    it("requires the initial profile phone to match the verified Auth phone", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({phoneNumber: "+918888888888"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            testEnv.authenticatedContext("runner-2").firestore(),
            "users",
            "runner-2",
          ),
          userProfile(),
        ),
      );
    });

    it("rejects legacy sexualOrientation on profile create", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({sexualOrientation: "straight"}),
        ),
      );
    });

    it("requires a non-empty profile display name on create", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({displayName: "   "}),
        ),
      );
    });

    it("allows account creation without matching preferences", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({interestedInGenders: []}),
        ),
      );
    });

    it("enforces schema-owned profile list bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({profilePhotos: values(6, {})}),
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({
            activityPreferences: activityPreferences({
              preferredRunTimes: values(8, "morning"),
            }),
          }),
        ),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-4"), "users", "runner-4"),
          userProfile({profilePhotos: values(7, {})}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-6"), "users", "runner-6"),
          userProfile({
            activityPreferences: activityPreferences({
              preferredRunTimes: values(9, "morning"),
            }),
          }),
        ),
      );
    });

    it("enforces profile age preference bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({minAgePreference: 18, maxAgePreference: 99}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "users", "runner-2"),
          userProfile({minAgePreference: 17}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({maxAgePreference: 100}),
        ),
      );
    });

    it("enforces profile height bounds on create", async () => {
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile({height: 120}),
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-2"), "users", "runner-2"),
          userProfile({height: 220}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-3"), "users", "runner-3"),
          userProfile({height: 119}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-4"), "users", "runner-4"),
          userProfile({height: 221}),
        ),
      );
    });

    it("denies direct profile edits but allows runtime FCM token updates", async () => {
      await seed(["users", "runner-1"], userProfile());

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          instagramHandle: "@runnerone",
          prefsWeeklyDigest: true,
        }),
      );
      await assertSucceeds(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          fcmToken: "token-1",
        }),
      );
    });

    it("tolerates retained server-owned lifecycle fields on profile updates", async () => {
      await seed(["users", "runner-1"], userProfile({
        deleted: false,
        deletedAt: null,
      }));

      await assertSucceeds(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          fcmToken: "token-1",
        }),
      );
    });

    it("allows owners to persist push installation tokens", async () => {
      await seed(["users", "runner-1"], userProfile());
      const installationRef = doc(
        authedDb("runner-1"),
        "users",
        "runner-1",
        "pushInstallations",
        "host_ios_installation_1",
      );

      await assertSucceeds(
        setDoc(installationRef, {
          token: "token-1",
          appRole: "host",
          environment: "prod",
          platform: "ios",
          appVersion: "1.0.0",
          buildNumber: "42",
          locale: "en-IN",
          timeZone: "IST",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(installationRef, {
          token: "token-2",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(getDoc(installationRef));
      await assertSucceeds(deleteDoc(installationRef));
    });

    it("denies invalid or cross-user push installation writes", async () => {
      await seed(["users", "runner-1"], userProfile());
      const ownerDb = authedDb("runner-1");
      const otherDb = authedDb("runner-2");
      const installationPath = [
        "users",
        "runner-1",
        "pushInstallations",
        "host_ios_installation_1",
      ];

      await assertFails(
        setDoc(doc(ownerDb, ...installationPath), {
          token: "token-1",
          appRole: "admin",
          environment: "prod",
          platform: "ios",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        setDoc(doc(otherDb, ...installationPath), {
          token: "token-1",
          appRole: "host",
          environment: "prod",
          platform: "ios",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(getDoc(doc(otherDb, ...installationPath)));
    });

    it("allows minimal verified identity without age, gender or social photos and keeps it private", async () => {
      const minimal = userProfile({profileComplete: false, interestedInGenders: [], profilePhotos: [], profilePrompts: []});
      delete minimal.dateOfBirth;
      delete minimal.gender;
      const owner = doc(authedDb("runner-1"), "users", "runner-1");
      await assertSucceeds(setDoc(owner, minimal));
      await assertSucceeds(getDoc(owner));
      await assertFails(getDoc(doc(authedDb("other-user"), "users", "runner-1")));
      await assertFails(setDoc(doc(authedDb("runner-2"), "users", "runner-2"), {...minimal, phoneNumber: "+919111111111"}));
    });

    it("rejects malformed optional age and gender on account creation", async () => {
      for (const patch of [
        {dateOfBirth: null},
        {dateOfBirth: "1998-01-01"},
        {gender: null},
        {gender: "unknown"},
      ]) {
        await assertFails(setDoc(
          doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile(patch),
        ));
      }
    });

    it("denies direct profile field updates regardless of field shape", async () => {
      await seed(["users", "runner-1"], userProfile());
      const userRef = doc(authedDb("runner-1"), "users", "runner-1");

      await assertFails(updateDoc(userRef, {name: "Runner Updated"}));
      await assertFails(updateDoc(userRef, {photoUrls: ["https://example.test/a.jpg"]}));
      await assertFails(updateDoc(userRef, {prefsWeeklyDigest: true}));
      await assertFails(updateDoc(userRef, {dateOfBirth: "1998-01-01"}));
    });

    it("keeps profile claim metadata server-owned and claimed identities private", async () => {
      const claimed = {profileRevision: 1, profileClaimedAt: Timestamp.now()};
      for (const patch of [{profileRevision: 0}, {profileClaimedAt: Timestamp.now()}]) {
        await assertFails(setDoc(doc(authedDb("runner-1"), "users", "runner-1"),
          userProfile(patch)));
      }
      await seed(["users", "runner-1"], userProfile({...claimed,
        profileComplete: false, interestedInGenders: []}));
      const ownerRef = doc(authedDb("runner-1"), "users", "runner-1");
      await assertSucceeds(getDoc(ownerRef));
      await assertSucceeds(updateDoc(ownerRef, {fcmToken: "token-claim"}));
      await assertFails(updateDoc(ownerRef, {profileRevision: 2}));
      await assertFails(updateDoc(ownerRef, {profileClaimedAt: Timestamp.now()}));
      await assertFails(getDoc(doc(authedDb("other-host"), "users", "runner-1")));
    });

    it("denies client writes to account-deletion lifecycle fields", async () => {
      await seed(["users", "runner-1"], userProfile());

      await assertFails(
        setDoc(doc(authedDb("runner-2"), "users", "runner-2"), userProfile({
          deleted: false,
        })),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          deleted: true,
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          deletedAt: serverTimestamp(),
        }),
      );
    });

    it("denies owner updates after account-deletion tombstone exists", async () => {
      await seed(["users", "runner-1"], userProfile({
        deleted: true,
        deletedAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      }));
      await seed(["deletedUsers", "runner-1"], {
        uid: "runner-1",
        deletedAt: Timestamp.fromDate(new Date("2026-04-28T10:00:00.000Z")),
      });

      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "users", "runner-1"), {
          prefsWeeklyDigest: true,
        }),
      );
    });
  });

  function values(count, value) {
    return Array.from({length: count}, () => value);
  }

  describe("onboarding drafts", () => {
    it("allows only the owner to read, write, and delete their draft", async () => {
      const draft = {
        step: 2,
        draftVersion: 0,
        firstName: "Runner",
        lastName: "One",
        dateOfBirth: null,
        phoneNumber: "9999999999",
        countryCode: "+91",
        gender: "woman",
        interestedInGenders: ["man"],
        instagramHandle: null,
      };

      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1"), draft),
      );
      await assertSucceeds(
        setDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1"), {
          ...draft,
          futureStepPayload: {canEvolveWithoutRulesDeploy: true},
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "onboarding_drafts", "runner-1")),
      );
      await assertSucceeds(
        deleteDoc(doc(authedDb("runner-1"), "onboarding_drafts", "runner-1")),
      );
    });
  });

  describe("launch access applications", () => {
    it("allows a signed-in owner to create and read a valid application", async () => {
      const application = {
        ...launchAccessApplication(),
        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          application,
        ),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "accessApplications", "runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "accessApplications", "runner-1")),
      );
    });

    it("allows owner edits only while editable and increments submissionCount", async () => {
      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication(),
      );

      await assertSucceeds(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            role: "both",
            wantsToHost: true,
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("rejects path impersonation and client-owned review fields", async () => {
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "accessApplications", "runner-1"),
          {
            ...launchAccessApplication(),
            createdAt: serverTimestamp(),
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            ...launchAccessApplication({reviewerUid: "runner-1"}),
            createdAt: serverTimestamp(),
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("rejects status spoofing, invalid shapes, and locked edits", async () => {
      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication(),
      );

      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            status: "approvedForProfile",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            city: "mumbai",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );

      await seed(
        ["accessApplications", "runner-1"],
        launchAccessApplication({status: "approvedForProfile"}),
      );
      await assertFails(
        updateDoc(
          doc(authedDb("runner-1"), "accessApplications", "runner-1"),
          {
            whyCatch: "I would like to change my approved application.",
            submissionCount: 2,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });
  });

  describe("chat and match writes", () => {
    it("allows participants to create messages but keeps match previews server-owned", async () => {
      await seed(["matches", "match-1"], match());

      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-1",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "image-message-1",
          ),
          {
            senderId: "runner-1",
            text: "",
            imageUrl: "https://storage.test/chat-image.jpg",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          lastMessagePreview: "client-owned preview",
        }),
      );
    });

    it("denies messages from non-participants and blocked matches", async () => {
      await seed(["matches", "match-1"], match());
      await seed(["matches", "blocked-match"], match({status: "blocked"}));

      await assertFails(
        setDoc(
          doc(
            authedDb("runner-3"),
            "matches",
            "match-1",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-3",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "blocked-match",
            "messages",
            "message-1",
          ),
          {
            senderId: "runner-1",
            text: "hello",
            sentAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "matches",
            "match-1",
            "messages",
            "empty-message",
          ),
          {
            senderId: "runner-1",
            text: "",
            sentAt: serverTimestamp(),
          },
        ),
      );
    });

    it("denies messages after a Cross Paths event plan expires", async () => {
      await seed(["matches", "expired-plan"], match({
        conversationType: "crossPathsEventPlan",
        eventPlanExpiresAt: Timestamp.fromMillis(Date.now() - 60_000),
      }));
      await seed(["matches", "open-plan"], match({
        conversationType: "crossPathsEventPlan",
        eventPlanExpiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
      }));
      const message = {
        senderId: "runner-1",
        text: "See you there",
        sentAt: serverTimestamp(),
      };
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "matches",
        "expired-plan",
        "messages",
        "message-1",
      ), message));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "matches",
        "open-plan",
        "messages",
        "message-1",
      ), message));
    });

    it("allows participants to reset only their own unread count", async () => {
      await seed(["matches", "match-1"], match());

      await assertSucceeds(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          "unreadCounts.runner-1": 0,
        }),
      );
      await assertFails(
        updateDoc(doc(authedDb("runner-1"), "matches", "match-1"), {
          "unreadCounts.runner-2": 0,
        }),
      );
    });
  });

  describe("activity notifications", () => {
    it("allows users to read only their own notification timeline", async () => {
      await seed(
        ["notifications", "runner-1", "items", "notification-1"],
        activityNotification(),
      );

      await assertSucceeds(
        getDocs(collection(authedDb("runner-1"), "notifications", "runner-1", "items")),
      );
      await assertFails(
        getDocs(collection(authedDb("runner-2"), "notifications", "runner-1", "items")),
      );
    });

    it("allows users to mark notifications read but not edit content", async () => {
      await seed(
        ["notifications", "runner-1", "items", "notification-1"],
        activityNotification(),
      );
      const notificationRef = doc(
        authedDb("runner-1"),
        "notifications",
        "runner-1",
        "items",
        "notification-1",
      );

      await assertSucceeds(updateDoc(notificationRef, {readAt: serverTimestamp()}));
      await assertFails(updateDoc(notificationRef, {title: "Updated"}));
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-2"),
            "notifications",
            "runner-1",
            "items",
            "notification-1",
          ),
          {readAt: serverTimestamp()},
        ),
      );
    });

    it("denies client-created notification timeline items", async () => {
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "notifications",
            "runner-1",
            "items",
            "notification-1",
          ),
          activityNotification(),
        ),
      );
    });
  });

  describe("swipes", () => {
    it("allows attended users to create valid outgoing swipes", async () => {
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );

      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2",
          ),
          swipe(),
        ),
      );
      await seed(["publicProfiles", "runner-2-reaction"], {name: "Runner R"});
      await seed(
        ["eventParticipations", "event-1_runner-2-reaction"],
        eventParticipation({
          uid: "runner-2-reaction",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2-reaction",
          ),
          swipe({
            targetId: "runner-2-reaction",
            reactionTargetId: "profile-prompt-perfectRun",
            reactionTargetType: "profilePrompt",
            reactionTargetLabel: "A perfect event with me looks like...",
            reactionTargetPreview: "Always up for a sunrise event.",
            comment: "Same here.",
          }),
        ),
      );
      await seed(["publicProfiles", "runner-2-compatibility"], {name: "Runner C"});
      await seed(
        ["eventParticipations", "event-1_runner-2-compatibility"],
        eventParticipation({
          uid: "runner-2-compatibility",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        setDoc(
          doc(
            authedDb("runner-1"),
            "profileDecisions",
            "runner-1",
            "outgoing",
            "runner-2-compatibility",
          ),
          swipe({
            targetId: "runner-2-compatibility",
            reactionTargetId: "compatibility",
            reactionTargetType: "compatibility",
            reactionTargetLabel: "Why you might click",
            reactionTargetPreview: "Your pace ranges overlap.",
          }),
        ),
      );
    });

    it("denies malformed swipe payloads", async () => {
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventParticipations", "event-1_runner-1")),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );

      const swipeRef = doc(
        authedDb("runner-1"),
        "profileDecisions",
        "runner-1",
        "outgoing",
        "runner-2",
      );

      await assertFails(setDoc(swipeRef, swipe({swiperId: "runner-3"})));
      await assertFails(setDoc(swipeRef, swipe({targetId: "runner-3"})));
      await assertFails(setDoc(swipeRef, swipe({direction: "superlike"})));
      await assertFails(setDoc(swipeRef, swipe({eventId: 123})));
      await assertFails(
        setDoc(swipeRef, swipe({reactionTargetType: "superlike"})),
      );
      await assertFails(
        setDoc(swipeRef, swipe({direction: "pass", comment: "Nope."})),
      );
      await assertFails(setDoc(swipeRef, {...swipe(), extraField: true}));
    });

    it("denies swipes outside the eligible event candidate relationship", async () => {
      await seed(["publicProfiles", "runner-1"], {name: "Runner One"});
      await seed(["publicProfiles", "runner-2"], {name: "Runner Two"});
      await seed(["publicProfiles", "runner-3"], {name: "Runner Three"});
      await seed(["events", "event-1"], event());
      await seed(["events", "event-2"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-2_runner-1"],
        eventParticipation({
          eventId: "event-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-1"),
          swipe({targetId: "runner-1"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-3"),
          swipe({targetId: "runner-3"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-2"),
          swipe({eventId: "event-2"}),
        ),
      );

      await seed(["blocks", "runner-2__runner-1"], {
        blockerUserId: "runner-2",
        blockedUserId: "runner-1",
      });
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "profileDecisions", "runner-1", "outgoing", "runner-2"),
          swipe(),
        ),
      );
    });
  });

  describe("reviews", () => {
    it("allows authenticated users to read reviews", async () => {
      await seed(
        ["reviews", eventReviewId("event-1", "runner-1")],
        review(),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "reviews",
        eventReviewId("event-1", "runner-1"),
      )));
    });

    it("denies direct review writes because reviews are callable-owned", async () => {
      await seed(
        ["reviews", eventReviewId("event-1", "runner-1")],
        review(),
      );

      const ownReviewRef = doc(
        authedDb("runner-1"),
        "reviews",
        eventReviewId("event-1", "runner-1"),
      );

      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "reviews", "event-2~runner-1"),
          review({eventId: "event-2"}),
        ),
      );
      await assertFails(updateDoc(ownReviewRef, {
        rating: 4,
        comment: "Updated review.",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(deleteDoc(ownReviewRef));
    });
  });

  describe("events", () => {
    it("protects private event reads by manager and active staff authority", async () => {
      await seed(["organizers", "club-1"], club());
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

    it("direct reads deny private or unlabelled setup records", async () => {
      const anonymous = testEnv.unauthenticatedContext().firestore();
      await seed(["events", "published"], event({publicationState: "published"}));
      await seed(["events", "legacy"], event());
      await seed(["events", "private"], event({publicationState: "private", setupRevision: 1}));
      await seed(["events", "unlabelled"], event({setupRevision: 1}));
      await seed(["events", "malformed"], event({publicationState: null}));
      for (const id of ["published", "legacy"]) {
        await assertSucceeds(getDoc(doc(anonymous, "events", id)));
      }
      for (const id of ["private", "unlabelled", "malformed"]) {
        await assertFails(getDoc(doc(anonymous, "events", id)));
      }
    });

    it("requires publication-constrained lists even for organizers", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "published"], event({publicationState: "published"}));
      await seed(["events", "legacy"], event());
      await seed(["events", "private"], event({publicationState: "private", setupRevision: 1}));
      await seed(["events", "unlabelled"], event({setupRevision: 1}));
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
      await seed(["organizers", "club-1"], club());

      await assertFails(
        setDoc(doc(authedDb("host-1"), "events", "event-new"), event()),
      );
    });

    it("denies direct host event detail edits because updates are callable-owned", async () => {
      await seed(["organizers", "club-1"], club());
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
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());

      const runRef = doc(authedDb("host-1"), "events", "event-1");

      await assertFails(updateDoc(runRef, {clubId: "club-2"}));
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
      await seed(["organizers", "club-1"], club());
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
  });

  describe("event success", () => {
    it("allows host setup writes but keeps live control callable-owned", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event({
        startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
      }));

      const planRef = doc(authedDb("host-1"), "eventSuccessPlans", "event-1");

      await assertSucceeds(setDoc(planRef, eventSuccessPlan()));
      await assertSucceeds(updateDoc(planRef, {
        hostGoal: "Keep the event welcoming.",
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(updateDoc(planRef, {
        conversationGraphConsentMode: "optOut",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(updateDoc(planRef, {
        conversationGraphConsentMode: "preselectedForever",
        updatedAt: serverTimestamp(),
      }));
      await assertFails(updateDoc(planRef, {
        activeStepIndex: 1,
        status: "live",
        compatibilityAffectsRanking: true,
        revealStatus: "countingDown",
        activeRevealRoundIndex: 0,
        revealStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        frozenAt: serverTimestamp(),
      }));
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessPlans", "event-1"),
          eventSuccessPlan(),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-2"),
          eventSuccessPlan({eventId: "event-1"}),
        ),
      );
      await assertFails(
        updateDoc(planRef, {
          liveControlRevision: 1,
          updatedAt: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 3,
              resourceLabelId: "court",
              seatsPerUnit: null,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 3,
              resourceLabelId: "court",
              seatsPerUnit: 2,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "sequence",
            resourceCapacity: {
              concurrentUnits: 0,
              resourceLabelId: "court",
              seatsPerUnit: null,
            },
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 15,
            topology: "neighbour",
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          selectedModuleIds: Array.from({length: 25}, (_, index) => `m-${index}`),
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          structureConfig: {
            unitKind: "pairs",
            unitSize: 2,
            rotationIntervalMinutes: 2,
            revealCountdownSeconds: 10,
          },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          revealStatus: "spoiled",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          compatibilityAffectsRanking: "yes",
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it("freezes event success setup after participant activity or event start", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event({
        startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        bookedCount: 1,
      }));
      await seed(["events", "event-started"], event({
        clubId: "club-1",
        startTime: Timestamp.fromDate(new Date("2026-05-02T01:30:00.000Z")),
        endTime: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
      }));

      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-1"),
          eventSuccessPlan(),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessPlans", "event-started"),
          eventSuccessPlan({
            eventId: "event-started",
          }),
        ),
      );

      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      const planRef = doc(authedDb("host-1"), "eventSuccessPlans", "event-1");

      await assertFails(
        updateDoc(planRef, {
          hostGoal: "Late rewrite.",
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(planRef, {
          activeStepIndex: 1,
          status: "live",
          updatedAt: serverTimestamp(),
          frozenAt: serverTimestamp(),
        }),
      );
    });

    it("allows hosts and active participants to read event success plans", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "cancelled",
          cancelledAt: Timestamp.fromDate(new Date("2026-05-01T11:00:00.000Z")),
        }),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventSuccessPlans", "event-1")),
      );
      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventSuccessPlans", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessPlans", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-3"), "eventSuccessPlans", "event-1")),
      );
    });

    it("grants Event Success to a ready external runtime identity", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(["eventSuccessPlans", "event-1"], eventSuccessPlan());
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-1"],
        eventRuntimeParticipant(),
      );
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-2"],
        eventRuntimeParticipant({
          uid: "runner-2",
          accessStatus: "needsInput",
          readyAt: null,
        }),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessPlans",
        "event-1",
      )));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessPreferences",
        "event-1_runner-1",
      ), eventSuccessPreference()));
      await assertSucceeds(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessCompatibilityResponses",
        "event-1_runner-1",
      ), eventSuccessCompatibilityResponse()));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "eventSuccessPlans",
        "event-1",
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-2"),
        "eventSuccessPreferences",
        "event-1_runner-2",
      ), eventSuccessPreference({uid: "runner-2"})));
    });

    it("allows attended users to submit feedback only after the event has ended", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "signedUp",
        }),
      );

      await assertSucceeds(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1"),
          eventSuccessFeedback(),
        ),
      );
      await assertSucceeds(
        updateDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1"),
          {
            privateNote: "Even better after the second loop.",
            updatedAt: serverTimestamp(),
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-2"), "eventSuccessFeedback", "event-1_runner-2"),
          eventSuccessFeedback({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-2"),
          eventSuccessFeedback(),
        ),
      );

      await seed(
        ["events", "event-future"],
        event({
          startTime: Timestamp.fromDate(new Date("2099-05-02T01:30:00.000Z")),
          endTime: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-future_runner-1"],
        eventParticipation({
          eventId: "event-future",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2099-05-02T02:30:00.000Z")),
        }),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSuccessFeedback", "event-future_runner-1"),
          eventSuccessFeedback({eventId: "event-future"}),
        ),
      );
    });

    it("keeps raw attendee feedback private from hosts and unrelated users", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventSuccessFeedback", "event-1_runner-1"],
        eventSuccessFeedback(),
      );

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "eventSuccessFeedback", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("host-1"), "eventSuccessFeedback", "event-1_runner-1")),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessFeedback"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessFeedback", "event-1_runner-1")),
      );
    });

    it("keeps conversation graph edges attendee-private and server-written", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-02T02:30:00.000Z")),
        }),
      );
      await seed(
        ["eventSuccessConversationGraphs", "event-1_runner-1"],
        eventSuccessConversationGraph(),
      );

      await assertSucceeds(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-2"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("host-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      )));
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "eventSuccessConversationGraphs"),
        where("eventId", "==", "event-1"),
      )));
      await assertFails(setDoc(doc(
        authedDb("runner-1"),
        "eventSuccessConversationGraphs",
        "event-1_runner-1",
      ), eventSuccessConversationGraph()));
    });

    it("keeps event safety reports server-owned", async () => {
      await seed(["eventSafetyReports", "event-1_runner-1"], {
        eventId: "event-1",
        clubId: "club-1",
        reporterUserId: "runner-1",
        feedbackId: "event-1_runner-1",
        source: "event_success_feedback",
        status: "open",
        createdAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
      });

      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventSafetyReports", "event-1_runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("host-1"), "eventSafetyReports", "event-1_runner-1")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("runner-1"), "eventSafetyReports", "event-1_runner-2"),
          {
            eventId: "event-1",
            clubId: "club-1",
            reporterUserId: "runner-1",
            feedbackId: "event-1_runner-1",
            source: "event_success_feedback",
            status: "open",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        ),
      );
    });

    it("allows participants to manage only their own event-success preferences", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "cancelled"}),
      );

      const preferenceRef = doc(
        authedDb("runner-1"),
        "eventSuccessPreferences",
        "event-1_runner-1",
      );

      await assertSucceeds(setDoc(preferenceRef, eventSuccessPreference()));
      await assertSucceeds(updateDoc(preferenceRef, {
        microPodsOptedOut: false,
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessPreferences",
            "event-1_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessPreferences"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessPreferences",
            "event-1_runner-2",
          ),
          eventSuccessPreference({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessPreferences",
            "event-1_runner-2",
          ),
          eventSuccessPreference({uid: "runner-2"}),
        ),
      );
    });

    it("lets participants manage private compatibility answers without host read access", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "cancelled"}),
      );

      const responseRef = doc(
        authedDb("runner-1"),
        "eventSuccessCompatibilityResponses",
        "event-1_runner-1",
      );

      await assertSucceeds(
        setDoc(responseRef, eventSuccessCompatibilityResponse()),
      );
      await assertSucceeds(updateDoc(responseRef, {
        answerIds: ["event_energy_playful_competition"],
        updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(
              authedDb("host-1"),
              "eventSuccessCompatibilityResponses",
            ),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-2",
          ),
          eventSuccessCompatibilityResponse({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessCompatibilityResponses",
            "event-1_runner-2",
          ),
          eventSuccessCompatibilityResponse({uid: "runner-2"}),
        ),
      );
      await assertFails(
        setDoc(
          responseRef,
          eventSuccessCompatibilityResponse({
            answerIds: Array.from({length: 9}, (_, index) => `answer-${index}`),
          }),
        ),
      );
    });

    it("keeps wingman requests server-owned and host-visible", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({
          uid: "runner-2",
          status: "attended",
          attendedAt: Timestamp.fromDate(new Date("2026-05-01T10:00:00.000Z")),
        }),
      );
      await seed(
        ["eventParticipations", "event-1_runner-3"],
        eventParticipation({
          uid: "runner-3",
          status: "signedUp",
        }),
      );

      await seed(
        ["eventSuccessWingmanRequests", "event-1_runner-1"],
        eventSuccessWingmanRequest(),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessWingmanRequests"),
            where("eventId", "==", "event-1"),
            where("status", "==", "active"),
            where("hostVisibleConsent", "==", true),
          ),
        ),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await seed(
        ["eventSuccessWingmanRequests", "event-1_runner-1"],
        eventSuccessWingmanRequest({
          status: "withdrawn",
          updatedAt: Timestamp.fromDate(new Date("2026-05-01T10:05:00.000Z")),
        }),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest(),
        ),
      );
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          {status: "active", updatedAt: serverTimestamp()},
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest({hostVisibleConsent: false}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-1",
          ),
          eventSuccessWingmanRequest({targetUid: "runner-3"}),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-3"),
            "eventSuccessWingmanRequests",
            "event-1_runner-3",
          ),
          eventSuccessWingmanRequest({
            requesterUid: "runner-3",
            targetUid: "runner-1",
          }),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessWingmanRequests",
            "event-1_runner-2",
          ),
          eventSuccessWingmanRequest(),
        ),
      );
    });

    it("keeps First Hello arrival missions server-owned and attendee-private", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "attended"}),
      );
      await seed(
        ["eventSuccessArrivalMissions", "event-1_runner-1"],
        eventSuccessArrivalMission(),
      );

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-1"), "eventSuccessArrivalMissions"),
            where("eventId", "==", "event-1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
          eventSuccessArrivalMission(),
        ),
      );
      await assertFails(
        updateDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-1",
          ),
          {status: "completed", updatedAt: serverTimestamp()},
        ),
      );
      await seed(
        ["eventSuccessArrivalMissions", "event-1_runner-2"],
        eventSuccessArrivalMission({observerUid: "runner-2"}),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessArrivalMissions",
            "event-1_runner-2",
          ),
        ),
      );
    });

    it("keeps event-success assignments server-owned and scoped to the attendee", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventParticipations", "event-1_runner-2"],
        eventParticipation({uid: "runner-2", status: "signedUp"}),
      );
      await seed(
        ["eventSuccessAssignments", "event-1_micro_pods_runner-1"],
        eventSuccessAssignment(),
      );

      await assertSucceeds(
        getDoc(
          doc(
            authedDb("runner-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "micro_pods"),
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authedDb("host-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "guided_rotations"),
          ),
        ),
      );
      await assertFails(
        getDocs(
          query(
            collection(authedDb("runner-1"), "eventSuccessAssignments"),
            where("eventId", "==", "event-1"),
            where("moduleId", "==", "micro_pods"),
          ),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            authedDb("runner-2"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-1",
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(
            authedDb("host-1"),
            "eventSuccessAssignments",
            "event-1_micro_pods_runner-2",
          ),
          eventSuccessAssignment({uid: "runner-2"}),
        ),
      );
    });

    it("keeps prepared rotation drafts host-only and server-owned", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventSuccessAssignmentDrafts", "event-1_guided_rotations_runner-1"],
        {
          eventId: "event-1",
          clubId: "club-1",
          organizerId: "club-1",
          uid: "runner-1",
          moduleId: "guided_rotations",
          roundIndex: 0,
          baseAssignmentRevision: 1,
          assignment: eventSuccessAssignment({
            moduleId: "guided_rotations",
          }),
          createdAt: Timestamp.fromDate(new Date("2026-05-02T01:00:00.000Z")),
          updatedAt: Timestamp.fromDate(new Date("2026-05-02T01:00:00.000Z")),
        },
      );

      const draftRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessAssignmentDrafts",
        "event-1_guided_rotations_runner-1",
      );
      await assertSucceeds(getDoc(draftRef("host-1")));
      await assertFails(getDoc(draftRef("runner-1")));
      await assertFails(setDoc(draftRef("host-1"), {
        eventId: "event-1",
      }));
    });

    it("keeps event matching answer decisions callable-only", async () => {
      await seed(["eventAssignmentFeatureConsents", "consent-1"], {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        featureId: "feature-1",
        status: "granted",
      });
      for (const uid of ["runner-1", "host-1", "other-1"]) {
        const ref = doc(authedDb(uid),
          "eventAssignmentFeatureConsents", "consent-1");
        await assertFails(getDoc(ref));
        await assertFails(setDoc(ref, {status: "withdrawn"}));
        await assertFails(deleteDoc(ref));
      }
      await assertFails(getDocs(collection(authedDb("runner-1"),
        "eventAssignmentFeatureConsents")));
    });

    it("keeps presence private and scopes late-arrival outcomes", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "attended"}),
      );
      const timestamp = Timestamp.fromDate(
        new Date("2026-05-02T01:45:00.000Z"),
      );
      await seed(["eventSuccessPresence", "event-1_runner-1"], {
        eventId: "event-1",
        clubId: "club-1",
        organizerId: "club-1",
        uid: "runner-1",
        surface: "flutter",
        heartbeatAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await seed(["eventSuccessLateArrivals", "event-1_runner-1"], {
        eventId: "event-1",
        clubId: "club-1",
        organizerId: "club-1",
        uid: "runner-1",
        resolvedByUid: "host-1",
        status: "heldForNextRound",
        targetRoundIndex: 2,
        assignmentDraftRevision: 4,
        reason: "The prepared units are full. You will join the next round.",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const presenceRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessPresence",
        "event-1_runner-1",
      );
      await assertFails(getDoc(presenceRef("runner-1")));
      await assertFails(getDoc(presenceRef("host-1")));
      await assertFails(setDoc(presenceRef("runner-1"), {
        eventId: "event-1",
      }));

      const resolutionRef = (uid) => doc(
        authedDb(uid),
        "eventSuccessLateArrivals",
        "event-1_runner-1",
      );
      await assertSucceeds(getDoc(resolutionRef("runner-1")));
      await assertSucceeds(getDoc(resolutionRef("host-1")));
      await assertFails(getDoc(resolutionRef("runner-2")));
      await assertFails(setDoc(resolutionRef("host-1"), {
        eventId: "event-1",
      }));
      await assertFails(getDocs(query(
        collection(authedDb("host-1"), "eventSuccessLateArrivals"),
        where("eventId", "==", "event-1"),
      )));
    });

    it("keeps outcome facts Host-only and shares standings with participants", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(
        ["eventRuntimeParticipants", "event-1_runner-2"],
        eventRuntimeParticipant({uid: "runner-2"}),
      );
      const timestamp = Timestamp.fromDate(
        new Date("2026-05-02T03:00:00.000Z"),
      );
      const outcomes = {
        eventId: "event-1",
        clubId: "club-1",
        unitOutcome: "score",
        revision: 1,
        rounds: [{
          roundIndex: 0,
          entries: [
            {unitId: "team-a", unitLabel: "Team A", score: 12},
          ],
        }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const standings = {
        eventId: "event-1",
        clubId: "club-1",
        unitOutcome: "score",
        revision: 1,
        latestRoundIndex: 0,
        rounds: [{
          roundIndex: 0,
          entries: [{
            unitId: "team-a",
            unitLabel: "Team A",
            position: 1,
            value: 12,
            roundsRecorded: 1,
          }],
        }],
        entries: [{
          unitId: "team-a",
          unitLabel: "Team A",
          position: 1,
          value: 12,
          roundsRecorded: 1,
        }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await seed(["eventSuccessUnitOutcomes", "event-1"], outcomes);
      await seed(["eventSuccessStandings", "event-1"], standings);

      await assertSucceeds(getDoc(doc(
        authedDb("host-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      )));
      await assertFails(getDoc(doc(
        authedDb("runner-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      )));
      for (const uid of ["host-1", "runner-1", "runner-2"]) {
        await assertSucceeds(getDoc(doc(
          authedDb(uid),
          "eventSuccessStandings",
          "event-1",
        )));
      }
      await assertFails(getDoc(doc(
        authedDb("runner-3"),
        "eventSuccessStandings",
        "event-1",
      )));
      await assertFails(getDocs(collection(
        authedDb("runner-1"),
        "eventSuccessStandings",
      )));
      await assertFails(setDoc(doc(
        authedDb("host-1"),
        "eventSuccessStandings",
        "event-1",
      ), standings));
      await assertFails(setDoc(doc(
        authedDb("host-1"),
        "eventSuccessUnitOutcomes",
        "event-1",
      ), outcomes));
    });

    it("exposes event scorecards only to the event host", async () => {
      await seed(["organizers", "club-1"], club());
      await seed(["events", "event-1"], event());
      await seed(
        ["eventParticipations", "event-1_runner-1"],
        eventParticipation({status: "signedUp"}),
      );
      await seed(["eventSuccessScorecards", "event-1"], {
        eventId: "event-1",
        clubId: "club-1",
        feedbackCount: 2,
        updatedAt: Timestamp.fromDate(new Date("2026-05-02T03:00:00.000Z")),
      });

      await assertSucceeds(
        getDoc(doc(authedDb("host-1"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "eventSuccessScorecards", "event-1")),
      );
      await assertFails(
        setDoc(
          doc(authedDb("host-1"), "eventSuccessScorecards", "event-1"),
          {eventId: "event-1"},
        ),
      );
    });
  });

  describe("participant success metrics", () => {
    it("keeps raw and admin participant metrics server-owned", async () => {
      await seed(["participantSignalFacts", "fact-1"], {
        uid: "runner-1",
        type: "incoming_like",
        source: "swipe",
      });
      await seed(["participantMetricCounters", "runner-1"], {
        uid: "runner-1",
        counters: {incoming_like: 1},
      });
      await seed(["participantMarketplaceMetrics", "runner-1"], {
        uid: "runner-1",
        demandPercentile: 80,
      });

      await assertFails(
        getDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-1"), "participantMetricCounters", "runner-1")),
      );
      await assertFails(
        getDoc(
          doc(authedDb("runner-1"), "participantMarketplaceMetrics", "runner-1"),
        ),
      );
      await assertFails(
        setDoc(doc(authedDb("runner-1"), "participantSignalFacts", "fact-2"), {
          uid: "runner-1",
        }),
      );
    });

    it("lets users read only their own materialized momentum summary", async () => {
      await seed(["participantMomentum", "runner-1"], {
        uid: "runner-1",
        profileMomentum: 0.7,
      });

      await assertSucceeds(
        getDoc(doc(authedDb("runner-1"), "participantMomentum", "runner-1")),
      );
      await assertFails(
        getDoc(doc(authedDb("runner-2"), "participantMomentum", "runner-1")),
      );
      await assertFails(
        setDoc(doc(authedDb("runner-1"), "participantMomentum", "runner-1"), {
          uid: "runner-1",
        }),
      );
    });
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
        "operationDecisions",
        "operationLeases",
        "operationPublicationPlans",
        "operationRuleProposals",
        "operationRuleEvaluations",
        "adminActionExecutions",
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
        "eventRehearsalMilestones",
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

  describe("private workspace relationship authority", () => {
    it("denies direct access for guests, managers and unauthenticated viewers",
      async () => {
        const collections = ["workspaceFieldAssertions", "workspaceFieldDecisions",
          "programLodgingProposals", "programLodgingWorkflows", "programLodgingReceipts", "programLodgingSourceVersions", "programLodgingConfigs", "workspaceMembershipAssertions", "workspaceMembershipDecisions",
          "organizerCommunityMemberships", "organizerCommunityMembershipDecisions"];
        for (const name of collections) {
          await seed([name, "doc-1"], {uid: "guest-1", organizerId: "club-1"});
          for (const db of [authedDb("guest-1"), authedDb("host-1"),
            testEnv.unauthenticatedContext().firestore()]) {
            const ref = doc(db, name, "doc-1");
            await assertFails(getDoc(ref));
            await assertFails(getDocs(collection(db, name)));
            await assertFails(setDoc(ref, {uid: "guest-1", organizerId: "club-1"}));
            await assertFails(updateDoc(ref, {state: "active"}));
            await assertFails(deleteDoc(ref));
          }
        }
      });
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
