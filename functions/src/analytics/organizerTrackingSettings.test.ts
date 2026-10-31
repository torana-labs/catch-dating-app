import test from "node:test";
import assert from "node:assert/strict";
import {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {getOrganizerTrackingSettingsHandler,
  setOrganizerTrackingSettingsHandler,
  readPublicOrganizerTrackingSettingsHandler, trackingConfigurationEligible,
  trackingEventPolicyReason, TrackingSettingsDependencies} from
  "./organizerTrackingSettings";

function fixture() {
  const docs: Record<string, Record<string, unknown>> = {
    "organizers/org-1": {ownerUserId: "owner", hostUserId: "owner",
      hostUserIds: [], hostProfiles: [], status: "active", archived: false,
      ownership: {state: "userCreated"}, claim: {state: "verified"},
      publicPage: {publishStatus: "published", indexStatus: "index",
        robots: "index, follow", canonicalPath: "/organizers/org-1/"}},
    "events/event-1": {organizerId: "org-1", publicationState: "published",
      status: "active",
      eventFormat: {version: 1, activityKind: "running",
        interactionModel: "pacePods"}},
  };
  const reads: string[] = [];
  const ref = (path: string) => ({path, get: async () => {
    reads.push(path);
    return snap(path);
  }});
  const snap = (path: string) => ({exists: !!docs[path], data: (
  ) => docs[path]});
  const db = {collection: (collection: string) => ({doc: (id: string) =>
    ref(`${collection}/${id}`)}), runTransaction: async (callback: (
      tx: unknown) =>
    Promise<unknown>) => callback({get: async (r: {path: string}) => snap(
    r.path),
  set: (r: {path: string}, value: Record<string,
        unknown>) => {
    docs[r.path] = value;
  }})};
  const deps: TrackingSettingsDependencies = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined, checkIpRateLimit: () => true,
    now: () => 1000,
  };
  return {docs, deps, reads};
}
function request(data: unknown, uid = "owner") {
  return {data, auth: uid ? {uid} : undefined,
    rawRequest: {ip: "test", socket: {remoteAddress: "test"}}} as
    unknown as CallableRequest<unknown>;
}
const command = {organizerId: "org-1", expectedRevision: 0,
  metaPixelId: "123456", googleMeasurementId: "G-TEST1234", enabled: false};

test("manager saves disabled IDs; projection omits audit", async () => {
  const {deps, docs} = fixture();
  const defaults = await getOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1"}), deps);
  assert.equal(defaults.revision, 0);
  const result = await setOrganizerTrackingSettingsHandler(request(command),
    deps);
  assert.equal(result.revision, 1);
  assert.equal(result.metaPixelId, "123456");
  assert.equal(result.enabled, false);
  assert.equal(result.publicationAllowed, false);
  assert.equal("updatedByUid" in result, false);
  assert.equal(docs["organizerTrackingSettings/org-1"].updatedByUid, "owner");
  await assert.rejects(setOrganizerTrackingSettingsHandler(request(command),
    deps), {code: "aborted"});
});
test("wrong tenant, event staff and unauthenticated access denied", async (
) => {
  const {deps} = fixture();
  for (const uid of ["foreign-owner", "event-staff"]) {
    await assert.rejects(getOrganizerTrackingSettingsHandler(request(
      {organizerId: "org-1"}, uid), deps), {code: "permission-denied"});
    await assert.rejects(setOrganizerTrackingSettingsHandler(request(
      command, uid), deps), {code: "permission-denied"});
  }
  await assert.rejects(getOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1"}, ""), deps), {code: "unauthenticated"});
  await assert.rejects(getOrganizerTrackingSettingsHandler(request(
    {organizerId: "missing"}), deps), {code: "not-found"});
});
test("live enable and invalid/unclaimed writes blocked", async () => {
  const {deps, docs} = fixture();
  await assert.rejects(setOrganizerTrackingSettingsHandler(request(
    {...command, enabled: true}), deps), {code: "failed-precondition"});
  for (const extra of [{metaPixelId: "<script>"},
    {googleMeasurementId: "GTM-1234"}, {snippet: "x"}]) {
    await assert.rejects(setOrganizerTrackingSettingsHandler(request(
      {...command, ...extra}), deps), {code: "invalid-argument"});
  }
  docs["organizers/org-1"].ownership = {state: "programmatic"};
  docs["organizers/org-1"].claim = {state: "claimed"};
  assert.equal((await getOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1"}), deps)).canEdit, false);
  await assert.rejects(setOrganizerTrackingSettingsHandler(request(command),
    deps), {code: "failed-precondition"});
});
test("public strips IDs; rejects foreign/private/suppressed", async () => {
  const {deps, docs} = fixture();
  docs["organizerTrackingSettings/org-1"] = {...command, enabled: true,
    updatedByUid: "private"};
  const payload = {organizerId: "org-1", eventId: "event-1"};
  const result = await readPublicOrganizerTrackingSettingsHandler(request(
    payload, ""), deps);
  assert.equal(result.enabled, false); assert.equal(result.metaPixelId, null);
  assert.equal(result.googleMeasurementId, null);
  docs["events/event-1"].organizerId = "foreign";
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
    payload), deps), {code: "permission-denied"});
  docs["events/event-1"].organizerId = "org-1";
  for (const state of ["private", "draft"]) {
    docs["events/event-1"].publicationState = state;
    await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
      payload), deps), {code: "failed-precondition"});
  }
  docs["organizers/org-1"].claim = {state: "suppressed"};
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1", eventId: null}), deps),
  {code: "failed-precondition"});
});
test("sensitive/unknown classification and public rate limits", async () => {
  assert.equal(trackingEventPolicyReason({}), "eventClassificationUnavailable");
  assert.equal(trackingEventPolicyReason({eventFormat: {version: 1,
    activityKind: "running", interactionModel: "freeFormMixer"}}),
  "sensitiveEvent");
  assert.equal(trackingConfigurationEligible({ownerUserId: "x",
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"}} as OrganizerDocument), false);
  const {deps} = fixture();
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1", eventId: null}), {...deps, checkIpRateLimit: (
  ) => false}), {code: "resource-exhausted"});
});


