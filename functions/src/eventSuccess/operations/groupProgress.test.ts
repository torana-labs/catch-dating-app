import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import type {EventAssistanceGroupProgressCallableResponse as Response} from
  "../../shared/generated/eventAssistanceGroupProgressCallableResponse";
import {EventGroupProgressStore, GROUP_PROGRESS} from "./groupProgressStore";
import {progressIdentity} from "./groupProgressSource";
import {evaluateLateJoin} from "./lateJoin";
import {
  changeEventAssistanceRouteHandler,
  confirmEventAssistanceDepartureHandler,
  getEventAssistanceGroupProgressHandler,
} from "./groupProgressHandlers";

const now = Date.parse("2026-09-07T12:00:00Z");
const stamp = (at: number) => ({_seconds: Math.floor(at / 1000),
  _nanoseconds: at % 1000 * 1_000_000});
const fixture = (name: string) => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/" + name + ".json", "utf8"));
async function harness(realDb?: Firestore, id = "fixture") {
  const fake = new ProgressFirestore();
  fake.generation = Timestamp.fromMillis(now - 86_400_000);
  const db = realDb ?? fake as unknown as Firestore;
  const context = {mode: "live" as const, organizerId: "o-" + id,
    eventId: "e-" + id};
  const scope = {context, groupId: "event:whole"};
  const clock = {now};
  const write = async (path: string, value: object) => {
    if (realDb) await realDb.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const event = {...fixture("event_doc"), organizerId: context.organizerId,
    name: "Night walk",
    startTime: stamp(now - 60_000), endTime: stamp(now + 3_600_000),
    eventFormat: {version: 1, activityKind: "barCrawl",
      interactionModel: "freeFormMixer"},
    itinerary: ["one", "two"].map((id, index) => ({id, kind: "stop",
      offsetMinutes: index * 30, title: "Stop " + id,
      location: {name: "Venue " + id, latitude: 22.7 + index / 100,
        longitude: 75.8, notes: "Meet at the entrance."}}))};
  const organizerSchema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  const organizer = {...Object.fromEntries(Object.entries(fixture(
    "organizer_doc"))
    .filter(([key]) => key in organizerSchema.properties)), followerCount: 12,
  organizerPhotos: [], organizerType: "community"};
  const plan = {...fixture("event_success_plan_doc"),
    eventId: context.eventId, organizerId: context.organizerId, status: "live"};
  assert.ok(validateEventDocument(event),
    JSON.stringify(validateEventDocument.errors));
  assert.ok(validateOrganizerDocument(organizer),
    JSON.stringify(validateOrganizerDocument.errors));
  assert.ok(validateEventSuccessPlanDocument(plan));
  await write("events/" + context.eventId, event);
  await write("organizers/" + context.organizerId, organizer);
  await write("eventSuccessPlans/" + context.eventId, plan);
  const store = new EventGroupProgressStore(db, () => clock.now);
  return {db, fake, clock, context, scope, event, organizer, plan,
    store, write};
}
function command(view: Response["view"], operationId = "depart-one",
  target = view.destinations.find((d) => d.target.kind !== "fixedPlace")!) {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "confirmDeparture" as const, context: view.context,
    eventId: view.context.eventId, operationId, payload: {
      groupId: view.groupId, destination: target.target,
      expectedProgressRevision: view.revision,
    },
  }};
}
function routeCommand(view: Response["view"],
  target = view.destinations.find((d) =>
    !view.progress || JSON.stringify(d.target) !==
      JSON.stringify(view.progress.destination))!,
  operationId = "route-change-one") {
  return {command: {kind: "changeRoute" as const, context: view.context,
    eventId: view.context.eventId, operationId, payload: {
      routeRevision: view.revision, groupId: view.groupId,
      expectedSourceHash: view.sourceHash,
      alternativeId: target.alternativeId,
      decisionId: "decision:" + operationId,
    }}};
}

