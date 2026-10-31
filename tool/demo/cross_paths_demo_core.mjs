#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  assertValidSchemaPayload,
  validateCrossPathsShowcaseEligibilityDocument,
  validateEventCrossPathsConsentDocument,
  validateEventDocument,
  validateEventParticipationDocument,
} from "../contracts/generated/schema_contract_validators.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);

const minimumLeadMillis = 6 * 60 * 60 * 1000;
const maximumHorizonMillis = 14 * 24 * 60 * 60 * 1000;
const reviewerUid = "cross-paths-demo-seed";

export const DEFAULT_CROSS_PATHS_DEMO_CANDIDATE_COUNT = 2;
export const PRODUCTION_CROSS_PATHS_FIXTURE = Object.freeze({
  projectId: "catch-dating-app-64e51",
  seedPrefix: "cross_paths_mumbai_qa",
  viewerUid: "cross_paths_mumbai_qa_user_002",
  eventId: "cross_paths_mumbai_qa_run_mumbai_01_01",
  organizerId: "courtside",
  candidateCount: 2,
  testPhone: "+16505550101",
});

export function assertProductionCrossPathsFixtureRequest({
  projectId,
  emulatorHost = null,
  apply = false,
  allowProd = false,
  allowProdCrossPathsFixture = false,
  configureTestLogin = false,
  seedPrefix,
  viewerUid,
  eventId,
  organizerId,
  candidateCount,
  testPhone,
  testCode,
}) {
  if (emulatorHost || projectId === "catchdates-dev") return;
  if (projectId !== PRODUCTION_CROSS_PATHS_FIXTURE.projectId) {
    throw new Error(
      "seed-cross-paths supports only dev, the emulator, or the exact " +
        "production Mumbai QA fixture."
    );
  }
  const exact = PRODUCTION_CROSS_PATHS_FIXTURE;
  const matchesExactFixture = allowProdCrossPathsFixture &&
    seedPrefix === exact.seedPrefix &&
    viewerUid === exact.viewerUid &&
    eventId === exact.eventId &&
    organizerId === exact.organizerId &&
    candidateCount === exact.candidateCount;
  const writeIsAuthorized = !apply || (
    allowProd &&
    configureTestLogin &&
    testPhone === exact.testPhone &&
    /^\d{6}$/.test(String(testCode ?? ""))
  );
  if (!matchesExactFixture || !writeIsAuthorized) {
    throw new Error(
      "Production Cross Paths seeding is restricted to the exact Mumbai QA " +
        "fixture and requires --allow-prod, --allow-prod-cross-paths-fixture, " +
        "--configure-test-login, and every pinned fixture argument."
    );
  }
}

export function loadCrossPathsDemoHelpers() {
  try {
    const showcase = requireFromFunctions(
      "./lib/crossPaths/showcaseEligibility.js"
    );
    const consent = requireFromFunctions(
      "./lib/crossPaths/setCrossPathsEventConsent.js"
    );
    const relationship = requireFromFunctions(
      "./lib/shared/relationshipEligibility.js"
    );
    const discovery = requireFromFunctions(
      "./lib/events/eventDiscoveryProjection.js"
    );
    return {
      crossPathsShowcaseRuleVersion:
        showcase.crossPathsShowcaseRuleVersion,
      currentCrossPathsTermsVersion: consent.currentCrossPathsTermsVersion,
      evaluateCrossPathsShowcaseReadiness:
        showcase.evaluateCrossPathsShowcaseReadiness,
      isReciprocallyEligible: relationship.isReciprocallyEligible,
      eventDiscoveryProjection: discovery.eventDiscoveryProjection,
    };
  } catch (error) {
    throw new Error(
      "Cross Paths demo seeding requires compiled Functions helpers. " +
        "Run `npm --prefix functions run build` first.",
      {cause: error}
    );
  }
}

