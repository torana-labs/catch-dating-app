import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {createReport, loadCollections, validateAll} from "./validate_firestore_data.mjs";

const requireFromFunctions = createRequire(new URL("../../functions/package.json", import.meta.url));
const {Timestamp} = requireFromFunctions("firebase-admin/firestore");
const fixtureRoot = new URL("../../contracts/fixtures/valid/", import.meta.url);
const validatorUrl = new URL("./validate_firestore_data.mjs", import.meta.url).href;
const fixture = (name) => JSON.parse(fs.readFileSync(new URL(name, fixtureRoot), "utf8"));
function timestamp(value) {
  if (value && typeof value === "object" && Number.isInteger(value._seconds)) {
    return new Timestamp(value._seconds, value._nanoseconds);
  }
  if (Array.isArray(value)) return value.map(timestamp);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, timestamp(item)]));
  }
  return value;
}
function doc(docPath, data) {
  return {id: docPath.split("/").at(-1), path: docPath, data: timestamp(data), bytes: 100};
}
function collections(overrides = {}) {
  return Object.fromEntries(["users", "hostProfiles", "publicProfiles", "clubs",
    "organizers", "organizerMemberships", "events", "eventParticipations", "savedEvents",
    "reviews", "matches", "onboarding_drafts", "organizerScheduleLocks",
    "userEventScheduleLocks", "outgoing", "messages"]
    .map((name) => [name, overrides[name] ?? []]));
}
function reportFor(overrides, maxDocs = 5000, options = {}) {
  const report = createReport({projectId: "demo-validator", maxDocs});
  validateAll(collections(overrides), report, options);
  reconcile(report);
  return report;
}
function reconcile(report) {
  const counts = Object.values(report.summary.collections);
  for (const severity of ["errors", "warnings"]) {
    assert.equal(report.summary[severity],
      report.issues.filter((item) => `${item.severity}s` === severity).length);
    assert.equal(report.summary[severity], counts.reduce((sum, value) => sum + value[severity], 0));
  }
  assert.equal(report.summary.scannedDocuments,
    counts.reduce((sum, value) => sum + value.scannedDocuments, 0));
  assert.equal(Object.keys(report.documentStates).length, report.summary.scannedDocuments);
}
function findings(report, docPath) {
  return report.issues.filter((item) => item.path === docPath);
}
function privateEvent() {
  return {organizerId: "club-1", name: "Private basics",
    startTime: {_seconds: 1792328400, _nanoseconds: 123456789},
    status: "active", publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false, cancelledAt: null, cancellationReason: null,
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {},
    eventCityId: "in-mh-mumbai", eventMarketId: "in-mh-mumbai",
    eventLocalDate: "2026-10-18", eventLocalStartTime: "18:30", eventTimezone: "Asia/Kolkata",
    setupDefaults: {city: {value: {cityId: "in-mh-mumbai", marketId: "in-mh-mumbai"}, source: "event"},
      timezone: {value: "Asia/Kolkata", source: "event"}, organizerDefaultsRevision: null,
      organizerDefaultsHash: "a".repeat(64)}};
}
const organizer = () => doc("clubs/club-1", {...fixture("organizer_doc.json"), memberCount: 0});

test("generated membership contract accepts owner and rejects unknown roles and missing fields", () => {
  const membershipPath = "organizerMemberships/club-1_runner-1";
  for (const role of ["owner", "host", "member"]) {
    const data = {...fixture("organizer_membership_doc.json"), role};
    assert.equal(findings(reportFor({organizerMemberships: [doc(membershipPath, data)]}), membershipPath)
      .filter((item) => item.severity === "error").length, 0);
  }
  for (const patch of [{role: "admin"}, {role: null}, {pushNotificationsEnabled: undefined}]) {
    const data = {...fixture("organizer_membership_doc.json"), ...patch};
    assert.ok(reportFor({organizerMemberships: [doc(membershipPath, data)]}).issues
      .some((item) => item.code === "schema-contract"));
  }
});

