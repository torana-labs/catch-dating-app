import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/eventDocument";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {
  ASSISTANCE_POLICY_VERSION, bindPolicyTemplate, SettingScope, SETTINGS,
  settingId, suggestedTemplate, Template,
} from "./policySettings";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {setEventAssistanceSettingHandler} from "./policySettingsHandlers";
import type {EventAssistanceSettingCallableResponse as Response} from
  "../../shared/generated/eventAssistanceSettingCallableResponse";

const now = Date.UTC(2026, 8, 15, 14, 30);
const manager = progressFixtureManager;
async function harness(realDb?: Firestore, fixtureId?: string) {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const id = fixtureId ?? randomUUID();
  const context = {mode: "live" as const, organizerId: "o-" + id,
    eventId: "e-" + id};
  const progress = await seedJoiningProgress(db, context, now, now + 3_600_000);
  const scope: SettingScope = {context, groupId: "event:whole",
    workflowKind: "lateJoin"};
  const clock = {now};
  const store = new EventAssistanceSettingsStore(db, () => clock.now);
  const put = async (path: string, value: object) => {
    if (realDb) await realDb.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  return {fake, db, progress, scope, store, clock, put};
}
function configure(view: Response["view"], requestId = "save") {
  return {context: view.context, groupId: view.groupId,
    workflowKind: view.workflowKind, requestId,
    expectedRevision: view.ownRevision, expectedSourceHash: view.sourceHash,
    preference: {kind: "configured" as const,
      template: view.suggested!}};
}

test("suggestions are read-only; saving does not create messages or episodes",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const view = (await h.store.get(manager, h.scope)).view;
    assert.equal(view.status, "unconfigured");
    assert.equal(view.origin, "none");
    assert.equal(view.effective, null);
    assert.equal(view.suggested?.kind, "lateJoin");
    assert.deepEqual(view.setup, {eventEnd: now + 3_600_000,
      destinations: h.progress.view.destinations});
    assert.deepEqual(h.fake.entries(), before);
    const input = configure(view);
    const result = await h.store.set(manager, input);
    assert.equal(result.view.status, "configured");
    assert.equal(result.view.origin, "event");
    assert.equal(result.view.ownRevision, 1);
    assert.equal(h.fake.entries().length, before.length + 2);
    const replay = await h.store.set(manager, input);
    assert.equal(replay.outcome, "replayed");
    assert.deepEqual(replay.view, result.view);
  });

test("revisions, command identities and atomic rollback prevent lost choices",
  async () => {
    const h = await harness();
    const input = configure((await h.store.get(manager, h.scope)).view);
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.set(manager, input), /interruption/);
    assert.equal((await h.store.get(manager, h.scope)).view.ownRevision, 0);
    const first = await h.store.set(manager, input);
    const second = await h.store.set(manager, {...configure(first.view, "off"),
      preference: {kind: "disabled"}});
    assert.equal(second.view.status, "disabled");
    const replay = await h.store.set(manager, input);
    assert.equal(replay.operationRevision, 1);
    assert.equal(replay.view.ownRevision, 2);
    assert.equal(replay.view.status, "disabled");
    await assert.rejects(h.store.set(manager, {...input,
      preference: {kind: "disabled"}}), {code: "aborted"});
    await assert.rejects(h.store.set(manager, {...input, requestId: "stale"}),
      {code: "aborted"});
  });

