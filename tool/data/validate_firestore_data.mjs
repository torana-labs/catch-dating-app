#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {
  validateClubDocument,
  validateOrganizerDocument,
  validateClubMembershipDocument,
  validateEventDocument,
  validateSwipeDocument,
} from "../contracts/generated/schema_contract_validators.mjs";
import {
  EVENT_MAX_DURATION_MINUTES,
  scheduleComplianceIssues,
} from "../demo/demo_schedule_policy.mjs";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);

const DEFAULT_MAX_DOCS = 5000;
const WARN_DOC_BYTES = 768 * 1024;
const ERROR_DOC_BYTES = 950 * 1024;

const ARRAY_LIMITS = {
  "users.profilePhotos": 6,
  "publicProfiles.profilePhotos": 6,
  "matches.participantIds": 20,
  "matches.eventIds": 100,
};

const retiredProfileFields = [
  "photoUrls",
  "photoThumbnailUrls",
  "photoPrompts",
  "paceMinSecsPerKm",
  "paceMaxSecsPerKm",
  "preferredDistances",
  "runningReasons",
  "preferredRunTimes",
  "runPreferencesVersion",
];

// Importing this module is offline: only the CLI boundary initializes Firebase.
export async function main(argv, {firestore} = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  const emulatorHost = args.emulatorHost ?? process.env.FIRESTORE_EMULATOR_HOST;
  let app;
  let db = firestore;
  if (!db) {
    if (emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const admin = requireFromFunctions("firebase-admin");
    app = admin.initializeApp({projectId});
    db = app.firestore();
  }
  try {
    const report = createReport({projectId, emulatorHost, maxDocs: args.maxDocs});
    const collections = await loadCollections(db, args.maxDocs, {
      includeScheduleLocks: args.checkScheduleLocks,
    });
    validateAll(collections, report, {checkScheduleLocks: args.checkScheduleLocks});
    const json = `${JSON.stringify(report, null, 2)}\n`;
    // Complete the artifact before reporting failure; stdout may be a slow pipe.
    if (args.output) fs.writeFileSync(args.output, json, {mode: 0o600});
    if (args.json) process.stdout.write(json);
    else printReport(report);
    process.exitCode = report.summary.errors > 0 ||
      (args.failOnWarning && report.summary.warnings > 0) ? 1 : 0;
    return report;
  } finally {
    if (app) {
      await db.terminate();
      await app.delete();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}

function parseArgs(argv) {
  const parsed = {
    env: null,
    project: null,
    emulatorHost: null,
    maxDocs: DEFAULT_MAX_DOCS,
    json: false,
    output: null,
    failOnWarning: false,
    checkScheduleLocks: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--output") parsed.output = requireValue(argv, ++i, arg);
    else if (arg === "--fail-on-warning") parsed.failOnWarning = true;
    else if (arg === "--check-schedule-locks") parsed.checkScheduleLocks = true;
    else if (arg === "--emulator") parsed.emulatorHost = "127.0.0.1:8080";
    else if (arg === "--emulator-host") parsed.emulatorHost = requireValue(argv, ++i, arg);
    else if (arg === "--env") parsed.env = requireValue(argv, ++i, arg);
    else if (arg === "--project") parsed.project = requireValue(argv, ++i, arg);
    else if (arg === "--max-docs") {
      parsed.maxDocs = Number(requireValue(argv, ++i, arg));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isSafeInteger(parsed.maxDocs) || parsed.maxDocs < 1) {
    throw new Error("--max-docs must be a positive integer.");
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`
Read-only Firestore data validator.

Usage:
  node tool/data/validate_firestore_data.mjs --env dev
  node tool/data/validate_firestore_data.mjs --env staging --json
  node tool/data/validate_firestore_data.mjs --project catchdates-dev
  node tool/data/validate_firestore_data.mjs --env dev --emulator

Options:
  --env <dev|staging|prod>       Resolve project id from .firebaserc.
  --project <firebase-project>   Explicit Firebase/GCP project id.
  --emulator                     Use FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
  --emulator-host <host:port>    Use a custom Firestore emulator host.
  --max-docs <n>                 Per-collection cap, default ${DEFAULT_MAX_DOCS}.
  --check-schedule-locks         Also verify server schedule lock documents.
  --json                         Emit machine-readable JSON.
  --output <file>                 Save complete JSON before setting failure status.
  --fail-on-warning              Exit non-zero on warnings as well as errors.
`);
}

export async function loadCollections(firestore, maxDocs, {includeScheduleLocks = false} = {}) {
  const topLevel = [
    "users",
    "hostProfiles",
    "publicProfiles",
    "clubs",
    "organizers",
    "clubMemberships",
    "events",
    "eventParticipations",
    "savedEvents",
    "reviews",
    "matches",
    "onboarding_drafts",
  ];
  const result = {};
  for (const collectionName of topLevel) {
    result[collectionName] = await readQuery(
      firestore.collection(collectionName),
      maxDocs
    );
  }
  result.clubScheduleLocks = includeScheduleLocks ?
    await readQuery(firestore.collection("clubScheduleLocks"), maxDocs) :
    [];
  result.userEventScheduleLocks = includeScheduleLocks ?
    await readQuery(firestore.collection("userEventScheduleLocks"), maxDocs) :
    [];
  result.outgoing = await readQuery(
    firestore.collectionGroup("outgoing"),
    maxDocs
  );
  result.messages = await readQuery(
    firestore.collectionGroup("messages"),
    maxDocs
  );
  return result;
}

async function readQuery(query, maxDocs) {
  const snap = await query.limit(maxDocs).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    path: doc.ref.path,
    data: doc.data(),
    bytes: estimateBytes(doc.data()),
  }));
}

export function createReport({projectId, emulatorHost, maxDocs = DEFAULT_MAX_DOCS}) {
  return {
    reportVersion: 2,
    projectId,
    maxDocs,
    consistency: "bounded-sequential-reads-not-a-snapshot",
    emulatorHost: emulatorHost ?? null,
    generatedAt: new Date().toISOString(),
    summary: {
      scannedDocuments: 0,
      errors: 0,
      warnings: 0,
      largestDocuments: [],
      collections: {},
      completeWithinCap: true,
    },
    documentStates: {},
    issues: [],
  };
}

export function validateAll(collections, currentReport, {checkScheduleLocks = false} = {}) {
  const users = byId(collections.users);
  const hostProfiles = byId(collections.hostProfiles);
  const publicProfiles = byId(collections.publicProfiles);
  const clubs = byId([...collections.clubs, ...collections.organizers]);
  const events = byId(collections.events);
  const eventParticipations = byId(collections.eventParticipations);
  const matches = byId(collections.matches);

  for (const [name, docs] of Object.entries(collections)) {
    const enabled = !["clubScheduleLocks", "userEventScheduleLocks"].includes(name) ||
      checkScheduleLocks;
    const limitReached = enabled && docs.length >= currentReport.maxDocs;
    currentReport.summary.collections[name] = {
      scannedDocuments: docs.length, enabled, limitReached,
      errors: 0, warnings: 0, documentsWithIssues: 0,
    };
    for (const doc of docs) {
      currentReport.documentStates[doc.path] = documentState(doc);
      validateDocumentSize(doc, currentReport);
    }
    if (limitReached) {
      currentReport.summary.completeWithinCap = false;
      issue(currentReport, "warning", name, "scan-limit-reached",
        "Query reached its cap; references and aggregate findings are provisional within this scan.");
    }
  }

  for (const doc of collections.users) validateUser(doc, currentReport);
  for (const doc of collections.publicProfiles) {
    validatePublicProfile(doc, currentReport);
  }
  validateSyntheticPublicProfileIdentities(
    collections.publicProfiles,
    currentReport
  );
  for (const doc of [...collections.clubs, ...collections.organizers]) {
    validateClub(doc, users, currentReport);
  }
  for (const doc of collections.clubMemberships) {
    validateClubMembership(doc, users, clubs, currentReport);
  }
  for (const doc of collections.events) validateRun(doc, clubs, currentReport);
  for (const doc of collections.eventParticipations) {
    validateEventParticipation(doc, users, events, currentReport);
  }
  for (const doc of collections.savedEvents) {
    validateSavedEvent(doc, users, events, currentReport);
  }
  for (const doc of collections.reviews) {
    validateReview(doc, users, clubs, events, currentReport);
  }
  for (const doc of collections.outgoing) {
    validateSwipe(doc, users, publicProfiles, events, eventParticipations,
      currentReport);
  }
  for (const doc of collections.matches) validateMatch(doc, users, currentReport);
  for (const doc of collections.messages) {
    validateMessage(doc, matches, currentReport);
  }
  for (const doc of collections.onboarding_drafts) {
    validateOnboardingDraft(doc, currentReport);
  }
  validateClubMemberCountAggregates(
    collections.clubs,
    collections.clubMemberships,
    currentReport
  );
  validateRunAggregateCounts(
    collections.events,
    collections.eventParticipations,
    currentReport
  );
  validateClubHostProfileProjections(
    collections.clubs,
    hostProfiles,
    currentReport
  );
  validateSchedulePolicy(collections, currentReport, {checkScheduleLocks});
  const collectionByPath = new Map(Object.entries(collections).flatMap(([name, docs]) =>
    docs.map((doc) => [doc.path, name])));
  for (const [name, docs] of Object.entries(collections)) {
    const paths = new Set(docs.map((doc) => doc.path));
    // Missing-document findings (for example absent schedule locks) still
    // belong to their collection, but not to its scanned-document denominator.
    const findings = currentReport.issues.filter((found) =>
      (collectionByPath.get(found.path) ?? found.path.split("/")[0]) === name);
    Object.assign(currentReport.summary.collections[name], {
      errors: findings.filter((found) => found.severity === "error").length,
      warnings: findings.filter((found) => found.severity === "warning").length,
      documentsWithIssues: new Set(findings.filter((found) => paths.has(found.path))
        .map((found) => found.path)).size,
    });
  }
}

function validateDocumentSize(doc, currentReport) {
  currentReport.summary.scannedDocuments += 1;
  currentReport.summary.largestDocuments.push({
    path: doc.path,
    bytes: doc.bytes,
  });
  currentReport.summary.largestDocuments.sort((a, b) => b.bytes - a.bytes);
  currentReport.summary.largestDocuments =
    currentReport.summary.largestDocuments.slice(0, 20);

  if (doc.bytes >= ERROR_DOC_BYTES) {
    issue(currentReport, "error", doc.path, "doc-size-error",
      `Document is near Firestore's 1 MiB limit: ${doc.bytes} bytes.`);
  } else if (doc.bytes >= WARN_DOC_BYTES) {
    issue(currentReport, "warning", doc.path, "doc-size-warning",
      `Document is large enough to monitor: ${doc.bytes} bytes.`);
  }
}

function validateUser(doc, currentReport) {
  const data = doc.data;
  requireString(data, "name", doc, currentReport);
  requireTimestamp(data, "dateOfBirth", doc, currentReport);
  requireString(data, "gender", doc, currentReport);
  requireString(data, "phoneNumber", doc, currentReport);
  requireBool(data, "profileComplete", doc, currentReport);
  requireArray(data, "profilePhotos", doc, currentReport);
  requireObject(data, "activityPreferences", doc, currentReport);
  requireStringArray(data, "interestedInGenders", doc, currentReport);
  checkArrayLimit("users.profilePhotos", data.profilePhotos, doc, currentReport);
  warnRetiredProfileFields(data, doc, currentReport);
}

function validatePublicProfile(doc, currentReport) {
  const data = doc.data;
  requireArray(data, "profilePhotos", doc, currentReport);
  requireObject(data, "activityPreferences", doc, currentReport);
  checkArrayLimit("publicProfiles.profilePhotos", data.profilePhotos, doc,
    currentReport);
  warnRetiredProfileFields(data, doc, currentReport);
}

function warnRetiredProfileFields(data, doc, currentReport) {
  for (const field of retiredProfileFields) {
    if (Object.hasOwn(data, field)) {
      issue(currentReport, "warning", doc.path, "retired-profile-field",
        `${field} is retired; this legacy field should not reappear after the completed remote cleanup.`);
    }
  }
}

function validateSyntheticPublicProfileIdentities(publicProfiles, currentReport) {
  const seen = new Map();

  for (const doc of publicProfiles) {
    const data = doc.data;
    if (!isSyntheticPublicProfile(doc)) continue;

    const name = normalizedPublicName(data.name);
    const firstProfilePhoto = Array.isArray(data.profilePhotos) ?
      data.profilePhotos[0] :
      null;
    const firstPhoto = typeof firstProfilePhoto?.url === "string" ?
      firstProfilePhoto.url :
      null;
    const firstThumbnail = typeof firstProfilePhoto?.thumbnailUrl === "string" ?
      firstProfilePhoto.thumbnailUrl :
      null;
    if (typeof firstPhoto === "string" &&
        firstPhoto.length > 0 &&
        (typeof firstThumbnail !== "string" || firstThumbnail.length === 0)) {
      issue(currentReport, "warning", doc.path,
        "missing-synthetic-public-profile-thumbnail",
        "Synthetic publicProfiles with photos should include profilePhotos.thumbnailUrl for tiny avatar surfaces.");
    }
    if (!name || typeof firstPhoto !== "string" || firstPhoto.length === 0) {
      continue;
    }

    const key = `${name}|${firstPhoto}`;
    const firstPath = seen.get(key);
    if (firstPath) {
      issue(currentReport, "warning", doc.path,
        "duplicate-synthetic-public-identity",
        `Synthetic public profile has the same visible name and primary photo as ${firstPath}.`);
    } else {
      seen.set(key, doc.path);
    }
  }
}

function validateClub(doc, users, currentReport) {
  const data = doc.data;
  validateSchema(doc, doc.path.startsWith("organizers/") ?
    validateOrganizerDocument : validateClubDocument, currentReport);
  requireTimestamp(data, "createdAt", doc, currentReport);

  if (Number.isInteger(data.memberCount) && data.memberCount < 0) {
    issue(currentReport, "error", doc.path, "negative-member-count",
      "memberCount cannot be negative.");
  }
  if (data.hostUserId && !users.has(data.hostUserId)) {
    issue(currentReport, "warning", doc.path, "missing-host-user",
      `hostUserId references missing users/${data.hostUserId}.`);
  }
  validateNoRetiredStoragePath(data.imageUrl, "imageUrl", doc, currentReport);
  validateNoRetiredStoragePath(
    data.profileImageUrl,
    "profileImageUrl",
    doc,
    currentReport
  );
}

function isSyntheticPublicProfile(doc) {
  return doc.data.synthetic === true ||
    typeof doc.data.seedPrefix === "string" ||
    doc.id.startsWith("demo_");
}

function validateClubMembership(doc, users, clubs, currentReport) {
  const data = doc.data;
  validateSchema(doc, validateClubMembershipDocument, currentReport);
  requireTimestamp(data, "joinedAt", doc, currentReport);
  for (const field of ["leftAt", "deletedAt"]) {
    if (data[field] != null) requireTimestamp(data, field, doc, currentReport);
  }
  if (data.clubId && data.uid && doc.id !== `${data.clubId}_${data.uid}`) {
    issue(currentReport, "error", doc.path, "membership-id-mismatch",
      "document id must be {clubId}_{uid}.");
  }
  if (data.clubId && !clubs.has(data.clubId)) {
    issue(currentReport, "warning", doc.path, "missing-membership-club",
      `clubId references missing clubs/${data.clubId}.`);
  }
  if (data.uid && !users.has(data.uid)) {
    issue(currentReport, "warning", doc.path, "missing-membership-user",
      `uid references missing users/${data.uid}.`);
  }
}

function validateRun(doc, clubs, currentReport) {
  const data = doc.data;
  validateSchema(doc, validateEventDocument, currentReport);
  requireTimestamp(data, "startTime", doc, currentReport);
  if (Object.hasOwn(data, "endTime")) requireTimestamp(data, "endTime", doc, currentReport);
  // Private setup can have a named venue before geocoding. Any supplied
  // structured location still needs coherent mirrors.
  if (data.publicationState !== "private" ||
      ["meetingLocation", "startingPointLat", "startingPointLng"]
        .some((field) => Object.hasOwn(data, field))) {
    validateEventMeetingLocation(data, doc, currentReport);
  }

  if (data.clubId && !clubs.has(data.clubId)) {
    issue(currentReport, "error", doc.path, "missing-club",
      `clubId references missing clubs/${data.clubId}.`);
  }
  if (isTimestamp(data.startTime) && isTimestamp(data.endTime) &&
      data.endTime.toMillis() <= data.startTime.toMillis()) {
    issue(currentReport, "error", doc.path, "invalid-event-time",
      "endTime must be after startTime.");
  }
  if (isTimestamp(data.startTime) && isTimestamp(data.endTime)) {
    const durationMinutes =
      (data.endTime.toMillis() - data.startTime.toMillis()) / (60 * 1000);
    if (durationMinutes > EVENT_MAX_DURATION_MINUTES) {
      issue(currentReport, "error", doc.path, "event-duration-too-long",
        `Event duration is ${durationMinutes} minutes, max ${EVENT_MAX_DURATION_MINUTES}.`);
    }
  }
  if (Number.isInteger(data.bookedCount) &&
      data.bookedCount > data.capacityLimit) {
    issue(currentReport, "error", doc.path, "over-capacity",
      "bookedCount exceeds capacityLimit.");
  }
  for (const field of ["bookedCount", "checkedInCount", "waitlistedCount"]) {
    if (Number.isInteger(data[field]) && data[field] < 0) {
      issue(currentReport, "error", doc.path, "negative-event-count",
        `${field} cannot be negative.`);
    }
  }
  validateNoRetiredStoragePath(data.photoUrl, "photoUrl", doc, currentReport);
}

function validateEventMeetingLocation(data, doc, currentReport) {
  const location = data.meetingLocation;
  const validObject = location != null &&
    typeof location === "object" &&
    !Array.isArray(location);
  if (!validObject) {
    issue(currentReport, "error", doc.path,
      "invalid-event-meeting-location",
      "meetingLocation must be a required structured object.");
  }

  const scalarLatitudeValid = validCoordinate(data.startingPointLat, -90, 90);
  const scalarLongitudeValid = validCoordinate(
    data.startingPointLng,
    -180,
    180
  );
  if (!scalarLatitudeValid || !scalarLongitudeValid) {
    issue(currentReport, "error", doc.path, "invalid-event-coordinates",
      "startingPointLat and startingPointLng are required finite coordinates.");
  }
  if (!validObject) return;

  const nameValid = typeof location.name === "string" &&
    location.name.trim().length > 0;
  const latitudeValid = validCoordinate(location.latitude, -90, 90);
  const longitudeValid = validCoordinate(location.longitude, -180, 180);
  const optionalStringsValid = ["address", "placeId", "notes"].every(
    (field) => location[field] == null || typeof location[field] === "string"
  );
  if (!nameValid || !latitudeValid || !longitudeValid ||
      !optionalStringsValid) {
    issue(currentReport, "error", doc.path,
      "invalid-event-meeting-location",
      "meetingLocation requires a name, finite coordinates, and nullable text metadata.");
    return;
  }

  if (scalarLatitudeValid && scalarLongitudeValid &&
      (location.name !== data.meetingPoint ||
       location.latitude !== data.startingPointLat ||
       location.longitude !== data.startingPointLng ||
       (location.notes ?? null) !== (data.locationDetails ?? null))) {
    issue(currentReport, "error", doc.path,
      "event-location-mirror-mismatch",
      "Structured meetingLocation and legacy event location mirrors must match.");
  }
}

function validCoordinate(value, minimum, maximum) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum;
}

