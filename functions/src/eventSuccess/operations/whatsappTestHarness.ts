import assert from "node:assert/strict";
import {createHash, createHmac} from "node:crypto";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {operationContentHash} from "../../operations/durableActions";
import {ingestMetaWhatsappWebhook} from
  "../../organizers/organizerWhatsappWebhook";
import {MetaWhatsappProvider} from
  "../../platform/delivery/organizerWhatsappProvider";
import type {SetEventWhatsappPreferenceCallablePayload as PreferenceInput} from
  "../../shared/generated/setEventWhatsappPreferenceCallablePayload";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {assistanceMessageId, MessageRecord} from "./messageOutbox";
import {WhatsappPreferenceStore} from "./whatsappPreferenceStore";
import {WHATSAPP_CONSENT_VERSION} from "./whatsappConsent";
import {WhatsappDispatchStore} from "./whatsappDispatchStore";
import {EventWhatsappWorker} from "./whatsappWorker";
import {whatsappBudgetScopes, whatsappBudgetId, WHATSAPP_BUDGETS} from
  "./whatsappSpend";
import {WHATSAPP_POLICIES, whatsappTemplateSnapshot, WhatsappPolicy} from
  "./whatsappTemplate";

export const start = Date.parse("2026-09-07T12:00:00Z");
export const keys = {currentKeyId: "fixture-key",
  keyFor: () => Buffer.alloc(32, 6)};
export const appSecret = "fixture-stop-secret";
export async function harness(realDb?: Firestore, id = "test",
  permittedRoutes: MessageRecord["intent"]["permittedRoutes"] =
  ["organizerEventWhatsapp"], eventEnd = start + 3_600_000,
  privateRecipient = false) {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const clock = {now: start};
  const write = async (path: string, value: object) => {
    if (realDb) await realDb.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const read = async (path: string) => realDb ?
    (await realDb.doc(path).get()).data() : fake.read(path);
  const context = {mode: "live" as const, organizerId: "o-" + id,
    eventId: "e-" + id};
  const scope = {eventId: context.eventId, attendeeId: "a-" + id,
    senderId: "sender-" + id};
  const actor = {uid: "u-" + id, phone: "+919999999999"};
  const phoneNumberId = "800" + BigInt("0x" +
    operationContentHash(id).slice(0, 16)).toString();
  const senderPath = "organizerSenderConnections/" + scope.senderId;
  const policyPath = WHATSAPP_POLICIES + "/" + scope.senderId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const stamp = {_seconds: start / 1000, _nanoseconds: 0};
  const progress = await seedJoiningProgress(db, context, start, eventEnd);
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, status: "registered", linkedUid: actor.uid,
    phoneE164: privateRecipient ? null : actor.phone, createdAt: stamp});
  await write(senderPath, {organizerId: context.organizerId,
    channel: "whatsapp", provider: "metaCloudApi", status: "active",
    wabaId: "700123", phoneNumberId, businessId: "900123",
    displayPhoneNumber: "+918888888888", verifiedName: "Fixture organizer",
    secretVersionResource: "projects/demo/secrets/WA_FIXTURE/versions/1",
    qualityRating: "GREEN", messagingLimitTier: null,
    templateSyncStatus: "current", webhookStatus: "subscribed",
    testStatus: "delivered", testProviderMessageId: "wamid.fixture",
    testRecipientHash: null, connectedByUid: "manager", revision: 1,
    createdAt: stamp, updatedAt: stamp, disconnectedAt: null});
  const templateId = "template-" + id;
  const templatePath = "organizerMessageTemplates/" + templateId;
  const template = {organizerId: context.organizerId,
    connectionId: scope.senderId, providerTemplateId: "600123", name: "update",
    language: "en", category: "UTILITY", status: "APPROVED",
    variableNames: ["instruction", "response_url"], parameterBindings: [
      {variableName: "instruction", component: "body", position: 0,
        buttonIndex: null},
      {variableName: "response_url", component: "body", position: 1,
        buttonIndex: null},
    ], hasMediaHeader: false, buttonKinds: ["QUICK_REPLY"],
    buttonLabels: ["On my way"], buttonUrls: [null], parameterFormat: "NAMED",
    contentHash: "f".repeat(64), providerUpdatedAt: null, syncedAt: stamp};
  await write(templatePath, template);
  const policy: WhatsappPolicy = {schemaVersion: 1, senderId: scope.senderId,
    organizerId: context.organizerId, revision: 1, status: "ready",
    providerAccountId: "700123", providerPhoneNumberId: phoneNumberId,
    maxTemplateAgeSeconds: 900, activation: {approvalId: "fixture-review",
      approvedAt: start - 1000, validUntil: start + 3_600_000},
    quote: {revision: 1, currency: "INR", recipientPrefixes: ["+91"],
      maxMicrosPerMessage: 500_000, validUntil: start + 3_600_000},
    templates: [{templateDocumentId: templateId, purpose: "joiningUpdate",
      templateHash: operationContentHash(whatsappTemplateSnapshot(template)),
      variables: [
        {providerName: "instruction", source: "instruction",
          maxCharacters: 500},
        {providerName: "response_url", source: "responseUrl",
          maxCharacters: 160},
      ], quickReplies: [{buttonIndex: 0, choiceId: "on-way", label: "On my way",
        action: "onMyWay"}]}]};
  await write(policyPath, policy);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const guest = await guests.startEpisode(context, scope.attendeeId,
    "start", null);
  const intent: MessageRecord["intent"] = {schemaVersion: 1,
    intentId: "m-" + id,
    revision: 1, context, eventId: context.eventId,
    attendeeId: scope.attendeeId,
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "s1"},
    createdAt: start, expiresAt: Math.min(start + 1_800_000,
      progress.guidance.validUntil),
    permittedRoutes,
    deliveryPolicy: {maxAttempts: 2,
      maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: progress.guidance, choices: [{choiceId: "on-way",
      label: "On my way", value: {kind: "joinIntent",
        intention: {kind: "onMyWay", claimedEta: null}}}]};
  const thread = await guests.publishMessage(intent, null);
  const link = await guests.issueLink(thread.threadId, "send", keys);
  const preferences = new WhatsappPreferenceStore(db, () => clock.now);
  const initial = (await preferences.get(actor, scope)).view;
  const grant = {...scope, requestId: "grant", expectedRevision: null,
    decision: {kind: "grant" as const, copyVersion: WHATSAPP_CONSENT_VERSION,
      reviewHash: initial.reviewHash,
      senderHash: initial.sender!.bindingHash,
      stopRecordHash: null}} satisfies PreferenceInput;
  await preferences.set(actor, grant);
  const budgetPaths: string[] = [];
  for (const budgetScope of whatsappBudgetScopes(context, start)) {
    const begins = budgetScope.kind === "senderDay" ?
      Date.parse(budgetScope.day + "T00:00:00Z") : start - 1000;
    const budgetId = whatsappBudgetId(scope.senderId, "INR", budgetScope);
    const path = WHATSAPP_BUDGETS + "/" + budgetId;
    budgetPaths.push(path);
    await write(path, {schemaVersion: 1, channel: "whatsapp", budgetId,
      senderId: scope.senderId,
      revision: 1, scope: budgetScope, status: "active", approvalId: "fixture",
      currency: "INR", limitMicros: 2_000_000, chargedMicros: 0,
      startsAt: begins, endsAt: budgetScope.kind === "senderDay" ?
        begins + 86_400_000 : start + 3_600_000, updatedAt: start});
  }
  const store = new WhatsappDispatchStore(db, scope.senderId, keys,
    () => clock.now);
  const expected = (await store.sender())!;
  const outbox = store.outbox(link.linkId);
  const messageId = assistanceMessageId(intent);
  const reserve = () => outbox.reserve(messageId);
  const claim = async () => {
    const reservation = await reserve();
    const attempt = reservation.record.attempts.at(-1)!;
    return outbox.claimLiveDispatch(messageId, attempt.attemptId,
      store.prepare(link.linkId, expected));
  };
  const stop = async (at: number, key = "stop") => {
    const rawBody = Buffer.from(JSON.stringify({entry: [{id: "700123",
      changes: [{value: {metadata: {phone_number_id: phoneNumberId},
        messages: [{id: "wamid." + id + key, from: actor.phone.slice(1),
          timestamp: String(at / 1000), type: "text", text: {body: "STOP"}}],
      }}]}]}));
    return ingestMetaWhatsappWebhook({db, rawBody, appSecret,
      now: Timestamp.fromMillis(clock.now), signatureHeader: "sha256=" +
        createHmac("sha256", appSecret).update(rawBody).digest("hex")});
  };
  return {progress, fake, db, clock, context, scope, actor, expected, outbox,
    messageId,
    intent, guests,
    link, store, claim, reserve, stop, preferences, grant, budgetPaths,
    senderPath, policyPath, attendeePath, templatePath, read, write};
}

