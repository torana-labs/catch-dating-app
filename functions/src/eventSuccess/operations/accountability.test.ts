import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAssistanceAccountabilityCallableResponse as Response} from
  "../../shared/generated/eventAssistanceAccountabilityCallableResponse";
import {accountabilityResolutionFields} from "../accountability";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";
import {EventAccountabilityStore, ACCOUNTABILITY_RECEIPTS} from
  "./accountabilityStore";
import {getEventAssistanceAccountabilityHandler,
  resolveEventAssistanceAccountabilityHandler} from "./accountabilityHandlers";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {EventMembershipStore} from "./membershipStore";
import {EventGroupStaffStore} from "./groupStaffStore";
import {guestCollections, guestIdentity} from "./guestRecords";
import {eventStaffGrantId} from "../../shared/eventOperatorAuthority";

const manager = progressFixtureManager;
const start = 1_000_000;
async function harness(real?: Firestore) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const, eventId: "e-" + id,
    organizerId: "o-" + id};
  const scope = {context, attendeeId: "a-" + id, groupId: "event:whole"};
  const seed = await seedJoiningProgress(db, context, start, 3_000_000);
  const event = {...seed.event, eventFormat: {version: 1,
    activityKind: "socialRun", interactionModel: "pacePods", activityDetails: {
      routePlan: {version: 2, movementMode: "run", routeShape: "loop",
        groupStrategy: "paceGroups", stopCadence: "hostedStops",
        stopKinds: ["regroup"], roleKinds: ["pacer", "sweep"],
        path: [{latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast"].map((id, sortOrder) =>
          ({id, label: id, sortOrder}))}}}};
  const attendee = {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  eventId: context.eventId, organizerId: context.organizerId,
  status: "checkedIn", linkedUid: null,
  checkedInAt: Timestamp.fromMillis(start - 100), checkedInBy: manager,
  attendanceRevision: 7, createdAt: Timestamp.fromMillis(start - 1000),
  updatedAt: Timestamp.fromMillis(start - 100)};
  const put = async (path: string, value: object) => {
    if (real) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const read = async (path: string) => real ?
    (await db.doc(path).get()).data() : fake.read(path);
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  await put(eventPath, event);
  await put(attendeePath, attendee);
  const clock = {now: start};
  const store = new EventAccountabilityStore(db, () => clock.now);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const membership = new EventMembershipStore(db, () => clock.now);
  const staff = new EventGroupStaffStore(db, () => clock.now);
  const initial = (await store.get(manager, scope)).view;
  await guests.startEpisode(context, scope.attendeeId, "begin", null);
  async function grant(uid: string, groupId: string,
    duty: "lead" | "pacer" | "sweep", until = start + 100_000) {
    const target = {uid, displayName: "Crew", phoneLastFour: "1234"};
    const view = (await staff.get(manager, target, {context, groupId})).view;
    await staff.set(manager, target, {context, groupId,
      phoneNumber: "+919999991234", expectedUid: uid,
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      requestId: randomUUID(), decision: {kind: "assign", duty,
        expiresAtMillis: until}});
  }
  async function place(groupId: string) {
    const view = (await membership.get(manager,
      {context, attendeeId: scope.attendeeId})).view;
    await membership.transfer(manager, {expectedSourceHash: view.sourceHash,
      command: {kind: "transferGroup", context, eventId: context.eventId,
        operationId: randomUUID(), payload: {attendeeId: scope.attendeeId,
          episodeId: view.episodeId,
          expectedMembershipRevision: view.revision,
          expectedParticipationRevision: view.participationRevision,
          decision: {kind: "place", groupId}}}});
  }
  return {fake, db, scope, seed, event, attendee, eventPath, attendeePath,
    clock, store, guests, membership, initial, put, read, grant, place};
}
type Harness = Awaited<ReturnType<typeof harness>>;
const current = async (h: Harness, actorUid = manager,
  groupId = h.scope.groupId) =>
  (await h.store.get(actorUid, {...h.scope, groupId})).view;
function command(view: Response["view"],
  disposition: "returned" | "departed" | "unresolved" = "returned",
  operationId = randomUUID()) {
  return {groupId: view.groupId, expectedSourceHash: view.sourceHash, command: {
    kind: "resolveAccountability", context: view.context,
    eventId: view.context.eventId, operationId, payload: {
      attendeeId: view.attendeeId, episodeId: view.episodeId, disposition}}};
}

test("accountability changes only the shared visit result, once", async () => {
  const h = await harness();
  assert.deepEqual(h.initial.availability, {kind: "ready"});
  assert.equal(h.initial.episodeId, null);
  const before = h.fake.entries();
  const input = command(await current(h));
  assert.ok(validateEventAssistanceCommand(input.command));
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.resolve(manager, input), /interruption/);
  assert.deepEqual(h.fake.entries(), before);
  const applied = await h.store.resolve(manager, input);
  assert.equal(applied.outcome, "applied");
  assert.equal(applied.operationRevision, 1);
  assert.equal(applied.view.disposition, "returned");
  assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
  const changed = h.fake.entries().filter(([path, value]) =>
    JSON.stringify(value) !== JSON.stringify(before.find(([p]) => p === path)
      ?.[1])).map(([path]) => path);
  assert.equal(changed.length, 2);
  assert.ok(changed.includes(h.attendeePath));
  assert.ok(changed.some((p) => p.startsWith(ACCOUNTABILITY_RECEIPTS + "/")));
  const saved = h.fake.entries();
  assert.equal((await h.store.resolve(manager, input)).outcome, "replayed");
  assert.deepEqual(h.fake.entries(), saved);
  await assert.rejects(h.store.resolve(manager, {...input, command: {
    ...input.command, payload: {...input.command.payload,
      disposition: "departed"}}}), {code: "aborted"});
  await h.store.resolve(manager, command(await current(h), "unresolved"));
  assert.equal((await current(h)).revision, 2);
  assert.equal((await current(h)).disposition, "unresolved");
  const replay = await h.store.resolve(manager, input);
  assert.equal(replay.operationRevision, 1);
  assert.equal(replay.view.revision, 2);
});