const manager = "host-1";
test("saved schedule cannot confirm departure; one command records the fact",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const initial = await h.store.get(manager, h.scope);
    assert.equal(initial.actorUid, manager);
    assert.deepEqual(initial.departureAuthority, {
      kind: "canConfirm", validUntil: Number.MAX_SAFE_INTEGER,
      checkpointReporter: "anyAuthorizedOperator",
    });
    assert.equal(initial.view.revision, 0);
    assert.equal(initial.view.freshness, "unconfirmed");
    assert.equal(initial.view.guidance, null);
    assert.deepEqual(h.fake.entries(), before);
    const input = command(initial.view);
    const applied = await h.store.confirmDeparture(manager, input);
    assert.equal(applied.outcome, "applied");
    assert.equal(applied.view.revision, 1);
    assert.equal(applied.view.progress?.confirmedBy, manager);
    assert.equal(applied.view.progress?.confirmedAt, now);
    assert.match(applied.view.guidance!.text, /Venue one/);
    const replay = await h.store.confirmDeparture(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.deepEqual(replay.view, applied.view);
    assert.equal(h.fake.entries().length, before.length + 2);
    assert.ok(h.fake.read(GROUP_PROGRESS + "/" +
      progressIdentity(h.context, "event:whole")));
    assert.deepEqual(h.fake.read("events/" + h.context.eventId), h.event);
    assert.deepEqual(h.fake.read("eventSuccessPlans/" + h.context.eventId),
      h.plan);
  });

test("saved departure feeds the existing late-join policy without sending",
  async () => {
    const h = await harness();
    const initial = (await h.store.get(manager, h.scope)).view;
    const result = await h.store.confirmDeparture(manager, command(initial));
    const guidance = result.view.guidance!;
    assert.equal(guidance.destination.kind, "itineraryStop");
    const input: Parameters<typeof evaluateLateJoin>[0] = {
      context: h.context, eventId: h.context.eventId,
      now, eventOpen: result.view.eventOpen, departureConfirmed: true,
      setting: {kind: "enabled", authority: "prepare", policyVersion: "v1"},
      policy: {destination: {kind: "itineraryStop",
        itineraryId: h.context.eventId + ":itinerary",
        permittedStopIds: ["one", "two"]}, cutoff: {kind: "eventEnd"},
      maxMessagesPerEpisode: 3, minimumMinutesBetweenMessages: 10,
      updateOn: "materialGuidanceChange", unanswered: "keepUnknownUntilCutoff"},
      guest: {attendeeId: "late-guest", episodeId: "visit",
        admission: "admitted", attendance: {kind: "known",
          value: {checkedIn: false}, revision: 1,
          observedAt: now, source: "host"},
        intention: {kind: "unknown"}, participation: "active",
        deliveryEligibility: "eligible"},
      guidance: {kind: "known", value: guidance, revision: result.view.revision,
        observedAt: result.view.progress!.confirmedAt, source: "host"},
      lastMessage: null, messagesThisEpisode: 0};
    const decision = evaluateLateJoin(input);
    assert.equal(decision.kind, "update");
    if (decision.kind !== "update") throw new Error("Expected update");
    assert.equal(decision.shouldSend, false);
  });

test("changed setup invalidates guidance and fences stale confirmation",
  async () => {
    for (const change of ["location", "generation", "schedule"]) {
      const h = await harness();
      const initial = (await h.store.get(manager, h.scope)).view;
      const input = command(initial);
      await h.store.confirmDeparture(manager, input);
      if (change === "location") {
        h.event.itinerary![0].location!.name = "Replacement venue";
        await h.write("events/" + h.context.eventId, h.event);
      } else if (change === "generation") {
        h.fake.generation = Timestamp.fromMillis(now - 10_000);
      } else {
        h.event.endTime = stamp(now + 600_000);
        await h.write("events/" + h.context.eventId, h.event);
      }
      const changed = (await h.store.get(manager, h.scope)).view;
      assert.equal(changed.freshness, "sourceChanged");
      assert.equal(changed.guidance, null);
      await assert.rejects(h.store.confirmDeparture(manager,
        {...input, command: {...input.command, operationId: "stale"}}),
      {code: "aborted"});
      const confirmed = await h.store.confirmDeparture(manager,
        command(changed, "confirmed-change"));
      assert.equal(confirmed.view.revision, 2);
      assert.equal(confirmed.view.freshness, "current");
      assert.ok(confirmed.view.guidance);
    }
  });

