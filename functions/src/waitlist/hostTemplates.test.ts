import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {MetaProviderError} from
  "../platform/delivery/organizerWhatsappProvider";
import {
  recordWhatsappSupportReceipt,
  supportConversationId,
} from "../supportInbox/conversations";
import type {CatchTemplateName} from "../catchMessaging/catchTemplates";
import {
  CATCH_TEMPLATES,
  leadFirstName,
} from "../catchMessaging/catchTemplates";
import {
  hostAppLinkMessageId,
  sendHostAppLinkForLead,
  type HostAppLinkDeps,
} from "./hostAppLink";
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
const LEAD = "a".repeat(64);
const HOST_LEAD = "b".repeat(64);

function appLinkLead(patch: Record<string, unknown> = {}) {
  return {intentId: LEAD, source: "website", status: "needs_identity_review",
    leadKind: "app_link", fullName: null, email: null, phone: PHONE,
    submissionId: "0b6f4a1e2c3d4e5f", city: null,
    lead: {consent: {purpose: "leadFollowUp", version: "app-link-whatsapp-v1"},
      sourcePage: "/host/start/", entry: "host_app_link",
      appLink: {app: "host"}},
    createdAt: Timestamp.fromMillis(T0), ...patch};
}

function walkthroughLead(patch: Record<string, unknown> = {}) {
  return {intentId: HOST_LEAD, source: "website",
    status: "needs_identity_review", leadKind: "walkthrough",
    fullName: "Ira Fernhill", email: null, phone: PHONE,
    submissionId: "1c7e5b2f3d4e5f6a", city: "Mumbai",
    lead: {consent: {purpose: "leadFollowUp", version: "walkthrough-v1"},
      sourcePage: "/host/", entry: "walkthrough",
      walkthrough: {preferredTime: "Evenings"}},
    createdAt: Timestamp.fromMillis(T0 - 3 * DAY), ...patch};
}

function harness(options: {enabled?: boolean; noSender?: boolean} = {}) {
  const db = new FakeFirestore({
    [`salesInboundIntents/${LEAD}`]: appLinkLead(),
    [`salesInboundIntents/${HOST_LEAD}`]: walkthroughLead(),
  });
  const clock = {millis: T0 + 1000};
  const sent: Array<{to: string; template: CatchTemplateName;
    variables: Record<string, string>}> = [];
  const warnings: string[] = [];
  let failure: unknown = null;
  const sender = async () => options.noSender ? null :
    async (to: string, template: CatchTemplateName,
      variables: Record<string, string>) => {
      if (failure) throw failure;
      sent.push({to, template, variables});
      return `wamid.tpl${sent.length}`;
    };
  const appLink: HostAppLinkDeps = {
    config: () => ({enabled: options.enabled ?? true, ...scope}),
    db: () => db as never,
    nowMillis: () => clock.millis,
    sender,
    findUidByPhone: async () => null,
    warn: (message) => {
      warnings.push(message);
    },
  };
  const followUp: HostLeadFollowUpDeps = {
    config: () => ({enabled: options.enabled ?? true, ...scope}),
    db: () => db as never,
    now: () => clock.millis,
    rateLimit: async () => undefined,
    sender,
    findUidByPhone: async () => null,
    serverTimestamp: () => "SERVER_TS" as never,
  };
  return {db, clock, sent, warnings, appLink, followUp,
    fail: (error: unknown) => {
      failure = error;
    },
    intent: (id = LEAD) => db.getDoc(`salesInboundIntents/${id}`)!,
    conversation: () => db.getDoc(`supportConversations/${conversationId}`),
    message: (id: string) =>
      db.getDoc(`supportConversations/${conversationId}/messages/${id}`)};
}

async function inbound(h: ReturnType<typeof harness>, eventId: string,
  atMillis: number, messageType = "text", text = "Hello") {
  return recordWhatsappSupportReceipt({firestore: () => h.db as never,
    now: () => Timestamp.fromMillis(h.clock.millis),
    findUidByPhone: async () => null}, {eventId, eventKind: "inbound",
    messageType, participantId: PHONE.slice(1), text,
    providerTimestampSeconds: String(Math.floor(atMillis / 1000))});
}

const followUpRequest = (clientRequestId = "req-follow-1",
  token: Record<string, unknown> = {support: true}) => ({
    auth: {uid: "ops-1", token},
    app: {appId: "admin"},
    data: {purpose: "hostLeadFollowUp", intentId: HOST_LEAD, clientRequestId},
    rawRequest: {headers: {}},
  }) as never;

const refusedWith = (pattern: RegExp) => (error: unknown) =>
  error instanceof HttpsError && pattern.test(error.message);