export async function buildCrossPathsDemoPlan({
  db,
  admin,
  seedPrefix,
  viewerUid = null,
  eventId = null,
  organizerId = null,
  candidateCount = DEFAULT_CROSS_PATHS_DEMO_CANDIDATE_COUNT,
  testPhone = null,
  now = new Date(),
  helpers = loadCrossPathsDemoHelpers(),
}) {
  assertCandidateCount(candidateCount);
  const nowMillis = now.getTime();
  const [usersSnapshot, eventsSnapshot] = await Promise.all([
    db.collection("users").where("seedPrefix", "==", seedPrefix).get(),
    db.collection("events").where("seedPrefix", "==", seedPrefix).get(),
  ]);
  const users = usersSnapshot.docs
    .map((snapshot) => ({uid: snapshot.id, data: snapshot.data()}))
    .filter(({data}) => data.synthetic === true)
    .sort((left, right) => left.uid.localeCompare(right.uid));
  if (users.length < candidateCount + 1) {
    throw new Error(
      `Seed prefix ${seedPrefix} has ${users.length} synthetic users; ` +
        `${candidateCount + 1} are required. Seed the demo world first.`
    );
  }

  const viewer = viewerUid ?
    users.find((user) => user.uid === viewerUid) :
    users[0];
  if (!viewer) {
    throw new Error(
      `Cross Paths demo viewer ${viewerUid} is not a synthetic ${seedPrefix} user.`
    );
  }
  assertSyntheticReadyUser(viewer, "viewer");

  if (organizerId) {
    const organizerSnapshot = await db.collection("organizers")
      .doc(organizerId)
      .get();
    if (!organizerSnapshot.exists) {
      throw new Error(`Cross Paths fixture organizer ${organizerId} is missing.`);
    }
  }

  const publicProfiles = new Map();
  const loadPublicProfile = async (uid) => {
    if (publicProfiles.has(uid)) return publicProfiles.get(uid);
    const snapshot = await db.collection("publicProfiles").doc(uid).get();
    const value = snapshot.exists ? snapshot.data() : null;
    publicProfiles.set(uid, value);
    return value;
  };

  const allEvents = eventsSnapshot.docs
    .map((snapshot) => ({id: snapshot.id, data: snapshot.data()}))
    .sort((left, right) =>
      left.data.startTime.toMillis() - right.data.startTime.toMillis() ||
      left.id.localeCompare(right.id)
    );
  const events = allEvents
    .filter(({id}) => eventId == null || id === eventId)
    .filter(({data}) => eventEligibleForFixture(data, nowMillis));

  let selection = null;
  for (const event of events) {
    const participationSnapshot = await db.collection("eventParticipations")
      .where("eventId", "==", event.id)
      .get();
    const signedUpUids = participationSnapshot.docs
      .map((snapshot) => snapshot.data())
      .filter((participation) => participation.status === "signedUp")
      .map((participation) => participation.uid)
      .filter((uid) => typeof uid === "string");
    if (!signedUpUids.includes(viewer.uid)) continue;

    const candidates = [];
    for (const uid of [...new Set(signedUpUids)].sort()) {
      if (uid === viewer.uid) continue;
      const candidate = users.find((user) => user.uid === uid);
      if (!candidate) continue;
      const publicProfile = await loadPublicProfile(uid);
      if (!publicProfile || publicProfile.synthetic !== true) continue;
      const readiness = helpers.evaluateCrossPathsShowcaseReadiness(
        publicProfile
      );
      if (readiness.automaticStatus !== "ready") continue;
      if (!helpers.isReciprocallyEligible({
        viewer: viewer.data,
        candidate: candidate.data,
        nowMillis,
      })) {
        continue;
      }
      candidates.push({
        ...candidate,
        publicProfile,
        readiness,
      });
      if (candidates.length === candidateCount) break;
    }
    if (candidates.length === candidateCount) {
      selection = {event, candidates};
      break;
    }
  }
  let fixtureDocs = [];
  if (!selection && eventId) {
    throw new Error(
      `Event ${eventId} does not have viewer ${viewer.uid} plus ` +
        `${candidateCount} signed-up, reciprocal, showcase-ready profiles.`
    );
  }
  if (!selection) {
    const sourceEvent = allEvents.find(({data}) =>
      data.synthetic === true &&
      typeof data.startTime?.toMillis === "function" &&
      typeof data.endTime?.toMillis === "function"
    );
    if (!sourceEvent) {
      throw new Error(
        `No ${seedPrefix} synthetic event exists to template a fresh fixture.`
      );
    }
    const candidates = [];
    for (const candidate of users) {
      if (candidate.uid === viewer.uid) continue;
      const publicProfile = await loadPublicProfile(candidate.uid);
      if (!publicProfile || publicProfile.synthetic !== true) continue;
      const readiness = helpers.evaluateCrossPathsShowcaseReadiness(
        publicProfile
      );
      if (readiness.automaticStatus !== "ready") continue;
      if (!helpers.isReciprocallyEligible({
        viewer: viewer.data,
        candidate: candidate.data,
        nowMillis,
      })) {
        continue;
      }
      candidates.push({...candidate, publicProfile, readiness});
      if (candidates.length === candidateCount) break;
    }
    if (candidates.length !== candidateCount) {
      throw new Error(
        `Seed prefix ${seedPrefix} does not contain ${candidateCount} ` +
          `reciprocal, showcase-ready candidates for ${viewer.uid}.`
      );
    }
    const fresh = buildDedicatedCrossPathsEventDocs({
      admin,
      seedPrefix,
      sourceEvent,
      viewer,
      candidates,
      now,
      helpers,
    });
    selection = {
      event: fresh.event,
      candidates,
    };
    fixtureDocs = fresh.docs;
  }

  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  const existingRecords = await loadExistingCrossPathsRecords({
    db,
    eventId: selection.event.id,
    candidateUids: selection.candidates.map((candidate) => candidate.uid),
  });
  const docs = consolidateDocPlan([
    ...fixtureDocs,
    ...buildCrossPathsDemoDocuments({
      viewer,
      candidates: selection.candidates,
      eventId: selection.event.id,
      organizerId,
      nowTimestamp,
      testPhone,
      helpers,
      existingRecords,
    }),
  ]);

  return {
    command: "seed-cross-paths",
    operationId: `${seedPrefix}_cross_paths_${selection.event.id}`,
    seedPrefix,
    viewerUid: viewer.uid,
    candidateUids: selection.candidates.map((candidate) => candidate.uid),
    candidateNames: selection.candidates.map((candidate) =>
      candidate.publicProfile.name
    ),
    users: [
      viewer.uid,
      ...selection.candidates.map((candidate) => candidate.uid),
    ],
    eventId: selection.event.id,
    eventStartTime: selection.event.data.startTime.toDate().toISOString(),
    testPhone,
    docs,
  };
}

