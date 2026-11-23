import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {MetaProviderError} from
  "../platform/delivery/organizerWhatsappProvider";
import {supportConversationId} from "../supportInbox/conversations";
import type {CatchTemplateName} from "../catchMessaging/catchTemplates";
import {CATCH_TEMPLATES} from "../catchMessaging/catchTemplates";
import {
  hostLeadWelcomeMessageId,
  sendHostAppLinkForLead,
  sendHostLeadWelcomeForLead,
  type HostLeadTemplateDeps,
} from "./hostLeadTemplates";
import {
  hostLeadFollowUpMessageId,
  sendHostLeadFollowUp,
  type HostLeadFollowUpDeps,
} from "../catchMessaging/hostLeadFollowUp";
import {projectInboxSource} from "../admin/inbox/model";
import {CATCH_ENDPOINT_STOPS} from
  "../catchMessaging/whatsappEndpointStops";
import {catchEndpointHash, catchStopId} from
  "../catchMessaging/whatsappReply";

const T0 = Date.UTC(2026, 10, 23, 9);
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const scope = {wabaId: "123", phoneNumberId: "456"};
const PHONE = "+919800004321";
const conversationId = supportConversationId("whatsapp", PHONE);
const LEAD = "c".repeat(64);
const SECOND = "d".repeat(64);

function guideLead(patch: Record<string, unknown> = {}) {
  return {intentId: LEAD, source: "website", status: "needs_identity_review",
    leadKind: "guide", fullName: "Ira Fernhill", email: null, phone: PHONE,
    submissionId: "2d8f6c3a4e5f6a7b", city: "Pune",
    lead: {consent: {purpose: "leadFollowUp",
      version: "playbook-lead-whatsapp-v2"},
    sourcePage: "/host/run-clubs/", entry: "run_club_setup_guide",
    guide: {format: "run-clubs"}},
    createdAt: Timestamp.fromMillis(T0), ...patch};
}

function metaLead(patch: Record<string, unknown> = {}) {
  return {intentId: LEAD, source: "meta_lead_ad",
    status: "needs_identity_review", fullName: "Noor Vale",
    email: null,
    phone: PHONE, submissionId: "meta_lead_1234567890", city: "Mumbai",
    hostApplication: {organizationName: "Harbour Runners"},
    metaLead: {leadgenId: "1234567890", pageId: "11111", formId: "22222",
      adId: null, campaignId: null,
      leadCreatedAt: Timestamp.fromMillis(T0 - 10 * 60_000)},
    createdAt: Timestamp.fromMillis(T0), ...patch};
}

function harness(options: {welcome?: boolean; meta?: boolean} = {}) {
  const db = new FakeFirestore({[`salesInboundIntents/${LEAD}`]: guideLead()});
  const clock = {millis: T0 + 1000};
  const sent: Array<{to: string; template: CatchTemplateName;
    variables: Record<string, string>}> = [];
  const warnings: string[] = [];
  let failure: unknown = null;
  const sender = async () => async (to: string, template: CatchTemplateName,
    variables: Record<string, string>) => {
    if (failure) throw failure;
    sent.push({to, template, variables});
    return `wamid.wel${sent.length}`;
  };
  const deps: HostLeadTemplateDeps = {
    config: () => ({appLinkEnabled: true,
      welcomeEnabled: options.welcome ?? true,
      welcomeMetaLeads: options.meta ?? false, ...scope}),
    db: () => db as never,
    nowMillis: () => clock.millis,
    sender,
    findUidByPhone: async () => null,
    warn: (message) => {
      warnings.push(message);
    },
  };
  const followUp: HostLeadFollowUpDeps = {
    config: () => ({enabled: true, ...scope}),
    db: () => db as never,
    now: () => clock.millis,
    rateLimit: async () => undefined,
    sender,
    findUidByPhone: async () => null,
    serverTimestamp: () => "SERVER_TS" as never,
  };
  return {db, clock, sent, warnings, deps, followUp,
    fail: (error: unknown) => {
      failure = error;
    },
    lead: (patch: Record<string, unknown>, id = LEAD,
      make: (patch: Record<string, unknown>) => Record<string, unknown> =
      guideLead) =>
      db.setDoc(
        `salesInboundIntents/${id}`, make({intentId: id, ...patch})),
    intent: (id = LEAD) => db.getDoc(`salesInboundIntents/${id}`)!,
    conversation: () => db.getDoc(`supportConversations/${conversationId}`),
    message: (id: string) =>
      db.getDoc(`supportConversations/${conversationId}/messages/${id}`)};
}

const record = (value: unknown) => value as Record<string, unknown>;

test("a website guide, demo or venue lead gets the welcome once, with the " +
  "first name, recorded on the lead and in Support", async () => {
  const h = harness();
  assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD), "accepted");
  assert.deepEqual(h.sent, [{to: PHONE, template: "host_lead_welcome",
    variables: {first_name: "Ira"}}]);
  const messageId = hostLeadWelcomeMessageId(scope, LEAD);
  const sent = record(h.intent().welcomeWhatsapp);
  assert.equal(sent.templateName, "host_lead_welcome");
  assert.equal(sent.state, "accepted");
  assert.equal(sent.providerMessageId, "wamid.wel1");
  assert.equal(sent.messageId, messageId);
  assert.equal(sent.conversationId, conversationId);
  const message = h.message(messageId)!;
  assert.equal(message.authorUid, null);
  assert.equal(message.deliveryState, "accepted");
  assert.equal(message.text, CATCH_TEMPLATES.host_lead_welcome.text(
    {first_name: "Ira"}));
  assert.equal(h.conversation()!.status, "waitingOnThem");
  // The app link is not this lead's.
  assert.equal(await sendHostAppLinkForLead(h.deps, LEAD), "notApplicable");
  // A redelivered trigger never sends again.
  assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD), "replayed");
  assert.equal(h.sent.length, 1);

  const projection = projectInboxSource("salesInboundIntent", LEAD,
    h.intent(), {});
  assert.ok(projection?.journey.some((step) =>
    step.title === "Sent the welcome on WhatsApp"));

  for (const leadKind of ["demo", "venue"]) {
    const other = harness();
    other.lead({leadKind, fullName: null});
    assert.equal(await sendHostLeadWelcomeForLead(other.deps, LEAD),
      "accepted");
    assert.deepEqual(other.sent[0].variables, {first_name: "there"});
  }
});

