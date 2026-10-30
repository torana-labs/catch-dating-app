import assert from "node:assert/strict";
import test from "node:test";
import {GoogleRbmProvider} from "./googleRbmProvider";
import {GOOGLE_RBM_MAX_BYTES} from "./googleRbmProtocol";
import type {GoogleRbmSendRequest} from "./googleRbmProtocol";
import {rcsNativeReplyId} from "./rcsWebhookProtocol";
import {BRAND} from "../../shared/generated/brand";

const now = 1788825600000;
const messageId = "592b6f05-96b2-5a74-8b21-246c59e8b4e7";
const requestId = "1be8b706-2400-4153-b501-be19d9f951c4";
const phoneE164 = "+919876543210";
const accessToken = "fixture-only-access-token";
const agentId = "fixture-agent@rbm.goog";
const guestUrl = `${BRAND.web.origin}/event-update/fixture#private-link`;
const expiresAt = now + 60_000;
const name = "phones/" + phoneE164 + "/agentMessages/" + messageId;
const attemptId = "attempt:" + "a".repeat(64);

function input(): GoogleRbmSendRequest {
  return {region: "asia", agentId, accessToken, phoneE164, messageId,
    deadline: now + 5000, expiresAt,
    contentMessage: {text: "Join us at the next stop.", suggestions: [
      {reply: {text: "On my way",
        postbackData: rcsNativeReplyId(attemptId, 0)}},
      {action: {text: "Event details", postbackData:
        "ce-rcs-web1." + attemptId.slice(8), openUrlAction: {url: guestUrl}}},
    ]}};
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status,
    headers: {"Content-Type": "application/json; charset=utf-8"}});
}

function accepted(): Response {
  return json({name, expireTime: new Date(expiresAt).toISOString()});
}

function harness(respond: (url: string, init: RequestInit) =>
  Response | Promise<Response> = accepted, clock = () => now) {
  const calls: Array<{url: string; init: RequestInit}> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(typeof url, "string");
    assert.ok(init);
    calls.push({url: String(url), init});
    return respond(String(url), init);
  };
  return {provider: new GoogleRbmProvider(fetchImpl, clock), calls};
}

test("RBM sends expiring text with native choices", async () => {
  const h = harness();
  assert.deepEqual(await h.provider.sendText(input()),
    {kind: "accepted", providerMessageId: messageId});
  assert.equal(h.calls.length, 1);
  const {url: raw, init} = h.calls[0];
  const url = new URL(raw);
  assert.equal(url.origin, "https://asia-rcsbusinessmessaging.googleapis.com");
  assert.equal(decodeURIComponent(url.pathname),
    "/v1/phones/" + phoneE164 + "/agentMessages");
  assert.deepEqual([...url.searchParams], [["agentId", agentId],
    ["messageId", messageId]]);
  assert.equal(raw.includes(accessToken), false);
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "error");
  assert.equal(new Headers(init.headers).get("Authorization"),
    "Bearer " + accessToken);
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(String(init.body)), {
    contentMessage: input().contentMessage, messageTrafficType: "TRANSACTION",
    expireTime: new Date(expiresAt).toISOString(),
  });
});

test("RBM uses configured regional endpoints", async () => {
  for (const region of ["asia", "europe", "us"] as const) {
    const h = harness((url, init) => init.method === "POST" ? accepted() :
      json(url.includes("capabilities") ?
        {features: ["ACTION_OPEN_URL"]} : {}));
    const request = {...input(), region};
    assert.equal((await h.provider.sendText(request)).kind, "accepted");
    assert.deepEqual(await h.provider.getCapabilities({...request, requestId}),
      {kind: "reachable", supportsOpenUrl: true});
    assert.equal((await h.provider.revoke(request)).kind,
      "revocationRequested");
    assert.equal(h.calls.length, 3);
    for (const call of h.calls) {
      assert.equal(new URL(call.url).hostname,
        region + "-rcsbusinessmessaging.googleapis.com");
    }
    assert.equal(h.calls[1].init.method, "GET");
    assert.equal(h.calls[1].init.body, undefined);
    assert.equal(new URL(h.calls[1].url).searchParams.get("requestId"),
      requestId);
    assert.equal(h.calls[2].init.method, "DELETE");
    assert.equal(h.calls[2].init.body, undefined);
    assert.equal(decodeURIComponent(new URL(h.calls[2].url).pathname),
      "/v1/" + name);
  }
});

