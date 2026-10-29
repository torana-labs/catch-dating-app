import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";
import {EventCheckpointStore} from "./checkpointStore";
import {getEventAssistanceCheckpointHandler,
  recordEventAssistanceCheckpointHandler} from "./checkpointHandlers";
import {CHECKPOINTS, CHECKPOINT_RECEIPTS, checkpointIdentity, Response} from
  "./checkpointRecords";
import {DEPARTURE_ROSTERS} from "./departureRosterSource";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {guestCollections, guestIdentity} from "./guestRecords";

async function harness(real?: Firestore, pace = false, size = 2) {
  const h = await departureRosterHarness(real);
  const ids = [h.attendeeId];
  for (let i = 1; i < size; i++) {
    const id = "guest-" + i;
    ids.push(id);
    await h.put("eventAttendees/" + id, h.attendee);
  }
  if (size === 0) ids.length = 0;
  const groupId = pace ? "easy" : "event:whole";
  if (pace) {
    assert.equal(size, 1);
    await h.groups();
    await h.place(groupId);
    await h.grant("sweep", groupId, "sweep");
    await h.grant("pacer", groupId, "pacer");
  }
  const departure = await h.progress.confirmDeparture(manager,
    await h.command(ids, manager, groupId));
  const scope = {context: h.scope.context, groupId, checkpointId: "one",
    progressRevision: departure.view.revision};
  const store = new EventCheckpointStore(h.db, () => h.clock.now);
  const view = async (actor = manager) => (await store.get(actor, scope)).view;
  const reportPath = CHECKPOINTS + "/" + checkpointIdentity(scope);
  const rosterPath = DEPARTURE_ROSTERS + "/" +
    departure.view.progress!.departureRosterId;
  return {...h, checkpointScope: scope, checkpoints: store, view,
    reportPath, rosterPath, ids, departure};
}
function command(view: Response["view"], accountedFor: string[],
  correctionReason: string | null = null, operationId = randomUUID()) {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "recordCheckpoint" as const, context: view.context,
    eventId: view.context.eventId, operationId, payload: {
      groupId: view.groupId, checkpointId: view.checkpointId, accountedFor,
      expectedProgressRevision: view.progressRevision,
      expectedCheckpointRevision: view.revision, correctionReason}}};
}
function ready(view: Response["view"]) {
  const available = view.availability;
  assert.equal(available.kind, "ready");
  if (available.kind !== "ready") throw new Error("Checkpoint unavailable");
  return available;
}

test("partial reports persist exactly the observed departure members once",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const initial = await h.view();
    assert.equal(ready(initial).reportStatus, "unreported");
    assert.equal(ready(initial).members.length, 2);
    assert.deepEqual(h.fake.entries(), before);
    const input = command(initial, [h.ids[0]]);
    assert.ok(validateEventAssistanceCommand(input.command));
    h.fake.failNextCommit = true;
    await assert.rejects(h.checkpoints.record(manager, input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const applied = await h.checkpoints.record(manager, input);
    assert.equal(applied.operationRevision, 1);
    assert.equal(ready(applied.view).reportStatus, "partial");
    assert.deepEqual(ready(applied.view).members.filter((m) =>
      m.observation === "unconfirmed").map((m) => m.attendeeId), [h.ids[1]]);
    const changed = h.fake.entries().filter(([path, value]) =>
      JSON.stringify(value) !== JSON.stringify(before.find(([p]) => p === path)
        ?.[1])).map(([path]) => path);
    assert.equal(changed.length, 2);
    assert.ok(changed.includes(h.reportPath));
    assert.ok(changed.some((p) => p.startsWith(CHECKPOINT_RECEIPTS + "/")));
    const saved = h.fake.entries();
    const replay = await h.checkpoints.record(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.deepEqual(h.fake.entries(), saved);
    const complete = await h.checkpoints.record(manager,
      command(await h.view(), h.ids));
    assert.equal(ready(complete.view).reportStatus, "complete");
    assert.equal(complete.view.report!.revision, 2);
    const oldRetry = await h.checkpoints.record(manager, input);
    assert.equal(oldRetry.operationRevision, 1);
    assert.equal(oldRetry.view.revision, 2);
    await assert.rejects(h.checkpoints.record(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        accountedFor: h.ids}}}), {code: "aborted"});
  });

