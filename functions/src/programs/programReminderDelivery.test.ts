import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import type {AnchorFacts, MomentAction, MomentDefinition,
  RunRecord} from "../moments/momentModel";
import type {ResolvedRecipient} from "../moments/momentDocuments";
import type {ProgramDeliveryMessageDocument}
  from "../shared/generated/programDeliveryMessageDocument";
import {deliverProgramReminder} from "./programReminderDelivery";

const NOW = 1_000_000;

const moment: MomentDefinition = {
  momentId: "m_reminder",
  scope: {kind: "program", programId: "prog"},
  name: "Travel window opens soon",
  initiation: {kind: "scheduled", atMillis: NOW},
  sense: "audience",
  audience: {kind: "households", rsvpPendingOnly: false},
  action: {kind: "sendTemplate", connectionId: "conn1",
    templateId: "tpl1", variables: {}},
  status: "armed",
  approval: {approvedByUid: "mgr", approvedAtMillis: 1},
  origin: "organizer",
  revision: 3,
};

const run: RunRecord = {
  runId: "m_reminder_run_1",
  momentId: "m_reminder",
  dueAtMillis: NOW,
  anchorRevision: 1,
  status: "planned",
};

const facts: AnchorFacts = {
  scope: {startsAtMillis: NOW + 90 * 86_400_000, endsAtMillis: null,
    rsvpDeadlineAtMillis: null, revision: 1, messagingEnabled: true,
    cancelled: false, organizerId: "org-1"},
  functions: {},
  travelLegs: {},
};

const recipient: ResolvedRecipient = {
  recipientKey: "household:hh1",
  endpoint: {kind: "phone", e164: "+911234567001"},
  householdId: "hh1",
};

const action = moment.action as Extract<MomentAction,
  {kind: "sendTemplate"}>;

function seedProgram(db: FakeFirestore): void {
  db.setDoc("organizerPrograms/prog", {
    organizerId: "org-1", kind: "wedding", title: "Mehta × Rao",
    status: "active", revision: 2,
  });
  db.setDoc("organizerMoments/m_reminder", {...moment});
  db.setDoc("organizerSenderConnections/conn1", {
    organizerId: "org-1", status: "active", phoneNumberId: "2002",
    wabaId: "1001", secretVersionResource: "sec/1", revision: 2,
  });
  db.setDoc("organizerMessageTemplates/tpl1", {
    organizerId: "org-1", status: "APPROVED", name: "reminder",
    language: "en", parameterBindings: [],
  });
  db.setDoc("programHouseholds/hh1", {
    programId: "prog", organizerId: "org-1", label: "Sharma",
    primaryPhoneE164: "+911234567001", memberGuestIds: ["g1"],
    messagingConsent: {granted: true}, revision: 4,
  });
  const acquired = seedWorkspaceFieldAssertions(Object.fromEntries(db.docs));
  for (const [path, doc] of Object.entries(acquired)) db.setDoc(path, doc);
}

function harness(db: FakeFirestore, resolved = recipient) {
  const calls: Array<{toE164: string; phoneNumberId: string}> = [];
  const clock = {now: NOW};
  const provider = {
    sendTemplate: async (p: {toE164: string; phoneNumberId: string}) => {
      calls.push(p);
      return {providerMessageId: "wamid-1"};
    },
  };
  const credentials = {accessBound: async () => "token-1"};
  const deliver = () => deliverProgramReminder({
    db: db as unknown as Firestore,
    provider, credentials, moment, run, facts, recipient: resolved, action,
    now: () => clock.now,
  });
  return {calls, clock, deliver};
}

function record(db: FakeFirestore): ProgramDeliveryMessageDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) => path.startsWith("deliveryMessages/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as ProgramDeliveryMessageDocument;
}

