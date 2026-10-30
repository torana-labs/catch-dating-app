import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {MetaWhatsappProvider} from "../../organizers/organizerWhatsappProvider";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {guestCollections, parseGrant} from "./guestRecords";
import type {GuestLinkSigningKeys} from "./guestLinkTokens";
import type {MessageRecord} from "./messageOutbox";
import {
  parseWhatsappPolicy, renderEventWhatsapp, WhatsappPolicy,
  whatsappReplyPayloads, whatsappTemplateSnapshot,
} from "./whatsappTemplate";
import {whatsappAttemptFromReplyId} from "./whatsappReplyProtocol";
import {BRAND} from "../../shared/generated/brand";

const now = Date.parse("2026-09-07T14:00:00Z");
const keys: GuestLinkSigningKeys = {currentKeyId: "test-wa-key",
  keyFor: () => Buffer.alloc(32, 3)};

async function fixture() {
  const db = new ProgressFirestore();
  const context = {mode: "live" as const, eventId: "e1", organizerId: "o1"};
  const progress = await seedJoiningProgress(db as unknown as Firestore,
    context, now, now + 3_600_000);
  db.write("eventAttendees/a1", {organizerId: "o1", eventId: "e1",
    status: "registered", linkedUid: "u1", phoneE164: "+919999999999",
    createdAt: {seconds: (now - 60_000) / 1000, nanoseconds: 0}});
  const guests = new GuestAssistanceStore(db as unknown as Firestore,
    () => now);
  const guest = await guests.startEpisode(context, "a1", "request", null);
  const intent: MessageRecord["intent"] = {schemaVersion: 1, intentId: "m1",
    revision: 1, context, eventId: "e1", attendeeId: "a1",
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "s1"},
    createdAt: now, expiresAt: now + 1_800_000,
    permittedRoutes: ["organizerEventWhatsapp"], deliveryPolicy: {
      maxAttempts: 2, maxAttemptsPerRoute: 1, minimumRetrySeconds: 1,
    }, kind: "joiningUpdate", guidance: progress.guidance,
    choices: [
      {choiceId: "on-my-way", label: "I'm on my way", value: {
        kind: "joinIntent",
        intention: {kind: "onMyWay", claimedEta: null}}},
      {choiceId: "not-coming", label: "I can't make it", value: {
        kind: "joinIntent",
        intention: {kind: "notComing"}}},
      {choiceId: "need-help", label: "I need help", value: {
        kind: "requestHelp", category: "eventLogistics"}},
    ]};
  const thread = await guests.publishMessage(intent, null);
  const link = await guests.issueLink(thread.threadId, "send-request", keys);
  const grant = parseGrant(db.read(
    guestCollections.grants + "/" + link.linkId));
  const raw = {
    id: "123456", name: "event_service_update", language: "en",
    status: "APPROVED", category: "UTILITY", parameter_format: "NAMED",
    components: [
      {type: "BODY", text: "Catch event update: {{instruction}}",
        example: {body_text_named_params: [{param_name: "instruction"}]}},
      {type: "BUTTONS", buttons: [
        {type: "QUICK_REPLY", text: "I'm on my way"},
        {type: "URL", text: "View update",
          url: `${BRAND.web.origin}/event-update/{{1}}`, example: ["token"]},
        {type: "QUICK_REPLY", text: "I need help"},
      ]},
    ],
  };
  const snapshot = await parseProviderTemplate(raw);
  const template = {organizerId: "o1", connectionId: "sender-1", ...snapshot,
    syncedAt: {_seconds: now / 1000, _nanoseconds: 0}, providerUpdatedAt: null};
  const policy: WhatsappPolicy = {schemaVersion: 1, senderId: "sender-1",
    organizerId: "o1", revision: 1, status: "ready",
    providerAccountId: "123456", providerPhoneNumberId: "789012",
    maxTemplateAgeSeconds: 900, activation: {approvalId: "fixture-review",
      approvedAt: now - 1000, validUntil: now + 3_600_000},
    quote: {revision: 1, currency: "INR", recipientPrefixes: ["+91"],
      maxMicrosPerMessage: 500_000, validUntil: now + 1_800_000},
    templates: [{templateDocumentId: "template-1", purpose: "joiningUpdate",
      templateHash: operationContentHash(whatsappTemplateSnapshot(template)),
      variables: [
        {providerName: "instruction", source: "instruction",
          maxCharacters: 500},
        {providerName: "button_2_url", source: "responseUrlSuffix",
          maxCharacters: 160},
      ], quickReplies: [
        {buttonIndex: 2, choiceId: "need-help", label: "I need help",
          action: "helpLogistics"},
        {buttonIndex: 0, choiceId: "on-my-way", label: "I'm on my way",
          action: "onMyWay"},
      ]}],
  };
  return {raw, template, policy, intent, grant, keys, now, db, guests,
    templateDocumentId: "template-1", eventTitle: "Evening crawl",
    phoneE164: "+919999999999"};
}

