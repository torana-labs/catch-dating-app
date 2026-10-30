import assert from "node:assert/strict";
import {createHash, createHmac} from "node:crypto";
import test from "node:test";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {parseDeliveryAttempt} from "./messageProtocol";
import {grantSecret, guestSecretHash} from "./guestLinkTokens";
import {GoogleRbmProvider} from "./googleRbmProvider";
import {rbmSendBody, rbmUuid} from "./googleRbmProtocol";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {parseRcsConfig, prepareEventRcs, rcsEndpointId, rcsMessageId,
  renderEventRcs, RcsConfig} from "./rcsProtocol";
import {rcsTestAttemptId, rcsTestConfig, rcsTestInput, rcsTestIntent,
  rcsTestNow} from "./rcsTestFixtures";
import {BRAND} from "../../shared/generated/brand";

test("Google binding is canonical only on the RCS route", () => {
  const input = rcsTestInput();
  const attempt = {schemaVersion: 1, attemptId: rcsTestAttemptId,
    intentId: input.intent.intentId, intentRevision: 1, ordinal: 1,
    createdAt: rcsTestNow, mode: "live", context: input.intent.context,
    state: {kind: "reserved", at: rcsTestNow, reconcileAfter: rcsTestNow},
    authorization: {permissionRevision: "fixture-only", checkedAt: rcsTestNow,
      validUntil: rcsTestNow + 1000, instructionRevision: 1},
    binding: {routeId: "catchEventRcs", transport: "rcs",
      senderIdentity: "catchPlatform", provider: "googleRbm",
      senderId: input.config.senderId, bindingRevision: 1,
      recipientEndpointId: "fixture-endpoint", fallbackOwner: "catch"}};
  assert.doesNotThrow(() => parseDeliveryAttempt(attempt));
  assert.throws(() => parseDeliveryAttempt({...attempt, binding: {
    ...attempt.binding, routeId: "catchEventSms", transport: "sms",
  }}));
  assert.throws(() => parseDeliveryAttempt({...attempt, binding: {
    ...attempt.binding, routeId: "organizerEventWhatsapp",
    transport: "whatsapp",
    senderIdentity: "organizerManaged",
  }}));
});

test("sender config preserves Google agent IDs and rejects malformed authority",
  () => {
    assert.equal(parseRcsConfig(rcsTestConfig()).agentId,
      "fixture-agent@rbm.goog");
    for (const change of [
      {provider: "gupshup"}, {agentId: "agent\n"}, {agentId: "agent/id"},
      {displayName: " "}, {displayName: "\ud800"}, {displayName: ""},
      {agentId: "a".repeat(513)}, {region: "global"}, {revision: 0},
      {credentialVersion: "projects/fixture/secrets/rcs/versions/latest"},
      {recipientPrefixes: []}, {recipientPrefixes: ["+91", "+91"]},
      {recipientPrefixes: ["+91\n"]}, {maxQueueSeconds: 0},
      {maxQueueSeconds: 3601}, {allowedPurposes: ["promotion"]},
      {activation: {...rcsTestConfig().activation, validUntil: 0}},
      {quote: {...rcsTestConfig().quote, validUntil: 0}},
      {accessToken: "do-not-store"},
    ]) assert.throws(() => parseRcsConfig({...rcsTestConfig(), ...change}));
  });

test("RCS identities are stable, valid UUIDs and separated by guest context",
  () => {
    const messageId = rcsMessageId(rcsTestAttemptId);
    assert.equal(messageId, rcsMessageId(rcsTestAttemptId));
    assert.equal(rbmUuid(messageId), true);
    assert.equal(messageId[14], "5");
    assert.notEqual(messageId, rcsMessageId("attempt:" + "c".repeat(64)));
    for (const value of ["attempt:1", rcsTestAttemptId + "\n", "../message"]) {
      assert.throws(() => rcsMessageId(value));
    }
    const context = rcsTestInput().grant.context;
    const endpoint = rcsEndpointId(context, "guest-1", "+919999999999");
    assert.notEqual(endpoint,
      rcsEndpointId(context, "guest-2", "+919999999999"));
    assert.notEqual(endpoint, rcsEndpointId({...context, eventId: "event-2"},
      "guest-1", "+919999999999"));
    assert.notEqual(endpoint,
      rcsEndpointId(context, "guest-1", "+919999999998"));
    assert.ok(!endpoint.includes("9999999999"));
    for (const phone of ["9999999999", "+919999999999\n", "+0123456789"]) {
      assert.throws(() => rcsEndpointId(context, "guest-1", phone));
    }
  });

