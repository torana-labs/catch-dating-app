import assert from "node:assert/strict";
import test from "node:test";
import {FieldValue, type Firestore} from "firebase-admin/firestore";
import type {EmailSubmission, TransactionalEmail} from "../email/emailProvider";
import {ALERTS, LEASE, LIFETIME, deliverHostAlert, dispatchHostAlerts,
  eligibleHostAlert, enqueueHostAlert} from "./delivery";
import {BRAND} from "../shared/generated/brand";

const clock = 1792512000000;
const eventId = `host_lead_${clock}_00000000-0000-4000-8000-000000000001`;
const intentId = "a".repeat(64);
const sourcePath = `salesInboundIntents/${intentId}`;
const alertPath = `${ALERTS}/${eventId}`;
const source = {source: "website", classification: "sales_private",
  hostLead: {eventId, isNew: true}, status: "needs_identity_review",
  hostApplication: {organizationName: "Private Company"},
  fullName: "Private Applicant", email: "private@organizer.in",
  submissionId: "request-one"};

function fixture() {
  const rows = new Map<string, Record<string, unknown>>([[sourcePath, source]]);
  let serial: Promise<unknown> = Promise.resolve();
  let time = clock;
  const read = (path: string) => ({exists: rows.has(path),
    data: () => structuredClone(rows.get(path))});
  const db = {
    collection: (name: string) => ({doc: (id: string) => ({
      path: `${name}/${id}`, get: async () => read(`${name}/${id}`),
    })}),
    runTransaction: (run: (tx: unknown) => Promise<unknown>) => {
      const result = serial.then(async () => {
        let writing = false;
        const writes: Array<() => void> = [];
        const value = await run({
          get: async ({path}: {path: string}) => {
            assert.equal(writing, false); return read(path);
          },
          create: ({path}: {path: string}, value: Record<string, unknown>) => {
            writing = true; assert.equal(rows.has(path), false);
            writes.push(() => {
              rows.set(path, structuredClone(value));
            });
          },
          update: ({path}: {path: string}, patch: Record<string, unknown>) => {
            writing = true;
            writes.push(() => {
              const next = {...rows.get(path)};
              for (const [key, value] of Object.entries(patch)) {
                if (value instanceof FieldValue) delete next[key];
                else next[key] = value;
              }
              rows.set(path, structuredClone(next));
            });
          },
        });
        writes.forEach((write) => write());
        return value;
      });
      serial = result.catch(() => undefined);
      return result;
    },
  } as unknown as Firestore;
  const base = {enabled: true, since: clock, db, now: () => time};
  const sent: TransactionalEmail[] = [];
  let outcome: EmailSubmission =
    {kind: "accepted", providerMessageId: "mail-1"};
  const provider = {id: "resend", submit: async (mail: TransactionalEmail) => {
    sent.push(mail); return outcome;
  }};
  return {rows, sent, base, provider,
    time: (value: number) => {
      time = value;
    },
    outcome: (value: EmailSubmission) => {
      outcome = value;
    },
    enqueue: () => enqueueHostAlert({...base, intentId}),
    deliver: () => deliverHostAlert({...base, provider, eventId})};
}

test("eligibility excludes legacy, replay, internal QA and pre-activation data",
  () => {
    assert.ok(eligibleHostAlert(source, clock, clock));
    for (const patch of [{source: "partner"}, {hostLead: null},
      {hostLead: {eventId, isNew: false}}, {status: "dismissed"},
      {submissionId: "internal_qa_delivery"}, {fullName: "[QA] Synthetic"},
      {email: "qa@example.test"}, {email: "qa@demo.example.com"},
      {hostApplication: null}]) {
      assert.equal(eligibleHostAlert({...source, ...patch}, clock, clock),
        null);
    }
    for (const [since, now] of [[clock + 1, clock + 2],
      [clock, clock + LIFETIME], [0, clock], [clock, clock - 1]]) {
      assert.equal(eligibleHostAlert(source, since, now), null);
    }
  });

