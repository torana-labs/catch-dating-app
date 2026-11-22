import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {LiveAssistanceEnrollmentStore} from "./liveEnrollmentStore";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {Guest, guestCollections, guestIdentity, parseGuest} from
  "./guestRecords";
import {setup} from "./liveLateJoinTestHarness";
import {configureRuntime} from "./runtimeConfigTestHarness";
import {start} from "./whatsappTestHarness";

async function enrollmentHarness(db?: Firestore) {
  const h = await setup(db);
  const runtime = await configureRuntime(h);
  const enrollment = new LiveAssistanceEnrollmentStore(h.db,
    () => h.clock.now);
  const runner = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
  const guestPath = guestCollections.guests + "/" +
    guestIdentity(h.context, h.scope.attendeeId);
  const ensure = (binding = runtime.binding) => enrollment.ensure(h.context,
    h.scope.attendeeId, binding);
  return {...h, runtime, enrollment, runner, guestPath, ensure};
}

test("enrollment creates participation and work atomically",
  async () => {
    const h = await enrollmentHarness();
    h.fake.remove(h.guestPath);
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.ensure(), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const enrolled = await h.ensure();
    assert.ok(enrolled.kind === "enrolled");
    const guest = parseGuest(await h.read(h.guestPath));
    assert.equal(guest.episodeId, enrolled.episodeId);
    assert.deepEqual(guest.intention, {kind: "unknown"});
    assert.deepEqual(guest.participation,
      {state: "active", resumeAtUnit: null});
    assert.equal((await h.read(h.attendeePath))!.status, "registered");
    const work = await h.runner.store.get(enrolled.workItemId);
    assert.deepEqual(work.payload.runtimeBinding, h.runtime.binding);
    assert.equal(work.payload.checkpoint.evaluations, 0);
    const after = h.fake.entries();
    assert.deepEqual(await h.ensure(), {...enrolled, kind: "current"});
    assert.deepEqual(h.fake.entries(), after);
  });

test("enrollment preserves break, departure, refusal and closed participation",
  async () => {
    for (const state of ["temporaryBreak", "departed", "notComing",
      "closed"] as const) {
      const h = await enrollmentHarness();
      const guest = parseGuest(await h.read(h.guestPath));
      const updated: Guest = {...guest, revision: guest.revision + 1};
      if (state === "notComing") updated.intention = {kind: "notComing"};
      else if (state === "closed") updated.lifecycle = "closed";
      else updated.participation = {state, resumeAtUnit: null};
      await h.write(h.guestPath, updated);
      const result = await h.ensure();
      assert.deepEqual(await h.read(h.guestPath), updated);
      assert.equal(result.kind, state === "closed" ? "held" : "enrolled");
      if (result.kind !== "held") {
        assert.equal(result.episodeId, guest.episodeId);
      }
    }
  });

test("enrollment requires current saved authority and an eligible roster row",
  async () => {
    for (const boundary of ["paused", "obsolete", "expired", "missing",
      "invited", "waitlisted", "cancelled"] as const) {
      const h = await enrollmentHarness();
      h.fake.remove(h.guestPath);
      if (boundary === "paused") {
        await h.runtime.store.set("host-1", {...h.runtime.input,
          requestId: randomUUID(), expectedRevision: h.runtime.binding.revision,
          command: {kind: "pause"}});
      }
      if (boundary === "obsolete") await configureRuntime(h);
      if (boundary === "expired") h.clock.now += 3_600_000;
      if (boundary === "missing") h.fake.remove(h.attendeePath);
      if (["invited", "waitlisted", "cancelled"].includes(boundary)) {
        await h.write(h.attendeePath, {...await h.read(h.attendeePath),
          status: boundary});
      }
      const before = h.fake.entries();
      assert.equal((await h.ensure()).kind, "held", boundary);
      assert.deepEqual(h.fake.entries(), before);
    }
  });

test("runtime changes rebind existing work; explicit re-entry gets new work",
  async () => {
    const h = await enrollmentHarness();
    const enrolled = await h.ensure();
    assert.ok(enrolled.kind !== "held");
    await h.runner.process(enrolled.workItemId, {kind: "evaluate"});
    const next = await configureRuntime(h);
    const requested = await h.ensure(next.binding);
    assert.deepEqual(requested, {...enrolled, kind: "rebindRequired",
      binding: next.binding});
    const before = await h.runner.store.get(enrolled.workItemId);
    assert.equal(before.payload.checkpoint.evaluations, 1);
    await h.runner.process(enrolled.workItemId,
      {kind: "rebind", binding: next.binding});
    const rebound = await h.runner.store.get(enrolled.workItemId);
    assert.equal(rebound.payload.checkpoint.evaluations, 1);
    assert.deepEqual(rebound.run.counters, before.run.counters);
    assert.equal((await h.ensure(next.binding)).kind, "current");
    const guest = parseGuest(await h.read(h.guestPath));
    await h.guests.startEpisode(h.context, h.scope.attendeeId,
      "explicit-re-entry", guest.revision);
    const returned = await h.ensure(next.binding);
    assert.ok(returned.kind === "enrolled");
    assert.notEqual(returned.workItemId, enrolled.workItemId);
    assert.notEqual(returned.episodeId, enrolled.episodeId);
    assert.deepEqual(await h.runner.store.get(enrolled.workItemId), rebound);
  });

