import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAssistanceMembershipCallableResponse as Response} from
  "../../shared/generated/eventAssistanceMembershipCallableResponse";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";
import {EventMembershipStore} from "./membershipStore";
import {EventGroupProgressStore} from "./groupProgressStore";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {membershipIdentity, MEMBERSHIPS, MEMBERSHIP_RECEIPTS} from
  "./membershipReader";
import {Decision} from "./membershipTransitions";
import {EventGroupStaffStore} from "./groupStaffStore";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {EventParticipationStore} from "./participationStore";
import {guestIdentity, guestCollections} from "./guestRecords";
import {eventStaffGrantId} from "../../shared/eventOperatorAuthority";
import {getEventAssistanceMembershipHandler,
  transferEventAssistanceGroupHandler} from "./membershipHandlers";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";

const manager = progressFixtureManager;
const start = 1_000_000;
const easy = "easy-operator";
const fast = "fast-operator";
const sweep = "sweep-operator";
async function harness(real?: Firestore) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const,
    organizerId: "o-" + id, eventId: "e-" + id};
  const scope = {context, attendeeId: "a-" + id};
  const seed = await seedJoiningProgress(db, context, start, 3_000_000);
  const event = {...seed.event, eventFormat: {version: 1,
    activityKind: "socialRun", interactionModel: "pacePods", activityDetails: {
      routePlan: {version: 2, movementMode: "run", routeShape: "loop",
        groupStrategy: "paceGroups", stopCadence: "hostedStops",
        stopKinds: ["regroup"], roleKinds: ["pacer", "sweep"],
        path: [{latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast", "third"].map((id, sortOrder) =>
          ({id, label: id, sortOrder}))}}}};
  const attendee = {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  eventId: context.eventId, organizerId: context.organizerId,
  status: "registered", linkedUid: "guest",
  checkedInAt: null, checkedInBy: null, attendanceRevision: 7,
  createdAt: Timestamp.fromMillis(start - 1000),
  updatedAt: Timestamp.fromMillis(start - 1000)};
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
  const store = new EventMembershipStore(db, () => clock.now);
  const staff = new EventGroupStaffStore(db, () => clock.now);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const participation = new EventParticipationStore(db, () => clock.now);
  const view = (await store.get(manager, scope)).view;
  await guests.startEpisode(context, scope.attendeeId, "begin", null);
  async function grant(uid: string, groupId: string,
    duty: "pacer" | "sweep", until = start + 100_000) {
    const target = {uid, displayName: "Crew", phoneLastFour: "1234"};
    const view = (await staff.get(manager, target, {context, groupId})).view;
    await staff.set(manager, target, {context, groupId,
      phoneNumber: "+919999991234", expectedUid: uid,
      expectedRevision: view.revision, expectedSourceHash: view.sourceHash,
      requestId: randomUUID(), decision: {kind: "assign", duty,
        expiresAtMillis: until}});
  }
  await grant(easy, "easy", "pacer");
  await grant(fast, "fast", "pacer");
  await grant(sweep, "easy", "sweep");
  return {fake, db, scope, event, attendee, clock, put, read, store, staff,
    guests, participation, view, eventPath, attendeePath, grant};
}
function command(view: Response["view"], decision: Decision,
  operationId = randomUUID()) {
  return {expectedSourceHash: view.sourceHash, command: {kind: "transferGroup",
    context: view.context, eventId: view.context.eventId, operationId,
    payload: {attendeeId: view.attendeeId, episodeId: view.episodeId,
      expectedMembershipRevision: view.revision,
      expectedParticipationRevision: view.participationRevision, decision}}};
}
async function view(h: Awaited<ReturnType<typeof harness>>, uid = manager) {
  return (await h.store.get(uid, h.scope)).view;
}
async function place(h: Awaited<ReturnType<typeof harness>>) {
  return h.store.transfer(manager, command(await view(h),
    {kind: "place", groupId: "easy"}));
}
async function propose(h: Awaited<ReturnType<typeof harness>>, uid = easy) {
  return h.store.transfer(uid, command(await view(h, uid), {kind: "propose",
    from: "easy", to: "fast", receivingOperatorId: fast,
    expiresAtMillis: start + 10_000}));
}
async function participation(h: Awaited<ReturnType<typeof harness>>,
  state: "active" | "temporaryBreak" | "departed") {
  const old = (await h.participation.get(manager, h.scope)).view;
  return h.participation.set(manager, {expectedSourceHash: old.sourceHash,
    command: {kind: "setParticipation", context: h.scope.context,
      eventId: h.scope.context.eventId, operationId: randomUUID(), payload: {
        attendeeId: h.scope.attendeeId, episodeId: old.episodeId,
        expectedParticipationRevision: old.revision, state,
        resumeAtUnit: null}}});
}