export function buildCrossPathsDemoDocuments({
  viewer,
  candidates,
  eventId,
  organizerId = null,
  nowTimestamp,
  testPhone,
  helpers,
  existingRecords = new Map(),
}) {
  const users = [viewer, ...candidates];
  const docs = [{
    path: `events/${eventId}`,
    data: {
      crossPathsDiscoveryEnabled: true,
      ...(organizerId ? {organizerId} : {}),
    },
  }, ...users.map((user) => ({
    path: `users/${user.uid}`,
    data: {
      prefsShowInCrossPaths: true,
      prefsCrossPathsInvitations: true,
      ...(user.uid === viewer.uid && testPhone ?
        {phoneNumber: testPhone} : {}),
    },
  })), ...(organizerId ? users.map((user) => ({
    path: `eventParticipations/${eventId}_${user.uid}`,
    data: {organizerId: organizerId},
  })) : [])];

  for (const candidate of candidates) {
    const consentPath = `eventCrossPathsConsents/${eventId}_${candidate.uid}`;
    const existingConsent = existingRecords.get(consentPath);
    const consent = {
      eventId,
      uid: candidate.uid,
      enabled: true,
      termsVersion: helpers.currentCrossPathsTermsVersion,
      consentedAt: existingConsent?.consentedAt ?? nowTimestamp,
      updatedAt: nowTimestamp,
      revokedAt: null,
      source: "settings",
    };
    assertValidSchemaPayload(
      validateEventCrossPathsConsentDocument,
      consent,
      consentPath
    );
    docs.push({path: consentPath, data: consent});

    const eligibilityPath =
      `crossPathsShowcaseEligibility/${candidate.uid}`;
    const existingEligibility = existingRecords.get(eligibilityPath);
    const unchangedEligibleReview = existingEligibility?.status === "eligible" &&
      existingEligibility.ruleVersion ===
        helpers.crossPathsShowcaseRuleVersion &&
      existingEligibility.profileFingerprint ===
        candidate.readiness.profileFingerprint;
    const eligibility = {
      status: "eligible",
      reasonCodes: [],
      ruleVersion: helpers.crossPathsShowcaseRuleVersion,
      reviewVersion: unchangedEligibleReview ?
        existingEligibility.reviewVersion :
        (existingEligibility?.reviewVersion ?? 0) + 1,
      profileFingerprint: candidate.readiness.profileFingerprint,
      reviewChecklist: {
        primaryPortraitClear: true,
        profileRepresentsCurrentMember: true,
        showcasePolicyReviewed: true,
      },
      reviewNote:
        "Synthetic internal/demo profile approved by seed-cross-paths.",
      reviewedByUid: reviewerUid,
      reviewedAt: unchangedEligibleReview ?
        existingEligibility.reviewedAt :
        nowTimestamp,
      updatedAt: nowTimestamp,
    };
    assertValidSchemaPayload(
      validateCrossPathsShowcaseEligibilityDocument,
      eligibility,
      eligibilityPath
    );
    docs.push({path: eligibilityPath, data: eligibility});
  }
  return docs;
}