test("public sensitive/unknown/unclaimed and missing scopes", async () => {
  const {deps, docs} = fixture();
  const payload = {organizerId: "org-1", eventId: "event-1"};
  docs["events/event-1"].eventFormat = {version: 1,
    activityKind: "singlesMixer", interactionModel: "freeFormMixer"};
  const sensitive = await readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps);
  assert.equal(sensitive.policyReason, "sensitiveEvent");
  assert.equal(sensitive.enabled, false);
  assert.equal(sensitive.metaPixelId, null);
  delete docs["events/event-1"].eventFormat;
  assert.equal((await readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps)).policyReason,
  "eventClassificationUnavailable");
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(
    request({...payload, eventId: "missing"}, ""), deps),
  {code: "not-found"});
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(
    request({...payload, organizerId: "missing"}, ""), deps),
  {code: "not-found"});
  docs["organizers/org-1"].ownership = {state: "programmatic"};
  docs["organizers/org-1"].claim = {state: "unclaimed"};
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps), {code: "failed-precondition"});
});


test("public external event stays excluded without canonical policy", async (
) => {
  const {deps, docs, reads} = fixture();
  docs["externalEvents/external-1"] = {
    canonicalHostId: "org-1", publicationStatus: "public", status: "active",
    eventFormat: {version: 1, activityKind: "running",
      interactionModel: "pacePods"},
  };
  docs["organizerTrackingSettings/org-1"] = {...command, enabled: true};
  const payload = {organizerId: "org-1", eventId: "external-1"};
  const result = await readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps);
  assert.deepEqual(result, {...payload, enabled: false, metaPixelId: null,
    googleMeasurementId: null,
    policyReason: "eventClassificationUnavailable"});
  assert.equal(reads.includes("organizerTrackingSettings/org-1"), false);
  delete docs["externalEvents/external-1"].eventFormat;
  assert.equal((await readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps)).policyReason,
  "eventClassificationUnavailable");
});

for (const [label, overrides, code] of [
  ["foreign", {canonicalHostId: "foreign"}, "permission-denied"],
  ["missing canonical host", {canonicalHostId: null}, "permission-denied"],
  ["private", {publicationStatus: "private"}, "failed-precondition"],
  ["draft", {publicationStatus: "draft"}, "failed-precondition"],
  ["cancelled", {status: "cancelled"}, "failed-precondition"],
] as const) {
  test(`public external ${label} event is rejected`, async () => {
    const {deps, docs} = fixture();
    docs["externalEvents/external-1"] = {
      canonicalHostId: "org-1", publicationStatus: "public", status: "active",
      ...overrides,
    };
    await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
      {organizerId: "org-1", eventId: "external-1"}, ""), deps), {code});
  });
}

test("public external event requires an existing claimed organizer", async (
) => {
  const {deps, docs} = fixture();
  const payload = {organizerId: "org-1", eventId: "external-1"};
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps), {code: "not-found"});
  docs["externalEvents/external-1"] = {
    canonicalHostId: "org-1", publicationStatus: "public", status: "active",
  };
  docs["organizers/org-1"].ownership = {state: "programmatic"};
  docs["organizers/org-1"].claim = {state: "unclaimed"};
  await assert.rejects(readPublicOrganizerTrackingSettingsHandler(
    request(payload, ""), deps), {code: "failed-precondition"});
});

for (const [label, overrides, code] of [
  ["foreign", {organizerId: "foreign"},
    "permission-denied"],
  ["conflicting owner", {organizerId: "foreign"}, "permission-denied"],
  ["private", {publicationState: "private"}, "failed-precondition"],
  ["cancelled", {status: "cancelled"}, "failed-precondition"],
] as const) {
  test(`native ${label} event cannot fall back to public external`, async (
  ) => {
    const {deps, docs, reads} = fixture();
    Object.assign(docs["events/event-1"], overrides);
    docs["externalEvents/event-1"] = {
      canonicalHostId: "org-1", publicationStatus: "public", status: "active",
    };
    await assert.rejects(readPublicOrganizerTrackingSettingsHandler(request(
      {organizerId: "org-1", eventId: "event-1"}, ""), deps), {code});
    assert.equal(reads.includes("externalEvents/event-1"), false);
  });
}

test("native classification takes precedence over external identity", async (
) => {
  const {deps, docs, reads} = fixture();
  docs["events/event-1"].eventFormat = {version: 1,
    activityKind: "singlesMixer", interactionModel: "freeFormMixer"};
  docs["externalEvents/event-1"] = {
    canonicalHostId: "foreign", publicationStatus: "private",
    status: "cancelled",
  };
  const result = await readPublicOrganizerTrackingSettingsHandler(request(
    {organizerId: "org-1", eventId: "event-1"}, ""), deps);
  assert.equal(result.policyReason, "sensitiveEvent");
  assert.equal(result.enabled, false);
  assert.equal(result.metaPixelId, null);
  assert.equal(result.googleMeasurementId, null);
  assert.equal(reads.includes("externalEvents/event-1"), false);
});