test("manager route recovery selects a current alternative", async () => {
  const h = await harness();
  const initial = (await h.store.get(manager, h.scope)).view;
  await assert.rejects(h.store.changeRoute(manager, routeCommand(initial)),
    {code: "failed-precondition"});
  const departed = (await h.store.confirmDeparture(manager,
    command(initial))).view;
  const alternative = departed.destinations.find((destination) =>
    JSON.stringify(destination.target) !==
      JSON.stringify(departed.progress!.destination))!;
  const input = routeCommand(departed, alternative);
  const applied = await h.store.changeRoute(manager, input);
  assert.equal(applied.outcome, "applied");
  assert.equal(applied.view.revision, 2);
  assert.deepEqual(applied.view.progress?.destination, alternative.target);
  assert.equal(applied.view.progress?.routeDecisionId,
    input.command.payload.decisionId);
  assert.equal(applied.view.progress?.departureRosterId, undefined);
  assert.deepEqual(h.fake.read("events/" + h.context.eventId), h.event);
  const replayed = await h.store.changeRoute(manager, input);
  assert.equal(replayed.outcome, "replayed");
  assert.equal(replayed.operationRevision, 2);
  await assert.rejects(h.store.changeRoute(manager,
    routeCommand(applied.view, alternative, "same-alternative")),
  {code: "failed-precondition"});
  await assert.rejects(h.store.changeRoute("guest", input),
    {code: "permission-denied"});
});

test("route recovery fences changed source, revision and opaque choices",
  async () => {
    const h = await harness();
    const departed = (await h.store.confirmDeparture(manager,
      command((await h.store.get(manager, h.scope)).view))).view;
    const input = routeCommand(departed);
    for (const changed of [
      {...input, command: {...input.command, payload: {
        ...input.command.payload, routeRevision: departed.revision + 1}}},
      {...input, command: {...input.command, payload: {
        ...input.command.payload, expectedSourceHash: "0".repeat(64)}}},
      {...input, command: {...input.command, payload: {
        ...input.command.payload,
        alternativeId: "alternative:" + "0".repeat(64)}}},
    ]) await assert.rejects(h.store.changeRoute(manager, changed));
    h.event.itinerary![1].title = "Replacement stop";
    await h.write("events/" + h.context.eventId, h.event);
    await assert.rejects(h.store.changeRoute(manager, input),
      {code: "aborted"});
  });

test("operation replay and revision fences prevent changed or older effects",
  async () => {
    const h = await harness();
    const initial = (await h.store.get(manager, h.scope)).view;
    const input = command(initial);
    const first = await h.store.confirmDeparture(manager, input);
    await assert.rejects(h.store.confirmDeparture(manager,
      command(first.view, input.command.operationId)), {code: "aborted"});
    const second = await h.store.confirmDeparture(manager,
      command(first.view, "depart-two", first.view.destinations[2]));
    assert.equal(second.view.revision, 2);
    const replay = await h.store.confirmDeparture(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.revision, 2);
    await assert.rejects(h.store.confirmDeparture(manager,
      command(second.view, input.command.operationId)), {code: "aborted"});
    assert.equal((await h.store.get(manager, h.scope)).view.revision, 2);
  });

test("manager, context, current destination and live phase are required",
  async () => {
    const h = await harness();
    const input = command((await h.store.get(manager, h.scope)).view);
    await assert.rejects(h.store.get("guest", h.scope),
      {code: "permission-denied"});
    await assert.rejects(h.store.confirmDeparture("guest", input),
      {code: "permission-denied"});
    for (const body of [
      {...input, roles: ["eventLead"]},
      {...input, command: {...input.command, eventId: "another-event"}},
      {...input, command: {...input.command, context: {mode: "rehearsal",
        rehearsalId: "practice", virtualEventId: "virtual", clockId: "clock"}}},
      {...input, command: {...input.command, payload: {...input.command.payload,
        destination: {kind: "itineraryStop",
          itineraryId: "other", stopId: "one"}}}},
    ]) await assert.rejects(h.store.confirmDeparture(manager, body));
    for (const status of ["setup", "complete"]) {
      await h.write("eventSuccessPlans/" + h.context.eventId,
        {...h.plan, status});
      const read = await h.store.get(manager, h.scope);
      assert.equal(read.departureAuthority.kind, "canConfirm",
        "role permission does not manufacture runtime readiness");
      assert.equal(read.view.runtimeLive, false);
      await assert.rejects(h.store.confirmDeparture(manager, input),
        {code: "failed-precondition"});
    }
    await h.write("eventSuccessPlans/" + h.context.eventId, h.plan);
    h.clock.now += 3_600_000;
    await assert.rejects(h.store.confirmDeparture(manager, input),
      {code: "failed-precondition"});
    h.clock.now = now;
    await h.write("organizers/" + h.context.organizerId,
      {...h.organizer, hostUserId: "new", ownerUserId: "new", hostUserIds: [],
        hostProfiles: []});
    await assert.rejects(h.store.confirmDeparture(manager, input),
      {code: "permission-denied"});
    assert.equal(h.fake.entries().length, 3);
  });