test("concurrent reviews conflict and corrections require reasons",
  async () => {
    const h = await harness();
    const first = command(await h.view(), [h.ids[0]]);
    const competing = command(await h.view(), [h.ids[1]]);
    await h.checkpoints.record(manager, first);
    await assert.rejects(h.checkpoints.record(manager, competing),
      {code: "aborted"});
    await assert.rejects(h.checkpoints.record(manager,
      command(await h.view(), [])), {code: "failed-precondition"});
    const corrected = await h.checkpoints.record(manager,
      command(await h.view(), [], "  Selected the wrong guest.  "));
    assert.equal(corrected.view.report!.correctionReason,
      "Selected the wrong guest.");
    assert.equal(ready(corrected.view).reportStatus, "partial");
    assert.ok(ready(corrected.view).members.every((m) =>
      m.observation === "unconfirmed"));
    const receipt = h.fake.entries().find(([p, data]) =>
      p.startsWith(CHECKPOINT_RECEIPTS + "/") &&
      (data.report as {revision?: number}).revision === 1)![1];
    assert.deepEqual((receipt.report as {accountedFor: string[]}).accountedFor,
      [h.ids[0]]);
    const replay = await h.checkpoints.record(manager, first);
    assert.equal(replay.view.revision, 2);
    assert.deepEqual(replay.view.report!.accountedFor, []);
  });

test("deleted or changed visits remain expected and cannot receive new proof",
  async () => {
    for (const change of ["missing", "checkIn", "attendanceRevision",
      "generation", "notCheckedIn", "invalid"] as const) {
      const h = await harness();
      const input = command(await h.view(), [h.ids[0]]);
      if (change === "missing") h.fake.remove(h.attendeePath);
      else if (change === "checkIn") {
        await h.put(h.attendeePath, {...h.attendee,
          checkedInAt: new Timestamp(999, 900_000_001)});
      } else if (change === "attendanceRevision") {
        await h.put(h.attendeePath, {...h.attendee, attendanceRevision: 9});
      } else if (change === "generation") {
        await h.put(h.attendeePath, {...h.attendee,
          createdAt: Timestamp.fromMillis(99)});
      } else if (change === "notCheckedIn") {
        await h.put(h.attendeePath, {...h.attendee, status: "cancelled"});
      } else await h.put(h.attendeePath, {unexpected: true});
      const view = await h.view();
      assert.equal(ready(view).members.length, 2);
      assert.equal(ready(view).members.find((m) =>
        m.attendeeId === h.ids[0])!.visit.kind, "unavailable");
      await assert.rejects(h.checkpoints.record(manager, input),
        {code: "aborted"});
      await assert.rejects(h.checkpoints.record(manager,
        command(view, [h.ids[0]])), {code: "failed-precondition"});
      const other = await h.checkpoints.record(manager,
        command(view, [h.ids[1]]));
      assert.equal(ready(other.view).reportStatus, "partial");
      assert.equal(ready(other.view).members.find((m) =>
        m.attendeeId === h.ids[0])!.observation, "unconfirmed");
    }
  });

test("later visit changes retain historical observations and permit correction",
  async () => {
    const h = await harness();
    const input = command(await h.view(), [h.ids[0]]);
    await h.checkpoints.record(manager, input);
    h.fake.remove(h.attendeePath);
    const view = await h.view();
    assert.equal(ready(view).members.find((m) =>
      m.attendeeId === h.ids[0])!.observation, "accountedFor");
    const complete = await h.checkpoints.record(manager, command(view, h.ids));
    assert.equal(ready(complete.view).reportStatus, "complete");
    const replay = await h.checkpoints.record(manager, input);
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.revision, 2);
    await h.checkpoints.record(manager,
      command(await h.view(), [h.ids[1]], "Earlier observation was mistaken."));
    assert.equal(ready(await h.view()).reportStatus, "partial");
  });

