import assert from "node:assert/strict";
import test from "node:test";
import {deriveCatchIngressEvidence as derive,
  compareCatchIngressReplay as compare} from "./whatsappIngressEvidence";
import {parseCatchWhatsappWebhook} from "./whatsappWebhookProtocol";
import type {CatchWebhookEvent} from "./whatsappWebhookProtocol";

const scope = {wabaId: "123", phoneNumberId: "456"};
function parse(messages: unknown[], statuses: unknown[] = []) {
  return parseCatchWhatsappWebhook(Buffer.from(JSON.stringify({
    object: "whatsapp_business_account", entry: [{id: scope.wabaId,
      changes: [{field: "messages", value: {messaging_product: "whatsapp",
        metadata: {phone_number_id: scope.phoneNumberId}, messages, statuses,
      }}]}],
  })), scope);
}
const message = (body = "Please help with my account") => ({
  id: "wamid.synthetic", from: "15551234567", timestamp: "1700000000",
  type: "text", text: {body},
});
const status = (state = "sent", timestamp = "1700000001",
  codes: number[] = []) =>
  ({id: "wamid.outbound", recipient_id: "15551234567", timestamp,
    status: state, errors: codes.map((code) => ({code}))});
const rejection = (fn: () => unknown) => assert.throws(fn,
  {message: "Catch ingress evidence unavailable."});

test("rebatching compares equal without exposing body or endpoint", () => {
  const [one] = parse([message()]);
  const [rebatched] = parse([message(), {...message(), id: "wamid.other"}]);
  assert.notEqual(one.payloadHash, rebatched.payloadHash);
  assert.equal(compare(one, rebatched), "equivalent");
  const evidence = derive(one);
  assert.equal(evidence.classification, "text");
  assert.deepEqual(Object.keys(evidence).sort(), ["ambiguity", "classification",
    "eventId", "eventKind", "materialSha256"]);
  assert.equal(JSON.stringify(evidence).includes(one.text!), false);
  assert.equal(JSON.stringify(evidence).includes(one.participantId), false);
});

test("same inbound ID with changed material conflicts", () => {
  const [original] = parse([message()]);
  for (const changed of [message("STOP"),
    {...message(), from: "15551234568"},
    {...message(), timestamp: "1700000001"},
    {...message(), type: "image", image: {caption: "STOP"}},
  ]) {
    const [next] = parse([changed]);
    assert.equal(compare(original, next), "conflict");
  }
});

test("distinct inbound and distinct status observations keep their own keys",
  () => {
    const [inbound] = parse([message()]);
    const [other] = parse([{...message(), id: "wamid.other"}]);
    assert.equal(compare(inbound, other), "distinct");
    const [sent] = parse([], [status()]);
    for (const observed of [status("delivered"), status("read"),
      status("failed", "1700000001", [131026]),
      status("sent", "1700000002")]) {
      const [next] = parse([], [observed]);
      assert.equal(compare(sent, next), "distinct");
    }
    const [sameMessageStatus] = parse([], [{...status(), id: message().id}]);
    assert.equal(compare(inbound, sameMessageStatus), "distinct");
  });

test("status errors normalize order without mutating original records", () => {
  const [one] = parse([], [status("failed", "1700000001", [7, 3])]);
  const [two] = parse([], [status("failed", "1700000001", [3, 7])]);
  const before = JSON.stringify(one);
  assert.equal(compare(one, two), "equivalent");
  assert.equal(JSON.stringify(one), before);
  const [different] = parse([], [status("failed", "1700000001", [3, 8])]);
  assert.equal(compare(one, different), "distinct");
  assert.equal(compare(one, {...one, participantId: "15551234568"}),
    "conflict");
});

test("only complete, resolvable canonical commands classify as STOP", () => {
  for (const body of [" STOP ", "UnSubscribe", "end", "quit", "cancel"]) {
    const [event] = parse([message(body)]);
    assert.equal(derive(event).classification, "stop");
    assert.equal(compare(event, {...event}), "equivalent");
    assert.equal(derive({...event, participantId: "unresolved"})
      .classification, "ambiguous");
  }
  const [ordinary] = parse([message("Please stop the video")]);
  assert.equal(derive(ordinary).classification, "text");
});

test("lost text and unsupported originals never become equivalent replays",
  () => {
    const [truncated1] = parse([message("x".repeat(4096) + "first suffix")]);
    const [truncated2] = parse([message("x".repeat(4096) + "STOP")]);
    assert.equal(derive(truncated1).materialSha256,
      derive(truncated2).materialSha256);
    assert.equal(derive(truncated1).ambiguity, "truncated-text");
    assert.equal(compare(truncated1, truncated2), "ambiguous");
    const [image1] = parse([{...message(), type: "image",
      image: {caption: "hello"}}]);
    const [image2] = parse([{...message(), type: "image",
      image: {caption: "STOP"}}]);
    assert.equal(derive(image1).ambiguity, "unsupported-message");
    // The Support placeholder keeps the caption, so a changed caption is a
    // conflict; an identical one is still only ambiguous, never equivalent.
    assert.equal(image1.text, "[photo] hello");
    assert.equal(compare(image1, image2), "conflict");
    assert.equal(compare(image1, image1), "ambiguous");
    const [blank] = parse([message(" ")]);
    assert.equal(derive(blank).ambiguity, "missing-text");
    assert.equal(compare(blank, blank), "ambiguous");
  });

test("unresolvable endpoints and nonfailure errors remain ambiguous", () => {
  const [event] = parse([{...message(), from: "not-a-phone"}]);
  assert.equal(derive(event).ambiguity, "unresolved-endpoint");
  assert.equal(compare(event, event), "ambiguous");
  const [observed] = parse([], [status("sent", "1700000001", [7])]);
  assert.equal(derive(observed).ambiguity, "invalid-status-errors");
  assert.equal(compare(observed, observed), "ambiguous");
});

test("forged identities and malformed records fail with content-free errors",
  () => {
    const [event] = parse([message("private synthetic body")]);
    for (const change of [{eventId: "cwhe_" + "a".repeat(64)},
      {schema: "other"}, {wabaId: "foreign"}, {phoneNumberId: ""},
      {payloadHash: "not-a-hash"}, {providerTimestampSeconds: "0"},
      {text: "private".repeat(1000)}, {textTruncated: null},
      {errorCodes: [3]}, {eventKind: "unknown"}, {messageType: null},
      {deliveryStatus: "sent"}, {participantId: ""}]) {
      rejection(() => derive({...event, ...change} as CatchWebhookEvent));
    }
    const [observed] = parse([], [status()]);
    for (const change of [{text: "private"}, {messageType: "text"},
      {textTruncated: true}, {errorCodes: [-1]}, {errorCodes: Array(2)},
      {errorCodes: Array(11).fill(1)}, {deliveryStatus: "unknown"}]) {
      rejection(() => derive({...observed, ...change} as CatchWebhookEvent));
    }
  });