function consolidateDocPlan(docs) {
  const byPath = new Map();
  for (const doc of docs) {
    const prior = byPath.get(doc.path);
    byPath.set(doc.path, {
      path: doc.path,
      data: {...(prior?.data ?? {}), ...doc.data},
    });
  }
  return [...byPath.values()];
}

export async function verifyCrossPathsDemoPlan({db, plan}) {
  const missingPaths = [];
  const mismatchedPaths = [];
  for (const planned of plan.docs) {
    const snapshot = await db.doc(planned.path).get();
    if (!snapshot.exists) {
      missingPaths.push(planned.path);
      continue;
    }
    const actual = snapshot.data();
    for (const [key, expected] of Object.entries(planned.data)) {
      if (!firestoreValueEqual(actual?.[key], expected)) {
        mismatchedPaths.push(`${planned.path}#${key}`);
      }
    }
  }
  return {
    ready: missingPaths.length === 0 && mismatchedPaths.length === 0,
    missingPaths,
    mismatchedPaths,
  };
}

export async function ensureCrossPathsDemoTestLogin({
  admin,
  projectId,
  viewerUid,
  phoneNumber,
  smsCode,
  fetchImpl = globalThis.fetch,
  getFallbackAccessToken = getActiveGcloudAccessToken,
}) {
  assertTestPhone(phoneNumber);
  assertTestSmsCode(smsCode);
  const auth = admin.auth();
  let authUser = null;
  try {
    authUser = await auth.getUser(viewerUid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }
  if (authUser?.phoneNumber && authUser.phoneNumber !== phoneNumber) {
    throw new Error(
      `Auth user ${viewerUid} already uses a different phone number. ` +
        "Refusing to replace it."
    );
  }

  const credential = admin.app().options.credential;
  if (!credential || typeof credential.getAccessToken !== "function") {
    throw new Error("Firebase Admin credential cannot update test-phone config.");
  }
  const adminToken = await credential.getAccessToken();
  const configUrl =
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  let accessToken = adminToken.access_token;
  let configResponse = await fetchIdentityConfig({
    fetchImpl,
    configUrl,
    accessToken,
    quotaProjectId: projectId,
  });
  if (configResponse.status === 401 || configResponse.status === 403) {
    accessToken = await getFallbackAccessToken();
    configResponse = await fetchIdentityConfig({
      fetchImpl,
      configUrl,
      accessToken,
      quotaProjectId: projectId,
    });
  }
  if (!configResponse.ok) {
    throw new Error(
      `Identity Platform config read failed (${configResponse.status}).`
    );
  }
  const config = await configResponse.json();
  const existing = config?.signIn?.phoneNumber?.testPhoneNumbers ?? {};
  const changed = existing[phoneNumber] !== smsCode;
  let phoneTemporarilyCleared = false;
  if (changed) {
    if (authUser?.phoneNumber === phoneNumber) {
      authUser = await auth.updateUser(viewerUid, {phoneNumber: null});
      phoneTemporarilyCleared = true;
    }
    try {
      const patchResponse = await fetchImpl(
        `${configUrl}?updateMask=signIn.phoneNumber.testPhoneNumbers`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "x-goog-user-project": projectId,
          },
          body: JSON.stringify({
            signIn: {
              phoneNumber: {
                testPhoneNumbers: {...existing, [phoneNumber]: smsCode},
              },
            },
          }),
        }
      );
      if (!patchResponse.ok) {
        throw new Error(
          `Identity Platform test-phone update failed (${patchResponse.status}).`
        );
      }
    } catch (error) {
      if (phoneTemporarilyCleared) {
        authUser = await auth.updateUser(viewerUid, {phoneNumber});
      }
      throw error;
    }
  }
  if (!authUser) {
    authUser = await auth.createUser({
      uid: viewerUid,
      phoneNumber,
      displayName: "Cross Paths Demo Viewer",
      disabled: false,
    });
  } else if (!authUser.phoneNumber) {
    authUser = await auth.updateUser(viewerUid, {phoneNumber});
  }
  return {
    viewerUid,
    phoneNumber,
    phoneSuffix: phoneNumber.slice(-4),
    authUserCreatedAt: authUser.metadata?.creationTime ?? null,
    testPhoneConfigChanged: changed,
  };
}