test("group preferences inherit defaults, override and reset independently",
  async () => {
    const h = await harness();
    const event = h.progress.event;
    event.eventFormat = {version: 1, activityKind: "socialRun",
      interactionModel: "pacePods", activityDetails: {routePlan: {
        version: 2, movementMode: "run", routeShape: "loop",
        groupStrategy: "paceGroups", stopCadence: "hostedStops",
        stopKinds: ["regroup"], roleKinds: ["pacer", "sweep"],
        path: [{latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast"].map((id, sortOrder) =>
          ({id, label: id, sortOrder})),
      }}};
    await h.put("events/" + h.scope.context.eventId, event);
    await h.store.set(manager,
      configure((await h.store.get(manager, h.scope)).view));
    const group = {...h.scope, groupId: "easy"};
    const initial = (await h.store.get(manager, group)).view;
    assert.equal(initial.origin, "event");
    assert.equal(initial.ownRevision, 0);
    assert.deepEqual(initial.setup?.destinations.map((d) => d.target),
      ["one", "two"].map((checkpointId) => ({kind: "groupCheckpoint",
        groupId: "easy", routeId: h.scope.context.eventId + ":route",
        checkpointId})));
    const disabled = await h.store.set(manager, {...configure(initial),
      preference: {kind: "disabled"}});
    assert.equal(disabled.view.origin, "group");
    assert.equal(disabled.view.status, "disabled");
    assert.equal((await h.store.get(manager,
      {...h.scope, groupId: "fast"})).view.status, "configured");
    const reset = await h.store.set(manager, {
      ...configure(disabled.view, "inherit"), preference: {kind: "inherit"}});
    assert.equal(reset.view.origin, "event");
    assert.equal(reset.view.status, "configured");
    assert.equal(reset.view.ownRevision, 2);
  });

test("structural changes require review; attendance counters do not",
  async () => {
    const h = await harness();
    const initial = (await h.store.get(manager, h.scope)).view;
    await h.store.set(manager, configure(initial));
    await h.put("events/" + h.scope.context.eventId,
      {...h.progress.event, checkedInCount: 1});
    assert.equal((await h.store.get(manager, h.scope)).view.status,
      "configured");
    h.fake.generation = Timestamp.fromMillis(2);
    const stale = (await h.store.get(manager, h.scope)).view;
    assert.equal(stale.status, "sourceChanged");
    assert.equal(stale.effective, null);
    await assert.rejects(h.store.set(manager,
      {...configure(stale, "unreviewed"),
        expectedSourceHash: initial.sourceHash}),
    {code: "aborted"});
    assert.equal((await h.store.set(manager,
      configure(stale, "reviewed"))).view.status, "configured");
  });

test("manager authority and correlated template types are enforced at write",
  async () => {
    const h = await harness();
    const input = configure((await h.store.get(manager, h.scope)).view);
    await assert.rejects(h.store.get("guest", h.scope),
      {code: "permission-denied"});
    await assert.rejects(h.store.set("guest", input),
      {code: "permission-denied"});
    for (const value of [
      {...input, workflowKind: "not-a-workflow"},
      {...input, workflowKind: "guestCheckIn"},
      {...input, context: {mode: "rehearsal", rehearsalId: "rehearsal"}},
      {...input, preference: {kind: "configured", template: {
        ...input.preference.template,
        setting: {kind: "enabled", authority: "executeWithinPolicy",
          policyVersion: "client-invented"}}}},
    ]) {
      await assert.rejects(h.store.set(manager, value),
        {code: "invalid-argument"});
    }
    const organizerPath = "organizers/" + h.scope.context.organizerId;
    h.fake.write(organizerPath, {...h.fake.read(organizerPath),
      ownerUserId: "new", hostUserId: "new", hostUserIds: [],
      hostProfiles: []});
    await assert.rejects(h.store.set(manager, input),
      {code: "permission-denied"});
    assert.equal(h.fake.read(SETTINGS + "/" + settingId(h.scope)), undefined);
  });

test("templates bind to concrete subjects without inventing a destination",
  async () => {
    const h = await harness();
    const template = suggestedTemplate("lateJoin")!;
    const scope = {kind: "guest" as const, eventId: h.scope.context.eventId,
      attendeeId: "a1", episodeId: "ep1"};
    const targets = h.progress.view.destinations.map((d) => d.target);
    assert.equal(bindPolicyTemplate(template, scope, targets, null), null);
    const bound = bindPolicyTemplate(template, scope, targets,
      h.progress.guidance.destination);
    assert.ok(bound?.kind === "lateJoin");
    assert.deepEqual(bound.scope, scope);
    assert.equal(bound.setting.kind, "enabled");
    if (bound.setting.kind !== "enabled") throw new Error("Expected enabled");
    assert.equal(bound.setting.authority, "prepare");
    assert.equal(bound.setting.policyVersion, ASSISTANCE_POLICY_VERSION);
    assert.deepEqual(bound.config.destination, {kind: "itineraryStop",
      itineraryId: h.scope.context.eventId + ":itinerary",
      permittedStopIds: ["one", "two"]});
    assert.throws(() => bindPolicyTemplate(template,
      {kind: "event", eventId: scope.eventId}, targets,
      h.progress.guidance.destination), /runtime subject/);
    const other: Template = {kind: "admissionReview", version: 1,
      setting: {kind: "enabled", authority: "observe"}, config: {
        offerExpiryMinutes: 30, admission: "existingEntitlementPolicy",
        releaseCapacity: "confirmedOnly"}};
    const view = (await h.store.get(manager,
      {...h.scope, workflowKind: "admissionReview"})).view;
    const saved = await h.store.set(manager, {...configure(view),
      preference: {kind: "configured", template: other}});
    assert.equal(saved.view.effective?.kind, "admissionReview");
    assert.ok(bindPolicyTemplate(other, scope, [], null));
  });

test("settings callables authenticate and rate-limit before store access",
  async () => {
    for (const handler of [setEventAssistanceSettingHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls.push("limit");
        },
        store: () => ({set: async () => {
          calls.push("set"); return {} as Response;
        }})};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await handler({data: {}, auth: {uid: manager}} as CallableRequest, deps);
      assert.equal(calls[0], "limit");
      assert.equal(calls.length, 2);
    }
  });