test("a program reminder reserves, claims, submits and receipts durably",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    const outcome = await h.deliver();
    assert.equal(outcome.kind, "sent");
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].toE164, "+911234567001");
    assert.equal(h.calls[0].phoneNumberId, "2002");
    const doc = record(db);
    assert.equal(doc.lifecycle, "active");
    assert.equal(doc.attempts.length, 1);
    const attempt = doc.attempts[0];
    assert.equal(attempt.state.kind, "accepted");
    assert.equal(attempt.binding.routeId, "organizerProgramWhatsapp");
    assert.equal(attempt.authorization.instructionRevision, 3);
    assert.equal(doc.intent.kind, "programReminder");
    assert.equal(doc.intent.recipient.recipientKey, "hh1");
  });

test("a re-fired sweep reconciles the existing attempt, never resends",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    await h.deliver();
    // The attempt sits in `accepted` awaiting a delivery receipt; a
    // second fire must wait on reconciliation rather than re-submit.
    const again = await h.deliver();
    assert.equal(again.kind, "retry");
    assert.equal(h.calls.length, 1);
    assert.equal(record(db).attempts.length, 1);
  });

test("consent revoked before claim suppresses without provider I/O",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    db.updateDoc("programHouseholds/hh1",
      {messagingConsent: {granted: false}});
    const h = harness(db);
    const outcome = await h.deliver();
    assert.equal(outcome.kind, "suppressed");
    assert.equal(h.calls.length, 0);
    assert.equal(record(db).attempts.length, 0);
  });

test("a moment edited after enqueue fences the stale instruction revision",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    // The intent freezes the moment's revision at compose time; the live
    // moment doc having moved to revision 4 must fence this dispatch.
    db.setDoc("organizerMoments/m_reminder",
      {...moment, revision: 4});
    const outcome = await h.deliver();
    assert.equal(outcome.kind, "suppressed");
    if (outcome.kind === "suppressed") {
      assert.equal(outcome.reason, "superseded");
    }
    assert.equal(h.calls.length, 0);
  });

test("a post-acceptance interruption leaves an unknown attempt, " +
    "not a resend", async () => {
  const db = new FakeFirestore({});
  seedProgram(db);
  const calls: unknown[] = [];
  const clock = {now: NOW};
  const provider = {
    sendTemplate: async (p: {toE164: string}) => {
      calls.push(p);
      // Worker cannot know whether Meta accepted — a generic error is
      // held as `unknown` for reconciliation, never auto-retried here.
      throw new Error("socket hangup");
    },
  };
  const outcome = await deliverProgramReminder({
    db: db as unknown as Firestore,
    provider, credentials: {accessBound: async () => "token-1"},
    moment, run, facts, recipient, action, now: () => clock.now,
  });
  assert.equal(outcome.kind, "sent");
  assert.equal(calls.length, 1);
  const doc = record(db);
  assert.equal(doc.attempts.length, 1);
  assert.equal(doc.attempts[0].state.kind, "unknown");
});

for (const modification of ["missingAssertion", "foreignScope", "unassigned"]) {
  test(`household phone evidence ${modification} prevents provider I/O`,
    async () => {
      const db = new FakeFirestore({});
      seedProgram(db);
      const selected = (db.getDoc("programHouseholds/hh1")!.fieldSelections as
        {phoneE164: string}).phoneE164;
      if (modification === "missingAssertion") {
        db.deleteDoc(`workspaceFieldAssertions/${selected}`);
      } else if (modification === "foreignScope") {
        db.updateDoc(`workspaceFieldAssertions/${selected}`, {
          workspaceRef: {kind: "program", id: "another-wedding"}});
      } else {
        db.updateDoc("programHouseholds/hh1", {fieldSelections: {}});
      }
      const h = harness(db);
      await h.deliver();
      assert.equal(h.calls.length, 0);
      assert.equal(record(db).attempts.length, 0);
    });
}

test("household evidence cannot authorize an unassigned guest phone",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    db.setDoc("programGuests/g1", {programId: "prog", organizerId: "org-1",
      householdId: "hh1", phoneE164: "+911234567001"});
    const h = harness(db, {...recipient, recipientKey: "guest:g1"});
    await h.deliver();
    assert.equal(h.calls.length, 0);
  });