function validateNoRetiredStoragePath(value, field, doc, currentReport) {
  const objectPath = storagePathFromFirebaseUrl(value);
  if (objectPath?.startsWith("clubs/")) {
    issue(currentReport, "error", doc.path, "retired-storage-media-path",
      `${field} references retired Storage path ${objectPath}; ` +
      "club/event media must live under users/{uid}/hostedMedia.");
  }
}

function storagePathFromFirebaseUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith("gs://")) {
    const withoutScheme = value.slice("gs://".length);
    const firstSlash = withoutScheme.indexOf("/");
    return firstSlash === -1 ? null : withoutScheme.slice(firstSlash + 1);
  }
  try {
    const url = new URL(value);
    if (url.hostname !== "firebasestorage.googleapis.com") return null;
    const marker = "/o/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch (_) {
    return null;
  }
}

function validateEventParticipation(doc, users, events, currentReport) {
  const data = doc.data;
  requireString(data, "eventId", doc, currentReport);
  requireString(data, "clubId", doc, currentReport);
  requireString(data, "uid", doc, currentReport);
  requireString(data, "status", doc, currentReport);
  requireTimestamp(data, "createdAt", doc, currentReport);
  requireTimestamp(data, "updatedAt", doc, currentReport);

  if (!["signedUp", "waitlisted", "attended", "cancelled", "deleted"]
    .includes(data.status)) {
    issue(currentReport, "error", doc.path, "invalid-participation-status",
      "status must be signedUp, waitlisted, attended, cancelled, or deleted.");
  }
  if (data.eventId && data.uid && doc.id !== `${data.eventId}_${data.uid}`) {
    issue(currentReport, "error", doc.path, "participation-id-mismatch",
      "document id must be {eventId}_{uid}.");
  }
  const event = events.get(data.eventId);
  if (!event) {
    issue(currentReport, "warning", doc.path, "missing-participation-event",
      `eventId references missing events/${data.eventId}.`);
  } else if (event.data.clubId !== data.clubId) {
    issue(currentReport, "error", doc.path, "participation-club-mismatch",
      "clubId does not match the parent event.");
  }
  if (data.status === "attended" &&
      event &&
      isTimestamp(event.data.startTime) &&
      event.data.startTime.toMillis() > Date.now()) {
    issue(currentReport, "error", doc.path, "future-event-attended",
      "future events cannot have attended eventParticipations.");
  }
  if (data.uid && !users.has(data.uid)) {
    issue(currentReport, "warning", doc.path, "missing-participation-user",
      `uid references missing users/${data.uid}.`);
  }
}