test("an app link lead gets the Host app link once, recorded on the lead " +
  "and in a new Support thread", async () => {
  const h = harness();
  assert.equal(await sendHostAppLinkForLead(h.appLink, LEAD), "accepted");
  assert.deepEqual(h.sent, [{to: PHONE, template: "host_app_link",
    variables: {}}]);
  const record = h.intent().appLinkWhatsapp as Record<string, unknown>;
  const messageId = hostAppLinkMessageId(scope, LEAD);
  assert.equal(record.state, "accepted");
  assert.equal(record.providerMessageId, "wamid.tpl1");
  assert.equal(record.messageId, messageId);
  assert.equal(record.conversationId, conversationId);
  const message = h.message(messageId)!;
  assert.equal(message.direction, "outbound");
  assert.equal(message.authorUid, null);
  assert.equal(message.deliveryState, "accepted");
  assert.equal(message.providerMessageId, "wamid.tpl1");
  const conversation = h.conversation()!;
  assert.equal(conversation.status, "waitingOnThem");
  assert.equal(conversation.waitingSince, null);
  assert.equal(conversation.messageCount, 1);

  // A redelivered trigger never sends again.
  assert.equal(await sendHostAppLinkForLead(h.appLink, LEAD), "replayed");
  assert.equal(h.sent.length, 1);

  // Their quick reply lands in the same thread like any inbound message.
  h.clock.millis += HOUR;
  await inbound(h, "cwhe_reply", h.clock.millis, "button",
    "Book a walkthrough");
  const after = h.conversation()!;
  assert.equal(after.status, "open");
  assert.equal(after.lastMessagePreview, "Book a walkthrough");
  assert.equal(after.messageCount, 2);

  // The inbox shows the send on the lead.
  const projection = projectInboxSource("salesInboundIntent", LEAD,
    h.intent(), {});
  assert.ok(projection?.journey.some((step) =>
    step.title === "Sent the Catch Host app link on WhatsApp"));
});