test("handover choices expose only current receiving authority and safe names",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const initial = await view(h);
    const review = initial.handoverReview!;
    assert.equal(review.expiresAt, start + 1_800_000);
    assert.deepEqual(review.receivers.map((r) => r.operatorId).sort(),
      [manager, easy, fast].sort());
    const target = review.receivers.find((r) => r.operatorId === fast)!;
    assert.deepEqual(target, {operatorId: fast, displayName: "Crew",
      groups: [{groupId: "fast", validUntil: start + 100_000}]});
    assert.deepEqual(h.fake.entries(), before);
    await place(h);
    assert.equal((await view(h, sweep)).handoverReview, undefined);
    const lead = (await view(h, easy)).handoverReview!;
    assert.deepEqual(lead.receivers, review.receivers);
    const fastPath = "eventStaffGrants/" +
      eventStaffGrantId(h.scope.context.eventId, fast);
    await h.put(fastPath, {...(await h.read(fastPath)), status: "revoked"});
    assert.ok(!(await view(h)).handoverReview!.receivers.some((r) =>
      r.operatorId === fast));
    // A previously offered receiver is still reauthorized at submission.
    await assert.rejects(h.store.transfer(easy, command(await view(h, easy),
      {kind: "propose", from: "easy", to: "fast", receivingOperatorId: fast,
        expiresAtMillis: start + 10_000})), {code: "permission-denied"});
    h.clock.now = start + 100_000;
    assert.deepEqual((await view(h)).handoverReview!.receivers.map((r) =>
      r.operatorId), [manager]);
  });

test("handover reviews bound deadlines, overflow and foreign grants",
  async () => {
    const h = await harness();
    h.clock.now = 2_990_000;
    assert.equal((await view(h)).handoverReview!.expiresAt, 3_000_000);
    h.clock.now = start;
    const original = (await h.read("eventStaffGrants/" +
      eventStaffGrantId(h.scope.context.eventId, fast)))!;
    await h.put("eventStaffGrants/foreign-document-id", original);
    await assert.rejects(view(h), {code: "failed-precondition"});
    const other = await harness();
    const source = (await other.read("eventStaffGrants/" +
      eventStaffGrantId(other.scope.context.eventId, fast)))!;
    for (let i = 0; i < 49; i++) {
      const uid = "extra-" + i;
      await other.put("eventStaffGrants/" +
        eventStaffGrantId(other.scope.context.eventId, uid), {...source, uid});
    }
    await assert.rejects(view(other), {code: "failed-precondition"});
  });

test("changed duties are withheld from receiver choices", async () => {
  const h = await harness();
  const event = structuredClone(h.event);
  event.eventFormat.activityDetails.routePlan.paceGroups[1].label = "Changed";
  await h.put(h.eventPath, event);
  const review = (await view(h)).handoverReview!;
  assert.ok(!review.receivers.some((r) => r.operatorId === fast));
  assert.ok(review.receivers.some((r) => r.operatorId === easy));
});

