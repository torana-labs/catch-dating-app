import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  AttentionSource,
  attentionEventFields,
  resolveAttentionOrganizerIds,
} from "./attentionTriggers";

type Data = Record<string, unknown> | undefined;
const db = new AudienceTestStore().asFirestore();
const resolve = (source: AttentionSource, before: Data, after: Data,
  documentId = "doc-1") =>
  resolveAttentionOrganizerIds(db, source, documentId, before, after);

test("organizer writes evaluate the organizer itself", async () => {
  assert.deepEqual(await resolve("organizers", {name: "a"}, {name: "a"},
    "org"), ["org"]);
  assert.deepEqual(await resolve("organizers", undefined, undefined, "org"),
    ["org"]);
});

test("event updates run only when a derivation field changes", async () => {
  const event = {organizerId: "org", status: "active",
    startTime: Timestamp.fromMillis(1000), endTime: Timestamp.fromMillis(2000),
    name: "Run", description: "Easy loop", bookedCount: 3};
  assert.deepEqual(await resolve("events", event,
    {...event, description: "Changed", bookedCount: 4}), []);
  assert.deepEqual(await resolve("events", event,
    {...event, startTime: Timestamp.fromMillis(1000)}), [],
  "an equal timestamp is not a change");
  for (const field of attentionEventFields) {
    assert.deepEqual(await resolve("events", event,
      {...event, [field]: "changed"}),
    field === "organizerId" ? ["org", "changed"] : ["org"], field);
  }
  assert.deepEqual(await resolve("events", undefined, event), ["org"],
    "a create always runs");
  assert.deepEqual(await resolve("events", event, undefined), ["org"],
    "a delete always runs");
});

test("each source skips only updates that cannot touch the queue",
  async () => {
    const cases: Array<[AttentionSource, Data, Data, string[]]> = [
      ["eventParticipations", {organizerId: "org", hostApprovalStatus: "none"},
        {organizerId: "org", hostApprovalStatus: "approved"}, []],
      ["eventParticipations", {organizerId: "org",
        hostApprovalStatus: "pending"}, {organizerId: "org",
        hostApprovalStatus: "approved"}, ["org"]],
      ["eventAssistanceCases", {context: {organizerId: "org",
        mode: "rehearsal"}}, {context: {organizerId: "org",
        mode: "rehearsal"}, status: "resolved"}, []],
      ["eventAssistanceCases", {context: {organizerId: "org", mode: "live"}},
        {context: {organizerId: "org", mode: "live"}, status: "resolved"},
        ["org"]],
      ["operationWorkItems", {workflowId: "intake",
        normalizedPayload: {kind: "liveMessageDelivery"}},
      {workflowId: "intake", normalizedPayload: {kind: "liveMessageDelivery"},
        revision: 2}, []],
      ["operationWorkItems", {workflowId: "event-assistance",
        normalizedPayload: {kind: "liveMessageDelivery",
          scope: {context: {organizerId: "org"}}}},
      {workflowId: "event-assistance", normalizedPayload: {
        kind: "liveMessageDelivery", scope: {context: {organizerId: "org"}}},
      revision: 2}, ["org"]],
      ["organizerApplications", {organizerId: "org", reviewStatus: "accepted"},
        {organizerId: "org", reviewStatus: "accepted", revision: 4}, []],
      ["organizerApplications", {organizerId: "org", reviewStatus: "inReview"},
        {organizerId: "org", reviewStatus: "accepted"}, ["org"]],
      ["organizerFormAutomationRuns", {organizerId: "org", status: "pending"},
        {organizerId: "org", status: "running"}, []],
      ["organizerFormAutomationRuns", {organizerId: "org", status: "running"},
        {organizerId: "org", status: "failed"}, ["org"]],
      ["organizerMomentSends", {organizerId: "org", actionKind: "notify"},
        {organizerId: "org", actionKind: "notify", status: "sent"}, []],
      ["organizerMomentSends", {organizerId: "org",
        actionKind: "staffAttention"}, {organizerId: "org",
        actionKind: "staffAttention", status: "sent"}, ["org"]],
      ["providerSyncRuns", {organizerId: "org"}, {organizerId: "org"},
        ["org"]],
      ["organizerFormAutomationRules", {organizerId: "org"},
        {organizerId: "org"}, ["org"]],
      ["organizerEventOffers", {organizerId: "org"}, {organizerId: "org"},
        ["org"]],
    ];
    for (const [source, before, after, expected] of cases) {
      assert.deepEqual(await resolve(source, before, after), expected,
        `${source} ${JSON.stringify(after)}`);
    }
    // Creates and deletes are never skipped, even when irrelevant.
    assert.deepEqual(await resolve("eventParticipations", undefined,
      {organizerId: "org", hostApprovalStatus: "none"}), ["org"]);
    assert.deepEqual(await resolve("organizerMomentSends",
      {organizerId: "org", actionKind: "notify"}, undefined), ["org"]);
  });

test("a move between organizers evaluates both", async () => {
  assert.deepEqual(await resolve("organizerEventOffers",
    {organizerId: "old"}, {organizerId: "new"}), ["old", "new"]);
});

test("payment accounts evaluate every organizer the owner could own",
  async () => {
    const store = new AudienceTestStore({
      "organizers/by-ownership": {ownership: {ownerUserId: "owner-1"}},
      "organizers/by-owner": {ownerUserId: "owner-1"},
      "organizers/by-host": {hostUserId: "owner-1", ownerUserId: "owner-1"},
      "organizers/other": {ownerUserId: "owner-2"},
    });
    const ids = await resolveAttentionOrganizerIds(store.asFirestore(),
      "hostPaymentAccounts", "owner-1_razorpay", {userId: "owner-1"},
      {userId: "owner-1", chargesEnabled: true});
    assert.deepEqual(ids.sort(), ["by-host", "by-owner", "by-ownership"]);
    assert.deepEqual(await resolveAttentionOrganizerIds(store.asFirestore(),
      "hostPaymentAccounts", "x", undefined, {provider: "stripe"}), []);
  });