test("the app link is not sent while switched off, to internal tests, to " +
  "other leads or after STOP", async () => {
  const off = harness({enabled: false});
  assert.equal(await sendHostAppLinkForLead(off.appLink, LEAD), "disabled");
  assert.equal(off.intent().appLinkWhatsapp, undefined);

  for (const patch of [{fullName: "[QA] Test lead"},
    {email: "qa@example.com"}, {leadKind: "guide"},
    {lead: {...appLinkLead().lead, appLink: {app: "guest"}}},
    {lead: {...appLinkLead().lead,
      consent: {purpose: "leadFollowUp", version: "other-v1"}}}]) {
    const h = harness();
    h.db.setDoc(`salesInboundIntents/${LEAD}`, appLinkLead(patch));
    assert.equal(await sendHostAppLinkForLead(h.appLink, LEAD),
      "notApplicable");
    assert.equal(h.sent.length, 0);
  }

  const stale = harness();
  stale.clock.millis = T0 + 7 * HOUR;
  assert.equal(await sendHostAppLinkForLead(stale.appLink, LEAD), "stale");

  const stopped = harness();
  stopped.db.setDoc(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope,
    catchEndpointHash(PHONE))}`, {stopId: "x"});
  assert.equal(await sendHostAppLinkForLead(stopped.appLink, LEAD),
    "stopped");
  assert.equal(stopped.sent.length, 0);
  const record = stopped.intent().appLinkWhatsapp as Record<string, unknown>;
  assert.equal(record.state, "skipped");
  assert.equal(record.skipReason, "stopped");
  assert.equal(stopped.conversation(), undefined);
  assert.equal(await sendHostAppLinkForLead(stopped.appLink, LEAD),
    "replayed");

  const noSender = harness({noSender: true});
  assert.equal(await sendHostAppLinkForLead(noSender.appLink, LEAD),
    "unavailable");
  assert.equal((noSender.intent().appLinkWhatsapp as Record<string, unknown>)
    .skipReason, "unavailable");
  assert.deepEqual(noSender.warnings,
    ["Host app link not sent: no WhatsApp sender here."]);
});

test("a refused or unconfirmed app link is recorded and never retried",
  async () => {
    const refused = harness();
    refused.fail(new MetaProviderError("Refused", 131026, 400));
    assert.equal(await sendHostAppLinkForLead(refused.appLink, LEAD),
      "failed");
    const record = refused.intent().appLinkWhatsapp as Record<string, unknown>;
    assert.equal(record.state, "failed");
    assert.equal(record.deliveryErrorCode, 131026);
    assert.equal(refused.message(hostAppLinkMessageId(scope, LEAD))!
      .deliveryState, "failed");
    assert.deepEqual(refused.warnings, ["Host app link refused by WhatsApp."]);
    refused.fail(null);
    assert.equal(await sendHostAppLinkForLead(refused.appLink, LEAD),
      "replayed");
    assert.equal(refused.sent.length, 0);

    const lost = harness();
    lost.fail(new Error("socket hang up"));
    assert.equal(await sendHostAppLinkForLead(lost.appLink, LEAD), "unknown");
    assert.equal((lost.intent().appLinkWhatsapp as Record<string, unknown>)
      .state, "unknown");
  });

test("the automatic app link leaves a waiting conversation waiting",
  async () => {
    const h = harness();
    await inbound(h, "cwhe_question", T0, "text", "Is Catch free?");
    const before = h.conversation()!;
    assert.equal(before.status, "open");
    assert.equal(await sendHostAppLinkForLead(h.appLink, LEAD), "accepted");
    const after = h.conversation()!;
    assert.equal(after.status, "open");
    assert.deepEqual(after.waitingSince, before.waitingSince);
    assert.equal(after.lastMessagePreview, "Is Catch free?");
    assert.equal(after.messageCount, 2);
  });

test("staff send the follow-up with the lead's first name, recorded in the " +
  "thread; a retry replays it", async () => {
  const h = harness();
  const first = await sendHostLeadFollowUp(followUpRequest(), h.followUp);
  const messageId = hostLeadFollowUpMessageId(scope, HOST_LEAD,
    "req-follow-1");
  assert.equal(first.replayed, false);
  assert.equal(first.operationId, messageId);
  assert.equal(first.conversationId, conversationId);
  assert.deepEqual(h.sent, [{to: PHONE, template: "host_lead_follow_up",
    variables: {first_name: "Ira"}}]);
  const message = h.message(messageId)!;
  assert.equal(message.authorUid, "ops-1");
  assert.equal(message.text, CATCH_TEMPLATES.host_lead_follow_up.text(
    {first_name: "Ira"}));
  assert.equal(h.conversation()!.status, "waitingOnThem");
  // The lead itself is only read; the thread and the audit log hold the send.
  assert.equal(h.intent(HOST_LEAD).followUpWhatsapp, undefined);
  const audits = [...h.db.docs.keys()]
    .filter((path) => path.startsWith("adminAuditLogs/"));
  assert.equal(audits.length, 2);

  const again = await sendHostLeadFollowUp(followUpRequest(), h.followUp);
  assert.equal(again.replayed, true);
  assert.equal(h.sent.length, 1);
});

test("the follow-up waits for a closed window and a week between sends",
  async () => {
    const h = harness();
    await inbound(h, "cwhe_1", T0 - 2 * HOUR);
    await assert.rejects(sendHostLeadFollowUp(followUpRequest(), h.followUp),
      refusedWith(/last 24 hours/));
    assert.equal(h.sent.length, 0);

    h.clock.millis = T0 + DAY;
    await sendHostLeadFollowUp(followUpRequest(), h.followUp);
    h.clock.millis += 3 * DAY;
    await assert.rejects(
      sendHostLeadFollowUp(followUpRequest("req-follow-2"), h.followUp),
      refusedWith(/one a week at most/));
    h.clock.millis += 4 * DAY;
    const later = await sendHostLeadFollowUp(followUpRequest("req-follow-3"),
      h.followUp);
    assert.equal(later.replayed, false);
    assert.equal(h.sent.length, 2);
  });

test("the follow-up is refused for other leads, after STOP, when off, and " +
  "for roles outside the inbox", async () => {
  const referral = harness();
  referral.db.setDoc(`salesInboundIntents/${HOST_LEAD}`,
    walkthroughLead({leadKind: "referral"}));
  await assert.rejects(
    sendHostLeadFollowUp(followUpRequest(), referral.followUp),
    refusedWith(/running events/));

  const stopped = harness();
  stopped.db.setDoc(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope,
    catchEndpointHash(PHONE))}`, {stopId: "x"});
  await assert.rejects(
    sendHostLeadFollowUp(followUpRequest(), stopped.followUp),
    refusedWith(/stop messaging/));

  const off = harness({enabled: false});
  await assert.rejects(sendHostLeadFollowUp(followUpRequest(), off.followUp),
    refusedWith(/switched off/));

  const safety = harness();
  await assert.rejects(sendHostLeadFollowUp(
    followUpRequest("req-follow-1", {safetyReviewer: true}),
    safety.followUp), (error: unknown) => error instanceof HttpsError &&
    error.code === "permission-denied");
  assert.equal(safety.sent.length + stopped.sent.length + off.sent.length +
    referral.sent.length, 0);
});

test("a first name is the first word of the name, or there", () => {
  assert.equal(leadFirstName("Ira Fernhill"), "Ira");
  assert.equal(leadFirstName("  asha,  K "), "asha");
  assert.equal(leadFirstName("Dr. Noor"), "Dr");
  assert.equal(leadFirstName(""), "there");
  assert.equal(leadFirstName("  "), "there");
  assert.equal(leadFirstName(null), "there");
  assert.equal(leadFirstName("1234"), "there");
});