async function parseProviderTemplate(raw: unknown) {
  const provider = new MetaWhatsappProvider({appId: "fixture-app",
    appSecret: "fixture-secret", configId: "fixture-config",
    graphVersion: "v23.0"},
  async () => new Response(JSON.stringify({data: [raw]})));
  const [snapshot] = await provider.listTemplates({accessToken: "fixture-token",
    wabaId: "123456"});
  return snapshot;
}

test("reviewed template retains all choices on web and maps native slots",
  async () => {
    const f = await fixture();
    const rendered = renderEventWhatsapp(f);
    assert.equal(rendered.templateDocumentId, "template-1");
    assert.equal(rendered.validUntil, now + 900_000);
    assert.equal(rendered.maxCostMicros, 500_000);
    assert.equal(rendered.variables.instruction, f.intent.guidance.text);
    assert.match(rendered.variables.button_2_url,
      /^[a-f0-9]{32}#[A-Za-z0-9_-]{43}$/);
    assert.equal(rendered.replies.length, 2);
    assert.equal(f.intent.choices.length, 3);
    const attemptId = "attempt:" + "a".repeat(64);
    const payloads = whatsappReplyPayloads(rendered, attemptId);
    assert.deepEqual(payloads.map((p) => p.buttonIndex), [2, 0]);
    assert.equal(whatsappAttemptFromReplyId(payloads[0].payload), attemptId);
    assert.ok(payloads[0].payload.endsWith(".0"));
    let sent: {template?: {components: unknown[]}} = {};
    const provider = new MetaWhatsappProvider({appId: "fixture-app",
      appSecret: "fixture-secret", configId: "fixture", graphVersion: "v23.0"},
    async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({messages: [{id: "wamid.fixture"}]}));
    }, () => now);
    await provider.sendTemplate({accessToken: "fixture-token",
      phoneNumberId: "789012", toE164: f.phoneE164, template: rendered.template,
      variables: rendered.variables, quickReplyPayloads: payloads,
      deadline: rendered.validUntil});
    const text = JSON.stringify(sent);
    assert.ok(text.includes("\"parameter_name\":\"instruction\""));
    assert.ok(text.includes("\"sub_type\":\"url\",\"index\":\"1\""));
    assert.ok(text.includes("\"sub_type\":\"quick_reply\",\"index\":\"2\""));
    assert.ok(text.includes(rendered.variables.button_2_url));
  });

test("content hash covers body, footer, buttons, format and provider identity",
  async () => {
    const f = await fixture();
    for (const raw of [
      {...f.raw, id: "654321"}, {...f.raw, name: "different_template"},
      {...f.raw, parameter_format: "POSITIONAL"},
      {...f.raw, components: [{...f.raw.components[0], text: "Changed copy"},
        f.raw.components[1]]},
      {...f.raw, components: [...f.raw.components,
        {type: "FOOTER", text: "Changed footer"}]},
    ]) {
      const changed = await parseProviderTemplate(raw);
      assert.notEqual(changed.contentHash, f.template.contentHash);
      assert.throws(() => renderEventWhatsapp({...f,
        template: {...f.template, ...changed}}), /Reviewed WhatsApp template/);
    }
    const synced = {...f.template,
      syncedAt: {_seconds: (now + 1000) / 1000, _nanoseconds: 0}};
    assert.equal(operationContentHash(whatsappTemplateSnapshot(synced)),
      f.policy.templates[0].templateHash);
  });

test("changed synchronized metadata cannot inherit review", async () => {
  const f = await fixture();
  for (const change of [
    {contentHash: undefined}, {buttonUrls: undefined},
    {name: "other_template"}, {language: "fr"}, {connectionId: "other-sender"},
    {organizerId: "other-organizer"}, {parameterFormat: "UNKNOWN"},
    {status: "PAUSED"}, {category: "MARKETING"}, {hasMediaHeader: true},
    {contentHash: "b".repeat(64)},
  ]) {
    assert.throws(() => renderEventWhatsapp({...f,
      template: {...f.template, ...change}}));
  }
});