test("placement and acknowledged transfers preserve one group and the roster",
  async () => {
    const h = await harness();
    assert.equal(h.view.ready, false);
    assert.deepEqual(h.view.actions, []);
    const before = h.fake.entries();
    const initial = await view(h);
    assert.equal(initial.freshness, "uninitialized");
    assert.deepEqual(initial.actions, ["place", "propose"]);
    assert.deepEqual(h.fake.entries(), before);
    await place(h);
    const original = (await view(h)).accepted;
    assert.equal(original?.responsibleOperatorId, manager);
    const request = await propose(h);
    assert.deepEqual(request.view.accepted, original);
    assert.equal(request.view.transferState, "pending");
    const receiverView = await view(h, fast);
    const acceptance = command(receiverView, {kind: "accept",
      transferId: receiverView.transfer!.transferId});
    await assert.rejects(h.store.transfer(manager, acceptance),
      {code: "permission-denied"});
    const accepted = await h.store.transfer(fast, acceptance);
    assert.equal(accepted.view.accepted?.groupId, "fast");
    assert.equal(accepted.view.accepted?.responsibleOperatorId, fast);
    assert.equal(accepted.view.transferState, "accepted");
    const replay = await h.store.transfer(fast, acceptance);
    assert.equal(replay.outcome, "replayed");
    await assert.rejects(h.store.get(easy, h.scope),
      {code: "permission-denied"});
    assert.deepEqual(await h.read(h.attendeePath),
      before.find(([path]) => path === h.attendeePath)?.[1]);
    const changed = h.fake.entries().filter(([path]) => !before.some(([p, v]) =>
      p === path && JSON.stringify(v) === JSON.stringify(h.fake.read(path))));
    assert.ok(changed.every(([path]) => path.startsWith(MEMBERSHIPS + "/") ||
      path.startsWith(MEMBERSHIP_RECEIPTS + "/")));
  });

test("roles, scope and named receiver constrain every transition", async () => {
  const h = await harness();
  for (const uid of ["guest", "stranger", easy, fast, sweep]) {
    await assert.rejects(h.store.get(uid, h.scope),
      {code: "permission-denied"});
  }
  await place(h);
  assert.deepEqual((await view(h, sweep)).actions, []);
  for (const uid of [easy, sweep]) {
    await assert.rejects(h.store.transfer(uid, command(await view(h, uid),
      {kind: "place", groupId: "fast"})), {code: "permission-denied"});
  }
  await assert.rejects(h.store.transfer(easy, command(await view(h, easy),
    {kind: "propose", from: "easy", to: "fast",
      receivingOperatorId: "ungranted", expiresAtMillis: start + 10_000})),
  {code: "permission-denied"});
  await assert.rejects(h.store.transfer(easy, command(await view(h, easy),
    {kind: "propose", from: "easy", to: "easy",
      receivingOperatorId: easy, expiresAtMillis: start + 10_000})),
  {code: "aborted"});
  await propose(h);
  const pending = await view(h, fast);
  await assert.rejects(h.store.transfer(sweep, command(pending,
    {kind: "accept", transferId: pending.transfer!.transferId})),
  {code: "permission-denied"});
  const staffPath = "eventStaffGrants/" +
    eventStaffGrantId(h.scope.context.eventId, fast);
  await h.put(staffPath, {...(await h.read(staffPath)), status: "revoked"});
  await assert.rejects(h.store.transfer(fast, command(pending,
    {kind: "accept", transferId: pending.transfer!.transferId})),
  {code: "permission-denied"});
  assert.equal((await view(h)).accepted?.groupId, "easy");
});

