import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {EventAccountabilityStore, ACCOUNTABILITY_RECEIPT_COMMAND} from
  "./accountabilityStore";
import {COMMAND_RECEIPTS} from "../../shared/commandReceipts";
import {operationContentHash} from "../../operations/durableActions";
import {EventCheckpointStore} from "./checkpointStore";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {accountabilityResolutionFields} from
  "../../domain/bookings/attendeeAccountability";
import type {EventAssistanceAccountabilityCallableResponse as Response} from
  "../../shared/generated/eventAssistanceAccountabilityCallableResponse";
import type {Decision} from "./membershipTransitions";
import {DEPARTURE_ROSTERS} from "./departureRosterSource";

const RECEIPT_PREFIX = `${COMMAND_RECEIPTS}/${ACCOUNTABILITY_RECEIPT_COMMAND}_`;
const receiptResult = (receipt: Record<string, unknown>) =>
  receipt.result as {checkpointHash: string};

async function setup(real?: Firestore, grouped = false, ids?: string[]) {
  const h = await departureRosterHarness(real);
  const groupId = grouped ? "easy" : h.scope.groupId;
  if (grouped) {
    await h.groups();
    await h.place(groupId);
  }
  const input = await h.command(ids ?? [h.attendeeId], manager, groupId);
  const departure = await h.progress.confirmDeparture(manager, input);
  const checkpoint = {checkpointId: "one",
    progressRevision: departure.view.revision};
  const scope = {context: h.scope.context, attendeeId: h.attendeeId,
    groupId, checkpoint};
  const account = new EventAccountabilityStore(h.db, () => h.clock.now);
  const reports = new EventCheckpointStore(h.db, () => h.clock.now);
  const view = async (actor = manager) =>
    (await account.get(actor, scope)).view;
  const report = async () => (await reports.get(manager,
    {context: scope.context,
      groupId, ...checkpoint})).view;
  async function transfer(actor: string, decision: Decision) {
    const v = (await h.membership.get(actor, {context: scope.context,
      attendeeId: h.attendeeId})).view;
    return h.membership.transfer(actor, {expectedSourceHash: v.sourceHash,
      command: {kind: "transferGroup", context: scope.context,
        eventId: scope.context.eventId, operationId: randomUUID(), payload: {
          attendeeId: h.attendeeId, episodeId: v.episodeId,
          expectedMembershipRevision: v.revision,
          expectedParticipationRevision: v.participationRevision, decision}}});
  }
  return {...h, scope, account, reports, view, report, departure, transfer};
}
function command(v: Response["view"],
  disposition: "departed" | "returned" | "unresolved" = "departed") {
  return {groupId: v.groupId, ...(v.checkpoint ?
    {checkpoint: v.checkpoint} : {}), expectedSourceHash: v.sourceHash,
  command: {kind: "resolveAccountability", context: v.context,
    eventId: v.context.eventId, operationId: randomUUID(), payload: {
      attendeeId: v.attendeeId, episodeId: v.episodeId, disposition}}};
}
function member(v: Awaited<ReturnType<Awaited<ReturnType<
  typeof setup>>["report"]>>) {
  assert.equal(v.availability.kind, "ready");
  if (v.availability.kind !== "ready") throw new Error("No roster");
  return v.availability.members[0];
}

