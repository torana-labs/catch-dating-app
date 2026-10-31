import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {guestCollections, guestIdentity} from "./guestRecords";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {suggestedTemplate, Setting, Template} from "./policySettings";
import {EventMembershipStore} from "./membershipStore";
import {Decision} from "./membershipTransitions";
import {EventGroupProgressStore} from "./groupProgressStore";
import {EventParticipationStore} from "./participationStore";
import {GROUP_PROGRESS} from "./groupProgressReader";
import {progressIdentity} from "./groupProgressSource";
import {readLateJoinSource, completeLateJoinInput, LateJoinSourceResult,
  LateJoinCommunicationFacts} from "./lateJoinSourceReader";
import {evaluateLateJoin} from "./lateJoin";

const manager = progressFixtureManager;
const start = 1_000_000;
async function harness(real?: Firestore) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const, eventId: "e-" + id,
    organizerId: "o-" + id};
  const scope = {context, attendeeId: "a-" + id};
  const seed = await seedJoiningProgress(db, context, start, 3_000_000);
  const clock = {now: start};
  const put = async (path: string, value: object) => {
    if (real) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const attendee = {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  eventId: context.eventId, organizerId: context.organizerId,
  status: "registered", linkedUid: "guest",
  checkedInAt: null, checkedInBy: null, attendanceRevision: 7,
  createdAt: Timestamp.fromMillis(start - 1000),
  updatedAt: Timestamp.fromMillis(start - 1000)};
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  await put(attendeePath, attendee);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const settings = new EventAssistanceSettingsStore(db, () => clock.now);
  const membership = new EventMembershipStore(db, () => clock.now);
  const progress = new EventGroupProgressStore(db, () => clock.now);
  const participation = new EventParticipationStore(db, () => clock.now);
  const read = () => db.runTransaction((tx) =>
    readLateJoinSource(db, tx, scope, clock.now));
  const configure = async (preference: Setting["preference"] = {
    kind: "configured", template: suggestedTemplate("lateJoin")!},
  groupId = "event:whole") => {
    const target = {context, groupId, workflowKind: "lateJoin"};
    const view = (await settings.get(manager, target)).view;
    return settings.set(manager, {...target, preference,
      requestId: randomUUID(), expectedRevision: view.ownRevision,
      expectedSourceHash: view.sourceHash});
  };
  const begin = () => guests.startEpisode(context, scope.attendeeId,
    "start", null);
  const transfer = async (decision: Decision) => {
    const view = (await membership.get(manager, scope)).view;
    return membership.transfer(manager, {expectedSourceHash: view.sourceHash,
      command: {kind: "transferGroup", context, eventId: context.eventId,
        operationId: randomUUID(), payload: {attendeeId: scope.attendeeId,
          episodeId: view.episodeId, expectedMembershipRevision: view.revision,
          expectedParticipationRevision: view.participationRevision,
          decision}}});
  };
  const confirm = async (groupId: string) => {
    const view = (await progress.get(manager, {context, groupId})).view;
    const destination = view.destinations[0].target;
    return progress.confirmDeparture(manager, {
      expectedSourceHash: view.sourceHash, command: {kind: "confirmDeparture",
        context, eventId: context.eventId, operationId: randomUUID(),
        payload: {groupId, destination,
          expectedProgressRevision: view.revision}}});
  };
  return {db, fake, scope, seed, clock, put, attendee, eventPath, attendeePath,
    guests, settings, membership, participation, read, configure, begin,
    transfer, confirm};
}
function ready(value: LateJoinSourceResult) {
  assert.equal(value.kind, "ready", JSON.stringify(value));
  assert.ok(value.kind === "ready");
  return value;
}
function communication(source: ReturnType<typeof ready>):
  LateJoinCommunicationFacts {
  return {scope: {context: source.facts.context,
    attendeeId: source.facts.guest.attendeeId},
  episodeId: source.facts.guest.episodeId, observedAt: source.facts.now,
  deliveryEligibility: "unknown", lastMessage: null,
  messagesThisEpisode: 0, responseDeadline: null};
}
async function paceGroups(h: Awaited<ReturnType<typeof harness>>) {
  const event = {...h.seed.event, eventFormat: {version: 1,
    activityKind: "socialRun", interactionModel: "pacePods", activityDetails: {
      routePlan: {version: 2, movementMode: "run", routeShape: "loop",
        groupStrategy: "paceGroups", stopCadence: "hostedStops",
        stopKinds: ["regroup"], roleKinds: ["pacer", "sweep"],
        path: [{latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast"].map((id, sortOrder) =>
          ({id, label: id, sortOrder}))}}}};
  await h.put(h.eventPath, event);
  return event;
}

// The reader is a trusted internal boundary, not an authenticated callable.
test("domain source is read-only and missing episodes never initialize guests",
  async () => {
    const h = await harness();
    await h.configure();
    const before = h.fake.entries();
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "episodeMissing", observedAt: start});
    assert.deepEqual(h.fake.entries(), before);
    const guest = await h.begin();
    const initialized = h.fake.entries();
    const source = ready(await h.read());
    assert.equal(source.groupId, "event:whole");
    assert.equal(source.facts.guest.episodeId, guest.episodeId);
    assert.equal(source.facts.setting.kind, "enabled");
    assert.ok(source.facts.setting.kind === "enabled");
    assert.equal(source.facts.setting.authority, "prepare");
    assert.equal(source.facts.departureConfirmed, true);
    assert.deepEqual(source.facts.guest.attendance, {kind: "known",
      value: {checkedIn: false}, revision: 7, observedAt: start,
      source: "system"});
    assert.equal("deliveryEligibility" in source.facts.guest, false);
    assert.equal("messagesThisEpisode" in source.facts, false);
    assert.equal("lastMessage" in source.facts, false);
    assert.deepEqual(h.fake.entries(), initialized);
  });