export type Harness = Awaited<ReturnType<typeof harness>>;
export function worker(h: Harness, fetchImpl: typeof fetch,
  credential = async () => "fixture-token") {
  const provider = new MetaWhatsappProvider({appId: "fixture",
    appSecret: "fixture", configId: "fixture", graphVersion: "v23.0"},
  fetchImpl, () => h.clock.now);
  return new EventWhatsappWorker(h.store, provider, {
    accessBound: async (scope) => {
      assert.deepEqual(scope, {
        versionResource: h.expected.connection.secretVersionResource,
        organizerId: h.context.organizerId, connectionId: h.scope.senderId,
      });
      return credential();
    },
  }, () => h.clock.now);
}

export async function queuedStatus(h: Harness, correlation: string,
  status: string, overrides: Record<string, unknown> = {}) {
  const value = {id: "wamid.delivery", status,
    timestamp: String(h.clock.now / 1000),
    recipient_id: h.actor.phone.slice(1),
    biz_opaque_callback_data: correlation, ...overrides};
  const rawBody = Buffer.from(JSON.stringify({entry: [{
    id: h.expected.connection.wabaId, changes: [{value: {
      metadata: {phone_number_id: h.expected.connection.phoneNumberId},
      statuses: [value],
    }}],
  }]}));
  await ingestMetaWhatsappWebhook({db: h.db, rawBody, appSecret,
    now: Timestamp.fromMillis(h.clock.now), signatureHeader: "sha256=" +
      createHmac("sha256", appSecret).update(rawBody).digest("hex")});
  const identity = "status:" + value.id + ":" + value.status + ":" +
    Number(value.timestamp) * 1000;
  return "omwe_" + createHash("sha256").update(identity)
    .digest("hex").slice(0, 48);
}