test("RBM reports agent-scoped reachability", async () => {
  for (const [body, expected] of [
    [{}, false], [{features: []}, false],
    [{features: ["ACTION_OPEN_URL", "FUTURE_FEATURE"],
      carrier: "private"}, true],
    [{features: ["ACTION_OPEN_URL_IN_WEBVIEW", "FEATURE_UNSPECIFIED"]}, false],
  ] as const) {
    const h = harness(() => json(body));
    assert.deepEqual(await h.provider.getCapabilities({...input(), requestId}),
      {kind: "reachable", supportsOpenUrl: expected});
  }
  const h = harness(() => json({error: {code: 404, status: "NOT_FOUND",
    message: phoneE164}}, 404));
  assert.deepEqual(await h.provider.getCapabilities({...input(), requestId}),
    {kind: "unreachable", reason: "agentOrRecipientUnavailable"});
});

test("RBM rejects invalid capability evidence", async () => {
  for (const body of [{features: null}, {features: "ACTION_OPEN_URL"},
    {features: [1]}, {features: ["ACTION_OPEN_URL\n"]}, {error: {}},
    {features: Array(129).fill("ACTION_OPEN_URL")},
    {features: ["X".repeat(129)]}]) {
    const h = harness(() => json(body));
    assert.deepEqual(await h.provider.getCapabilities({...input(), requestId}),
      {kind: "unknown", reason: "invalidResponse", httpStatus: 200});
  }
  for (const status of [401, 403, 404, 429, 500, 503]) {
    const h = harness(() => json({error: {code: status}}, status));
    assert.deepEqual(await h.provider.getCapabilities({...input(), requestId}),
      {kind: "unknown", reason: "http", httpStatus: status});
    assert.equal(h.calls.length, 1);
  }
});

test("RBM validates request authority inputs", async () => {
  const h = harness();
  for (const change of [{region: "global"}, {region: "toString"},
    {region: "asia.evil.test"}, {agentId: agentId + "\n"},
    {agentId: "../other"},
    {agentId: "a&agentId=other"}, {agentId: ""}, {accessToken: ""},
    {accessToken: accessToken + "\n"}, {accessToken: "x\r\nHost: evil.test"},
    {accessToken: "x".repeat(4097)}, {phoneE164: phoneE164 + "\n"},
    {phoneE164: "919876543210"}, {phoneE164: "+000000000"},
    {phoneE164: "+1/../other"}, {deadline: NaN}, {deadline: -1},
    {deadline: now + 0.5}, {deadline: Infinity}]) {
    const request = {...input(), ...change} as GoogleRbmSendRequest;
    for (const result of [await h.provider.sendText(request),
      await h.provider.getCapabilities({...request, requestId}),
      await h.provider.revoke(request)]) {
      assert.deepEqual(result, {kind: "notSent", reason: "invalidRequest"});
    }
  }
  for (const id of ["", "not-a-uuid", messageId + "\n", "../other",
    "00000000-0000-0000-0000-000000000000"]) {
    assert.equal((await h.provider.sendText({...input(), messageId: id})).kind,
      "notSent");
    assert.equal((await h.provider.revoke({...input(), messageId: id})).kind,
      "notSent");
    assert.equal((await h.provider.getCapabilities({...input(), requestId: id}))
      .kind, "notSent");
  }
  assert.equal(h.calls.length, 0);
});