test("later departures cannot overwrite earlier checkpoint scope or evidence",
  async () => {
    const h = await harness();
    const oldInput = command(await h.view(), [h.ids[0]]);
    const next = await h.command(h.ids);
    const target = (await h.progress.get(manager, h.scope)).view.destinations
      .find((d) => d.target.kind === "itineraryStop" &&
        d.target.stopId === "two")!;
    next.command.payload.destination = target.target;
    const departed = await h.progress.confirmDeparture(manager, next);
    const old = await h.checkpoints.record(manager, oldInput);
    assert.equal(old.view.progressRevision, h.checkpointScope.progressRevision);
    const laterScope = {...h.checkpointScope, checkpointId: "two",
      progressRevision: departed.view.revision};
    const later = (await h.checkpoints.get(manager, laterScope)).view;
    assert.equal(ready(later).reportStatus, "unreported");
    await h.checkpoints.record(manager, command(later, h.ids));
    assert.equal(ready(await h.view()).reportStatus, "partial");
  });

test("roster and destination must be recorded; an empty roster is explicit",
  async () => {
    const h = await harness();
    const absent = (await h.checkpoints.get(manager, {...h.checkpointScope,
      progressRevision: 1})).view;
    assert.deepEqual(absent.availability,
      {kind: "unavailable", reason: "rosterNotRecorded"});
    const manifest = (await h.read(h.rosterPath))!;
    const {destination, ...legacy} = manifest;
    void destination;
    await h.put(h.rosterPath, legacy);
    assert.deepEqual((await h.view()).availability,
      {kind: "unavailable", reason: "destinationNotRecorded"});
    await h.put(h.rosterPath, manifest);
    const wrong = (await h.checkpoints.get(manager, {...h.checkpointScope,
      checkpointId: "two"})).view;
    assert.deepEqual(wrong.availability,
      {kind: "unavailable", reason: "differentCheckpoint"});
    await assert.rejects(h.checkpoints.record(manager, command(wrong, h.ids)),
      {code: "failed-precondition"});
    const empty = await harness(undefined, false, 0);
    assert.equal(ready(await empty.view()).reportStatus, "unreported");
    const recorded = await empty.checkpoints.record(manager,
      command(await empty.view(), []));
    assert.equal(ready(recorded.view).reportStatus, "complete");
  });

test("meeting points and replaced event generations cannot imply checkpoints",
  async () => {
    const h = await harness();
    const input = await h.command(h.ids);
    const view = (await h.progress.get(manager, h.scope)).view;
    const meeting = view.destinations.find((d) =>
      d.target.kind === "fixedPlace");
    assert.ok(meeting);
    input.command.payload.destination = meeting.target;
    const departure = await h.progress.confirmDeparture(manager, input);
    const fixed = (await h.checkpoints.get(manager, {...h.checkpointScope,
      progressRevision: departure.view.revision})).view;
    assert.deepEqual(fixed.availability,
      {kind: "unavailable", reason: "notCheckpoint"});
    h.fake.generation = Timestamp.fromMillis(2);
    assert.deepEqual((await h.view()).availability,
      {kind: "unavailable", reason: "setupChanged"});
  });

test("new guests cannot be invented into an earlier departure report",
  async () => {
    const h = await harness();
    await h.put("eventAttendees/late", h.attendee);
    const input = command(await h.view(), [...h.ids, "late"]);
    await assert.rejects(h.checkpoints.record(manager, input),
      {code: "failed-precondition"});
    assert.equal(ready(await h.view()).members.length, 2);
    assert.equal(await h.read(h.reportPath), undefined);
  });