test("disabled paths touch no database or sender", async () => {
  const f = fixture();
  const base = {...f.base, enabled: false, db: {
    collection: () => {
      throw new Error("disabled database");
    },
  } as unknown as Firestore};
  assert.equal(await enqueueHostAlert({...base, intentId}), false);
  assert.equal(await deliverHostAlert({...base, eventId,
    provider: f.provider}), "disabled");
  assert.equal(await dispatchHostAlerts({...base, provider: f.provider}), 0);
});

test("concurrent workers send one notice without applicant data",
  async () => {
    const f = fixture();
    assert.deepEqual(await Promise.all([f.enqueue(), f.enqueue()]),
      [true, false]);
    await Promise.all([f.deliver(), f.deliver()]);
    assert.equal(f.sent.length, 1);
    const mail = f.sent[0];
    assert.equal(mail.to, "suvrat.garg@gmail.com"); // brand-literal-ok: owner inbox
    assert.equal(mail.from, `host@${BRAND.senders.emailDomain}`);
    assert.ok(mail.text.includes(`${BRAND.web.adminOrigin}/`));
    assert.equal(mail.html, undefined);
    for (const value of ["Private Applicant", "Private Company",
      "private@organizer.in", intentId]) {
      assert.equal(JSON.stringify(mail).includes(value), false);
      assert.equal(JSON.stringify(f.rows.get(alertPath)).includes(value),
        value === intentId);
    }
    assert.equal(f.rows.get(alertPath)?.status, "accepted");
    assert.equal(f.rows.get(alertPath)?.providerMessageId, "mail-1");
    assert.equal(f.rows.get(alertPath)?.nextAttemptAt, undefined);
    await f.enqueue(); await f.deliver();
    assert.equal(f.sent.length, 1);
  });

test("missing or dismissed intake stops queued delivery", async () => {
  for (const removed of [true, false]) {
    const f = fixture(); await f.enqueue();
    if (removed) f.rows.delete(sourcePath);
    else f.rows.set(sourcePath, {...source, status: "dismissed"});
    await f.deliver();
    assert.equal(f.sent.length, 0);
    assert.equal(f.rows.get(alertPath)?.status, "stopped");
  }
});

test("uncertain sends never automatically retry", async () => {
  const f = fixture(); await f.enqueue(); f.outcome({kind: "unknown"});
  assert.equal(await f.deliver(), "unknown");
  await f.deliver(); assert.equal(f.sent.length, 1);
  const g = fixture(); await g.enqueue();
  g.rows.set(alertPath, {...g.rows.get(alertPath), status: "sending",
    attempts: 1, attemptId: "00000000-0000-4000-8000-000000000002",
    nextAttemptAt: clock + LEASE});
  g.time(clock + LEASE); await g.deliver(); await g.deliver();
  assert.equal(g.rows.get(alertPath)?.status, "unknown");
  assert.equal(g.rows.get(alertPath)?.nextAttemptAt, undefined);
  assert.equal(g.sent.length, 0);
});

test("only explicit throttles retry, bounded by attempts and original deadline",
  async () => {
    const f = fixture(); await f.enqueue();
    f.outcome({kind: "deferred", reason: "rateLimited",
      retryAfterMillis: 1000});
    for (let i = 0; i < 5; i++) {
      f.time(clock + i * 60_000); await f.deliver();
    }
    assert.equal(f.sent.length, 5);
    assert.equal(new Set(f.sent.map((mail) => mail.idempotencyKey)).size, 1);
    assert.equal(f.rows.get(alertPath)?.status, "failed");
    assert.equal(f.rows.get(alertPath)?.nextAttemptAt, undefined);
    await f.deliver(); assert.equal(f.sent.length, 5);
    const g = fixture(); await g.enqueue();
    g.outcome({kind: "deferred", reason: "quotaExceeded",
      retryAfterMillis: LIFETIME});
    assert.equal(await g.deliver(), "failed");
  });

test("sender rejection is terminal; expiry cannot send", async () => {
  const f = fixture(); await f.enqueue();
  f.outcome({kind: "rejected", reason: "senderUnavailable"});
  assert.equal(await f.deliver(), "failed");
  await f.deliver(); assert.equal(f.sent.length, 1);
  const g = fixture(); await g.enqueue(); g.time(clock + LIFETIME);
  await g.deliver(); assert.equal(g.sent.length, 0);
  assert.equal(g.rows.get(alertPath)?.status, "stopped");
});