test("the welcome skips other kinds, other consent wording, internal tests, " +
  "old leads, STOP and switched-off environments", async () => {
  const off = harness({welcome: false});
  assert.equal(await sendHostLeadWelcomeForLead(off.deps, LEAD), "disabled");
  assert.equal(off.intent().welcomeWhatsapp, undefined);

  for (const patch of [{leadKind: "app_link"}, {leadKind: "walkthrough"},
    {leadKind: "referral"}, {leadKind: "city_alerts"}, {leadKind: "story"},
    {leadKind: "org_contact"}, {source: "partner"},
    {status: "dismissed"}, {fullName: "[QA] Test lead"},
    {submissionId: "internal_qa_0001aaaa"}, {phone: null},
    {lead: {...guideLead().lead,
      consent: {purpose: "leadFollowUp", version: "playbook-lead-v1"}}},
    {lead: {...guideLead().lead,
      consent: {purpose: "cityNewPlans",
        version: "playbook-lead-whatsapp-v2"}}}]) {
    const h = harness();
    h.lead(patch);
    assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD),
      "notApplicable", JSON.stringify(patch));
    assert.equal(h.sent.length, 0);
    assert.equal(h.intent().welcomeWhatsapp, undefined);
  }

  const stale = harness();
  stale.clock.millis = T0 + 7 * HOUR;
  assert.equal(await sendHostLeadWelcomeForLead(stale.deps, LEAD), "stale");

  const stopped = harness();
  stopped.db.setDoc(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope,
    catchEndpointHash(PHONE))}`, {stopId: "x"});
  assert.equal(await sendHostLeadWelcomeForLead(stopped.deps, LEAD),
    "stopped");
  assert.equal(record(stopped.intent().welcomeWhatsapp).skipReason,
    "stopped");
  assert.equal(stopped.sent.length, 0);
  assert.equal(stopped.conversation(), undefined);
});

test("Meta lead-form leads get the welcome only with their own switch, and " +
  "a late import is stale", async () => {
  const without = harness();
  without.lead({}, LEAD, metaLead);
  assert.equal(await sendHostLeadWelcomeForLead(without.deps, LEAD),
    "notApplicable");

  const h = harness({meta: true});
  h.lead({}, LEAD, metaLead);
  assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD), "accepted");
  assert.deepEqual(h.sent[0].variables, {first_name: "Noor"});

  const late = harness({meta: true});
  late.lead({metaLead: {...metaLead().metaLead,
    leadCreatedAt: Timestamp.fromMillis(T0 - 2 * DAY)}}, LEAD, metaLead);
  assert.equal(await sendHostLeadWelcomeForLead(late.deps, LEAD), "stale");

  const noPhone = harness({meta: true});
  noPhone.lead({phone: undefined}, LEAD, metaLead);
  assert.equal(await sendHostLeadWelcomeForLead(noPhone.deps, LEAD),
    "notApplicable");
});

test("a number gets one welcome a week; a refused one does not count",
  async () => {
    const h = harness();
    h.fail(new MetaProviderError("Refused", 131026, 400));
    assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD), "failed");
    assert.equal(record(h.intent().welcomeWhatsapp).deliveryErrorCode,
      131026);
    assert.deepEqual(h.warnings, ["Host lead welcome refused by WhatsApp."]);
    h.fail(null);

    // A second enquiry from the same number: the refused one did not count.
    h.lead({leadKind: "demo", submissionId: "3e9a7d4b5f6a7b8c"}, SECOND);
    assert.equal(await sendHostLeadWelcomeForLead(h.deps, SECOND),
      "accepted");
    // A third within the week is skipped and recorded.
    h.clock.millis += HOUR;
    const third = "e".repeat(64);
    h.lead({leadKind: "venue", createdAt: Timestamp.fromMillis(T0 + HOUR)},
      third);
    assert.equal(await sendHostLeadWelcomeForLead(h.deps, third),
      "recentlySent");
    assert.equal(record(h.intent(third).welcomeWhatsapp).skipReason,
      "recentlySent");
    assert.equal(h.sent.length, 1);
  });

test("after the welcome, staff can still send the follow-up once the " +
  "window has closed", async () => {
  const h = harness();
  assert.equal(await sendHostLeadWelcomeForLead(h.deps, LEAD), "accepted");
  h.clock.millis = T0 + 2 * DAY;
  const result = await sendHostLeadFollowUp({
    auth: {uid: "ops-1", token: {support: true}}, app: {appId: "admin"},
    data: {purpose: "hostLeadFollowUp", intentId: LEAD,
      clientRequestId: "req-follow-1"},
    rawRequest: {headers: {}},
  } as never, h.followUp);
  assert.equal(result.replayed, false);
  assert.equal(result.messageId,
    hostLeadFollowUpMessageId(scope, LEAD, "req-follow-1"));
  assert.deepEqual(h.sent.map((send) => send.template),
    ["host_lead_welcome", "host_lead_follow_up"]);
});