function fetchIdentityConfig({
  fetchImpl,
  configUrl,
  accessToken,
  quotaProjectId,
}) {
  return fetchImpl(configUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": quotaProjectId,
    },
  });
}

function getActiveGcloudAccessToken() {
  try {
    const token = execFileSync(
      "gcloud",
      ["auth", "print-access-token"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).trim();
    if (token) return token;
  } catch {
    // The caller below receives one stable, credential-safe error.
  }
  throw new Error(
    "Identity Platform config requires an active gcloud account with " +
      "firebaseauth.configs.get/update permission."
  );
}

function buildDedicatedCrossPathsEventDocs({
  admin,
  seedPrefix,
  sourceEvent,
  viewer,
  candidates,
  now,
  helpers,
}) {
  const eventId = `${seedPrefix}_cross_paths_demo_event`;
  const startTime = new Date(now.getTime() + 30 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);
  const people = [viewer, ...candidates];
  const source = cloneFirestoreValue(sourceEvent.data);
  const sourcePolicy = source.eventPolicy ?? {};
  const sourceAdmission = sourcePolicy.admission ?? {};
  const event = {
    ...source,
    synthetic: true,
    seedPrefix,
    scenario: "cross-paths",
    demoOps: true,
    demoOpsCommand: "seed-cross-paths",
    demoOpsId: `${seedPrefix}_cross_paths_fixture`,
    startTime: admin.firestore.Timestamp.fromDate(startTime),
    endTime: admin.firestore.Timestamp.fromDate(endTime),
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    priceInPaise: 0,
    capacityLimit: 12,
    bookedCount: people.length,
    checkedInCount: 0,
    waitlistedCount: 0,
    crossPathsPairHeldCount: 0,
    crossPathsPairConfirmedCount: 0,
    crossPathsPairHeldCohortCounts: {},
    crossPathsDiscoveryEnabled: true,
    constraints: {
      ...(source.constraints ?? {}),
      minAge: 18,
      maxAge: 99,
      maxMen: null,
      maxWomen: null,
    },
    eventPolicy: {
      ...sourcePolicy,
      admission: {
        ...sourceAdmission,
        capacityLimit: 12,
        inviteRequired: false,
        membershipRequired: false,
        manualApprovalRequired: false,
        waitlistPolicy: {mode: "disabled", offerWindowMinutes: 0},
        privateAccessPolicy: {
          mode: "none",
          inviteCodeHint: null,
          privateLinkEnabled: false,
        },
        cohortCapacityLimits: {},
        crossPathsPairInventory: {
          enabled: false,
          reservedPairCapacity: 0,
          holdDurationMinutes: 15,
        },
      },
      pricing: {
        ...(sourcePolicy.pricing ?? {}),
        basePriceInPaise: 0,
        cohortAdjustmentsInPaise: {},
        demandPricingRules: [],
      },
    },
    genderCounts: countBy(people, (person) => person.data.gender ?? "other"),
    cohortCounts: countBy(people, (person) =>
      cohortIdForGender(person.data.gender)
    ),
    waitlistedCohortCounts: {},
  };
  Object.assign(event, helpers.eventDiscoveryProjection({
    event,
    organizerLocation: event.discoveryCityName ?? event.cityName ?? event.city,
    organizerLocationMarketId:
      event.discoveryMarketId ?? event.locationMarketId ?? event.city,
    bookedCount: people.length,
  }));
  assertValidSchemaPayload(
    validateEventDocument,
    event,
    `events/${eventId}`
  );

  const signedUpAt = admin.firestore.Timestamp.fromDate(
    new Date(now.getTime() - 60 * 60 * 1000)
  );
  const updatedAt = admin.firestore.Timestamp.fromDate(now);
  const participations = people.map((person) => {
    const data = {
      synthetic: true,
      seedPrefix,
      scenario: "cross-paths",
      eventId,
      organizerId: event.organizerId,
      uid: person.uid,
      status: "signedUp",
      createdAt: signedUpAt,
      updatedAt,
      signedUpAt,
      waitlistedAt: null,
      attendedAt: null,
      cancelledAt: null,
      deletedAt: null,
      genderAtSignup: person.data.gender ?? "other",
      paymentId: null,
    };
    assertValidSchemaPayload(
      validateEventParticipationDocument,
      data,
      `eventParticipations/${eventId}_${person.uid}`
    );
    return {
      path: `eventParticipations/${eventId}_${person.uid}`,
      data,
    };
  });
  return {
    event: {id: eventId, data: event},
    docs: [{path: `events/${eventId}`, data: event}, ...participations],
  };
}

async function loadExistingCrossPathsRecords({
  db,
  eventId,
  candidateUids,
}) {
  const records = new Map();
  const paths = candidateUids.flatMap((uid) => [
    `eventCrossPathsConsents/${eventId}_${uid}`,
    `crossPathsShowcaseEligibility/${uid}`,
  ]);
  for (const recordPath of paths) {
    const snapshot = await db.doc(recordPath).get();
    if (snapshot.exists) records.set(recordPath, snapshot.data());
  }
  return records;
}

function eventEligibleForFixture(event, nowMillis) {
  if (
    event?.synthetic !== true ||
    event.status !== "active" ||
    typeof event.startTime?.toMillis !== "function"
  ) {
    return false;
  }
  const startMillis = event.startTime.toMillis();
  return startMillis >= nowMillis + minimumLeadMillis &&
    startMillis <= nowMillis + maximumHorizonMillis;
}

function cloneFirestoreValue(value) {
  if (value == null || typeof value !== "object") return value;
  if (typeof value.toMillis === "function") return value;
  if (Array.isArray(value)) return value.map(cloneFirestoreValue);
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      cloneFirestoreValue(nested),
    ])
  );
}