test("RBM validates content before submission", async () => {
  const h = harness();
  const reply = {reply: {text: "Join", postbackData: "reply_1"}};
  const action = {action: {text: "Details", postbackData: "action_1",
    openUrlAction: {url: guestUrl}}};
  const invalid = [
    {text: ""}, {text: "  "}, {text: "x".repeat(3073)}, {text: "\ud800"},
    {richCard: {}}, {ttl: "10s"}, {suggestions: null},
    {suggestions: Array(12).fill(reply)}, {suggestions: [reply, reply]},
    {suggestions: [{...reply, ...action}]},
    {suggestions: [{reply: {...reply.reply, text: "x".repeat(26)}}]},
    {suggestions: [{reply: {...reply.reply, postbackData: ""}}]},
    {suggestions: [{reply: {...reply.reply, postbackData: "x".repeat(2049)}}]},
    {suggestions: [{reply: {...reply.reply, text: "\udfff"}}]},
    {suggestions: [{action: {...action.action,
      dialAction: {phoneNumber: phoneE164}}}]},
    ...[`http://${BRAND.web.domain}/`, "javascript:alert(1)",
      `https://token@${BRAND.web.domain}/`, `${BRAND.web.origin}/\npath`,
      `${BRAND.web.origin}\\evil.test`, "x".repeat(2049)].map((url) =>
      ({suggestions: [{action: {...action.action, openUrlAction: {url}}}]})),
  ];
  for (const change of invalid) {
    const request = {...input(), contentMessage: {...input().contentMessage,
      ...change}} as GoogleRbmSendRequest;
    assert.deepEqual(await h.provider.sendText(request),
      {kind: "notSent", reason: "invalidRequest"});
  }
  for (const expiresAt of [NaN, -1, now + 1.5, now + 15 * 86400_000 + 1]) {
    assert.equal((await h.provider.sendText({...input(), expiresAt})).kind,
      "notSent");
  }
  assert.equal(h.calls.length, 0);
});

test("RBM preserves Unicode and 11 distinct choices", async () => {
  const h = harness();
  const contentMessage = {text: "é".repeat(3072), suggestions:
    Array.from({length: 11}, (_, i) => ({reply: {text: "é".repeat(25),
      postbackData: "reply_" + i}}))};
  assert.equal((await h.provider.sendText({...input(), contentMessage})).kind,
    "accepted");
  assert.deepEqual(JSON.parse(String(h.calls[0].init.body)).contentMessage,
    contentMessage);
  const oversized = {...contentMessage, suggestions:
    Array.from({length: 11}, (_, i) => ({reply: {text: "Join",
      postbackData: "\u0000".repeat(2040) + i}}))};
  assert.equal((await h.provider.sendText({...input(),
    contentMessage: oversized})).kind, "notSent");
  assert.equal(h.calls.length, 1);
});

test("RBM rechecks deadline and expiry before I/O", async () => {
  for (const deadline of [now, now - 1]) {
    const h = harness();
    const request = {...input(), deadline};
    for (const result of [await h.provider.sendText(request),
      await h.provider.revoke(request),
      await h.provider.getCapabilities({...request, requestId})]) {
      assert.deepEqual(result, {kind: "notSent", reason: "deadlineExpired"});
    }
    assert.equal(h.calls.length, 0);
  }
  let ticks = 0;
  const h = harness(accepted, () => ticks++ === 0 ? now : now + 5000);
  assert.deepEqual(await h.provider.sendText(input()),
    {kind: "notSent", reason: "deadlineExpired"});
  assert.equal(h.calls.length, 0);
  const expired = harness();
  assert.deepEqual(await expired.provider.sendText({...input(),
    expiresAt: now}),
  {kind: "notSent", reason: "deadlineExpired"});
  assert.equal(expired.calls.length, 0);
  const badClock = harness(accepted, () => NaN);
  assert.equal((await badClock.provider.sendText(input())).kind, "notSent");
  assert.equal(badClock.calls.length, 0);
});

test("RBM acceptance matches message and expiry", async () => {
  for (const body of [{}, {name}, {name: name + "other", expireTime:
    new Date(expiresAt).toISOString()}, {
    name: name.replace(phoneE164, "+14155555555"),
    expireTime: new Date(expiresAt).toISOString()},
  {name, expireTime: "tomorrow"},
  {name, expireTime: new Date(expiresAt + 1000).toISOString()},
  {name, expireTime: new Date(expiresAt).toISOString(), error: {}}]) {
    const h = harness(() => json(body));
    assert.deepEqual(await h.provider.sendText(input()),
      {kind: "unknown", reason: "invalidResponse", httpStatus: 200});
    assert.equal(h.calls.length, 1);
  }
});