function validateSavedEvent(doc, users, events, currentReport) {
  const data = doc.data;
  requireString(data, "uid", doc, currentReport);
  requireString(data, "eventId", doc, currentReport);
  requireTimestamp(data, "savedAt", doc, currentReport);

  if (data.uid && data.eventId && doc.id !== `${data.uid}_${data.eventId}`) {
    issue(currentReport, "error", doc.path, "saved-event-id-mismatch",
      "document id must be {uid}_{eventId}.");
  }
  if (data.uid && !users.has(data.uid)) {
    issue(currentReport, "warning", doc.path, "missing-saved-event-user",
      `uid references missing users/${data.uid}.`);
  }
  if (data.eventId && !events.has(data.eventId)) {
    issue(currentReport, "warning", doc.path, "missing-saved-event",
      `eventId references missing events/${data.eventId}.`);
  }
}

function validateReview(doc, users, clubs, events, currentReport) {
  const data = doc.data;
  requireString(data, "clubId", doc, currentReport);
  requireString(data, "reviewerUserId", doc, currentReport);
  requireString(data, "reviewerName", doc, currentReport);
  requireInteger(data, "rating", doc, currentReport);
  requireString(data, "comment", doc, currentReport);
  requireTimestamp(data, "createdAt", doc, currentReport);

  if (data.rating < 1 || data.rating > 5) {
    issue(currentReport, "error", doc.path, "invalid-rating",
      "rating must be between 1 and 5.");
  }
  if (data.clubId && !clubs.has(data.clubId)) {
    issue(currentReport, "error", doc.path, "missing-review-club",
      `clubId references missing clubs/${data.clubId}.`);
  }
  if (!data.eventId) {
    issue(currentReport, "warning", doc.path, "legacy-review-id",
      "Review has no eventId; new reviews must be event-scoped.");
  } else {
    const expectedId = `${data.eventId}~${data.reviewerUserId}`;
    if (doc.id !== expectedId) {
      issue(currentReport, "error", doc.path, "review-id-mismatch",
        `Expected deterministic review id ${expectedId}.`);
    }
    const event = events.get(data.eventId);
    if (!event) {
      issue(currentReport, "error", doc.path, "missing-review-event",
        `eventId references missing events/${data.eventId}.`);
    } else if (event.data.clubId !== data.clubId) {
      issue(currentReport, "error", doc.path, "review-club-mismatch",
        "Review eventId belongs to a different clubId.");
    }
  }
  const reviewer = users.get(data.reviewerUserId);
  if (reviewer) {
    const expectedReviewerName = publicDisplayName(reviewer.data);
    if (data.reviewerName !== expectedReviewerName) {
      issue(currentReport, "error", doc.path, "reviewer-name-drift",
        "reviewerName differs from the current user public-name projection.");
    }
  }
}