function countBy(items, keyFor) {
  const result = {};
  for (const item of items) {
    const key = keyFor(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function cohortIdForGender(gender) {
  if (gender === "man") return "menInterestedInWomen";
  if (gender === "woman") return "womenInterestedInMen";
  if (gender === "nonBinary" || gender === "other") {
    return "nonBinaryOrOther";
  }
  return "queerOrOpen";
}

function assertSyntheticReadyUser(user, label) {
  if (user.data.synthetic !== true || user.data.profileComplete !== true) {
    throw new Error(
      `Cross Paths demo ${label} ${user.uid} must be synthetic and profile-complete.`
    );
  }
}

function assertCandidateCount(value) {
  if (!Number.isInteger(value) || value < 1 || value > 2) {
    throw new Error("--candidate-count must be 1 or 2.");
  }
}

function assertTestPhone(value) {
  if (!/^\+165055501\d{2}$/.test(String(value ?? ""))) {
    throw new Error(
      "--test-phone must use the fictional +1 650-555-01xx range."
    );
  }
}

function assertTestSmsCode(value) {
  if (!/^\d{6}$/.test(String(value ?? ""))) {
    throw new Error("--test-code must contain exactly six digits.");
  }
}

function firestoreValueEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (
    typeof left?.toMillis === "function" &&
    typeof right?.toMillis === "function"
  ) {
    return left.toMillis() === right.toMillis();
  }
  if (typeof left?.isEqual === "function") {
    return left.isEqual(right);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) =>
        firestoreValueEqual(value, right[index])
      );
  }
  if (
    left != null &&
    right != null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) =>
        key === rightKeys[index] &&
        firestoreValueEqual(left[key], right[key])
      );
  }
  return false;
}