test("same label and id cannot mask a different guest action", async () => {
  const f = await fixture();
  const changed = structuredClone(f.intent);
  changed.choices[0] = {...changed.choices[0], value: {
    kind: "joinIntent", intention: {kind: "notComing"}}};
  assert.throws(() => renderEventWhatsapp({...f, intent: changed}),
    /differs from the offered guest action/);
  const missing = structuredClone(f.policy);
  missing.templates[0].quickReplies.pop();
  assert.throws(() => renderEventWhatsapp({...f, policy: missing}),
    /coverage is incomplete/);
  const wrong = structuredClone(f.policy);
  wrong.templates[0].quickReplies[0].label = "I can't make it";
  assert.throws(() => renderEventWhatsapp({...f, policy: wrong}),
    /differs from the offered guest action/);
});

test("template policies require complete unique instruction and response slots",
  async () => {
    const f = await fixture();
    for (const mutate of [
      (p: WhatsappPolicy) => p.templates.push(p.templates[0]),
      (p: WhatsappPolicy) => p.templates[0].variables.pop(),
      (p: WhatsappPolicy) => p.templates[0].variables.push(
        p.templates[0].variables[0]),
      (p: WhatsappPolicy) => p.templates[0].quickReplies.push(
        p.templates[0].quickReplies[0]),
      (p: WhatsappPolicy) => p.activation.validUntil = p.activation.approvedAt,
    ]) {
      const policy = structuredClone(f.policy);
      mutate(policy);
      assert.throws(() => parseWhatsappPolicy(policy));
    }
    const excess = structuredClone(f.policy);
    excess.templates[0].variables.push({providerName: "unused",
      source: "eventTitle", maxCharacters: 50});
    assert.throws(() => renderEventWhatsapp({...f, policy: excess}),
      /variable mapping is incomplete/);
    const wrong = structuredClone(f.policy);
    wrong.templates[0].variables[1].source = "responseUrl";
    assert.throws(() => renderEventWhatsapp({...f, policy: wrong}),
      /Unsupported WhatsApp parameter destination/);
  });

test("guest link and instruction are never truncated or silently rewritten",
  async () => {
    const f = await fixture();
    const changed = structuredClone(f.intent);
    changed.guidance.text = "  Meet at the first venue.  ";
    const rendered = renderEventWhatsapp({...f, intent: changed});
    assert.equal(rendered.variables.instruction, changed.guidance.text);
    const limited = structuredClone(f.policy);
    limited.templates[0].variables[0].maxCharacters = 4;
    assert.throws(() => renderEventWhatsapp({...f, policy: limited}),
      /exceeds its reviewed limit/);
    const wrongKey = {currentKeyId: "test-wa-key",
      keyFor: () => Buffer.alloc(32, 4)};
    assert.throws(() => renderEventWhatsapp({...f, keys: wrongKey}),
      /guest link key mismatch/);
  });

test("native help buttons preserve their exact category",
  async () => {
    const f = await fixture();
    const categories = {helpLogistics: "eventLogistics",
      helpAccessibility: "accessibility", helpSafety: "comfortSafety",
      helpOther: "other"} as const;
    for (const [action, category] of Object.entries(categories)) {
      const intent = structuredClone(f.intent);
      intent.choices[2].value = {kind: "requestHelp", category};
      const policy = structuredClone(f.policy);
      policy.templates[0].quickReplies[0].action =
        action as keyof typeof categories;
      const rendered = renderEventWhatsapp({...f, policy, intent});
      assert.equal(rendered.replies[0].choiceId, "need-help");
      const mismatched = structuredClone(policy);
      mismatched.templates[0].quickReplies[0].action =
        action === "helpOther" ? "helpLogistics" : "helpOther";
      assert.throws(() => renderEventWhatsapp({...f, intent,
        policy: mismatched}), /differs from the offered guest action/);
    }
  });

