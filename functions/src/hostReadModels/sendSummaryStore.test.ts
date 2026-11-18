import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {reconcileSendSummary, refreshNamedCampaignSummaries, sendSummaryId}
  from "./sendSummaryStore";

const at = (millis: number) => Timestamp.fromMillis(millis);

const audienceCounts = {total: 4, reachable: 3, optedOut: 1, invalid: 0,
  duplicate: 0, unsupported: 0, frequencyCapped: 0, providerBlocked: 0,
  unknown: 0};
const deliveryCounts = {pending: 0, suppressed: 0, accepted: 3, sent: 3,
  delivered: 2, read: 1, failed: 0, replied: 0, optedOut: 0};

function campaign(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org", name: "Regulars back", status: "draft",
    savedAudienceId: "audience-1", segmentIds: [], templateId: "template-1",
    templateVariables: {first_name: "Riya"}, audienceCounts, deliveryCounts,
    scheduledAt: null, dispatchedAt: null, createdAt: at(3_000),
    revision: 2, ...overrides};
}

function seed() {
  return new AudienceTestStore({
    "organizerCampaigns/c1": campaign(),
    "organizerMessageTemplates/template-1": {organizerId: "org",
      name: "Regular invite"},
    "organizerSavedAudiences/audience-1": {organizerId: "org",
      name: "Regulars"},
    "organizerBroadcastSummaries/b1": {organizerId: "org", broadcastId: "b1",
      eventId: "event-1", eventName: "Friday run", audience: "booked",
      recipientCount: 8, recipientContactIds: ["contact-1"],
      sentAt: at(2_000), partialFailure: false},
    "organizers/org/posts/p1": {authorUid: "host", text: "New route",
      eventId: null, audience: "followers", createdAt: at(1_000),
      status: "active"},
    "organizerPostDeliveryOperations/p1": {organizerId: "org", postId: "p1",
      status: "processing", recipientCount: 10, excludedCount: 1,
      activityAvailableCount: 9, pushAttemptedCount: 8, pushAcceptedCount: 7,
      pushFailedCount: 1, pushUnknownCount: 0, leaseOwner: "worker-1"},
  });
}

test("a campaign row is the callable's row with its template and audience",
  async () => {
    const db = seed();
    await reconcileSendSummary(db.asFirestore(),
      {kind: "campaign", campaignId: "c1"});
    assert.deepEqual(db.docs["hostSendSummaries/campaign_c1"], {
      organizerId: "org", sendId: "campaign_c1", kind: "campaign",
      activityAtMillis: 3_000, version: 1,
      row: {kind: "campaign", campaignId: "c1", name: "Regulars back",
        status: "draft", savedAudienceId: "audience-1",
        savedAudienceName: "Regulars", segmentIds: [],
        templateId: "template-1", templateName: "Regular invite",
        audienceCounts, deliveryCounts, scheduledAtMillis: null,
        dispatchedAtMillis: null, activityAtMillis: 3_000}});
    // Template variables never reach the view.
    assert.equal(JSON.stringify(db.docs["hostSendSummaries/campaign_c1"])
      .includes("Riya"), false);
  });

test("names from another organizer are left out", async () => {
  const db = seed();
  db.docs["organizerMessageTemplates/template-1"] = {organizerId: "other",
    name: "Their template"};
  await reconcileSendSummary(db.asFirestore(),
    {kind: "campaign", campaignId: "c1"});
  const row = db.docs["hostSendSummaries/campaign_c1"].row as
    Record<string, unknown>;
  assert.equal(row.templateName, null);
  assert.equal(row.savedAudienceName, "Regulars");
});

test("a follower update's WhatsApp leg has no row of its own", async () => {
  const db = seed();
  db.docs["organizerCampaigns/c1"] = campaign({
    recipientSource: {kind: "organizerFollowers", postId: "p1"}});
  db.docs["hostSendSummaries/campaign_c1"] = {organizerId: "org"};
  await reconcileSendSummary(db.asFirestore(),
    {kind: "campaign", campaignId: "c1"});
  assert.equal(db.docs["hostSendSummaries/campaign_c1"], undefined);
});

test("announcement and follower update rows carry no recipients or leases",
  async () => {
    const db = seed();
    await reconcileSendSummary(db.asFirestore(),
      {kind: "announcement", broadcastId: "b1"});
    await reconcileSendSummary(db.asFirestore(),
      {kind: "followerUpdate", organizerId: "org", postId: "p1"});
    assert.deepEqual(db.docs["hostSendSummaries/announcement_b1"].row, {
      kind: "announcement", broadcastId: "b1", eventId: "event-1",
      eventName: "Friday run", audience: "booked", recipientCount: 8,
      sentAtMillis: 2_000, partialFailure: false, activityAtMillis: 2_000});
    assert.deepEqual(db.docs["hostSendSummaries/followerUpdate_p1"].row, {
      kind: "followerUpdate", postId: "p1", eventId: null,
      audience: "followers", status: "active", deliveryStatus: "pending",
      recipientCount: 10, excludedCount: 1, activityAvailableCount: 9,
      pushAttemptedCount: 8, pushAcceptedCount: 7, pushFailedCount: 1,
      pushUnknownCount: 0, createdAtMillis: 1_000, activityAtMillis: 1_000});
    assert.equal(JSON.stringify(db.docs["hostSendSummaries/announcement_b1"])
      .includes("contact-1"), false);
    const follower = JSON.stringify(
      db.docs["hostSendSummaries/followerUpdate_p1"]);
    assert.equal(follower.includes("worker-1"), false);
    assert.equal(follower.includes("New route"), false);
  });

test("reconcile writes only on change and removes a deleted Send",
  async () => {
    const db = seed();
    const source = {kind: "campaign", campaignId: "c1"} as const;
    await reconcileSendSummary(db.asFirestore(), source);
    const first = db.docs["hostSendSummaries/campaign_c1"];
    await reconcileSendSummary(db.asFirestore(), source);
    assert.equal(db.docs["hostSendSummaries/campaign_c1"], first);
    delete db.docs["organizerCampaigns/c1"];
    await reconcileSendSummary(db.asFirestore(), source);
    assert.equal(db.docs["hostSendSummaries/campaign_c1"], undefined);
  });

test("a renamed template reaches every campaign that names it", async () => {
  const db = seed();
  db.docs["organizerCampaigns/c2"] = campaign({name: "Second"});
  db.docs["organizerCampaigns/c3"] = campaign({templateId: "template-2"});
  const before = {organizerId: "org", name: "Regular invite"};
  const after = {organizerId: "org", name: "Weekly invite"};
  db.docs["organizerMessageTemplates/template-1"] = after;
  assert.equal(await refreshNamedCampaignSummaries(db.asFirestore(),
    "templateId", "template-1", before, before), 0);
  assert.equal(await refreshNamedCampaignSummaries(db.asFirestore(),
    "templateId", "template-1", before, after), 2);
  for (const id of ["c1", "c2"]) {
    const row = db.docs[`hostSendSummaries/campaign_${id}`].row as
      Record<string, unknown>;
    assert.equal(row.templateName, "Weekly invite");
  }
  assert.equal(db.docs["hostSendSummaries/campaign_c3"], undefined);
});

test("view ids name the kind and the source", () => {
  assert.equal(sendSummaryId({kind: "campaign", campaignId: "c"}),
    "campaign_c");
  assert.equal(sendSummaryId({kind: "announcement", broadcastId: "b"}),
    "announcement_b");
  assert.equal(sendSummaryId({kind: "followerUpdate", organizerId: "o",
    postId: "p"}), "followerUpdate_p");
});