test("nullable unclaimed hosts follow generated contracts without hiding invalid host types", () => {
  for (const collection of ["organizers"]) {
    const data = {...fixture("organizer_doc.json"), hostUserId: null, hostName: null,
      hostAvatarUrl: null, ownerUserId: null, hostUserIds: [], hostProfiles: [], memberCount: 0,
      organizerPhotos: [], followerCount: 0, organizerType: "club"};
    const docPath = `${collection}/club-1`;
    assert.deepEqual(findings(reportFor({[collection]: [doc(docPath, data)]}), docPath), []);
    assert.ok(findings(reportFor({[collection]: [doc(docPath, {...data, hostUserId: 123})]}), docPath)
      .some((item) => item.code === "schema-contract"));
  }
});

test("private drafts may omit rich fields but preserve required basics and supplied field validation", () => {
  const valid = privateEvent();
  for (const extra of [{}, {meetingPoint: "A named venue"}]) {
    assert.deepEqual(findings(reportFor({organizers: [organizer()], events: [doc("events/e1", {...valid, ...extra})]}), "events/e1"), []);
  }
  for (const patch of [{name: undefined}, {setupDefaults: undefined}, {endTime: null},
    {capacityLimit: -1}, {meetingLocation: {name: "Broken"}}, {publicRegistrationEnabled: true}]) {
    assert.ok(findings(reportFor({organizers: [organizer()], events: [doc("events/e1", {...valid, ...patch})]}), "events/e1")
      .some((item) => item.code === "schema-contract"));
  }
  assert.ok(reportFor({events: [doc("events/e1", valid)]}).issues.some((item) => item.code === "missing-club"));
});

test("published and legacy events still require rich fields and enforce aggregates and location mirrors", () => {
  for (const publicationState of [undefined, "published"]) {
    const data = {...fixture("event_doc.json"), publicationState};
    delete data.meetingPoint;
    assert.ok(reportFor({organizers: [organizer()], events: [doc("events/e1", data)]}).issues
      .some((item) => item.code === "schema-contract"));
  }
  const data = {...fixture("event_doc.json"), meetingPoint: "Wrong mirror"};
  const report = reportFor({organizers: [organizer()], events: [doc("events/e1", data)]});
  for (const code of ["event-location-mirror-mismatch", "event-count-drift", "event-gender-count-drift"]) {
    assert.ok(report.issues.some((item) => item.code === code), code);
  }
});

test("canonical decisions enforce path identity, event existence and attendance while legacy paths remain visible", () => {
  const data = fixture("swipe_doc.json");
  const canonical = `profileDecisions/${data.swiperId}/outgoing/${data.targetId}`;
  const legacy = `swipes/${data.swiperId}/outgoing/${data.targetId}`;
  const base = {organizers: [organizer()], events: [doc(`events/${data.eventId}`, fixture("event_doc.json"))]};
  const report = reportFor({...base, outgoing: [doc(canonical, data), doc(legacy, data),
    doc("profileDecisions/wrong/outgoing/wrong", data), doc("other/a/outgoing/b", {})]});
  assert.ok(findings(report, canonical).some((item) => item.code === "swipe-event-attendance-mismatch"));
  assert.ok(findings(report, legacy).some((item) => item.code === "legacy-swipe-path"));
  assert.ok(report.issues.some((item) => item.code === "swipe-path-data-mismatch"));
  assert.ok(report.issues.some((item) => item.code === "unrecognized-outgoing-path"));
  assert.ok(reportFor({outgoing: [doc(canonical, data)]}).issues.some((item) => item.code === "missing-swipe-event"));
  const attended = [data.swiperId, data.targetId].map((uid) =>
    doc(`eventParticipations/${data.eventId}_${uid}`, {eventId: data.eventId, uid, status: "attended"}));
  assert.ok(!findings(reportFor({...base, eventParticipations: attended, outgoing: [doc(canonical, data)]}), canonical)
    .some((item) => item.code === "swipe-event-attendance-mismatch"));
});