test("pace groups have separate progress and must use their own route targets",
  async () => {
    const h = await harness();
    h.event.eventFormat = {version: 1, activityKind: "socialRun",
      interactionModel: "pacePods", activityDetails: {routePlan: {
        version: 2, movementMode: "run", routeShape: "loop",
        groupStrategy: "paceGroups", stopCadence: "hostedStops",
        stopKinds: ["regroup"], roleKinds: ["pacer", "sweep"],
        path: [{latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast", "wholeEvent"].map((id, sortOrder) =>
          ({id, label: id, sortOrder})),
      }}};
    await h.write("events/" + h.context.eventId, h.event);
    const easy = (await h.store.get(manager,
      {...h.scope, groupId: "easy"})).view;
    const fast = (await h.store.get(manager,
      {...h.scope, groupId: "fast"})).view;
    const named = (await h.store.get(manager,
      {...h.scope, groupId: "wholeEvent"})).view;
    assert.ok(named.destinations.every((d) =>
      d.target.kind === "groupCheckpoint"));
    assert.ok(easy.destinations.every((d) =>
      d.target.kind === "groupCheckpoint" && d.target.groupId === "easy"));
    const input = command(easy);
    await h.store.confirmDeparture(manager, input);
    assert.equal((await h.store.get(manager,
      {...h.scope, groupId: "fast"})).view.revision, 0);
    await assert.rejects(h.store.confirmDeparture(manager,
      command(fast, "wrong-group", easy.destinations[0])),
    {code: "failed-precondition"});
    await assert.rejects(h.store.get(manager,
      {...h.scope, groupId: "unknown"}), {code: "failed-precondition"});
  });

test("rollback leaves no progress and retry can commit once", async () => {
  const h = await harness();
  const input = command((await h.store.get(manager, h.scope)).view);
  h.fake.failNextCommit = true;
  await assert.rejects(h.store.confirmDeparture(manager, input),
    /interruption/);
  assert.equal((await h.store.get(manager, h.scope)).view.revision, 0);
  const result = await h.store.confirmDeparture(manager, input);
  assert.equal(result.view.revision, 1);
});

test("receipt reads cannot extend the event window or reverse the clock",
  async () => {
    for (const later of [now + 3_600_000, now - 1]) {
      const h = await harness();
      const input = command((await h.store.get(manager, h.scope)).view);
      h.fake.beforeRead = (path) => {
        if (path.startsWith("eventAssistanceProgressReceipts/")) {
          h.clock.now = later;
        }
      };
      await assert.rejects(h.store.confirmDeparture(manager, input),
        {code: "failed-precondition"});
      assert.equal(h.fake.entries().length, 3);
    }
  });

test("callable handlers authenticate and rate-limit before store access",
  async () => {
    for (const handler of [getEventAssistanceGroupProgressHandler,
      confirmEventAssistanceDepartureHandler,
      changeEventAssistanceRouteHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls.push("limit");
        },
        store: () => ({get: async () => {
          calls.push("read"); return {} as Response;
        }, confirmDeparture: async () => {
          calls.push("confirm"); return {} as Response;
        }, changeRoute: async () => {
          calls.push("route"); return {} as Response;
        }})};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await handler({data: {}, auth: {uid: manager}} as CallableRequest, deps);
      assert.equal(calls[0], "limit");
      assert.equal(calls.length, 2);
    }
  });

test("Firestore contenders record one departure; replacement source is stale", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, "progress-" + id);
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db, id);
    const input = command((await h.store.get(manager, h.scope)).view);
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.confirmDeparture(manager, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    assert.ok(results.every((r) => r.view.revision === 1));
    const routeInput = routeCommand(results[0].view,
      results[0].view.destinations[2]);
    const routeResults = await Promise.all(Array.from({length: 8}, () =>
      h.store.changeRoute(manager, routeInput)));
    assert.equal(routeResults.filter((r) => r.outcome === "applied").length,
      1);
    assert.equal(routeResults.filter((r) => r.outcome === "replayed").length,
      7);
    assert.ok(routeResults.every((r) => r.view.revision === 2));
    await db.doc("events/" + h.context.eventId).delete();
    await h.write("events/" + h.context.eventId, h.event);
    const replaced = (await h.store.get(manager, h.scope)).view;
    assert.equal(replaced.freshness, "sourceChanged");
    assert.equal(replaced.guidance, null);
  } finally {
    await deleteApp(app);
  }
});