test("preflight authority is stable across clocks; claim material fixes expiry",
  () => {
    const input = rcsTestInput();
    const first = prepareEventRcs(input);
    const later = prepareEventRcs({...input, now: input.now + 1000});
    assert.deepEqual(first, later);
    assert.ok(Object.isFrozen(first));
    const rendered = renderEventRcs(input);
    assert.equal(rendered.expiresAt, input.now + 600_000);
    assert.equal(rendered.validUntil, rendered.expiresAt);
    assert.equal(rendered.authorityHash, first.authorityHash);
    const laterRender = renderEventRcs({...input, now: input.now + 1000});
    assert.equal(laterRender.providerMessageId, rendered.providerMessageId);
    assert.notEqual(laterRender.payloadHash, rendered.payloadHash);
    assert.equal(rendered.expiresAt, input.now + 600_000);
    const body = rbmSendBody({messageId: rendered.providerMessageId,
      contentMessage: rendered.contentMessage, expiresAt: rendered.expiresAt},
    input.now);
    assert.ok(body);
    assert.equal(rendered.payloadHash, createHash("sha256").update(body)
      .digest("hex"));
    assert.throws(() => {
      rendered.contentMessage.text = "Changed";
    });
    assert.throws(() => rendered.contentMessage.suggestions.pop());
    for (const changed of [
      {...input, eventTitle: "Changed"}, {...input, supportsOpenUrl: false},
      {...input, config: {...input.config, revision: 2}},
    ]) {
      assert.notEqual(prepareEventRcs(changed).authorityHash,
        first.authorityHash);
    }
  });

test("native shortcuts keep indices and the page retains all choices",
  () => {
    const input = rcsTestInput();
    input.intent.choices = Array.from({length: 12}, (_, index) => ({
      choiceId: "choice-" + index,
      label: index === 1 ? "A detailed option that needs the full guest page" :
        "Option " + index,
      value: {kind: "requestHelp", category: "eventLogistics"},
    }));
    const before = structuredClone(input.intent);
    const rendered = renderEventRcs(input);
    assert.deepEqual(input.intent, before);
    assert.equal(rendered.contentMessage.suggestions.length, 10);
    const native = rendered.contentMessage.suggestions[1];
    assert.ok("reply" in native);
    assert.equal(native.reply.text, "Option 2");
    assert.equal(native.reply.postbackData, "ce-rcs1." + "a".repeat(64) + ".2");
    assert.throws(() => {
      native.reply.text = "Changed";
    });
    const link = rendered.contentMessage.suggestions.at(-1)!;
    assert.ok("action" in link);
    assert.equal(link.action.openUrlAction.url,
      `${BRAND.web.origin}/event-update/` + input.grant.linkId + "#" +
      grantSecret(input.grant, input.keys));
    const token = "fixture-only-rcs-token-12345678901234567890";
    const payload = Buffer.from(JSON.stringify({agentId: input.config.agentId,
      senderPhoneNumber: "+919999999999", messageId: "native-fixture",
      suggestionResponse: {postbackData: native.reply.postbackData,
        text: native.reply.text, type: "REPLY"}}));
    const parsed = VerifiedRcsCallback.receive({
      rawBody: Buffer.from(JSON.stringify({message: {
        data: payload.toString("base64"),
      }})),
      signature: createHmac("sha512", token).update(payload).digest("base64"),
      clientToken: token, expectedAgentId: input.config.agentId,
      receivedAt: input.now + 1000});
    assert.equal(parsed.kind, "verified");
    if (parsed.kind !== "verified") throw new Error("Expected verified reply");
    assert.equal(parsed.callback.evidence.observation.kind, "suggestion");
    if (parsed.callback.evidence.observation.kind !== "suggestion") {
      throw new Error("Expected suggestion");
    }
    assert.deepEqual(parsed.callback.evidence.observation.correlation,
      {kind: "choice", attemptId: input.attemptId, choiceIndex: 2});
  });

test("text-only capability keeps the guest link and native replies", () => {
  const input = {...rcsTestInput(), supportsOpenUrl: false};
  const prepared = prepareEventRcs(input);
  const rendered = renderEventRcs(input);
  assert.ok(rendered.contentMessage.text.endsWith(prepared.responseUrl));
  assert.ok(rendered.contentMessage.suggestions.every((v) => "reply" in v));
  input.intent.choices[0].label = "A longer option available on the guest page";
  assert.equal(renderEventRcs(input).contentMessage.suggestions.length, 0);
});

test("every supported purpose keeps its full instruction and title", () => {
  const {guidance, automation, ...base} = rcsTestIntent();
  void automation;
  for (const noticeKind of rcsTestConfig().allowedPurposes) {
    if (noticeKind === "joiningUpdate") continue;
    const intent: Intent = {...base, kind: "operationalNotice", noticeKind,
      title: "Important update", body: "Meet at the revised venue. नमस्ते 🙂",
      instructionRevision: 2, choices: []};
    const input = rcsTestInput(intent);
    assert.equal(renderEventRcs(input).contentMessage.text,
      input.eventTitle + "\n\n" + intent.title + "\n" + intent.body);
    const blocked = {...input.config,
      allowedPurposes: ["joiningUpdate"]} as RcsConfig;
    assert.throws(() => renderEventRcs({...input, config: blocked}));
  }
  assert.ok(renderEventRcs(rcsTestInput()).contentMessage.text
    .includes(guidance.text));
});