test("operational acknowledgement buttons retain the instruction revision",
  async () => {
    const f = await fixture();
    const {guidance, kind, automation, ...base} = f.intent;
    void [guidance, kind, automation];
    const intent: MessageRecord["intent"] = {...base, intentId: "notice-1",
      kind: "operationalNotice", noticeKind: "planChanged",
      workflow: {kind: "planChangeCommunication", occurrenceId: "notice-s1"},
      title: "Meeting place updated", body: "Meet at the next venue.",
      instructionRevision: 2, choices: [
        {choiceId: "acknowledged", label: "Got it", value: {
          kind: "acknowledge", instructionRevision: 2}},
        {choiceId: "need-help", label: "I need help", value: {
          kind: "requestHelp", category: "eventLogistics"}},
      ]};
    const thread = await f.guests.publishMessage(intent, null);
    const link = await f.guests.issueLink(thread.threadId, "notice-send", keys);
    const grant = parseGrant(f.db.read(guestCollections.grants + "/" +
      link.linkId));
    const raw = structuredClone(f.raw);
    raw.components[1].buttons![0].text = "Got it";
    const template = {...f.template, ...await parseProviderTemplate(raw)};
    const policy = structuredClone(f.policy);
    policy.templates[0].purpose = "planChanged";
    policy.templates[0].templateHash =
      operationContentHash(whatsappTemplateSnapshot(template));
    policy.templates[0].quickReplies[1] = {buttonIndex: 0,
      choiceId: "acknowledged", label: "Got it", action: "acknowledge"};
    const rendered = renderEventWhatsapp({
      ...f, intent, policy, template, grant,
    });
    assert.equal(rendered.variables.instruction, intent.body);
    assert.equal(rendered.replies[1].choiceId, "acknowledged");
    const stale = {...intent, instructionRevision: 3};
    assert.throws(() => renderEventWhatsapp({...f, intent: stale, policy,
      template, grant}), /another instruction revision/);
  });

test("templates without native buttons retain the complete webpage response",
  async () => {
    const f = await fixture();
    const raw = {...f.raw, components: [{type: "BODY",
      text: "Catch update: {{instruction}}. Respond: {{response_url}}",
      example: {body_text_named_params: [{param_name: "instruction"},
        {param_name: "response_url"}]}}]};
    const template = {...f.template, ...await parseProviderTemplate(raw)};
    const policy = structuredClone(f.policy);
    policy.templates[0].templateHash =
      operationContentHash(whatsappTemplateSnapshot(template));
    policy.templates[0].quickReplies = [];
    policy.templates[0].variables[1] = {providerName: "response_url",
      source: "responseUrl", maxCharacters: 160};
    const rendered = renderEventWhatsapp({...f, policy, template});
    assert.deepEqual(rendered.replies, []);
    assert.ok(rendered.variables.response_url.startsWith(
      `${BRAND.web.origin}/event-update/`));
  });

test("review cannot route a guest link to another host or wrong URL slot",
  async () => {
    const f = await fixture();
    const template = {...f.template, buttonUrls: [null,
      "https://example.com/event-update/{{1}}", null]};
    const policy = structuredClone(f.policy);
    policy.templates[0].templateHash =
      operationContentHash(whatsappTemplateSnapshot(template));
    assert.throws(() => renderEventWhatsapp({...f, policy, template}),
      /Unsupported WhatsApp parameter destination/);
    const gap = structuredClone(f.template);
    gap.parameterBindings[0].position = 1;
    policy.templates[0].templateHash =
      operationContentHash(whatsappTemplateSnapshot(gap));
    assert.throws(() => renderEventWhatsapp({...f, policy, template: gap}),
      /parameter positions are incomplete/);
  });

test("native payload numbering cannot use changed prepared material",
  async () => {
    const rendered = renderEventWhatsapp(await fixture());
    rendered.replies.reverse();
    assert.throws(() => whatsappReplyPayloads(rendered,
      "attempt:" + "a".repeat(64)), /prepared material changed/);
  });

test("expiry and unsupported recipients cannot use stale reviewed material",
  async () => {
    const f = await fixture();
    for (const change of [
      {now: now + 900_000}, {now: now - 1},
      {phoneE164: "+441234567890"}, {phoneE164: "+919999999999\n"},
      {template: {...f.template, syncedAt: {_seconds: (now + 1000) / 1000,
        _nanoseconds: 0}}},
      {grant: {...f.grant, revokedAt: now}},
      {grant: {...f.grant, episodeId: "another-episode"}},
      {policy: {...f.policy, status: "paused" as const}},
      {policy: {...f.policy, quote: {...f.policy.quote, validUntil: now}}},
    ]) assert.throws(() => renderEventWhatsapp({...f, ...change}));
  });