test("schedule expiry and completion do not erase outstanding checkpoint work",
  async () => {
    const h = await harness();
    h.clock.now = 3_000_001;
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    await h.put("eventSuccessPlans/" + h.scope.context.eventId,
      {...h.seed.plan, status: "complete"});
    const result = await h.checkpoints.record(manager,
      command(await h.view(), h.ids));
    assert.equal(ready(result.view).reportStatus, "complete");
    await h.put("events/" + h.scope.context.eventId, {...h.seed.event,
      itinerary: h.seed.event.itinerary.map((stop: {title: string}) => ({
        ...stop,
        title: "Changed " + stop.title}))});
    const changed = await h.view();
    assert.deepEqual(changed.availability,
      {kind: "unavailable", reason: "setupChanged"});
    assert.deepEqual(changed.report!.accountedFor, [...h.ids].sort());
    await assert.rejects(h.checkpoints.record(manager,
      command(changed, [], "Correction")), {code: "failed-precondition"});
  });

test("scoped sweep reports its original roster after a group transfer",
  async () => {
    const h = await harness(undefined, true, 1);
    await h.grant("wrong-group", "fast", "sweep");
    await assert.rejects(h.view("wrong-group"), {code: "permission-denied"});
    const input = command(await h.view("sweep"), h.ids);
    const m = (await h.membership.get(manager,
      {context: h.scope.context, attendeeId: h.attendeeId})).view;
    await h.membership.transfer(manager, {expectedSourceHash: m.sourceHash,
      command: {kind: "transferGroup", context: h.scope.context,
        eventId: h.scope.context.eventId, operationId: randomUUID(), payload: {
          attendeeId: h.attendeeId, episodeId: m.episodeId,
          expectedMembershipRevision: m.revision,
          expectedParticipationRevision: m.participationRevision,
          decision: {kind: "leave"}}}});
    await h.place("fast");
    const result = await h.checkpoints.record("sweep", input);
    assert.equal(ready(result.view).reportStatus, "complete");
    const guestPath = guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.attendeeId);
    const guest = (await h.read(guestPath))!;
    await h.put(guestPath, {...guest, intention: {kind: "notComing"},
      participation: {state: "departed", resumeAtUnit: null},
      revision: Number(guest.revision) + 1});
    assert.equal(ready(await h.view("sweep")).reportStatus, "complete");
    h.clock.now += 100_000;
    await assert.rejects(h.checkpoints.record("sweep", input),
      {code: "permission-denied"});
  });

test("expiry and source read failures cannot publish a checkpoint result",
  async () => {
    for (const pathKind of ["attendee", "receipt"] as const) {
      const h = await harness(undefined, true, 1);
      const input = command(await h.view("sweep"), h.ids);
      h.fake.beforeRead = (path) => {
        if (pathKind === "attendee" ? path === h.attendeePath :
          path.startsWith(CHECKPOINT_RECEIPTS + "/")) h.clock.now += 100_000;
      };
      await assert.rejects(h.checkpoints.record("sweep", input),
        {code: "permission-denied"});
      assert.equal(await h.read(h.reportPath), undefined);
    }
    const h = await harness();
    const input = command(await h.view(), h.ids);
    h.fake.beforeRead = (path) => {
      if (path === h.attendeePath) throw new Error("read interrupted");
    };
    await assert.rejects(h.checkpoints.record(manager, input),
      /read interrupted/);
    assert.equal(await h.read(h.reportPath), undefined);
    h.fake.beforeRead = undefined;
    await h.checkpoints.record(manager, input);
  });

test("closed reads use SDK retries; commit uncertainty uses receipts",
  async () => {
    const h = await harness();
    const input = command(await h.view(), h.ids);
    const closed = () => Object.assign(new Error("Closed transaction"),
      {code: 3, details: "Transaction is invalid or closed."});
    const original = closed();
    h.fake.beforeRead = (path) => {
      if (path === h.attendeePath) throw original;
    };
    // The simple fake does not implement SDK backoff; inspect the handoff.
    await assert.rejects(h.checkpoints.record(manager, input), (error) =>
      error instanceof Error && error.cause === original &&
      (error as Error & {code: number}).code === 10);
    assert.equal(await h.read(h.reportPath), undefined);
    h.fake.beforeRead = undefined;
    const transact = h.db.runTransaction.bind(h.db);
    let doubt = true;
    h.db.runTransaction = async (update, options) => {
      const result = await transact(update, options);
      if (doubt) {
        doubt = false;
        throw original;
      }
      return result;
    };
    await assert.rejects(h.checkpoints.record(manager, input),
      (error) => error === original);
    assert.equal((await h.read(h.reportPath))!.revision, 1);
    const replay = await h.checkpoints.record(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, 1);
  });