for (const change of ["assertionDeleted", "consentRevoked"]) {
  test(`program reminder ${change} between reserve and claim never sends`,
    async () => {
      const db = new FakeFirestore({});
      seedProgram(db);
      let changed = false;
      let sends = 0;
      const outcome = await deliverProgramReminder({
        db: db as unknown as Firestore, moment, run, facts, recipient, action,
        credentials: {accessBound: async () => "synthetic-token"},
        provider: {sendTemplate: async () => {
          sends++;
          return {providerMessageId: "unexpected-send"};
        }},
        now: () => {
          const doc = [...db.docs.entries()].find(([path]) =>
            path.startsWith("deliveryMessages/"))?.[1] as
            ProgramDeliveryMessageDocument | undefined;
          if (!changed && doc?.attempts.some((attempt) =>
            attempt.state.kind === "reserved")) {
            changed = true;
            if (change === "consentRevoked") {
              db.updateDoc("programHouseholds/hh1", {
                messagingConsent: {granted: false}});
            } else {
              const id = (db.getDoc("programHouseholds/hh1")!
                .fieldSelections as {phoneE164: string}).phoneE164;
              db.deleteDoc(`workspaceFieldAssertions/${id}`);
            }
          }
          return NOW;
        },
      });
      assert.equal(changed, true);
      assert.equal(sends, 0);
      assert.equal(outcome.kind, "retry");
      assert.equal([...db.docs.keys()].filter((path) =>
        path.startsWith("whatsappDispatches/")).length, 0);
    });
}

test("advancing-clock replay preserves the first intent and expiry",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    await h.deliver();
    const original = structuredClone(record(db).intent);
    h.clock.now += 60_000;
    assert.equal((await h.deliver()).kind, "retry");
    assert.deepEqual(record(db).intent, original);
    assert.equal(h.calls.length, 1);
  });

test("an expired original intent cannot acquire a fresh recovery window",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    db.updateDoc("organizerSenderConnections/conn1", {status: "inactive"});
    const h = harness(db);
    assert.equal((await h.deliver()).kind, "suppressed");
    const original = structuredClone(record(db).intent);
    h.clock.now = original.expiresAt + 1;
    db.updateDoc("organizerSenderConnections/conn1", {status: "active"});
    assert.deepEqual(await h.deliver(),
      {kind: "suppressed", reason: "expired"});
    assert.deepEqual(record(db).intent, original);
    assert.equal(h.calls.length, 0);
  });

test("concurrent first producers with different clocks share one intent",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrivals = 0;
    db.beforeCommit = async () => {
      if (arrivals >= 2) return;
      arrivals++;
      if (arrivals === 2) release();
      await bothRead;
    };
    let sends = 0;
    const invoke = (firstNow: number) => {
      let first = true;
      return deliverProgramReminder({db: db as unknown as Firestore,
        moment, run, facts, recipient, action,
        provider: {sendTemplate: async () => {
          sends++;
          return {providerMessageId: "concurrent-1"};
        }},
        credentials: {accessBound: async () => "token-1"},
        now: () => {
          if (!first) return NOW + 2;
          first = false;
          return firstNow;
        }});
    };
    const pending = Promise.all([invoke(NOW), invoke(NOW + 1)]);
    try {
      await pending;
      assert.equal(arrivals, 2);
      assert.equal(sends, 1);
      assert.equal(record(db).attempts.length, 1);
      assert.equal(record(db).intent.createdAt, NOW);
      assert.equal(record(db).intent.expiresAt, NOW + 6 * 3_600_000);
    } finally {
      release();
      await pending.catch(() => undefined);
    }
  });

