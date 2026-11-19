import test from "node:test";
import assert from "node:assert/strict";
import {classifyOrganizerProfile, readOrganizerProfileClassification,
  organizerProfileClassificationReadLimit} from
  "./organizerProfileClassification";
import {organizerTrackingPublicationPolicy as policy} from
  "./organizerTrackingPublicationPolicy";

const run = (activityKind = "running", interactionModel = "pacePods") => ({
  publicationState: "published", status: "active",
  eventFormat: {version: 1, activityKind, interactionModel}});
const listing = {publicationStatus: "public", status: "active"};
const classify = (native: Record<string, unknown>[],
  external: Record<string, unknown>[] = [], truncated = false) =>
  classifyOrganizerProfile({native, external, truncated});

test("eligible only with classified, non-excluded published native events",
  () => {
    assert.equal(classify([run(), run("yoga", "classSession")]), "eligible");
  });

test("no published active native event is unknown (fail closed)", () => {
  assert.equal(classify([]), "unknown");
  assert.equal(classify([{...run(), status: "cancelled"}]), "unknown");
  assert.equal(classify([{...run(), publicationState: "draft"}]), "unknown");
});

test("an unclassified event makes the profile unknown", () => {
  assert.equal(classify([run(), {publicationState: "published",
    status: "active"}]), "unknown");
  assert.equal(classify([run(), {...run(), eventFormat: {version: 2,
    activityKind: "running", interactionModel: "pacePods"}}]), "unknown");
});

test("excluded classes come from the policy version", () => {
  for (const kind of policy.excludedActivityKinds) {
    assert.equal(classify([run(), run(kind)]), "sensitive");
  }
  for (const model of policy.excludedInteractionModels) {
    assert.equal(classify([run("running", model)]), "sensitive");
  }
  const lifted = {...policy, excludedActivityKinds: [],
    excludedInteractionModels: []};
  assert.equal(classifyOrganizerProfile({native: [run("singlesMixer",
    "freeFormMixer")], external: [], truncated: false}, lifted), "eligible");
});

test("external listings count as unknown only while the policy says so",
  () => {
    assert.equal(policy.externalListingsCountAsUnknown, true);
    assert.equal(classify([run()], [listing]), "unknown");
    assert.equal(classify([run()], [{...listing, status: "cancelled"}]),
      "eligible");
    const allowed = {...policy, externalListingsCountAsUnknown: false};
    assert.equal(classifyOrganizerProfile({native: [run()],
      external: [listing], truncated: false}, allowed), "eligible");
  });

test("a truncated read fails closed", () => {
  assert.equal(classify([run()], [], true), "unknown");
});

test("reads both collections by owner, one past the limit", async () => {
  const calls: string[] = [];
  const db = {collection: (name: string) => ({where: (field: string,
    _op: string, value: string) => ({limit: (count: number) => ({
    get: async () => {
      calls.push(`${name}.${field}=${value}:${count}`);
      const size = name === "events" ? count : 0;
      return {size, docs: Array.from({length: size}, () => ({
        data: () => run()}))};
    }})})})} as unknown as FirebaseFirestore.Firestore;
  assert.equal(await readOrganizerProfileClassification(db, "org-1"),
    "unknown");
  const limit = organizerProfileClassificationReadLimit + 1;
  assert.deepEqual(calls.sort(), [`events.organizerId=org-1:${limit}`,
    `externalEvents.canonicalHostId=org-1:${limit}`]);
});
