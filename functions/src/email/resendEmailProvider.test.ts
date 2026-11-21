import assert from "node:assert/strict";
import test from "node:test";
import {ResendEmailProvider} from "./resendEmailProvider";
import type {TransactionalEmail} from "./emailProvider";

const message: TransactionalEmail = {from: "events@catch.example",
  to: "guest@example.com", subject: "Your application update",
  text: "Sign in to view your next step.", idempotencyKey: "approval_1234",
  deadlineMillis: 5000};
const key = "re_test_key_for_fixture";

test("email adapter sends one immutable idempotent request", async () => {
  let calls = 0;
  const provider = new ResendEmailProvider(key, (async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options?.redirect, "error");
    const headers = options?.headers as Record<string, string>;
    assert.equal(headers["Idempotency-Key"], message.idempotencyKey);
    assert.deepEqual(JSON.parse(options!.body as string), {
      from: message.from, to: [message.to], subject: message.subject,
      text: message.text,
    });
    return Response.json({id: "email_1"});
  }) as typeof fetch, () => 1000);
  assert.deepEqual(await provider.submit(message),
    {kind: "accepted", providerMessageId: "email_1"});
  assert.equal(calls, 1);
});

test("expired authorization performs no network I/O", async () => {
  const provider = new ResendEmailProvider(key, (async () => {
    assert.fail("No send after deadline");
  }) as typeof fetch, () => 5000);
  assert.deepEqual(await provider.submit(message),
    {kind: "withheld", reason: "deadlineExpired"});
});

for (const status of [408, 409, 500, 503]) {
  test(`ambiguous HTTP ${status} never authorizes another send`, async () => {
    let calls = 0;
    const provider = new ResendEmailProvider(key, (async () => {
      calls++;
      return Response.json({message: "private provider diagnostic"}, {status});
    }) as typeof fetch, () => 1000);
    assert.deepEqual(await provider.submit(message), {kind: "unknown"});
    assert.equal(calls, 1);
  });
}

test("free quota exhaustion defers instead of buying or retrying", async () => {
  const provider = new ResendEmailProvider(key, (async () =>
    Response.json({name: "daily_quota_exceeded"}, {status: 429,
      headers: {"retry-after": "3600"}})) as typeof fetch, () => 1000);
  assert.deepEqual(await provider.submit(message), {kind: "deferred",
    reason: "quotaExceeded", retryAfterMillis: 3_600_000});
});

test("invalid fields fail before I/O and malformed responses stay unknown",
  async () => {
    let calls = 0;
    const provider = new ResendEmailProvider(key, (async () => {
      calls++; return new Response("x".repeat(9000));
    }) as typeof fetch, () => 1000);
    await assert.rejects(provider.submit({...message,
      subject: "Subject\r\nInjected header"}), /Invalid transactional email/);
    assert.equal(calls, 0);
    assert.deepEqual(await provider.submit(message), {kind: "unknown"});
  });

for (const [status, reason] of [
  [401, "senderUnavailable"], [403, "senderUnavailable"],
  [400, "invalidRequest"], [422, "invalidRequest"],
] as const) {
  test(`explicit rejection ${status} retains only a safe reason`, async () => {
    const provider = new ResendEmailProvider(key, (async () =>
      Response.json({message: message.to}, {status})) as typeof fetch,
    () => 1000);
    assert.deepEqual(await provider.submit(message),
      {kind: "rejected", reason});
  });
}

test("network failure is unknown and does not retry or leak diagnostics",
  async () => {
    let calls = 0;
    const provider = new ResendEmailProvider(key, (async () => {
      calls++;
      throw new Error(`Network diagnostic containing ${message.to}`);
    }) as typeof fetch, () => 1000);
    assert.deepEqual(await provider.submit(message), {kind: "unknown"});
    assert.equal(calls, 1);
  });

test("quota retry delays remain bounded", async () => {
  for (const [retryAfter, expected] of [
    ["999999999", 86_400_000], ["0.1", 1000], ["bad", 3_600_000],
  ] as const) {
    const provider = new ResendEmailProvider(key, (async () =>
      Response.json({name: "monthly_quota_exceeded"}, {status: 429,
        headers: {"retry-after": retryAfter}})) as typeof fetch, () => 1000);
    assert.deepEqual(await provider.submit(message), {kind: "deferred",
      reason: "quotaExceeded", retryAfterMillis: expected});
  }
});

test("malformed sender credentials cannot construct a transport", () => {
  for (const secret of ["", "wrong-key", "re_bad\nheader"]) {
    assert.throws(() => new ResendEmailProvider(secret),
      /Email sender credential unavailable/);
  }
});

test("several recipients share one request; bad lists fail before I/O",
  async () => {
    let body: Record<string, unknown> | null = null;
    const provider = new ResendEmailProvider(key, (async (_url, options) => {
      body = JSON.parse(options!.body as string);
      return Response.json({id: "email_2"});
    }) as typeof fetch, () => 1000);
    const to = ["staff-one@catch.example", "staff-two@catch.example"];
    assert.deepEqual(await provider.submit({...message, to}),
      {kind: "accepted", providerMessageId: "email_2"});
    assert.deepEqual(body?.["to"], to);
    for (const bad of [[], ["staff-one@catch.example",
      "staff-one@catch.example"], Array.from({length: 6},
      (_, i) => `staff-${i}@catch.example`), ["not an address"]]) {
      body = null;
      await assert.rejects(provider.submit({...message, to: bad}),
        /Invalid transactional email/);
      assert.equal(body, null);
    }
  });