function validateSwipe(doc, users, publicProfiles, events, eventParticipations,
  currentReport) {
  const data = doc.data;
  const pathMatch = /^(?:profileDecisions|swipes)\/([^/]+)\/outgoing\/([^/]+)$/.exec(doc.path);
  if (!pathMatch) {
    issue(currentReport, "warning", doc.path, "unrecognized-outgoing-path",
      "Outgoing collection-group document is outside profileDecisions or legacy swipes.");
    return;
  }
  validateSchema(doc, validateSwipeDocument, currentReport);
  requireTimestamp(data, "createdAt", doc, currentReport);
  if (doc.path.startsWith("swipes/")) {
    issue(currentReport, "warning", doc.path, "legacy-swipe-path",
      "Profile decision uses the legacy swipes path.");
  }
  if (pathMatch &&
      (pathMatch[1] !== data.swiperId || pathMatch[2] !== data.targetId)) {
    issue(currentReport, "error", doc.path, "swipe-path-data-mismatch",
      "swipe path user IDs do not match swiperId/targetId.");
  }
  if (data.swiperId && !users.has(data.swiperId)) {
    issue(currentReport, "warning", doc.path, "missing-swiper-user",
      `swiperId references missing users/${data.swiperId}.`);
  }
  if (data.targetId && !publicProfiles.has(data.targetId)) {
    issue(currentReport, "warning", doc.path, "missing-target-profile",
      `targetId references missing publicProfiles/${data.targetId}.`);
  }
  const event = events.get(data.eventId);
  if (!event) {
    issue(currentReport, "error", doc.path, "missing-swipe-event",
      `eventId references missing events/${data.eventId}.`);
  } else if (!hasAttendedRun(eventParticipations, data.eventId, data.swiperId) ||
      !hasAttendedRun(eventParticipations, data.eventId, data.targetId)) {
    issue(currentReport, "error", doc.path, "swipe-event-attendance-mismatch",
      "swiperId and targetId must both have attended eventParticipations for the swipe event.");
  }
}