test("reject, cancel and timeout never move a guest", async () => {
  for (const resolution of ["reject", "cancel", "expired"] as const) {
    const h = await harness();
    await place(h);
    await propose(h);
    const before = await view(h);
    if (resolution === "expired") {
      h.clock.now = start + 10_000;
      assert.equal((await view(h)).transferState, "expired");
      await assert.rejects(h.store.transfer(fast, command(before,
        {kind: "accept", transferId: before.transfer!.transferId})),
      {code: "permission-denied"});
    } else {
      const actor = resolution === "reject" ? fast : easy;
      await h.store.transfer(actor, command(await view(h, actor),
        {kind: resolution, transferId: before.transfer!.transferId}));
    }
    assert.equal((await view(h)).accepted?.groupId, "easy");
    if (resolution !== "expired") {
      await assert.rejects(h.store.get(fast, h.scope),
        {code: "permission-denied"});
    }
    await h.store.transfer(easy, command(await view(h, easy), {kind: "leave"}));
    assert.equal((await view(h)).accepted, null);
    assert.notEqual((await view(h)).transferState, "pending");
  }
});

test("initial assignment may wait for the receiving operator's acceptance",
  async () => {
    const h = await harness();
    await h.store.transfer(manager, command(await view(h), {kind: "propose",
      from: null, to: "fast", receivingOperatorId: fast,
      expiresAtMillis: start + 10_000}));
    assert.equal((await view(h)).accepted, null);
    await assert.rejects(h.store.transfer(manager, command(await view(h),
      {kind: "place", groupId: "easy"})), {code: "permission-denied"});
    const pending = await view(h, fast);
    await h.store.transfer(fast, command(pending, {kind: "accept",
      transferId: pending.transfer!.transferId}));
    assert.equal((await view(h)).accepted?.groupId, "fast");
  });

test("breaks, return episodes and changed sources cannot inherit a handover",
  async () => {
    const h = await harness();
    await place(h);
    await propose(h);
    const old = await view(h, fast);
    await participation(h, "temporaryBreak");
    assert.equal((await view(h)).accepted?.groupId, "easy");
    assert.equal((await view(h)).ready, false);
    const paused = await view(h, fast);
    assert.deepEqual(paused.actions, ["reject"]);
    await assert.rejects(h.store.transfer(fast, command(paused,
      {kind: "accept", transferId: old.transfer!.transferId})),
    {code: "permission-denied"});
    await participation(h, "active");
    const resumed = await view(h);
    assert.notEqual(resumed.episodeId, old.episodeId);
    assert.equal(resumed.freshness, "sourceChanged");
    await assert.rejects(h.store.transfer(fast, command(old,
      {kind: "accept", transferId: old.transfer!.transferId})),
    {code: "permission-denied"});
    await place(h);
    assert.equal((await view(h)).transfer, null);
    const changed = structuredClone(h.event);
    changed.checkedInCount = 2;
    await h.put(h.eventPath, changed);
    assert.equal((await view(h)).freshness, "current");
    changed.eventFormat.activityDetails.routePlan.paceGroups[0].label = "New";
    await h.put(h.eventPath, changed);
    assert.equal((await view(h)).freshness, "sourceChanged");
    await place(h);
    const guestPath = guestCollections.guests + "/" + guestIdentity(
      h.scope.context, h.scope.attendeeId);
    const guest = await h.read(guestPath);
    h.fake.generation = Timestamp.fromMillis(2);
    assert.equal((await view(h)).ready, false);
    assert.equal((await view(h)).freshness, "sourceChanged");
    assert.deepEqual(await h.read(guestPath), guest);
  });

test("changed receiving-group setup requires a fresh handover", async () => {
  const h = await harness();
  await place(h);
  await propose(h);
  const changed = structuredClone(h.event);
  changed.eventFormat.activityDetails.routePlan.paceGroups[1].label = "New";
  await h.put(h.eventPath, changed);
  await h.grant(fast, "fast", "pacer");
  const current = await view(h, fast);
  assert.equal(current.freshness, "current");
  assert.equal(current.accepted?.groupId, "easy");
  assert.equal(current.transferState, "sourceChanged");
  assert.ok(!current.actions.includes("accept"));
  await assert.rejects(h.store.transfer(fast, command(current,
    {kind: "accept", transferId: current.transfer!.transferId})),
  {code: "permission-denied"});
  await h.store.transfer(easy, command(await view(h, easy),
    {kind: "cancel", transferId: current.transfer!.transferId}));
  assert.equal((await view(h)).accepted?.groupId, "easy");
});

