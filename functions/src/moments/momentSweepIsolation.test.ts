import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {MOMENTS_COLLECTION, MOMENT_RUNS_COLLECTION} from "./momentDocuments";
import type {MomentDefinition} from "./momentModel";
import {runMomentSweep, type MomentRunnerDeps} from "./momentRunner";

const NOW = 1_700_000_000_000;

function moment(id: string): MomentDefinition {
  return {
    momentId: id, scope: {kind: "event", eventId: id}, name: "Reminder",
    initiation: {kind: "scheduled", atMillis: NOW}, sense: "audience",
    audience: {kind: "eventParticipants", statuses: ["signedUp"]},
    action: {kind: "push", notificationType: "eventReminder",
      preferenceKey: "eventReminders"},
    status: "armed", approval: {approvedByUid: "host", approvedAtMillis: 1},
    origin: "organizer", revision: 1,
  };
}

function seed(db: FakeFirestore, value: MomentDefinition): void {
  db.setDoc(`${MOMENTS_COLLECTION}/${value.momentId}`, {...value});
  db.setDoc(`events/${value.momentId}`, {
    status: "active", startTime: NOW + 172_800_000,
    endTime: NOW + 180_000_000, revision: 1, timezone: "UTC",
  });
  db.setDoc(`users/${value.momentId}`, {});
  db.setDoc(`users/${value.momentId}/pushInstallations/device`,
    {token: "synthetic-token", appRole: "consumer"});
  db.setDoc(`eventParticipations/${value.momentId}`, {
    eventId: value.momentId, uid: value.momentId, status: "signedUp",
  });
}

function runner(db: FakeFirestore) {
  const pushed: string[] = [];
  const deps: MomentRunnerDeps = {
    firestore: () => db as never, nowMillis: () => NOW,
    quietEndMillis: () => null, localDayKey: () => "day",
    localMinuteOfDay: () => 600, quietHoursFor: () => null,
    dailyCapFor: () => 0,
    pushCopyFor: async () => ({title: "Reminder", body: "Soon"}),
    sendPushToUid: async ({uid}) => {
      pushed.push(uid);
    },
    deliverProgramReminder: async () => ({kind: "sent"}),
    deliverAutomationMessage: async () =>
      ({kind: "suppressed", reason: "hostReview"}),
    writeStaffAttention: async () => {}, loadConsentFacts: async () => ({}),
  };
  return {deps, pushed};
}

for (const offset of ["offsetDays", "offsetMonths"] as const) {
  for (const fullPage of [false, true]) {
    test(`bad timezone with ${offset} cannot stop healthy due work ` +
        `on a ${fullPage ? "full" : "short"} page`, async () => {
      const db = new FakeFirestore({});
      seed(db, {...moment("a_bad"), initiation: {kind: "anchored",
        anchorKind: "scopeStart", anchorId: null, offsetMinutes: 0,
        [offset]: -1}});
      db.updateDoc("events/a_bad", {timezone: "Invalid/Zone"});
      seed(db, moment("b_healthy"));
      if (fullPage) {
        for (let index = 0; index < 498; index++) {
          seed(db, {...moment(`z_${String(index).padStart(3, "0")}`),
            initiation: {kind: "scheduled", atMillis: NOW + 999_000_000}});
        }
        seed(db, moment("zz_later"));
      }
      const {deps, pushed} = runner(db);
      const first = await runMomentSweep(deps);
      assert.equal(first.runsFired, 1);
      assert.equal(first.momentsFailed, 1);
      assert.equal(first.runsFailed, 0);
      assert.deepEqual(pushed, ["b_healthy"]);
      assert.equal(db.getDoc("organizerMomentSweepState/armed")?.afterMomentId,
        fullPage ? "z_497" : null);
      const second = await runMomentSweep(deps);
      assert.equal(second.runsFired, fullPage ? 1 : 0);
      assert.deepEqual(pushed, fullPage ?
        ["b_healthy", "zz_later"] : ["b_healthy"]);
    });
  }
}

test("malformed moment and due-run rows leave healthy dispatch reachable",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("b_healthy"));
    // Both the lenient-null and throwing decoder paths must be isolated.
    db.setDoc(`${MOMENTS_COLLECTION}/a_null`, {status: "armed"});
    db.setDoc(`${MOMENTS_COLLECTION}/a_throw`,
      {...moment("a_throw"), name: null});
    db.setDoc(`${MOMENT_RUNS_COLLECTION}/a_bad`,
      {status: "planned", dueAtMillis: NOW - 1, momentId: "missing"});
    const {deps, pushed} = runner(db);
    const summary = await runMomentSweep(deps);
    assert.equal(summary.runsFired, 1);
    assert.equal(summary.momentsFailed, 2);
    assert.equal(summary.runsFailed, 1);
    assert.deepEqual(summary.failureSamples.map((sample) => sample.stage),
      ["momentDecode", "momentDecode", "runDecode"]);
    assert.deepEqual(pushed, ["b_healthy"]);
    assert.equal(db.getDoc(`${MOMENT_RUNS_COLLECTION}/a_bad`)?.status,
      "planned");
  });