test("worker and UI share inherited, disabled and changed-source settings",
  async () => {
    const h = await harness();
    await h.begin();
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "unconfigured", observedAt: start});
    await h.configure({kind: "disabled"});
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "disabled", observedAt: start});
    await h.configure();
    ready(await h.read());
    await h.put(h.eventPath, {...h.seed.event, checkedInCount: 1});
    ready(await h.read());
    await h.put(h.eventPath, {...h.seed.event,
      endTime: Timestamp.fromMillis(4_000_000)});
    const ui = (await h.settings.get(manager, {context: h.scope.context,
      groupId: "event:whole", workflowKind: "lateJoin"})).view;
    assert.equal(ui.status, "sourceChanged");
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "settingSourceChanged", observedAt: start});
    await h.configure();
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "progressSourceChanged", observedAt: start});
    await h.confirm("event:whole");
    ready(await h.read());
  });

test("a scheduled itinerary never invents departure or live state",
  async () => {
    const h = await harness();
    await h.begin();
    await h.configure();
    h.fake.remove(GROUP_PROGRESS + "/" +
      progressIdentity(h.scope.context, "event:whole"));
    h.clock.now = start + 1_000_000;
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "progressUnconfirmed", observedAt: h.clock.now});
    await h.confirm("event:whole");
    ready(await h.read());
    const planPath = "eventSuccessPlans/" + h.scope.context.eventId;
    await h.put(planPath, {...h.seed.plan, status: "setup"});
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "runtimeNotLive", observedAt: h.clock.now});
    await h.put(planPath, {...h.seed.plan, status: "complete"});
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "eventClosed", observedAt: h.clock.now});
    await h.put(planPath, h.seed.plan);
    h.clock.now = 3_000_000;
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "eventClosed", observedAt: h.clock.now});
  });

test("accepted groups guide guests during a pending handover",
  async () => {
    const h = await harness();
    await paceGroups(h);
    await h.begin();
    await h.configure();
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "membershipMissing", observedAt: start});
    await h.transfer({kind: "place", groupId: "easy"});
    await h.confirm("easy");
    await h.confirm("fast");
    const initial = ready(await h.read());
    assert.equal(initial.groupId, "easy");
    await h.configure({kind: "disabled"}, "fast");
    const pending = await h.transfer({kind: "propose", from: "easy", to: "fast",
      receivingOperatorId: manager, expiresAtMillis: start + 10_000});
    const oldGroup = ready(await h.read());
    assert.equal(oldGroup.groupId, "easy");
    assert.notEqual(initial.sourceHash, oldGroup.sourceHash);
    await h.transfer({kind: "accept",
      transferId: pending.view.transfer!.transferId});
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "disabled", observedAt: start});
    await h.configure({kind: "inherit"}, "fast");
    const current = ready(await h.read());
    assert.equal(current.groupId, "fast");
    assert.ok(current.facts.guidance.kind === "known");
    assert.ok(current.facts.guidance.value.destination.kind ===
      "groupCheckpoint");
    assert.equal(current.facts.guidance.value.destination.groupId, "fast");
  });

test("re-entry or replacement source cannot inherit earlier group membership",
  async () => {
    const h = await harness();
    await paceGroups(h);
    await h.begin();
    await h.configure();
    await h.transfer({kind: "place", groupId: "easy"});
    await h.confirm("easy");
    ready(await h.read());
    for (const state of ["temporaryBreak", "active"] as const) {
      const view = (await h.participation.get(manager, h.scope)).view;
      await h.participation.set(manager, {expectedSourceHash: view.sourceHash,
        command: {kind: "setParticipation", context: h.scope.context,
          eventId: h.scope.context.eventId, operationId: randomUUID(),
          payload: {attendeeId: h.scope.attendeeId, episodeId: view.episodeId,
            expectedParticipationRevision: view.revision, state,
            resumeAtUnit: null}}});
    }
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "membershipSourceChanged", observedAt: start});
    h.fake.generation = Timestamp.fromMillis(2);
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "guestSourceChanged", observedAt: start});
  });