test("shared legacy writes fence a stale typed resolution, including ABA",
  async () => {
    const h = await harness();
    const input = command(await current(h));
    for (const disposition of ["departed", "unresolved"] as const) {
      const row = (await h.read(h.attendeePath))! as typeof h.attendee;
      await h.put(h.attendeePath, {...row,
        ...accountabilityResolutionFields(row, disposition, manager,
          Timestamp.fromMillis(h.clock.now))});
    }
    assert.equal((await current(h)).revision, 2);
    await assert.rejects(h.store.resolve(manager, input), {code: "aborted"});
  });

test("accountability works without initializing assistance or a linked account",
  async () => {
    const h = await harness();
    const path = guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId);
    const guest = (await h.read(path))!;
    h.fake.remove(path);
    const view = await current(h);
    assert.equal(view.episodeId, null);
    assert.deepEqual(view.availability, {kind: "ready"});
    const input = command(view);
    assert.equal((await h.store.resolve(manager, input)).outcome, "applied");
    assert.equal(await h.read(path), undefined);
    assert.equal((await h.read(h.attendeePath))!.linkedUid, null);
    // A subsequently created episode is an explicit change of context.
    await h.put(path, guest);
    await assert.rejects(h.store.resolve(manager, input), {code: "aborted"});
  });

test("new check-ins, episodes, format and replaced sources fence old commands",
  async () => {
    for (const change of ["checkIn", "episode", "format", "source"]) {
      const h = await harness();
      const input = command(await current(h));
      if (change === "checkIn") {
        await h.put(h.attendeePath,
          {...(await h.read(h.attendeePath)),
            checkedInAt: Timestamp.fromMillis(start - 50),
            attendanceRevision: 8});
      }
      if (change === "episode") {
        const path = guestCollections.guests + "/" +
          guestIdentity(h.scope.context, h.scope.attendeeId);
        const row = (await h.read(path))!;
        await h.put(path, {...row, episodeId: "episode:replacement",
          revision: Number(row.revision) + 1});
      }
      if (change === "format") {
        await h.put(h.eventPath, {...h.event,
          eventFormat: {...h.event.eventFormat,
            eventSuccessPrimitives: {accountability: "rollCall"}}});
      }
      if (change === "source") h.fake.generation = Timestamp.fromMillis(2);
      await assert.rejects(h.store.resolve(manager, input));
      assert.equal((await h.read(h.attendeePath))!.accountabilityRevision,
        undefined);
    }
  });