for (const change of ["title", "template", "revision"] as const) {
  test(`replay still rejects changed immutable ${change}`, async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    await h.deliver();
    const original = structuredClone(record(db));
    await assert.rejects(deliverProgramReminder({
      db: db as unknown as Firestore,
      moment: {...moment,
        ...(change === "title" ? {name: "Other title"} : {}),
        ...(change === "revision" ? {revision: moment.revision + 1} : {})},
      run, facts, recipient,
      action: {...action,
        ...(change === "template" ? {templateId: "other-template"} : {})},
      now: () => NOW + 1,
      provider: {sendTemplate: async () => {
        assert.fail("changed content must not reach provider");
      }},
      credentials: {accessBound: async () => "token-1"},
    }), /Message intent identity already has other content/);
    assert.deepEqual(record(db), original);
    assert.equal(h.calls.length, 1);
  });
}

test("uncommitted enqueue failure preserves its error and performs no send",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    const failure = new Error("enqueue unavailable");
    db.beforeCommit = async () => {
      throw failure;
    };
    await assert.rejects(h.deliver(), (error) => error === failure);
    assert.equal(h.calls.length, 0);
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("deliveryMessages/")).length, 0);
    db.beforeCommit = undefined;
    assert.equal((await h.deliver()).kind, "sent");
  });

test("ambiguous enqueue completion recovers only the committed intent",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const transaction = db.runTransaction.bind(db);
    let fail = true;
    db.runTransaction = async (callback) => {
      const value = await transaction(callback);
      if (fail) {
        fail = false;
        throw new Error("enqueue committed but response lost");
      }
      return value;
    };
    const h = harness(db);
    assert.equal((await h.deliver()).kind, "sent");
    assert.equal(h.calls.length, 1);
    assert.equal(record(db).intent.createdAt, NOW);
    assert.equal(record(db).attempts.length, 1);
  });

test("failed initial intent read is not treated as an absent record",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const collection = db.collection.bind(db);
    const failure = new Error("intent read unavailable");
    db.collection = (path) => {
      const result = collection(path);
      if (path !== "deliveryMessages") return result;
      const doc = result.doc.bind(result);
      result.doc = (id) => {
        const ref = doc(id);
        ref.get = async () => {
          throw failure;
        };
        return ref;
      };
      return result;
    };
    const h = harness(db);
    await assert.rejects(h.deliver(), (error) => error === failure);
    assert.equal(h.calls.length, 0);
    assert.equal(db.transactionCommits, 0);
  });

test("unknown provider outcome stays held on advancing-clock replay",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    let sends = 0;
    let now = NOW;
    const invoke = () => deliverProgramReminder({
      db: db as unknown as Firestore, moment, run, facts, recipient, action,
      now: () => now, credentials: {accessBound: async () => "token-1"},
      provider: {sendTemplate: async () => {
        sends++;
        throw new Error("provider outcome unknown");
      }},
    });
    await invoke();
    now += 60_000;
    assert.equal((await invoke()).kind, "retry");
    assert.equal(sends, 1);
    assert.equal(record(db).attempts[0].state.kind, "unknown");
  });

test("failed recovery read rejects instead of claiming enqueue recovery",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const collection = db.collection.bind(db);
    const readFailure = new Error("recovery read unavailable");
    let rejectReads = false;
    db.collection = (path) => {
      const result = collection(path);
      if (path !== "deliveryMessages") return result;
      const doc = result.doc.bind(result);
      result.doc = (id) => {
        const ref = doc(id);
        const get = ref.get.bind(ref);
        ref.get = async () => {
          if (rejectReads) throw readFailure;
          return get();
        };
        return ref;
      };
      return result;
    };
    db.beforeCommit = async () => {
      rejectReads = true;
      throw new Error("enqueue outcome unavailable");
    };
    const h = harness(db);
    await assert.rejects(h.deliver(), (error) => error === readFailure);
    assert.equal(h.calls.length, 0);
    assert.equal(db.transactionCommits, 0);
  });

test("recovery retries enqueue once and never retries the provider",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const h = harness(db);
    await h.deliver();
    const original = structuredClone(record(db));
    const failure = new Error("enqueue remains unavailable");
    let attempts = 0;
    db.runTransaction = async () => {
      attempts++;
      throw failure;
    };
    h.clock.now++;
    await assert.rejects(h.deliver(), (error) => error === failure);
    assert.equal(attempts, 2);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(record(db), original);
  });