test("reported arrival and participation do not overwrite observed attendance",
  async () => {
    const h = await harness();
    const guest = await h.begin();
    await h.configure();
    const guestPath = guestCollections.guests + "/" + guest.guestId;
    await h.put(guestPath, {...guest,
      intention: {kind: "onMyWay", claimedEta: start + 10_000}});
    const source = ready(await h.read());
    assert.ok(source.facts.guest.attendance.kind === "known");
    assert.equal(source.facts.guest.attendance.value.checkedIn, false);
    assert.equal(source.facts.guest.intention.kind, "onMyWay");
    await h.put(guestPath, {...guest,
      participation: {state: "departed", resumeAtUnit: null}});
    const departed = ready(await h.read());
    assert.deepEqual(evaluateLateJoin(completeLateJoinInput(departed,
      communication(departed))), {kind: "cancelled",
      reason: "participationInactive"});
    await h.put(guestPath, guest);
    await h.put(h.attendeePath, {...h.attendee, status: "checkedIn",
      checkedInAt: Timestamp.fromMillis(start), checkedInBy: manager,
      attendanceRevision: 8});
    const joined = ready(await h.read());
    assert.deepEqual(evaluateLateJoin(completeLateJoinInput(joined,
      communication(joined))), {kind: "resolved", reason: "joined"});
  });

test("composition requires scoped history, eligibility and a matching snapshot",
  async () => {
    const h = await harness();
    await h.begin();
    const template = suggestedTemplate("lateJoin")!;
    assert.ok(template.kind === "lateJoin");
    template.setting = {kind: "enabled", authority: "executeWithinPolicy"};
    await h.configure({kind: "configured", template});
    const source = ready(await h.read());
    const evidence = communication(source);
    assert.deepEqual(evaluateLateJoin(completeLateJoinInput(source, evidence)),
      {kind: "hostDecision", reason: "unreachable",
        guidance: source.facts.guidance.kind === "known" ?
          source.facts.guidance.value : null});
    const eligible = {...evidence, deliveryEligibility: "eligible" as const};
    const evaluation = evaluateLateJoin(
      completeLateJoinInput(source, eligible));
    assert.ok(evaluation.kind === "update" && evaluation.shouldSend);
    const capped = evaluateLateJoin(completeLateJoinInput(source,
      {...eligible, messagesThisEpisode: 3}));
    assert.ok(capped.kind === "update" && !capped.shouldSend);
    for (const patch of [
      {episodeId: "other"}, {observedAt: start - 1},
      {scope: {...evidence.scope, attendeeId: "other"}},
      {scope: {context: {...h.scope.context, organizerId: "other"},
        attendeeId: h.scope.attendeeId}},
    ]) {
      assert.throws(() =>
        completeLateJoinInput(source, {...eligible, ...patch}),
      /outside this snapshot/);
    }
    for (const field of ["messagesThisEpisode", "lastMessage",
      "deliveryEligibility"] as const) {
      const missing = {...eligible};
      delete (missing as Partial<LateJoinCommunicationFacts>)[field];
      assert.throws(() => completeLateJoinInput(source, missing));
    }
    assert.throws(() => completeLateJoinInput(source, {...eligible,
      lastMessage: {materialKey: "old", at: start + 1}}));
    const deadlineTemplate: Template = {...template,
      config: {...template.config,
        unanswered: "hostReviewAtDeadline"}};
    await h.configure({kind: "configured", template: deadlineTemplate});
    const deadlineSource = ready(await h.read());
    assert.throws(() => completeLateJoinInput(deadlineSource, eligible));
    const deadline = completeLateJoinInput(deadlineSource,
      {...eligible, responseDeadline: start});
    assert.equal(evaluateLateJoin(deadline).kind, "hostDecision");
  });

test("malformed or foreign source and transport errors are never safe defaults",
  async () => {
    const h = await harness();
    const guest = await h.begin();
    await h.configure();
    await h.put(h.attendeePath, {...h.attendee, eventId: "another"});
    await assert.rejects(h.read(), {code: "failed-precondition"});
    await h.put(h.attendeePath, {...h.attendee,
      updatedAt: Timestamp.fromMillis(start + 1)});
    await assert.rejects(h.read(), {code: "failed-precondition"});
    await h.put(h.attendeePath, h.attendee);
    const guestPath = guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId);
    await h.put(guestPath, {...guest, updatedAt: start + 1});
    await assert.rejects(h.read(), {code: "failed-precondition"});
    await h.put(guestPath, guest);
    h.fake.beforeRead = () => {
      throw new Error("transport unavailable");
    };
    await assert.rejects(h.read(), /transport unavailable/);
  });

test("Firestore source joins fence an identically recreated roster", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    await h.begin();
    await h.configure();
    const source = ready(await h.read());
    assert.equal(source.facts.guest.admission, "admitted");
    await db.doc(h.attendeePath).delete();
    await h.put(h.attendeePath, h.attendee);
    assert.deepEqual(await h.read(), {kind: "notReady",
      reason: "guestSourceChanged", observedAt: start});
    const after = await db.collection("eventAssistanceMessages")
      .where("intent.eventId", "==", h.scope.context.eventId).limit(1).get();
    assert.equal(after.empty, true);
  } finally {
    await deleteApp(app);
  }
});
