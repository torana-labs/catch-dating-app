import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {EmailSubmission, TransactionalEmail} from
  "../email/emailProvider";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {
  ALERTS,
  SETTINGS_PATH,
  alertOnSalesIntent,
  alertOnSupportMessage,
  summariseOverflow,
} from "./delivery";

const clock = Date.UTC(2026, 10, 21, 8, 35);
const conversationId = `whatsapp-${"b".repeat(64)}`;
const settings = {
  schemaVersion: 1,
  email: {provider: "resend", accountId: "account-fixture",
    from: "billing@catch.example",
    credentialVersion: "projects/demo/secrets/EMAIL/versions/1"},
  operatorAlerts: {enabled: true, recipients: ["staff@catch.example",
    "owner@catch.example"], from: "alerts@catch.example", hourlyCap: 2},
  updatedAtMillis: 1,
};

function intent(id: number, patch: Record<string, unknown> = {}) {
  return [`salesInboundIntents/${String(id).repeat(64).slice(0, 64)}`, {
    status: "needs_identity_review", source: "meta_lead_ad",
    submissionId: `meta-${id}`, fullName: "Sample Person",
    email: "sample@organizer.in", city: "Pune",
    createdAt: Timestamp.fromMillis(clock - 1000),
    hostApplication: {organizationName: "Lantern Run Club"}, ...patch,
  }] as const;
}

function fixture(seed: Record<string, Record<string, unknown>> = {}) {
  const db = new FakeFirestore({[SETTINGS_PATH]: settings, ...seed});
  const sent: TransactionalEmail[] = [];
  let time = clock;
  let outcomes: EmailSubmission[] = [];
  const deps = {
    db: () => db.asFirestore(),
    now: () => time,
    emailSender: async () => ({id: "fake", submit: async (
      mail: TransactionalEmail) => {
      sent.push(mail);
      return outcomes.shift() ??
        {kind: "accepted" as const, providerMessageId: `mail-${sent.length}`};
    }}),
  };
  return {db, sent, deps,
    at: (value: number) => {
      time = value;
    },
    outcomes: (value: EmailSubmission[]) => {
      outcomes = value;
    }};
}

const leadId = (id: number) => String(id).repeat(64).slice(0, 64);

test("switched off: nothing is written or sent",
  async () => {
    for (const operatorAlerts of [undefined, {...settings.operatorAlerts,
      enabled: false}]) {
      const f = fixture(Object.fromEntries([intent(1)]));
      f.db.put(SETTINGS_PATH, {...settings, operatorAlerts});
      assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "disabled");
      assert.equal(await summariseOverflow(f.deps), 0);
      assert.deepEqual(f.db.paths(ALERTS), []);
      assert.equal(f.sent.length, 0);
    }
    const f = fixture(Object.fromEntries([intent(1)]));
    f.db.put(SETTINGS_PATH, {...settings, email: null});
    assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "disabled");
    f.db.put(SETTINGS_PATH, {...settings, operatorAlerts: {
      ...settings.operatorAlerts, recipients: []}});
    assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "disabled");
    assert.equal(f.sent.length, 0);
  });

test("one email per lead to every recipient, however often it is retried",
  async () => {
    const f = fixture(Object.fromEntries([intent(1)]));
    const results = await Promise.all([1, 2, 3].map(() =>
      alertOnSalesIntent(f.deps, leadId(1))));
    assert.deepEqual(results.sort(), ["duplicate", "duplicate", "sent"]);
    assert.equal(f.sent.length, 1);
    assert.deepEqual(f.sent[0].to, settings.operatorAlerts.recipients);
    assert.equal(f.sent[0].from, "alerts@catch.example");
    const receipt = f.db.get(`${ALERTS}/lead_${leadId(1)}`);
    assert.equal(receipt?.status, "sent");
    assert.equal(receipt?.acceptedCount, 2);
    assert.equal(receipt?.providerMessageId, "mail-1");
    // The receipt keeps ids and links, never the lead's details.
    for (const value of ["Sample Person", "Lantern", "sample@organizer.in"]) {
      assert.equal(JSON.stringify(receipt).includes(value), false);
    }
  });

test("stale, closed and partner rows send nothing", async () => {
  const f = fixture(Object.fromEntries([
    intent(1, {createdAt: Timestamp.fromMillis(clock - 7 * 3_600_000)}),
    intent(2, {source: "partner"}),
  ]));
  assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "stale");
  assert.equal(await alertOnSalesIntent(f.deps, leadId(2)), "ignored");
  assert.equal(await alertOnSalesIntent(f.deps, leadId(3)), "ignored");
  assert.equal(f.sent.length, 0);
});