test("Firestore saves one preference; recreated events require review", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const input = configure((await h.store.get(manager, h.scope)).view);
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.set(manager, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    await db.doc("events/" + h.scope.context.eventId).delete();
    await h.put("events/" + h.scope.context.eventId, h.progress.event);
    assert.equal((await h.store.get(manager, h.scope)).view.status,
      "sourceChanged");
  } finally {
    await deleteApp(app);
  }
});

test("explicit joining destinations must belong to the reviewed event setup",
  async () => {
    const h = await harness();
    const input = configure((await h.store.get(manager, h.scope)).view);
    const template = input.preference.template;
    assert.ok(template.kind === "lateJoin");
    for (const destination of [
      {kind: "itineraryStop", itineraryId: "other", permittedStopIds: ["one"]},
      {kind: "itineraryStop",
        itineraryId: h.scope.context.eventId + ":itinerary",
        permittedStopIds: ["not-configured"]},
      {kind: "groupCheckpoint", routeId: "other", groupId: "easy",
        permittedCheckpointIds: ["one"]},
    ]) {
      await assert.rejects(h.store.set(manager, {...input, preference: {
        kind: "configured", template: {...template, config: {
          ...template.config, destination}}}}), {code: "failed-precondition"});
    }
    assert.equal((await h.store.get(manager, h.scope)).view.ownRevision, 0);
  });


test("joining options and timing change with the reviewed event source",
  async () => {
    const h = await harness();
    const initial = (await h.store.get(manager, h.scope)).view;
    await h.put("events/" + h.scope.context.eventId, {...h.progress.event,
      endTime: Timestamp.fromMillis(now + 7_200_000),
      itinerary: (h.progress.event.itinerary as
      NonNullable<EventDocument["itinerary"]>)
        .map((stop, index) => index === 0 ?
          {...stop, title: "Updated first stop"} : stop)});
    const changed = (await h.store.get(manager, h.scope)).view;
    assert.notEqual(changed.sourceHash, initial.sourceHash);
    assert.equal(changed.setup?.eventEnd, now + 7_200_000);
    assert.equal(changed.setup?.destinations.find((d) =>
      d.target.kind === "itineraryStop" && d.target.stopId === "one")?.label,
    "Updated first stop");
    await assert.rejects(h.store.set(manager, configure(initial)),
      {code: "aborted"});
  });

test("native late joining setup fixture is an actual settings projection",
  async () => {
    const h = await harness(undefined, "00000000-0000-0000-0000-000000000457");
    const initial = await h.store.get(manager, h.scope);
    const input = configure(initial.view);
    const template = input.preference.template;
    assert.ok(template.kind === "lateJoin");
    const customInput = {...input, preference: {kind: "configured" as const,
      template: {...template, config: {...template.config,
        destination: {kind: "itineraryStop" as const,
          itineraryId: h.scope.context.eventId + ":itinerary",
          permittedStopIds: ["two"]},
        cutoff: {kind: "time" as const, at: now + 1_800_000}}}}};
    const custom = await h.store.set(manager, customInput);
    const disabled = await h.store.set(manager, {
      ...configure(custom.view, "off"),
      preference: {kind: "configured", template: {
        ...customInput.preference.template,
        setting: {kind: "disabled", reason: "hostChoice"}}}});
    const replayed = await h.store.set(manager, customInput);
    const samples = {initial, customInput, custom, disabled, replayed};
    const file = path.resolve(__dirname,
      "../../../../test/event_success/fixtures/late_join_settings.json");
    if (process.env.UPDATE_LATE_JOIN_SETTINGS_FIXTURE === "1") {
      writeFileSync(file, JSON.stringify(samples, null, 2) + "\n");
    }
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), samples);
  });