test("stale views, identity mismatch and failed commits cannot create effects",
  async () => {
    const h = await harness();
    const old = await view(h);
    const input = command(old, {kind: "place", groupId: "easy"});
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.transfer(manager, input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    await h.store.transfer(manager, input);
    assert.equal((await h.store.transfer(manager, input)).outcome, "replayed");
    await assert.rejects(h.store.transfer(manager,
      command(old, {kind: "place", groupId: "fast"})), {code: "aborted"});
    await assert.rejects(h.store.transfer(manager, {...input,
      command: {...input.command, eventId: "other"}}),
    {code: "invalid-argument"});
    await assert.rejects(h.store.transfer(manager, {...input,
      command: {...input.command, payload: {...input.command.payload,
        decision: {kind: "place", groupId: "fast"}}}}), {code: "aborted"});
    assert.equal(validateEventAssistanceCommand({...input.command,
      payload: {attendeeId: h.scope.attendeeId, from: "easy", to: "fast",
        receivingOperatorId: fast}}), false);
    assert.equal(validateEventAssistanceCommand({...input.command,
      payload: {...input.command.payload,
        decision: {kind: "accept", transferId: "id", to: "invented"}}}), false);
  });

test("event and operator expiry during transaction reads withhold transfer",
  async () => {
    const h = await harness();
    await place(h);
    await h.grant(fast, "fast", "pacer", start + 5000);
    await propose(h);
    const pending = await view(h, fast);
    h.fake.beforeRead = (path) => {
      if (path.startsWith(MEMBERSHIP_RECEIPTS + "/")) {
        h.clock.now = start + 6000;
      }
    };
    await assert.rejects(h.store.transfer(fast, command(pending,
      {kind: "accept", transferId: pending.transfer!.transferId})),
    {code: "permission-denied"});
    assert.equal((await view(h)).accepted?.groupId, "easy");
    h.fake.beforeRead = undefined;
    await h.put(h.eventPath, {...h.event, status: "cancelled"});
    assert.equal((await view(h)).ready, false);
    await assert.rejects(h.store.transfer(manager, command(await view(h),
      {kind: "propose", from: "easy", to: "fast", receivingOperatorId: manager,
        expiresAtMillis: h.clock.now + 1000})), {code: "permission-denied"});
  });

test("membership callables authenticate and rate-limit before using the store",
  async () => {
    const h = await harness();
    const calls: string[] = [];
    const deps = {db: () => h.db, rateLimit: async () => {
      calls.push("limit");
    },
    store: () => ({get: async () => {
      calls.push("get");
      return h.store.get(manager, h.scope);
    },
    transfer: async () => {
      calls.push("transfer");
      return place(h);
    }})};
    await assert.rejects(getEventAssistanceMembershipHandler(
      {data: h.scope} as CallableRequest, deps), {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    await getEventAssistanceMembershipHandler({data: h.scope,
      auth: {uid: manager}} as CallableRequest, deps);
    assert.deepEqual(calls, ["limit", "get"]);
    calls.length = 0;
    await transferEventAssistanceGroupHandler({data: {},
      auth: {uid: manager}} as CallableRequest, deps);
    assert.deepEqual(calls, ["limit", "transfer"]);
  });

test("accepted membership gates publication, links, replies and dispatch",
  async () => {
    const h = await harness();
    const progress = new EventGroupProgressStore(h.db, () => h.clock.now);
    const initial = (await progress.get(manager,
      {context: h.scope.context, groupId: "easy"})).view;
    const moved = await progress.confirmDeparture(manager, {
      expectedSourceHash: initial.sourceHash, command: {
        kind: "confirmDeparture",
        context: h.scope.context, eventId: h.scope.context.eventId,
        operationId: "depart", payload: {groupId: "easy",
          expectedProgressRevision: initial.revision,
          destination: initial.destinations[0].target}}});
    const guest = (await h.read(guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId)))!;
    const intent: Intent = {schemaVersion: 1, intentId: "joining-message",
      revision: 1, context: h.scope.context, eventId: h.scope.context.eventId,
      attendeeId: h.scope.attendeeId, episodeId: guest.episodeId,
      workflow: {kind: "lateJoin", occurrenceId: "depart"},
      createdAt: start, expiresAt: 2_000_000,
      permittedRoutes: ["catchEventSms", "organizerEventWhatsapp"],
      deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
        minimumRetrySeconds: 1}, kind: "joiningUpdate",
      guidance: moved.view.guidance!, choices: [{choiceId: "way",
        label: "On my way", value: {kind: "joinIntent",
          intention: {kind: "onMyWay", claimedEta: null}}}]};
    await assert.rejects(h.guests.publishMessage(intent, null), /unavailable/);
    await place(h);
    const thread = await h.guests.publishMessage(intent, null);
    const keys = {currentKeyId: "fixture", keyFor: () => Buffer.alloc(32, 9)};
    const link = await h.guests.issueLink(thread.threadId, "send", keys);
    const guestView = await h.guests.getView(link.linkId, link.secret);
    assert.equal(guestView.status, "ready");
    await propose(h);
    assert.equal((await h.guests.getView(link.linkId, link.secret)).status,
      "ready");
    const pending = await view(h, fast);
    await h.store.transfer(fast, command(pending, {kind: "accept",
      transferId: pending.transfer!.transferId}));
    assert.deepEqual(await h.guests.getView(link.linkId, link.secret),
      {status: "unavailable", reason: "noInstructions",
        serverTime: h.clock.now});
    assert.equal((await h.db.runTransaction((tx) =>
      readEventAssistanceMessageGate(h.db, tx, intent, h.clock.now))).kind,
    "stop");
    await assert.rejects(h.guests.issueLink(thread.threadId, "again", keys),
      /unavailable/);
    await assert.rejects(h.guests.publishMessage(intent, null), /unavailable/);
    assert.ok(guestView.status === "ready");
    const result = await h.guests.submit({linkId: link.linkId,
      secret: link.secret, intentId: guestView.intentId,
      intentRevision: guestView.intentRevision,
      expectedGuestRevision: guestView.guestRevision,
      choiceId: "way", requestId: "late-reply"});
    assert.equal(result.result.kind, "rejected");
    assert.equal((await h.read(guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId)))!.revision,
    guest.revision);
  });