test("a bar crawl records a departure disposition without enabling a sweep",
  async () => {
    const h = await setup();
    const {checkpoint, ...eventScope} = h.scope;
    void checkpoint;
    const unscoped = (await h.account.get(manager, eventScope)).view;
    assert.deepEqual(unscoped.availability,
      {kind: "unavailable", reason: "notApplicable"});
    const view = await h.view();
    assert.deepEqual(view.availability, {kind: "ready"});
    assert.deepEqual(view.checkpoint, h.scope.checkpoint);
    assert.equal(view.episodeId, null);
    const before = h.fake.entries();
    const input = command(view);
    h.fake.failNextCommit = true;
    await assert.rejects(h.account.resolve(manager, input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const result = await h.account.resolve(manager, input);
    assert.equal(result.view.disposition, "departed");
    assert.equal(result.operationRevision, 1);
    const changed = h.fake.entries().filter(([path, value]) =>
      JSON.stringify(value) !== JSON.stringify(before.find(([p]) => p === path)
        ?.[1])).map(([path]) => path);
    assert.equal(changed.length, 2);
    assert.ok(changed.includes(h.attendeePath));
    assert.ok(changed.some((p) => p.startsWith(RECEIPT_PREFIX)));
    assert.deepEqual(await h.read("events/" + h.scope.context.eventId),
      before.find(([p]) => p === "events/" + h.scope.context.eventId)![1]);
    const saved = h.fake.entries();
    assert.equal((await h.account.resolve(manager, input)).outcome, "replayed");
    assert.deepEqual(h.fake.entries(), saved);
    const receipt = saved.find(([p]) => p.startsWith(RECEIPT_PREFIX))![1];
    // The receipt binds the departure checkpoint the visit was resolved for.
    assert.ok(h.departure.view.progress?.departureRosterId);
    assert.match(receiptResult(receipt).checkpointHash, /^[a-f0-9]{64}$/);
    assert.notEqual(receiptResult(receipt).checkpointHash,
      operationContentHash(null));
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  });

test("known dispositions do not claim arrival or invalidate an arrival review",
  async () => {
    const h = await setup();
    const initial = await h.report();
    const before = member(initial);
    assert.equal(before.observation, "unconfirmed");
    assert.deepEqual(before.disposition, {kind: "unresolved"});
    await h.account.resolve(manager, command(await h.view()));
    const departed = await h.report();
    assert.equal(departed.sourceHash, initial.sourceHash);
    assert.equal(departed.report, null);
    const row = member(departed);
    assert.equal(row.observation, "unconfirmed");
    assert.equal(row.disposition?.kind, "resolved");
    if (row.disposition?.kind !== "resolved") throw new Error("No disposition");
    assert.equal(row.disposition.disposition, "departed");
    assert.equal(row.disposition.resolvedBy, manager);
    assert.equal(row.disposition.resolvedAt, h.clock.now);
    const proofHash = row.disposition.sourceHash;
    await h.account.resolve(manager, command(await h.view(), "unresolved"));
    assert.deepEqual(member(await h.report()).disposition,
      {kind: "unresolved"});
    await h.account.resolve(manager, command(await h.view(), "departed"));
    const changed = member(await h.report()).disposition!;
    assert.equal(changed.kind, "resolved");
    if (changed.kind === "resolved") {
      assert.notEqual(changed.sourceHash,
        proofHash);
    }
    // The separately reviewed observation still needs an explicit report.
    const report = await h.reports.record(manager, {
      expectedSourceHash: initial.sourceHash,
      command: {kind: "recordCheckpoint",
        context: initial.context, eventId: initial.context.eventId,
        operationId: randomUUID(), payload: {groupId: initial.groupId,
          checkpointId: initial.checkpointId,
          expectedProgressRevision: initial.progressRevision,
          expectedCheckpointRevision: 0, accountedFor: [h.attendeeId],
          correctionReason: null}}});
    assert.equal(member(report.view).observation, "accountedFor");
  });

test("the exact departure and visit scope gates new dispositions",
  async () => {
    for (const change of ["missing", "wrongStop", "absent", "checkIn",
      "generation", "setup"] as const) {
      const h = await setup(undefined, false, change === "absent" ? [] :
        undefined);
      const scope = structuredClone(h.scope);
      let expected: string;
      switch (change) {
      case "missing":
        scope.checkpoint.progressRevision++;
        expected = "departureNotRecorded"; break;
      case "wrongStop":
        scope.checkpoint.checkpointId = "two";
        expected = "differentCheckpoint"; break;
      case "absent": expected = "notOnDeparture"; break;
      case "checkIn":
        await h.put(h.attendeePath, {...h.attendee, attendanceRevision: 8,
          checkedInAt: Timestamp.fromMillis(h.clock.now)});
        expected = "visitChanged"; break;
      case "generation":
        h.fake.generation = Timestamp.fromMillis(2);
        expected = "setupChanged"; break;
      case "setup":
        await h.put("events/" + h.scope.context.eventId,
          {...h.seed.event, itinerary: []});
        expected = "setupChanged"; break;
      }
      const view = (await h.account.get(manager, scope)).view;
      assert.deepEqual(view.availability, {kind: "unavailable",
        reason: expected});
      await assert.rejects(h.account.resolve(manager, command(view)),
        {code: "failed-precondition"});
      assert.equal((await h.read(h.attendeePath))!.accountabilityRevision,
        undefined);
    }
  });

test("group staff require current membership; managers retain departure review",
  async () => {
    const h = await setup(undefined, true);
    await h.grant("sweep", "easy", "sweep");
    await h.grant("other", "fast", "pacer");
    const input = command(await h.view("sweep"));
    await h.account.resolve("sweep", input);
    await assert.rejects(h.view("other"), {code: "permission-denied"});
    const proposed = await h.transfer(manager, {kind: "propose", from: "easy",
      to: "fast", receivingOperatorId: "other",
      expiresAtMillis: h.clock.now + 1000});
    await h.transfer("other", {kind: "accept",
      transferId: proposed.view.transfer!.transferId});
    await assert.rejects(h.account.resolve("sweep", input),
      {code: "permission-denied"});
    assert.deepEqual((await h.view()).availability, {kind: "ready"});
    assert.equal((await h.account.resolve(manager,
      command(await h.view(), "returned"))).view.disposition, "returned");
  });

test("scope, receipt evidence, original source and authority fence retries",
  async () => {
    const h = await setup();
    await h.grant("sweep", h.scope.groupId, "sweep");
    const input = command(await h.view("sweep"));
    await h.account.resolve("sweep", input);
    const receipt = h.fake.entries().find(([p]) =>
      p.startsWith(RECEIPT_PREFIX))!;
    const original = receipt[1];
    await h.put(receipt[0], {...original, result: {
      ...receiptResult(original), checkpointHash: operationContentHash(null)}});
    await assert.rejects(h.account.resolve("sweep", input), {code: "aborted"});
    await h.put(receipt[0], original);
    const wrong = {...input, checkpoint: {...input.checkpoint!,
      checkpointId: "two"}};
    await assert.rejects(h.account.resolve("sweep", wrong), {code: "aborted"});
    h.fake.beforeRead = (p) => {
      if (p.startsWith(DEPARTURE_ROSTERS + "/")) h.clock.now = 1_100_000;
    };
    await assert.rejects(h.account.resolve("sweep", input),
      {code: "permission-denied"});
  });

test("old, malformed or changed-visit results cannot prove a new closeout",
  async () => {
    for (const change of ["old", "future", "missingActor", "newVisit",
      "cleared"] as const) {
      const h = await setup();
      const fields = accountabilityResolutionFields(h.attendee, "departed",
        manager, Timestamp.fromMillis(h.clock.now));
      const attendee = {...h.attendee, ...fields};
      const expected = change === "old" ? "beforeDeparture" :
        change === "newVisit" ? "visitChanged" : "invalidSource";
      if (change === "old") {
        attendee.accountabilityResolvedAt =
        Timestamp.fromMillis(h.clock.now - 1);
      }
      if (change === "future") {
        attendee.accountabilityResolvedAt =
        Timestamp.fromMillis(h.clock.now + 1);
      }
      if (change === "missingActor") attendee.accountabilityResolvedBy = null;
      if (change === "newVisit") attendee.attendanceRevision++;
      if (change === "cleared") {
        Object.assign(attendee,
          accountabilityResolutionFields(attendee, "unresolved", manager,
            Timestamp.fromMillis(h.clock.now)));
      }
      await h.put(h.attendeePath, attendee);
      assert.deepEqual(member(await h.report()).disposition,
        change === "cleared" ? {kind: "unresolved"} :
          {kind: "unavailable", reason: expected});
    }
  });

test("a backwards clock cannot revive access lost during the roster read",
  async () => {
    const h = await setup();
    await h.grant("sweep", h.scope.groupId, "sweep");
    const input = command(await h.view("sweep"));
    const before = h.fake.entries();
    let lastSourceRead = false;
    let samples = 0;
    h.fake.beforeRead = (p) => {
      if (p.startsWith(DEPARTURE_ROSTERS + "/")) lastSourceRead = true;
    };
    const store = new EventAccountabilityStore(h.db, () => {
      if (!lastSourceRead) return h.clock.now;
      return samples++ === 0 ? 1_100_000 : 1_050_000;
    });
    await assert.rejects(store.resolve("sweep", input),
      {code: "failed-precondition"});
    assert.deepEqual(h.fake.entries(), before);
  });

test("disposition proof preserves timestamp precision from legacy writers",
  async () => {
    const h = await setup();
    h.clock.now++;
    const proofs: string[] = [];
    for (const nanos of [1, 2]) {
      await h.put(h.attendeePath, {...h.attendee,
        ...accountabilityResolutionFields(h.attendee, "returned", manager,
          new Timestamp(1000, nanos))});
      const result = member(await h.report()).disposition;
      assert.equal(result?.kind, "resolved");
      if (result?.kind !== "resolved") throw new Error("No precise proof");
      assert.equal(result.resolvedAt, 1_000_000);
      proofs.push(result.sourceHash);
    }
    assert.notEqual(proofs[0], proofs[1]);
  });

test("event end permits resolution; unauthorized readers see no roster",
  async () => {
    const h = await setup();
    const input = command(await h.view());
    let rosterRead = false;
    h.fake.beforeRead = (p) => {
      if (p.startsWith(DEPARTURE_ROSTERS + "/") ||
          p === h.attendeePath) rosterRead = true;
    };
    await assert.rejects(h.account.resolve("unknown", input),
      {code: "permission-denied"});
    assert.equal(rosterRead, false);
    h.fake.beforeRead = undefined;
    h.clock.now = 4_000_000;
    await h.put("events/" + h.scope.context.eventId,
      {...h.seed.event, status: "cancelled"});
    const view = await h.view();
    assert.deepEqual(view.availability, {kind: "ready"});
    await h.account.resolve(manager, command(view));
    assert.equal(member(await h.report()).disposition?.kind, "resolved");
  });

test("Firestore serializes checkpoint dispositions without inventing arrival", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  const app = initializeApp({projectId: "demo-catch-rules"},
    "checkpoint-dispositions-" + randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    const input = command(await h.view());
    const results = await Promise.all(Array.from({length: 6}, () =>
      h.account.resolve(manager, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 5);
    const view = await h.report();
    assert.equal(member(view).observation, "unconfirmed");
    assert.equal(member(view).disposition?.kind, "resolved");
    assert.equal(view.report, null);
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  } finally {
    await deleteApp(app);
  }
});