function hasAttendedRun(eventParticipations, eventId, uid) {
  if (!eventId || !uid) return false;
  const participation = eventParticipations.get(`${eventId}_${uid}`);
  return participation?.data?.status === "attended";
}

function validateMatch(doc, users, currentReport) {
  const data = doc.data;
  requireString(data, "user1Id", doc, currentReport);
  requireString(data, "user2Id", doc, currentReport);
  requireStringArray(data, "participantIds", doc, currentReport);
  if (Array.isArray(data.eventIds)) {
    requireStringArray(data, "eventIds", doc, currentReport);
  } else {
    requireString(data, "eventId", doc, currentReport);
  }
  requireTimestamp(data, "createdAt", doc, currentReport);
  requireObject(data, "unreadCounts", doc, currentReport);
  requireString(data, "status", doc, currentReport);
  checkArrayLimit("matches.participantIds", data.participantIds, doc, currentReport);
  checkArrayLimit("matches.eventIds", data.eventIds, doc, currentReport);

  for (const uid of [data.user1Id, data.user2Id]) {
    if (uid && !users.has(uid)) {
      issue(currentReport, "warning", doc.path, "missing-match-user",
        `${uid} is not present in users.`);
    }
  }
  if (Array.isArray(data.participantIds) &&
      (!data.participantIds.includes(data.user1Id) ||
       !data.participantIds.includes(data.user2Id))) {
    issue(currentReport, "error", doc.path, "participant-id-mismatch",
      "participantIds must include user1Id and user2Id.");
  }
}