test("replacement registration cannot inherit the previous episode or links",
  async () => {
    const h = await enrollmentHarness();
    const first = await h.ensure();
    assert.ok(first.kind !== "held");
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      createdAt: Timestamp.fromMillis(start + 1)});
    h.clock.now += 1;
    const next = await h.ensure();
    assert.ok(next.kind === "enrolled");
    assert.notEqual(next.episodeId, first.episodeId);
    assert.notEqual(next.workItemId, first.workItemId);
    assert.equal((await h.runner.store.get(first.workItemId))
      .payload.scope.episodeId, first.episodeId);
  });

test("enrollment cannot revive completed work or restore erased participation",
  async () => {
    const h = await enrollmentHarness();
    const first = await h.ensure();
    assert.ok(first.kind !== "held");
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      status: "checkedIn", checkedInAt: Timestamp.fromMillis(start),
      checkedInBy: "host-1", attendanceRevision: 1});
    await h.runner.process(first.workItemId, {kind: "evaluate"});
    const latest = await configureRuntime(h);
    const before = h.fake.entries();
    assert.equal((await h.ensure(latest.binding)).kind, "completed");
    assert.deepEqual(h.fake.entries(), before);
    // Start from an automatically assigned episode for the erasure case.
    const fresh = await enrollmentHarness();
    fresh.fake.remove(fresh.guestPath);
    await fresh.ensure();
    fresh.fake.remove(fresh.guestPath);
    const erased = fresh.fake.entries();
    await assert.rejects(fresh.ensure());
    assert.deepEqual(fresh.fake.entries(), erased);
  });

test("expired work stays distinct from completed cleanup during enrollment",
  async () => {
    const h = await enrollmentHarness();
    const short = await configureRuntime(h, {...h.runtime.configuration,
      expiresAt: start + 1000});
    const first = await h.ensure(short.binding);
    assert.ok(first.kind === "enrolled");
    h.clock.now += 1000;
    const latest = await configureRuntime(h);
    assert.equal((await h.ensure(latest.binding)).kind, "expired");
    await h.runner.process(first.workItemId, {kind: "evaluate"});
    assert.equal((await h.ensure(latest.binding)).kind, "completed");
  });

test("foreign, malformed and mid-transaction expired enrollment has no effects",
  async () => {
    for (const boundary of ["foreign", "malformed", "clock"] as const) {
      const h = await enrollmentHarness();
      h.fake.remove(h.guestPath);
      if (boundary !== "clock") {
        const row = {...await h.read(h.attendeePath)};
        if (boundary === "foreign") row.eventId = "another-event";
        else row.status = "maybe";
        await h.write(h.attendeePath, row);
      } else {
        h.fake.beforeRead = (path) => {
          if (path.startsWith(operationCollections.workItems + "/")) {
            h.clock.now = h.runtime.configuration.expiresAt;
          }
        };
      }
      const before = h.fake.entries();
      await assert.rejects(h.ensure());
      assert.deepEqual(h.fake.entries(), before);
    }
  });

test("Firestore serializes automatic enrollment and runtime rebinding", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await enrollmentHarness(getEmulatorFirestore(app));
    await h.db.doc(h.guestPath).delete();
    const enrolled = await Promise.all([h.ensure(), h.ensure()]);
    assert.equal(enrolled.filter((r) => r.kind === "enrolled").length, 1);
    assert.equal(enrolled.filter((r) => r.kind === "current").length, 1);
    const first = enrolled[0];
    assert.ok(first.kind !== "held");
    const originalGuest = await h.read(h.guestPath);
    await h.runner.process(first.workItemId, {kind: "evaluate"});
    const next = await configureRuntime(h);
    const runs = await Promise.all([
      h.runner.process(first.workItemId,
        {kind: "rebind", binding: next.binding}),
      h.runner.process(first.workItemId,
        {kind: "rebind", binding: next.binding})]);
    assert.ok(runs.some((r) => r.kind === "finished"));
    assert.equal((await h.ensure(next.binding)).kind, "current");
    assert.deepEqual(await h.read(h.guestPath), originalGuest);
    const records = await h.runner.store.get(first.workItemId);
    assert.equal(records.item.revision, 2);
    assert.equal(records.payload.checkpoint.evaluations, 1);
    const receipts = await h.db.collection(operationCollections.actionReceipts)
      .where("workItemId", "==", first.workItemId).get();
    assert.equal(receipts.size, 2);
  } finally {
    await deleteApp(app);
  }
});