test("unscheduled drafts still reject scheduled participation", () => {
  const report = reportFor({organizers: [organizer()], events: [doc("events/e1", privateEvent())],
    eventParticipations: [doc("eventParticipations/e1_u1", {eventId: "e1", uid: "u1", status: "signedUp"})]});
  assert.ok(report.issues.some((item) => item.code === "participation-event-unscheduled"));
  assert.ok(report.issues.some((item) => item.code === "event-count-drift"));
});

test("denominators expose capped queries and metadata includes only allowlisted states", () => {
  const data = {...privateEvent(), status: "sensitive-free-text", seedPrefix: "private-marker", synthetic: true};
  const report = reportFor({organizers: [organizer()], events: [doc("events/e1", data)]}, 1);
  assert.equal(report.summary.completeWithinCap, false);
  assert.equal(report.summary.collections.events.limitReached, true);
  assert.equal(report.summary.collections.organizerScheduleLocks.enabled, false);
  assert.deepEqual(report.documentStates["events/e1"], {collection: "events", synthetic: true,
    hasSeedMarker: true, status: "unrecognized", publicationState: "private",
    hasEndTime: false, hasMeetingLocation: false, hasSetupRevision: true});
  assert.ok(!JSON.stringify(report).includes("sensitive-free-text"));
  assert.ok(!JSON.stringify(report).includes("private-marker"));
});

test("collection loader stays read-only and bounded and includes canonical organizers and outgoing group", async () => {
  const queries = [];
  const query = (kind, name) => ({limit(value) {
    queries.push({kind, name, value});
    return {get: async () => ({docs: []})};
  }});
  const result = await loadCollections({collection: (name) => query("collection", name),
    collectionGroup: (name) => query("group", name)}, 17);
  assert.ok(queries.some((item) => item.kind === "collection" && item.name === "organizers"));
  assert.ok(queries.some((item) => item.kind === "group" && item.name === "outgoing"));
  assert.ok(queries.every((item) => item.value === 17));
  assert.deepEqual(result.organizerScheduleLocks, []);
});

function runOffline(rows, args, {blockOutput = false} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "firestore-report-"));
  const input = path.join(directory, "rows.json");
  const output = path.join(directory, "report.json");
  fs.writeFileSync(input, JSON.stringify(rows));
  if (blockOutput) fs.mkdirSync(output);
  const program = `import fs from "node:fs";
    import {main} from ${JSON.stringify(validatorUrl)};
    import {createRequire} from "node:module";
    const requireFromFunctions = createRequire(${JSON.stringify(new URL("../../functions/package.json", import.meta.url).href)});
    const {Timestamp} = requireFromFunctions("firebase-admin/firestore");
    const rows = JSON.parse(fs.readFileSync(${JSON.stringify(input)}, "utf8"), (_key, value) =>
      value && typeof value === "object" && Number.isInteger(value._seconds) ?
        new Timestamp(value._seconds, value._nanoseconds) : value);
    const query = (name) => ({limit: (cap) => ({get: async () => ({docs:
      (rows[name] ?? []).slice(0, cap).map((row) => ({id: row.path.split("/").at(-1),
        ref: {path: row.path}, data: () => row.data}))})})});
    await main(process.argv.slice(1), {firestore: {collection: query, collectionGroup: query}});`;
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", program, "--",
      "--project", "demo-validator", "--json", "--output", output, ...args],
    {encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 30000});
    assert.ifError(result.error);
    return {...result, saved: blockOutput ? null : fs.readFileSync(output, "utf8")};
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test("failing report larger than 64 KiB saves parseable JSON and reconciles every total", (t) => {
  const rows = Array.from({length: 350}, (_, index) => ({path: `organizerMemberships/club-1_user-${index}`,
    data: {...fixture("organizer_membership_doc.json"), uid: `user-${index}`, role: "invalid"}}));
  const result = runOffline({organizerMemberships: rows}, []);
  assert.equal(result.status, 1, result.stderr);
  assert.ok(Buffer.byteLength(result.saved) > 65536);
  assert.deepEqual(JSON.parse(result.stdout), JSON.parse(result.saved));
  const report = JSON.parse(result.saved);
  reconcile(report);
  assert.equal(report.summary.scannedDocuments, 350);
  assert.equal(report.summary.errors, 350);
  assert.equal(report.summary.warnings, 700);
  assert.equal(report.issues.length, 1050);
  t.diagnostic(`Saved ${Buffer.byteLength(result.saved)} bytes; 350 documents, 350 errors, 700 warnings, 1050 findings.`);
});

