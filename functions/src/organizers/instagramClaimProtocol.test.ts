import assert from "node:assert/strict";
import {createHash, createHmac} from "node:crypto";
import test from "node:test";
import {
  extractClaimCode,
  handleInstagramClaimWebhook,
  parseInstagramWebhook,
} from "./instagramClaimProtocol";
import type {InstagramInboundMessage} from "./instagramClaimProtocol";

const config = {accountId: "17841400000000001", appSecret: "app-secret",
  verifyToken: "v".repeat(32)};

function signed(body: unknown) {
  const rawBody = Buffer.from(JSON.stringify(body));
  return {rawBody, signature: "sha256=" +
    createHmac("sha256", config.appSecret).update(rawBody).digest("hex")};
}

function delivery(...messaging: unknown[]) {
  return {object: "instagram", entry: [{id: config.accountId, time: 1,
    messaging}]};
}

function inbound(mid: string, senderId: string, text: string) {
  return {sender: {id: senderId}, recipient: {id: config.accountId},
    timestamp: 1, message: {mid, text}};
}

test("the verify-token handshake echoes the challenge only for our token",
  async () => {
    const handshake = (token: string) => handleInstagramClaimWebhook({
      method: "GET", query: {"hub.mode": "subscribe",
        "hub.verify_token": token, "hub.challenge": "challenge-7"},
    }, config, async () => undefined);
    assert.deepEqual(await handshake(config.verifyToken),
      {status: 200, body: "challenge-7"});
    assert.equal((await handshake("w".repeat(32))).status, 403);
  });

test("an unconfigured receiver stays inert", async () => {
  const result = await handleInstagramClaimWebhook({method: "GET",
    query: {"hub.mode": "subscribe", "hub.verify_token": "",
      "hub.challenge": "c"}}, {...config, verifyToken: ""},
  async () => undefined);
  assert.equal(result.status, 503);
});

test("a bad signature is rejected before anything is read", async () => {
  const {rawBody} = signed(delivery(inbound("m1", "901", "482173")));
  let handled = false;
  for (const signature of [undefined, "sha256=" + "0".repeat(64),
    "sha1=abc"]) {
    const result = await handleInstagramClaimWebhook({method: "POST",
      query: {}, rawBody, signature}, config, async () => {
      handled = true;
    });
    assert.equal(result.status, 401);
  }
  assert.equal(handled, false);
});

test("a signed delivery hands over inbound messages and acknowledges",
  async () => {
    let received: InstagramInboundMessage[] = [];
    const result = await handleInstagramClaimWebhook({method: "POST",
      query: {}, ...signed(delivery(inbound("m1", "901", "482 173")))},
    config, async (messages) => {
      received = messages;
    });
    assert.deepEqual(result, {status: 200, body: "ok"});
    assert.deepEqual(received, [{senderId: "901", text: "482 173",
      messageKey: createHash("sha256").update("m1").digest("hex"),
      attachments: [], unsupported: false}]);
  });

test("a processing failure asks Meta to retry", async () => {
  const result = await handleInstagramClaimWebhook({method: "POST",
    query: {}, ...signed(delivery(inbound("m1", "901", "1")))}, config,
  async () => {
    throw new Error("Firestore unavailable");
  });
  assert.equal(result.status, 503);
});

test("echoes, reactions, other accounts and Catch itself are skipped", () => {
  const body = {object: "instagram", entry: [
    {id: config.accountId, messaging: [
      inbound("m1", "901", "111111"),
      {...inbound("m2", "902", "222222"),
        message: {mid: "m2", text: "222222", is_echo: true}},
      {sender: {id: "903"}, recipient: {id: config.accountId},
        reaction: {mid: "m1", action: "react"}},
      inbound("m4", config.accountId, "444444"),
    ]},
    {id: "17841499999999999", messaging: [inbound("m5", "905", "555555")]},
    // The dashboard's test event uses changes[].
    {id: config.accountId, changes: [{field: "messages",
      value: inbound("m6", "906", "666666")}]},
  ]};
  const messages = parseInstagramWebhook(Buffer.from(JSON.stringify(body)),
    config.accountId);
  assert.deepEqual(messages.map((message) => message.senderId),
    ["901", "906"]);
  assert.throws(() => parseInstagramWebhook(Buffer.from(JSON.stringify(
    {object: "page", entry: []})), config.accountId));
});

test("claim codes are read with or without the display space", () => {
  assert.equal(extractClaimCode("482173"), "482173");
  assert.equal(extractClaimCode("my code is 482 173 thanks"), "482173");
  assert.equal(extractClaimCode("482-173"), "482173");
  assert.equal(extractClaimCode("call 98765 43210"), null);
  assert.equal(extractClaimCode("1234567"), null);
  assert.equal(extractClaimCode("hello"), null);
  assert.equal(extractClaimCode(null), null);
});

test("shares keep their type, any instagram.com page link and field names",
  () => {
    const cdn = "https://scontent.cdninstagram.com/v/abc.jpg";
    const body = {object: "instagram", entry: [{id: config.accountId,
      messaging: [
        {...inbound("m1", "901", ""), message: {mid: "m1", attachments: [
          {type: "ig_post", payload: {url: cdn, title: "x"}},
          {type: "share",
            payload: {url: "https://instagram.com/afterfly.in/?igsh=1"}},
          {type: "share",
            payload: {url: "http://www.instagram.com/afterfly.in/"}},
        ]}},
        {...inbound("m2", "902", ""),
          message: {mid: "m2", is_unsupported: true}},
      ]}]};
    const [shared, unsupported] = parseInstagramWebhook(
      Buffer.from(JSON.stringify(body)), config.accountId);
    assert.deepEqual(shared.attachments, [
      {type: "ig_post", pageUrl: null, payloadKeys: ["url", "title"]},
      {type: "share", pageUrl: "https://www.instagram.com/afterfly.in/",
        payloadKeys: ["url"]},
      {type: "share", pageUrl: null, payloadKeys: ["url"]},
    ]);
    assert.deepEqual([unsupported.unsupported, unsupported.text,
      unsupported.attachments], [true, null, []]);
  });