function validateMessage(doc, matches, currentReport) {
  const data = doc.data;
  const pathMatch = /^matches\/([^/]+)\/messages\/([^/]+)$/.exec(doc.path);
  const legacyPathMatch = /^chats\/([^/]+)\/messages\/([^/]+)$/.exec(doc.path);
  requireString(data, "senderId", doc, currentReport);
  requireTimestamp(data, "sentAt", doc, currentReport);
  if (typeof data.text !== "string" && typeof data.imageUrl !== "string") {
    issue(currentReport, "error", doc.path, "message-empty-content",
      "message must contain text or imageUrl.");
  }
  if (legacyPathMatch) {
    issue(currentReport, "warning", doc.path, "legacy-chat-message-path",
      "message still lives under chats/{matchId}/messages; migrate it to matches/{matchId}/messages.");
  }
  if (!pathMatch) return;
  const match = matches.get(pathMatch[1]);
  if (!match) {
    issue(currentReport, "warning", doc.path, "missing-message-match",
      `Message belongs to missing matches/${pathMatch[1]}.`);
  } else if (Array.isArray(match.data.participantIds) &&
      !match.data.participantIds.includes(data.senderId)) {
    issue(currentReport, "error", doc.path, "message-sender-not-participant",
      "senderId is not a participant in the parent match.");
  }
}

function validateOnboardingDraft(doc, currentReport) {
  requireInteger(doc.data, "step", doc, currentReport);
}

function validateClubMemberCountAggregates(
  clubs,
  clubMemberships,
  currentReport
) {
  const activeCounts = new Map();
  for (const doc of clubMemberships) {
    const data = doc.data;
    if (data.status !== "active" || typeof data.clubId !== "string") continue;
    activeCounts.set(data.clubId, (activeCounts.get(data.clubId) ?? 0) + 1);
  }

  for (const doc of clubs) {
    const expected = activeCounts.get(doc.id) ?? 0;
    if (doc.data.memberCount !== expected) {
      issue(currentReport, "error", doc.path, "member-count-drift",
        `memberCount is ${doc.data.memberCount}, but active ` +
        `clubMemberships count is ${expected}.`);
    }
  }
}