test("warning-only reports preserve exit policy and explicit file output failures fail closed", () => {
  const rows = {outgoing: [{path: "other/a/outgoing/b", data: {}}]};
  for (const [args, status] of [[[], 0], [["--fail-on-warning"], 1]]) {
    const result = runOffline(rows, args);
    assert.equal(result.status, status, result.stderr);
    reconcile(JSON.parse(result.saved));
    assert.equal(JSON.parse(result.saved).summary.warnings, 1);
  }
  const failure = runOffline({}, [], {blockOutput: true});
  assert.notEqual(failure.status, 0);
  assert.match(failure.stderr, /EISDIR/);
});

test("missing schedule locks reconcile into zero-document collection denominators", () => {
  const data = {...fixture("event_doc.json"), bookedCount: 0, genderCounts: {}, cohortCounts: {}};
  const report = reportFor({organizers: [organizer()], events: [doc("events/e1", data)]}, 5000,
    {checkScheduleLocks: true});
  const missing = report.issues.filter((item) => item.code === "missing-schedule-lock");
  assert.ok(missing.length > 0);
  assert.equal(report.summary.collections.organizerScheduleLocks.errors, missing.length);
  assert.equal(report.summary.collections.organizerScheduleLocks.scannedDocuments, 0);
  assert.equal(report.summary.collections.organizerScheduleLocks.documentsWithIssues, 0);
  assert.equal(report.summary.collections.organizerScheduleLocks.enabled, true);
});

test("complete published and legacy fixtures remain valid and wrong time ordering still fails", () => {
  for (const publicationState of [undefined, "published"]) {
    const data = {...fixture("event_doc.json"), bookedCount: 0, genderCounts: {}, cohortCounts: {}, publicationState};
    assert.deepEqual(findings(reportFor({organizers: [organizer()], events: [doc("events/e1", data)]}), "events/e1"), []);
    data.endTime = {_seconds: data.startTime._seconds - 60, _nanoseconds: 0};
    assert.ok(findings(reportFor({organizers: [organizer()], events: [doc("events/e1", data)]}), "events/e1")
      .some((item) => item.code === "invalid-event-time"));
  }
});

test("serialized timestamp maps cannot impersonate native Firestore Timestamp values", () => {
  const membership = doc("organizerMemberships/club-1_runner-1", fixture("organizer_membership_doc.json"));
  const event = doc("events/e1", privateEvent());
  const decision = doc("profileDecisions/a/outgoing/b", {...fixture("swipe_doc.json"), swiperId: "a", targetId: "b"});
  const cases = [["organizerMemberships", membership, "joinedAt"], ["organizers", organizer(), "createdAt"],
    ["events", event, "startTime"], ["outgoing", decision, "createdAt"]];
  for (const [collection, record, field] of cases) {
    record.data[field] = new Timestamp(1792328400, 123456789);
    assert.ok(!findings(reportFor({[collection]: [record]}), record.path)
      .some((item) => item.code === "field-type" && item.message.startsWith(field)));
    record.data[field] = {_seconds: 1792328400, _nanoseconds: 123456789};
    assert.ok(findings(reportFor({[collection]: [record]}), record.path)
      .some((item) => item.code === "field-type" && item.message.startsWith(field)), `${collection}.${field}`);
  }
});