test("tampered receipts and malformed departure identities fail closed",
  async () => {
    const h = await harness();
    const input = command(await h.view(), [h.ids[0]]);
    await h.checkpoints.record(manager, input);
    const [path, receipt] = h.fake.entries().find(([p]) =>
      p.startsWith(CHECKPOINT_RECEIPTS + "/"))!;
    await h.put(path, {...receipt, report: {...(receipt.report as object),
      accountedFor: h.ids}});
    await assert.rejects(h.checkpoints.record(manager, input),
      {code: "aborted"});
    const roster = (await h.read(h.rosterPath))!;
    await h.put(h.rosterPath, {...roster,
      members: [...(roster.members as object[]),
        (roster.members as object[])[0]]});
    await assert.rejects(h.view(), {code: "failed-precondition"});
  });

test("reporting preserves the full 1,000-member scope",
  async () => {
    const h = await harness(undefined, false, 1000);
    const view = await h.view();
    assert.equal(ready(view).members.length, 1000);
    const result = await h.checkpoints.record(manager,
      command(view, h.ids.slice(0, 999)));
    assert.equal(ready(result.view).members.filter((m) =>
      m.observation === "unconfirmed").length, 1);
    await assert.rejects(h.checkpoints.record(manager,
      command(result.view, [...h.ids, "extra"])), {code: "invalid-argument"});
  });

test("callables authenticate, limit and reject invalid or rehearsal requests",
  async () => {
    for (const handler of [getEventAssistanceCheckpointHandler,
      recordEventAssistanceCheckpointHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore, rateLimit: async () => {
        calls.push("limit");
      }, store: () => ({get: async () => {
        calls.push("get"); return {} as Response;
      }, record: async () => {
        calls.push("record"); return {} as Response;
      }})};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await handler({auth: {uid: "operator"}, data: {}} as CallableRequest,
        deps);
      assert.equal(calls[0], "limit");
      assert.equal(calls.length, 2);
    }
    const h = await harness();
    const input = command(await h.view(), h.ids);
    for (const wrong of [
      {...input, command: {...input.command, eventId: "other"}},
      {...input, command: {...input.command, context: {mode: "rehearsal",
        rehearsalId: "r", virtualEventId: "v", clockId: "clock"}}},
      command(await h.view(), [h.ids[0], h.ids[0]]),
      command(await h.view(), [], "   "),
    ]) {
      await assert.rejects(h.checkpoints.record(manager, wrong),
        {code: "invalid-argument"});
    }
    const paths: string[] = [];
    h.fake.beforeRead = (path) => paths.push(path);
    await assert.rejects(h.view("stranger"), {code: "permission-denied"});
    assert.ok(paths.every((p) => !p.startsWith(DEPARTURE_ROSTERS + "/") &&
      !p.startsWith("eventAttendees/")));
  });

test("Firestore competing report retries commit one immutable observation", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await harness(getEmulatorFirestore(app), true, 1);
    const input = command(await h.view("sweep"), h.ids);
    // The emulator breaks each receipt-lock deadlock only by a ~2 s lock
    // timeout; more contenders add rounds that can exhaust the SDK's five
    // attempts on a loaded runner. Three still race one commit with replays.
    const results = await Promise.all(Array.from({length: 3}, () =>
      h.checkpoints.record("sweep", input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 2);
    assert.equal((await h.read(h.reportPath))!.revision, 1);
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
    const stale = command(await h.view("sweep"), [], "Correction");
    await h.checkpoints.record("sweep", command(await h.view("sweep"), h.ids));
    await assert.rejects(h.checkpoints.record("sweep", stale),
      {code: "aborted"});
  } finally {
    await deleteApp(app);
  }
});