function validateRunAggregateCounts(events, eventParticipations, currentReport) {
  const aggregates = new Map();
  for (const doc of eventParticipations) {
    const data = doc.data;
    if (typeof data.eventId !== "string") continue;
    const aggregate = runAggregate(aggregates, data.eventId);
    if (data.status === "signedUp" || data.status === "attended") {
      aggregate.bookedCount += 1;
      if (typeof data.genderAtSignup === "string") {
        aggregate.genderCounts[data.genderAtSignup] =
          (aggregate.genderCounts[data.genderAtSignup] ?? 0) + 1;
      }
    }
    if (data.status === "attended") aggregate.checkedInCount += 1;
    if (data.status === "waitlisted") aggregate.waitlistedCount += 1;
  }

  for (const doc of events) {
    const expected = runAggregate(aggregates, doc.id);
    for (const field of ["bookedCount", "checkedInCount", "waitlistedCount"]) {
      if (doc.data[field] !== expected[field]) {
        issue(currentReport, "error", doc.path, "event-count-drift",
          `${field} is ${doc.data[field]}, but eventParticipations imply ` +
          `${expected[field]}.`);
      }
    }
    if (JSON.stringify(normalizeObject(doc.data.genderCounts ?? {})) !==
        JSON.stringify(normalizeObject(expected.genderCounts))) {
      issue(currentReport, "error", doc.path, "event-gender-count-drift",
        "genderCounts does not match signedUp/attended eventParticipations.");
    }
  }
}

function validateClubHostProfileProjections(clubs, hostProfiles, currentReport) {
  for (const doc of clubs) {
    const data = doc.data;
    if (typeof data.hostUserId !== "string" || data.hostUserId.length === 0) {
      continue;
    }

    const hostProfile = hostProfiles.get(data.hostUserId)?.data;
    if (!hostProfile) continue;

    const expectedName = professionalDisplayName(hostProfile);
    const expectedAvatarUrl = professionalAvatarUrl(hostProfile);
    if (data.hostName !== expectedName) {
      issue(currentReport, "error", doc.path, "club-host-name-drift",
        "hostName differs from the current host profile projection.");
    }
    if ((data.hostAvatarUrl ?? null) !== expectedAvatarUrl) {
      issue(currentReport, "error", doc.path, "club-host-avatar-drift",
        "hostAvatarUrl differs from the current host profile projection.");
    }
  }
}

function professionalDisplayName(hostProfile) {
  return hostProfile.displayName?.trim() || "Catch Host";
}

function professionalAvatarUrl(hostProfile) {
  return hostProfile.avatarUrl?.trim() || null;
}

function publicDisplayName(user) {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;

  const firstName = user.firstName?.trim();
  if (firstName) return firstName;

  const legacyName = user.name?.trim();
  if (!legacyName) return "Runner";
  return legacyName.split(/\s+/)[0];
}

function publicAvatarUrl(user) {
  const primaryPhoto = Array.isArray(user.profilePhotos) ?
    user.profilePhotos[0] :
    null;
  return primaryPhoto?.thumbnailUrl ?? primaryPhoto?.url ?? null;
}

function validateSchedulePolicy(collections, currentReport, {checkScheduleLocks}) {
  const unscheduled = new Set(collections.events.filter((doc) =>
    doc.data.publicationState === "private" && !Object.hasOwn(doc.data, "endTime"))
    .map((doc) => doc.id));
  for (const doc of collections.eventParticipations) {
    if (unscheduled.has(doc.data.eventId) &&
        ["signedUp", "waitlisted", "attended"].includes(doc.data.status)) {
      issue(currentReport, "error", doc.path, "participation-event-unscheduled",
        "Scheduled participation references a private event without an end time.");
    }
  }
  const issues = scheduleComplianceIssues({
    events: collections.events.filter((doc) => !unscheduled.has(doc.id)),
    participations: collections.eventParticipations.filter((doc) =>
      !unscheduled.has(doc.data.eventId)),
    clubScheduleLocks: collections.clubScheduleLocks,
    userEventScheduleLocks: collections.userEventScheduleLocks,
    checkLocks: checkScheduleLocks,
  });
  for (const found of issues) {
    issue(currentReport, "error", found.path, found.code, found.message);
  }
}

function runAggregate(aggregates, eventId) {
  if (!aggregates.has(eventId)) {
    aggregates.set(eventId, {
      bookedCount: 0,
      checkedInCount: 0,
      waitlistedCount: 0,
      genderCounts: {},
    });
  }
  return aggregates.get(eventId);
}

function normalizeObject(value) {
  return Object.fromEntries(Object.entries(value).sort());
}

function byId(docs) {
  return new Map(docs.map((doc) => [doc.id, doc]));
}

function normalizedPublicName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function requireString(data, field, doc, currentReport) {
  if (typeof data[field] !== "string") {
    typeIssue(field, "string", doc, currentReport);
  }
}