test("past the hourly cap alerts are held, then summarised once", async () => {
  const f = fixture(Object.fromEntries([1, 2, 3, 4].map((id) => intent(id))));
  const outcomes = [];
  for (const id of [1, 2, 3, 4]) {
    outcomes.push(await alertOnSalesIntent(f.deps, leadId(id)));
  }
  assert.deepEqual(outcomes, ["sent", "sent", "overflow", "overflow"]);
  assert.equal(f.sent.length, 2);
  const window = f.db.get(`${ALERTS}/hourly/windows/2026112108`);
  assert.equal(window?.sentCount, 2);
  assert.equal(window?.overflowCount, 2);
  assert.equal(window?.summaryStatus, "pending");
  // Not before the hour closes.
  assert.equal(await summariseOverflow(f.deps), 0);
  f.at(clock + 3_600_000);
  assert.equal(await summariseOverflow(f.deps), 1);
  assert.equal(f.sent.length, 3);
  const summary = f.sent[2];
  assert.equal(summary.subject, "2 more Catch alerts in one hour");
  assert.ok(summary.text.includes(`/inbox/enquiry-${leadId(3)}`));
  assert.ok(summary.text.includes(`/inbox/enquiry-${leadId(4)}`));
  assert.equal(summary.text.includes("Sample Person"), false);
  assert.equal(f.db.get(`${ALERTS}/hourly/windows/2026112108`)
    ?.summaryStatus, "sent");
  assert.equal(await summariseOverflow(f.deps), 0);
  assert.equal(f.sent.length, 3);
  // A new hour has a fresh allowance.
  f.db.put(intent(5)[0], {...intent(5)[1],
    createdAt: Timestamp.fromMillis(clock + 3_600_000)});
  assert.equal(await alertOnSalesIntent(f.deps, leadId(5)), "sent");
});

test("uncertain and rejected sends are recorded and never repeated",
  async () => {
    const f = fixture(Object.fromEntries([intent(1), intent(2)]));
    f.outcomes([{kind: "unknown"},
      {kind: "rejected", reason: "senderUnavailable"}]);
    assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "unknown");
    assert.equal(await alertOnSalesIntent(f.deps, leadId(2)), "failed");
    assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "duplicate");
    assert.equal(f.sent.length, 2);
    assert.equal(f.db.get(`${ALERTS}/lead_${leadId(1)}`)?.status, "unknown");
  });

test("a short throttle is waited out once with the same key", async () => {
  const f = fixture(Object.fromEntries([intent(1)]));
  f.outcomes([{kind: "deferred", reason: "rateLimited",
    retryAfterMillis: 1}]);
  assert.equal(await alertOnSalesIntent(f.deps, leadId(1)), "sent");
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[0].idempotencyKey, f.sent[1].idempotencyKey);
  const g = fixture(Object.fromEntries([intent(1)]));
  g.outcomes([{kind: "deferred", reason: "quotaExceeded",
    retryAfterMillis: 3_600_000}]);
  assert.equal(await alertOnSalesIntent(g.deps, leadId(1)), "failed");
  assert.equal(g.sent.length, 1);
});

function supportSeed(messages: Array<[string, Record<string, unknown>]>,
  createdAt = clock) {
  return {
    [`supportConversations/${conversationId}`]: {channel: "whatsapp",
      displayName: "Sample Person", audience: "guest",
      createdAt: Timestamp.fromMillis(createdAt)},
    ...Object.fromEntries(messages.map(([id, row]) => [
      `supportConversations/${conversationId}/messages/${id}`,
      {direction: "inbound", authorUid: null, text: "Hello there", ...row}])),
  };
}

test("support: a new conversation alerts; a quick follow-up does not",
  async () => {
    const f = fixture(supportSeed([
      ["src-first-message", {at: Timestamp.fromMillis(clock)}],
      ["src-second-message", {at: Timestamp.fromMillis(clock + 60_000)}],
    ]));
    assert.equal(await alertOnSupportMessage(f.deps, conversationId,
      "src-first-message"), "sent");
    f.at(clock + 60_000);
    assert.equal(await alertOnSupportMessage(f.deps, conversationId,
      "src-second-message"), "ignored");
    assert.equal(f.sent.length, 1);
    assert.match(f.sent[0].subject, /^WhatsApp message: Sample Person$/u);
    assert.ok(f.sent[0].text.includes(`/support/${conversationId}`));
  });

test("support: an inbound message after four quiet hours alerts, even with " +
  "staff replies in between; staff-logged messages never do", async () => {
  const start = clock - 5 * 3_600_000;
  const f = fixture(supportSeed([
    ["src-opening-message", {at: Timestamp.fromMillis(start)}],
    ["msg-staff-reply-1", {direction: "outbound", authorUid: "staff",
      at: Timestamp.fromMillis(clock - 3_600_000)}],
    ["src-returning-message", {at: Timestamp.fromMillis(clock)}],
    ["msg-logged-email-1", {authorUid: "staff",
      at: Timestamp.fromMillis(clock + 1000)}],
  ], start));
  assert.equal(await alertOnSupportMessage(f.deps, conversationId,
    "src-returning-message"), "sent");
  assert.equal(await alertOnSupportMessage(f.deps, conversationId,
    "msg-logged-email-1"), "ignored");
  assert.equal(f.sent.length, 1);
  assert.ok(f.sent[0].text.includes(
    "WhatsApp message (First message from them in over 4 hours)"));
  const receipts = f.db.paths(ALERTS).filter((path) =>
    /^hostOperatorAlerts\/support_/u.test(path));
  assert.equal(receipts.length, 1);
  assert.equal(f.db.get(receipts[0])?.kind, "supportReturn");
});