test("a sweep can resolve its accepted group, with no cross-group authority",
  async () => {
    const h = await harness();
    await h.grant("sweep", "easy", "sweep");
    await h.grant("other", "fast", "pacer");
    await h.place("easy");
    const own = await current(h, "sweep", "easy");
    await h.store.resolve("sweep", command(own, "departed"));
    for (const [uid, group] of [["sweep", "event:whole"], ["other", "easy"],
      ["other", "fast"], ["guest", "event:whole"]]) {
      await assert.rejects(current(h, uid, group), {code: "permission-denied"});
    }
    await h.grant("lead", "event:whole", "lead");
    await h.store.resolve("lead",
      command(await current(h, "lead"), "returned"));
    const stamp = await current(h, "sweep", "easy");
    h.clock.now = start + 100_000;
    await assert.rejects(h.store.resolve("sweep", command(stamp)),
      {code: "permission-denied"});
  });

test("an expired or revoked duty cannot replay an earlier successful command",
  async () => {
    for (const change of ["revoked", "expiresDuringRead"]) {
      const h = await harness();
      await h.grant("sweep", "event:whole", "sweep");
      const input = command(await current(h, "sweep"));
      await h.store.resolve("sweep", input);
      if (change === "revoked") {
        const path = "eventStaffGrants/" +
          eventStaffGrantId(h.scope.context.eventId, "sweep");
        await h.put(path, {...(await h.read(path)), status: "revoked"});
      } else {
        h.fake.beforeRead = (path) => {
          if (path.startsWith(ACCOUNTABILITY_RECEIPTS + "/")) {
            h.clock.now = start + 100_000;
          }
        };
      }
      await assert.rejects(h.store.resolve("sweep", input),
        {code: "permission-denied"});
    }
  });

test("finishing, cancellation and scheduled end do not erase accountability",
  async () => {
    const h = await harness();
    h.clock.now = 4_000_000;
    await h.put(h.eventPath, {...h.event, status: "cancelled"});
    await h.put("eventSuccessPlans/" + h.scope.context.eventId,
      {...h.seed.plan, status: "complete"});
    const view = await current(h);
    assert.deepEqual(view.availability, {kind: "ready"});
    assert.equal((await h.store.resolve(manager, command(view))).outcome,
      "applied");
    await h.put(h.attendeePath, {...(await h.read(h.attendeePath)),
      status: "registered", checkedInAt: null});
    assert.deepEqual((await current(h)).availability,
      {kind: "unavailable", reason: "notCheckedIn"});
  });

test("reported intentions do not invalidate a reviewed physical sweep action",
  async () => {
    const h = await harness();
    const input = command(await current(h));
    const path = guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId);
    const row = (await h.read(path))!;
    await h.put(path, {...row, intention: {kind: "notComing"},
      revision: Number(row.revision) + 1});
    assert.equal((await h.store.resolve(manager, input)).outcome, "applied");
    assert.deepEqual((await h.read(path))!.intention, {kind: "notComing"});
  });

test("foreign command contexts and rehearsal effects cannot reach live records",
  async () => {
    const h = await harness();
    const input = command(await current(h));
    for (const wrong of [
      {...input, command: {...input.command, eventId: "other"}},
      {...input, command: {...input.command, kind: "recordCheckpoint"}},
      {...input, expectedSourceHash: "unknown"},
      {...input, command: {...input.command, context: {mode: "rehearsal",
        rehearsalId: "r", virtualEventId: "v", clockId: "clock"}}}]) {
      await assert.rejects(h.store.resolve(manager, wrong),
        {code: "invalid-argument"});
    }
    assert.equal((await current(h)).revision, 0);
  });

test("accountability handlers authenticate and rate-limit before store access",
  async () => {
    for (const handler of [getEventAssistanceAccountabilityHandler,
      resolveEventAssistanceAccountabilityHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls.push("limit");
        },
        store: () => ({
          get: async () => {
            calls.push("get"); return {} as Response;
          },
          resolve: async () => {
            calls.push("resolve"); return {} as Response;
          },
        })};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await handler({data: {}, auth: {uid: "actor"}} as CallableRequest, deps);
      assert.equal(calls[0], "limit");
      assert.equal(calls.length, 2);
    }
  });

test("Firestore applies one sweep result under competing command retries", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await harness(getEmulatorFirestore(app));
    await h.grant("sweep", "easy", "sweep");
    await h.place("easy");
    const input = command(await current(h, "sweep", "easy"));
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.resolve("sweep", input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    assert.equal((await h.read(h.attendeePath))!.accountabilityRevision, 1);
    assert.equal((await h.read(h.attendeePath))!.attendanceRevision, 7);
    await h.put(h.attendeePath, {...(await h.read(h.attendeePath)),
      checkedInAt: Timestamp.fromMillis(start + 1), attendanceRevision: 8});
    await assert.rejects(h.store.resolve("sweep", input), {code: "aborted"});
  } finally {
    await deleteApp(app);
  }
});