function requireBool(data, field, doc, currentReport) {
  if (typeof data[field] !== "boolean") {
    typeIssue(field, "boolean", doc, currentReport);
  }
}

function requireInteger(data, field, doc, currentReport) {
  if (!Number.isInteger(data[field])) {
    typeIssue(field, "integer", doc, currentReport);
  }
}

function requireObject(data, field, doc, currentReport) {
  if (typeof data[field] !== "object" ||
      data[field] === null ||
      Array.isArray(data[field])) {
    typeIssue(field, "object", doc, currentReport);
  }
}

function requireArray(data, field, doc, currentReport) {
  if (!Array.isArray(data[field])) {
    typeIssue(field, "array", doc, currentReport);
  }
}

function requireTimestamp(data, field, doc, currentReport) {
  if (!isTimestamp(data[field])) {
    typeIssue(field, "Firestore Timestamp", doc, currentReport);
  }
}

function requireStringArray(data, field, doc, currentReport) {
  if (!Array.isArray(data[field]) ||
      !data[field].every((value) => typeof value === "string")) {
    typeIssue(field, "string[]", doc, currentReport);
  }
}

function typeIssue(field, expected, doc, currentReport) {
  issue(currentReport, "error", doc.path, "field-type",
    `${field} must be ${expected}.`);
}

function checkArrayLimit(key, value, doc, currentReport) {
  if (!Array.isArray(value)) return;
  const max = ARRAY_LIMITS[key];
  if (max && value.length > max) {
    issue(currentReport, "error", doc.path, "array-length",
      `${key} has ${value.length} items, max ${max}.`);
  }
}

function isTimestamp(value) {
  return value &&
    typeof value.toMillis === "function" &&
    typeof value.toDate === "function";
}

function estimateBytes(value) {
  return Buffer.byteLength(JSON.stringify(toJsonSafe(value)), "utf8");
}

function toJsonSafe(value) {
  if (isTimestamp(value)) {
    const seconds = value.seconds ?? value._seconds ?? Math.floor(value.toMillis() / 1000);
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ??
      Math.round((value.toMillis() - seconds * 1000) * 1_000_000);
    return {_seconds: seconds, _nanoseconds: nanoseconds};
  }
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonSafe(item)])
    );
  }
  return value;
}

function validateSchema(doc, validator, currentReport) {
  if (validator(toJsonSafe(doc.data))) return;
  // Report schema locations/keywords, never rejected values or user-authored text.
  for (const error of validator.errors ?? []) {
    issue(currentReport, "error", doc.path, "schema-contract",
      `${error.instancePath || "/"}: ${error.keyword}` +
      `${error.keyword === "required" ? ` (${error.params.missingProperty})` : ""}` +
      ` at ${error.schemaPath}`);
  }
}

function documentState(doc) {
  const data = doc.data;
  const state = {
    collection: doc.path.split("/")[0],
    synthetic: data.synthetic === true,
    hasSeedMarker: typeof data.seedPrefix === "string",
  };
  const enums = {
    status: ["active", "archived", "cancelled", "deleted", "left", "signedUp",
      "waitlisted", "attended"],
    publicationState: ["private", "published"],
    role: ["owner", "host", "member"],
  };
  for (const [field, values] of Object.entries(enums)) {
    if (Object.hasOwn(data, field)) {
      state[field] = values.includes(data[field]) ? data[field] : "unrecognized";
    }
  }
  if (["clubs", "organizers"].includes(state.collection)) {
    state.hasHostUserId = typeof data.hostUserId === "string" && data.hostUserId.length > 0;
  }
  if (state.collection === "events") {
    state.hasEndTime = Object.hasOwn(data, "endTime");
    state.hasMeetingLocation = Object.hasOwn(data, "meetingLocation");
    state.hasSetupRevision = Object.hasOwn(data, "setupRevision");
  }
  return state;
}

function issue(currentReport, severity, pathValue, code, message) {
  currentReport.issues.push({severity, path: pathValue, code, message});
  if (severity === "error") currentReport.summary.errors += 1;
  else currentReport.summary.warnings += 1;
}

function printReport(currentReport) {
  console.log("Firestore data validation report");
  console.log(`Project: ${currentReport.projectId}`);
  if (currentReport.emulatorHost) {
    console.log(`Emulator: ${currentReport.emulatorHost}`);
  }
  console.log(`Scanned docs: ${currentReport.summary.scannedDocuments}`);
  console.log(`Errors: ${currentReport.summary.errors}`);
  console.log(`Warnings: ${currentReport.summary.warnings}`);

  if (currentReport.issues.length > 0) {
    console.log("\nIssues:");
    for (const found of currentReport.issues.slice(0, 200)) {
      console.log(
        `- [${found.severity}] ${found.path} ${found.code}: ${found.message}`
      );
    }
    if (currentReport.issues.length > 200) {
      console.log(`... ${currentReport.issues.length - 200} more issues`);
    }
  }

  if (currentReport.summary.largestDocuments.length > 0) {
    console.log("\nLargest documents:");
    for (const doc of currentReport.summary.largestDocuments.slice(0, 10)) {
      console.log(`- ${doc.path}: ${doc.bytes} bytes`);
    }
  }
}