test("expired or mismatched authority cannot render", () => {
  const input = rcsTestInput();
  for (const mutate of [
    (v: typeof input) => {
      v.config.status = "paused";
    },
    (v: typeof input) => {
      v.config.activation.approvedAt = v.now + 1;
    },
    (v: typeof input) => {
      v.config.activation.validUntil = v.now;
    },
    (v: typeof input) => {
      v.config.quote.validUntil = v.now;
    },
    (v: typeof input) => {
      v.grant.expiresAt = v.now;
    },
    (v: typeof input) => {
      v.grant.issuedAt = v.now + 1;
    },
    (v: typeof input) => {
      v.grant.revokedAt = v.now;
    },
    (v: typeof input) => {
      v.grant.episodeId = "other";
    },
    (v: typeof input) => {
      v.grant.threadId = "other";
    },
    (v: typeof input) => {
      v.grant.attendeeId = "other";
    },
    (v: typeof input) => {
      v.intent.permittedRoutes = ["catchEventSms"];
    },
    (v: typeof input) => {
      v.now = v.intent.expiresAt;
    },
    (v: typeof input) => {
      v.now = Number.NaN;
    },
    (v: typeof input) => {
      v.now = v.intent.createdAt - 1;
    },
    (v: typeof input) => {
      v.eventTitle = "\ud800";
    },
    (v: typeof input) => {
      v.eventTitle = "x".repeat(201);
    },
    (v: typeof input) => {
      v.intent.choices[0].label = "\ud800";
    },
    (v: typeof input) => {
      v.intent.choices[0].label = " ";
    },
    (v: typeof input) => {
      v.intent.context = {mode: "rehearsal",
        virtualEventId: v.intent.eventId,
        rehearsalId: "practice", clockId: "clock"};
    },
  ]) {
    const changed = {...input, config: structuredClone(input.config),
      intent: structuredClone(input.intent),
      grant: structuredClone(input.grant)};
    mutate(changed);
    assert.throws(() => renderEventRcs(changed));
  }
  assert.throws(() => renderEventRcs({...input,
    keys: {currentKeyId: "wrong", keyFor: () => Buffer.alloc(32, 1)}}));
});

test("message, grant, sender and quote deadlines cap expiry", () => {
  for (const field of ["message", "grant", "sender", "quote"]) {
    const input = rcsTestInput();
    const deadline = input.now + 5000;
    if (field === "message") input.intent.expiresAt = deadline;
    if (field === "grant") {
      input.grant.expiresAt = deadline;
      // Re-sign changed fixture grant through the ordinary signing function.
      input.grant.tokenHash = guestSecretHash(
        grantSecret(input.grant, input.keys));
    }
    if (field === "sender") input.config.activation.validUntil = deadline;
    if (field === "quote") input.config.quote.validUntil = deadline;
    assert.equal(renderEventRcs(input).expiresAt, deadline, field);
  }
});

test("injected transport preserves the rendered id, payload and expiry",
  async () => {
    const input = rcsTestInput();
    const rendered = renderEventRcs(input);
    const calls: string[] = [];
    const provider = new GoogleRbmProvider(async (url, request) => {
      const target = new URL(String(url));
      assert.equal(target.searchParams.get("messageId"),
        rendered.providerMessageId);
      calls.push(String(request?.body));
      const body = JSON.parse(calls.at(-1)!);
      assert.equal(Date.parse(body.expireTime), rendered.expiresAt);
      return new Response(JSON.stringify({name:
        "phones/+919999999999/agentMessages/" + rendered.providerMessageId,
      expireTime: body.expireTime}), {
        headers: {"Content-Type": "application/json"},
      });
    }, () => input.now + 1000);
    const request = {region: input.config.region, agentId: input.config.agentId,
      accessToken: "fixture-only-token", phoneE164: "+919999999999",
      deadline: input.now + 10_000, messageId: rendered.providerMessageId,
      contentMessage: rendered.contentMessage, expiresAt: rendered.expiresAt};
    assert.equal((await provider.sendText(request)).kind, "accepted");
    assert.equal((await provider.sendText(request)).kind, "accepted");
    assert.equal(calls[0], calls[1]);
    assert.equal(createHash("sha256").update(calls[0]).digest("hex"),
      rendered.payloadHash);
    const expired = new GoogleRbmProvider(async () => {
      throw new Error("Expired request must not make I/O");
    }, () => rendered.expiresAt);
    assert.deepEqual(await expired.sendText(request),
      {kind: "notSent", reason: "deadlineExpired"});
  });
