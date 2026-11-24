import test from "node:test";
import assert from "node:assert/strict";
import {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {getOrganizerTrackingSettingsHandler,
  setOrganizerTrackingSettingsHandler, TrackingSettingsDependencies} from
  "./organizerTrackingSettings";
import {organizerTrackingEventPolicyReason, trackingConfigurationEligible} from
  "./organizerTrackingPublicationPolicy";

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
  const docs_ = docs;
  const ref = (path: string) => ({path, get: async () => {
    reads.push(path);
    return snap(path);
  }});
  const snap = (path: string) => ({exists: !!docs[path], data: (
  ) => docs[path]});
  const query = (collection: string, field: string, value: unknown) => ({
    limit: (count: number) => ({get: async () => {
      reads.push(`${collection}?${field}=${String(value)}`);
      const docs = Object.entries(docs_).filter(([path, data]) =>
        path.startsWith(`${collection}/`) && data[field] === value)
        .slice(0, count).map(([, data]) => ({data: () => data}));
      return {docs, size: docs.length};
    }}),
  });
  const db = {collection: (collection: string) => ({doc: (id: string) =>
    ref(`${collection}/${id}`), where: (field: string, _op: string,
    value: unknown) => query(collection, field, value)}),
  runTransaction: async (callback: (tx: unknown) =>
    Promise<unknown>) => callback({get: async (r: {path: string}) => snap(
    r.path),
  set: (r: {path: string}, value: Record<string,
        unknown>) => {
    docs[r.path] = value;
  }})};
  const deps: TrackingSettingsDependencies = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
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

test("event classification and tracking eligibility", () => {
  assert.equal(organizerTrackingEventPolicyReason({}),
    "eventClassificationUnavailable");
  assert.equal(organizerTrackingEventPolicyReason({eventFormat: {version: 1,
    activityKind: "running", interactionModel: "freeFormMixer"}}),
  "sensitiveEvent");
  assert.equal(trackingConfigurationEligible({ownerUserId: "x",
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"}} as OrganizerDocument), false);
  assert.equal(trackingConfigurationEligible({ownerUserId: "x",
    ownership: {state: "userCreated"},
    claim: {state: "unclaimed"}} as OrganizerDocument), true);
});