test("Firestore handovers contend once and reject replaced roster rows", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    await place(h);
    const reviewed = await view(h, easy);
    const results = await Promise.allSettled([fast, manager].map((receiver) =>
      h.store.transfer(easy, command(reviewed, {kind: "propose", from: "easy",
        to: "fast", receivingOperatorId: receiver,
        expiresAtMillis: start + 10_000}))));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const pending = await view(h);
    const receiver = pending.transfer!.receivingOperatorId;
    const input = command(pending, {kind: "accept",
      transferId: pending.transfer!.transferId});
    const accepted = await Promise.all(Array.from({length: 8}, () =>
      h.store.transfer(receiver, input)));
    assert.equal(accepted.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(accepted.filter((r) => r.outcome === "replayed").length, 7);
    assert.equal((await view(h)).accepted?.groupId, "fast");
    const receiptCount = await db.collection(MEMBERSHIP_RECEIPTS)
      .where("membershipId", "==", membershipIdentity(h.scope)).get();
    assert.equal(receiptCount.size, 3);
    await db.doc(h.attendeePath).delete();
    await db.doc(h.attendeePath).set(h.attendee);
    const replaced = await view(h);
    assert.equal(replaced.ready, false);
    assert.equal(replaced.freshness, "sourceChanged");
    await assert.rejects(h.store.transfer(manager, input));
    assert.equal((await db.collection(MEMBERSHIP_RECEIPTS)
      .where("membershipId", "==", membershipIdentity(h.scope)).get()).size, 3);
  } finally {
    await deleteApp(app);
  }
});