test("RBM separates rejection and ambiguity", async () => {
  for (const [status, reason] of [[400, "invalidArgument"],
    [404, "agentOrRecipientUnavailable"]] as const) {
    const h = harness(() => json({error: {code: status,
      status: status === 400 ? "INVALID_ARGUMENT" : "NOT_FOUND",
      message: accessToken + phoneE164 + guestUrl}}, status));
    assert.deepEqual(await h.provider.sendText(input()),
      {kind: "rejected", reason, httpStatus: status});
  }
  for (const status of [400, 401, 403, 404, 409, 429, 500, 503, 504]) {
    const h = harness(() => json({error: {code: status,
      status: "UNRECOGNIZED", message: guestUrl}}, status));
    assert.deepEqual(await h.provider.sendText(input()), {kind: "unknown",
      reason: status === 409 ? "duplicate" : "http", httpStatus: status});
    assert.equal(h.calls.length, 1);
  }
});

test("RBM never retries or leaks transport errors", async () => {
  const h = harness(() => {
    throw new Error(accessToken + phoneE164 + guestUrl);
  });
  for (const result of [await h.provider.sendText(input()),
    await h.provider.getCapabilities({...input(), requestId}),
    await h.provider.revoke(input())]) {
    assert.deepEqual(result, {kind: "unknown", reason: "transport",
      httpStatus: null});
  }
  assert.equal(h.calls.length, 3);
});

test("RBM aborts pending I/O without resolving delivery", async () => {
  let aborted = false;
  const h = harness((_url, init) => new Promise((_resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("No abort")), 1000);
    init.signal!.addEventListener("abort", () => {
      aborted = true;
      clearTimeout(timeout);
      reject(new Error(accessToken + guestUrl));
    }, {once: true});
  }));
  assert.deepEqual(await h.provider.sendText({...input(), deadline: now + 5}),
    {kind: "unknown", reason: "transport", httpStatus: null});
  assert.equal(aborted, true);
  assert.equal(h.calls.length, 1);
});

test("RBM rejects invalid and oversized responses", async () => {
  const variants = [
    () => new Response("not JSON " + guestUrl, {headers:
      {"Content-Type": "application/json"}}),
    () => new Response(JSON.stringify({name}), {headers:
      {"Content-Type": "text/html"}}),
    () => json([]), () => json(null),
    () => new Response(Buffer.from([0xc3, 0x28]), {headers:
      {"Content-Type": "application/json"}}),
    () => json({content: "x".repeat(GOOGLE_RBM_MAX_BYTES)}),
  ];
  for (const respond of variants) {
    const h = harness(respond);
    assert.deepEqual(await h.provider.sendText(input()),
      {kind: "unknown", reason: "invalidResponse", httpStatus: 200});
    assert.equal(h.calls.length, 1);
  }
});

test("RBM cancels oversized response streams", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({start(controller) {
    controller.enqueue(new Uint8Array(GOOGLE_RBM_MAX_BYTES));
    controller.enqueue(new Uint8Array(1));
  }, cancel() {
    cancelled = true;
  }});
  const h = harness(() => new Response(stream, {headers:
    {"Content-Type": "application/json"}}));
  assert.equal((await h.provider.sendText(input())).kind, "unknown");
  assert.equal(cancelled, true);
});

test("RBM revocation results cannot grant fallback", async () => {
  const h = harness(() => json({}));
  assert.deepEqual(await h.provider.revoke(input()),
    {kind: "revocationRequested", providerMessageId: messageId});
  for (const status of [404, 409, 429, 500]) {
    const failing = harness(() => json({error: {code: status,
      status: "NOT_FOUND"}}, status));
    assert.deepEqual(await failing.provider.revoke(input()), {kind: "unknown",
      reason: status === 409 ? "duplicate" : "http", httpStatus: status});
    assert.equal(failing.calls.length, 1);
  }
  const malformed = harness(() => json({revoked: true}));
  assert.deepEqual(await malformed.provider.revoke(input()),
    {kind: "unknown", reason: "invalidResponse", httpStatus: 200});
});