test("transient replan failure retries without repeating healthy sends",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("a_retry"));
    seed(db, moment("b_healthy"));
    const original = db.runQuery.bind(db);
    let fail = true;
    db.runQuery = async (query) => {
      if (fail && query.collectionPath === MOMENT_RUNS_COLLECTION &&
          query.wheres.some((where) => where.field === "momentId" &&
            where.value === "a_retry")) {
        throw new Error("private transient backend details");
      }
      return original(query);
    };
    const {deps, pushed} = runner(db);
    assert.equal((await runMomentSweep(deps)).runsFired, 1);
    assert.deepEqual(pushed, ["b_healthy"]);
    fail = false;
    assert.equal((await runMomentSweep(deps)).runsFired, 1);
    assert.deepEqual(pushed, ["b_healthy", "a_retry"]);
  });

test("transient dispatch failure stays planned and does not stall other runs",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("a_retry"));
    seed(db, moment("b_healthy"));
    const {deps, pushed} = runner(db);
    let fail = true;
    deps.quietEndMillis = (scope) => {
      if (fail && scope.kind === "event" && scope.eventId === "a_retry") {
        throw new Error("private policy dependency details");
      }
      return null;
    };
    const first = await runMomentSweep(deps);
    assert.equal(first.runsFired, 1);
    const retry = [...db.docs.values()].find((row) =>
      row.momentId === "a_retry" && typeof row.runId === "string");
    assert.equal(retry?.status, "planned");
    assert.deepEqual(pushed, ["b_healthy"]);
    fail = false;
    assert.equal((await runMomentSweep(deps)).runsFired, 1);
    assert.deepEqual(pushed, ["b_healthy", "a_retry"]);
  });

test("top-level due query failure still rejects the sweep", async () => {
  const db = new FakeFirestore({});
  const original = db.runQuery.bind(db);
  db.runQuery = async (query) => {
    if (query.collectionPath === MOMENT_RUNS_COLLECTION) {
      throw new Error("due query unavailable");
    }
    return original(query);
  };
  await assert.rejects(runMomentSweep(runner(db).deps),
    /due query unavailable/);
});


test("isolated failure evidence is bounded and excludes arbitrary payloads",
  async () => {
    const db = new FakeFirestore({});
    for (let index = 0; index < 12; index++) {
      seed(db, moment(`private-row-${index}`));
    }
    const {deps} = runner(db);
    deps.quietEndMillis = () => {
      throw Object.assign(new Error("private-secret-message"),
        {token: "private-secret-token"});
    };
    const summary = await runMomentSweep(deps);
    assert.equal(summary.momentsFailed, 0);
    assert.equal(summary.runsFailed, 12);
    assert.equal(summary.runsFired, 0);
    assert.equal(summary.runsSkipped, 0);
    assert.equal(summary.runsDeferred, 0);
    assert.equal(summary.failureSamples.length, 10);
    for (const sample of summary.failureSamples) {
      assert.deepEqual(Object.keys(sample).sort(), ["documentHash", "stage"]);
      assert.equal(sample.stage, "runDispatch");
      assert.match(sample.documentHash, /^[a-f0-9]{64}$/);
    }
    assert.doesNotMatch(JSON.stringify(summary), /private|secret|token/);
    // Repeated failures correlate without exposing arbitrary IDs or errors.
    assert.deepEqual((await runMomentSweep(deps)).failureSamples,
      summary.failureSamples);
  });

test("a malformed old due row cannot block an otherwise valid due page",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("b_healthy"));
    db.setDoc(`${MOMENT_RUNS_COLLECTION}/a_old_bad`, {
      status: "planned", dueAtMillis: NOW - 1, runId: "a_old_bad",
      momentId: null,
    });
    const {deps, pushed} = runner(db);
    const summary = await runMomentSweep(deps);
    assert.equal(summary.runsFailed, 1);
    assert.equal(summary.failureSamples[0].stage, "runDecode");
    assert.equal(summary.runsFired, 1);
    assert.deepEqual(pushed, ["b_healthy"]);
  });

test("partial dispatch retains sent journals across the next sweep",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("a_retry"));
    seed(db, moment("b_healthy"));
    db.setDoc("eventParticipations/a_second", {
      eventId: "a_retry", uid: "second", status: "signedUp",
    });
    db.setDoc("users/second", {});
    db.setDoc("users/second/pushInstallations/device",
      {token: "synthetic-token", appRole: "consumer"});
    const {deps, pushed} = runner(db);
    const send = deps.sendPushToUid;
    let fail = true;
    deps.sendPushToUid = async (params) => {
      if (fail && params.uid === "second") throw new Error("temporary outage");
      await send(params);
    };
    const first = await runMomentSweep(deps);
    assert.equal(first.runsFailed, 1);
    assert.equal(first.runsFired, 1);
    assert.deepEqual(pushed, ["a_retry", "b_healthy"]);
    fail = false;
    const second = await runMomentSweep(deps);
    assert.equal(second.runsFailed, 0);
    assert.equal(second.runsFired, 1);
    assert.deepEqual(pushed, ["a_retry", "b_healthy", "second"]);
  });


test("healthy run at the bounded due-page edge survives 199 malformed rows",
  async () => {
    const db = new FakeFirestore({});
    seed(db, moment("healthy"));
    for (let index = 0; index < 199; index++) {
      db.setDoc(`${MOMENT_RUNS_COLLECTION}/bad_${index}`, {
        status: "planned", dueAtMillis: NOW - 1, momentId: null,
      });
    }
    const {deps, pushed} = runner(db);
    const summary = await runMomentSweep(deps);
    assert.equal(summary.runsFailed, 199);
    assert.equal(summary.runsFired, 1);
    assert.equal(summary.failureSamples.length, 10);
    assert.deepEqual(pushed, ["healthy"]);
  });
