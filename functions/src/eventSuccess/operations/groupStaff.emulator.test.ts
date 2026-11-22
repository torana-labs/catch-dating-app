import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import type {UserRecord} from "firebase-admin/auth";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAssistanceGroupStaffCallableResponse as Response} from
  "../../shared/generated/eventAssistanceGroupStaffCallableResponse";
import type {EventDocument, OrganizerDocument, EventStaffGrantDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {eventOperatorExpiryMillis, eventStaffGrantId,
  requireEventOperatorPermission} from "../../shared/eventOperatorAuthority";
import {grantEventStaffHandler, revokeEventStaffHandler} from
  "../../events/eventStaff";
import {EventGroupStaffStore, STAFF_RECEIPT_COMMAND} from "./groupStaffStore";
import {getEventAssistanceGroupStaffHandler,
  setEventAssistanceGroupStaffHandler} from "./groupStaffHandlers";
import {GroupDuty, requireGroupPermission} from "./groupStaffAuthority";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {EventGroupProgressStore, DEPARTURE_RECEIPT_COMMAND} from
  "./groupProgressStore";
import {COMMAND_RECEIPTS, commandReceiptId} from
  "../../shared/commandReceipts";
import {operationContentHash} from "../../operations/durableActions";

const manager = progressFixtureManager;
const start = 1_000_000;
const phone = "+919999999999";
async function harness(realDb?: Firestore) {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const, organizerId: "o-" + id,
    eventId: "e-" + id};
  const seeded = await seedJoiningProgress(db, context, start, 3_000_000);
  const event = {...seeded.event, eventFormat: {version: 1,
    activityKind: "socialRun", interactionModel: "pacePods",
    activityDetails: {routePlan: {version: 2, movementMode: "run",
      routeShape: "loop", groupStrategy: "paceGroups",
      stopCadence: "hostedStops", stopKinds: ["regroup"],
      roleKinds: ["pacer", "sweep"], path: [{latitude: 22.7, longitude: 75.8},
        {latitude: 22.71, longitude: 75.8}],
      paceGroups: ["easy", "fast"].map((id, sortOrder) =>
        ({id, label: id, sortOrder}))}}}};
  const put = async (path: string, value: object) => {
    if (realDb) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const read = async (path: string) => realDb ?
    (await db.doc(path).get()).data() : fake.read(path);
  await put("events/" + context.eventId, event);
  const clock = {now: start};
  const store = new EventGroupStaffStore(db, () => clock.now);
  const progress = new EventGroupProgressStore(db, () => clock.now);
  const target = {uid: "crew-" + id, displayName: "Pacer",
    phoneLastFour: "9999"};
  const scope = {context, groupId: "easy"};
  const staffPath = "eventStaffGrants/" + eventStaffGrantId(context.eventId,
    target.uid);
  const view = (await store.get(manager, target, scope)).view;
  return {fake, db, event, clock, store, progress, target, scope,
    view, put, read, staffPath};
}
function assign(view: Response["view"], duty: GroupDuty["duty"] = "lead",
  requestId = "assign", expiresAtMillis = start + 20_000) {
  return {context: view.context, groupId: view.groupId, phoneNumber: phone,
    expectedUid: view.uid, expectedRevision: view.revision,
    expectedSourceHash: view.sourceHash, requestId,
    decision: {kind: "assign" as const, duty, expiresAtMillis}};
}
function remove(view: Response["view"], requestId = "remove") {
  return {...assign(view, "lead", requestId), decision: {kind: "remove"}};
}
async function current(h: Awaited<ReturnType<typeof harness>>,
  groupId = "easy") {
  const result = await h.store.get(manager, h.target, {...h.scope, groupId});
  return result.view;
}
async function departure(h: Awaited<ReturnType<typeof harness>>) {
  const view = (await h.progress.get(manager, h.scope)).view;
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "confirmDeparture", context: h.scope.context,
    eventId: h.scope.context.eventId, operationId: "depart",
    payload: {groupId: h.scope.groupId, expectedProgressRevision: view.revision,
      destination: view.destinations[0].target}}};
}
async function globalAccess(h: Awaited<ReturnType<typeof harness>>,
  permission: "viewRoster" | "publishLiveLocation" = "viewRoster") {
  return requireEventOperatorPermission({db: h.db,
    event: h.event as unknown as EventDocument,
    organizer: (await h.read("organizers/" + h.scope.context.organizerId)) as
      unknown as OrganizerDocument,
    eventId: h.scope.context.eventId, actorUid: h.target.uid, permission,
    now: Timestamp.fromMillis(h.clock.now)});
}

test("group-only pacers can control their group without event-wide access",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    assert.equal(h.view.status, "none");
    assert.deepEqual(h.view.availableDuties, ["lead", "pacer", "sweep"]);
    assert.equal((await current(h)).revision, 0);
    assert.deepEqual(h.fake.entries(), before);
    const result = await h.store.set(manager, h.target,
      assign(h.view, "pacer"));
    assert.equal(result.view.status, "assigned");
    const staff = (await h.read(h.staffPath))!;
    assert.deepEqual(staff.permissions, []);
    assert.equal(staff.operatorExpiresAt, null);
    for (const permission of ["viewRoster", "publishLiveLocation"] as const) {
      await assert.rejects(globalAccess(h, permission),
        {code: "permission-denied"});
    }
    const initial = await h.progress.get(h.target.uid, h.scope);
    assert.equal(initial.actorUid, h.target.uid);
    assert.deepEqual(initial.departureAuthority, {
      kind: "canConfirm", validUntil: start + 20_000,
      checkpointReporter: "selfOnly",
    });
    assert.equal(initial.view.revision, 0);
    const moved = await h.progress.confirmDeparture(h.target.uid,
      await departure(h));
    assert.equal(moved.view.progress?.confirmedBy, h.target.uid);
    const alternative = moved.view.destinations.find((destination) =>
      JSON.stringify(destination.target) !==
        JSON.stringify(moved.view.progress!.destination))!;
    await assert.rejects(h.progress.changeRoute(h.target.uid, {command: {
      kind: "changeRoute", context: h.scope.context,
      eventId: h.scope.context.eventId, operationId: "pacer-route-change",
      payload: {routeRevision: moved.view.revision,
        groupId: h.scope.groupId, expectedSourceHash: moved.view.sourceHash,
        alternativeId: alternative.alternativeId,
        decisionId: "decision:pacer-route-change"},
    }}), {code: "permission-denied"});
    for (const groupId of ["fast", "event:whole"]) {
      await assert.rejects(h.progress.get(h.target.uid, {...h.scope, groupId}),
        {code: "permission-denied"});
    }
    await assert.rejects(h.store.get(h.target.uid, h.target, h.scope),
      {code: "permission-denied"});
  });

test("sweeps can read progress but cannot confirm a departure or handover",
  async () => {
    const h = await harness();
    await h.store.set(manager, h.target, assign(h.view, "sweep"));
    const read = await h.progress.get(h.target.uid, h.scope);
    assert.deepEqual(read.departureAuthority,
      {kind: "readOnly", validUntil: start + 20_000});
    await assert.rejects(h.progress.confirmDeparture(h.target.uid,
      await departure(h)), {code: "permission-denied"});
    await assert.rejects(h.db.runTransaction((tx) => requireGroupPermission(
      h.db, tx, h.scope.context, "easy", h.target.uid, "transferGroup",
      () => h.clock.now)), {code: "permission-denied"});
    const whole = await current(h, "event:whole");
    assert.deepEqual(whole.availableDuties, ["lead", "sweep"]);
    await assert.rejects(h.store.set(manager, h.target, assign(whole, "pacer")),
      {code: "failed-precondition"});
  });

test("departure authority follows duty changes without preserving access",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const managerRead = await h.progress.get(manager, h.scope);
    assert.equal(managerRead.actorUid, manager);
    assert.equal(managerRead.departureAuthority.kind, "canConfirm");
    assert.deepEqual(h.fake.entries(), before);
    await h.store.set(manager, h.target, assign(h.view, "lead"));
    const request = await departure(h);
    const lead = await h.progress.get(h.target.uid, h.scope);
    assert.deepEqual(lead.departureAuthority, {
      kind: "canConfirm", validUntil: start + 20_000,
      checkpointReporter: "selfOnly",
    });
    await h.store.set(manager, h.target,
      assign(await current(h), "sweep", "change-duty"));
    const sweep = await h.progress.get(h.target.uid, h.scope);
    assert.deepEqual(sweep.departureAuthority,
      {kind: "readOnly", validUntil: start + 20_000});
    await assert.rejects(h.progress.confirmDeparture(h.target.uid, request),
      {code: "permission-denied"});
    const staff = (await h.read(h.staffPath))!;
    await h.put(h.staffPath, {...staff, groupDuties: [],
      permissions: ["viewRoster", "setAttendance"]});
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
  });

test("duties preserve separate expiry and removal cannot undo another group",
  async () => {
    const h = await harness();
    const base = {organizerId: h.scope.context.organizerId,
      eventId: h.scope.context.eventId, uid: h.target.uid,
      displayName: h.target.displayName, phoneLastFour: "9999",
      role: "checkInOperator", permissions: ["viewRoster", "setAttendance",
        "reviewRuntimeClaims", "publishLiveLocation"], status: "active",
      createdBy: manager, createdAt: Timestamp.fromMillis(start),
      updatedAt: Timestamp.fromMillis(start), revision: 1,
      expiresAt: Timestamp.fromMillis(start + 5000), revokedAt: null,
      revokedBy: null};
    await h.put(h.staffPath, base);
    const input = assign(await current(h));
    const first = await h.store.set(manager, h.target, input);
    assert.equal(first.view.operatorExpiresAtMillis, start + 5000);
    await h.store.set(manager, h.target,
      assign(await current(h, "fast"), "pacer", "second-group"));
    h.clock.now = start + 5001;
    await assert.rejects(globalAccess(h), {code: "permission-denied"});
    await h.progress.get(h.target.uid, h.scope);
    const removed = await h.store.set(manager, h.target,
      remove(await current(h)));
    assert.equal(removed.view.status, "none");
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    await h.progress.get(h.target.uid, {...h.scope, groupId: "fast"});
    const replay = await h.store.set(manager, h.target, input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, first.operationRevision);
    assert.equal(replay.view.status, "none");
    assert.equal(eventOperatorExpiryMillis((await h.read(h.staffPath)) as
      unknown as EventStaffGrantDocument), null);
  });

test("expired or revoked duties do not revive with another assignment",
  async () => {
    const h = await harness();
    await h.store.set(manager, h.target, assign(h.view));
    const staff = (await h.read(h.staffPath))!;
    await h.put(h.staffPath, {...staff, status: "revoked",
      revokedBy: manager, revokedAt: Timestamp.fromMillis(start)});
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    await h.store.set(manager, h.target,
      assign(await current(h, "fast"), "lead", "new-grant"));
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    await h.progress.get(h.target.uid, {...h.scope, groupId: "fast"});
    h.clock.now = start + 20_000;
    await assert.rejects(h.progress.get(h.target.uid,
      {...h.scope, groupId: "fast"}), {code: "permission-denied"});
  });

test("changed scope and source generations invalidate duties, counters do not",
  async () => {
    const h = await harness();
    await h.store.set(manager, h.target, assign(h.view));
    const changed = structuredClone(h.event);
    changed.checkedInCount = 12;
    await h.put("events/" + h.scope.context.eventId, changed);
    await h.progress.get(h.target.uid, h.scope);
    const route = changed.eventFormat.activityDetails.routePlan;
    route.paceGroups[0].label = "New group";
    await h.put("events/" + h.scope.context.eventId, changed);
    assert.equal((await current(h)).status, "sourceChanged");
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    await h.store.set(manager, h.target,
      assign(await current(h), "pacer", "reviewed"));
    h.fake.generation = Timestamp.fromMillis(2);
    assert.equal((await current(h)).status, "sourceChanged");
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    changed.eventFormat.activityDetails.routePlan.paceGroups = [];
    await h.put("events/" + h.scope.context.eventId, changed);
    const missing = await current(h);
    assert.equal(missing.canAssign, false);
    assert.deepEqual(missing.availableDuties, []);
    assert.equal((await h.store.set(manager, h.target, remove(missing)))
      .view.status, "none");
  });

test("stale, changed and interrupted duty commands cannot repeat effects",
  async () => {
    const h = await harness();
    const input = assign(h.view);
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.set(manager, h.target, input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const result = await h.store.set(manager, h.target, input);
    await assert.rejects(h.store.set(manager, h.target,
      assign(result.view, "sweep")), {code: "aborted"});
    await assert.rejects(h.store.set(manager, h.target,
      assign(h.view, "sweep", "old-view")), {code: "aborted"});
    await assert.rejects(h.store.set(manager, {...h.target, uid: "different"},
      input), {code: "aborted"});
    h.fake.beforeRead = (path) => {
      if (path.startsWith(
        `${COMMAND_RECEIPTS}/${DEPARTURE_RECEIPT_COMMAND}_`)) {
        h.clock.now = start + 20_000;
      }
    };
    const request = await departure(h);
    await assert.rejects(h.progress.confirmDeparture(h.target.uid, request),
      {code: "permission-denied"});
    assert.equal((await h.progress.get(manager, h.scope)).view.revision, 0);
  });

test("staff lookup is manager gated and subject changes require a new review",
  async () => {
    const h = await harness();
    const calls: string[] = [];
    const deps = {db: () => h.db,
      rateLimit: async () => {
        calls.push("limit");
      },
      lookup: async () => {
        calls.push("lookup");
        return {uid: h.target.uid, displayName: "Pacer"} as UserRecord;
      }, store: () => h.store};
    const request = (uid: string, data: unknown) =>
      ({data, auth: {uid}} as CallableRequest<unknown>);
    const readInput = {...h.scope, phoneNumber: phone};
    await assert.rejects(getEventAssistanceGroupStaffHandler(
      {data: readInput} as CallableRequest<unknown>, deps),
    {code: "unauthenticated"});
    assert.deepEqual(calls, []);
    await assert.rejects(getEventAssistanceGroupStaffHandler(
      request("stranger", readInput), deps), {code: "permission-denied"});
    assert.deepEqual(calls, ["limit"]);
    const view = (await getEventAssistanceGroupStaffHandler(
      request(manager, readInput), deps)).view;
    assert.equal(JSON.stringify(view).includes(phone), false);
    const organizerPath = "organizers/" + h.scope.context.organizerId;
    await assert.rejects(setEventAssistanceGroupStaffHandler(
      request(manager, assign(view)), {...deps, lookup: async () => {
        await h.put(organizerPath, {...(await h.read(organizerPath)),
          ownerUserId: "other", hostUserId: "other", hostUserIds: [],
          hostProfiles: []});
        return {uid: h.target.uid, displayName: "Pacer"} as UserRecord;
      }}), {code: "permission-denied"});
    assert.equal(await h.read(h.staffPath), undefined);
  });

test("Firestore reconciles group duties with legacy grants and the staff cap", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const input = assign(h.view);
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.set(manager, h.target, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    const deps = {firestore: () => db, checkRateLimit: async () => {},
      now: () => Timestamp.fromMillis(h.clock.now),
      getUserByPhoneNumber: async () => ({uid: h.target.uid,
        displayName: "Crew", phoneNumber: phone}) as UserRecord};
    const grant = await grantEventStaffHandler({auth: {uid: manager}, data: {
      eventId: h.scope.context.eventId, phoneNumber: phone,
      expiresAtMillis: start + 5000}} as CallableRequest, deps);
    assert.equal(grant.members.length, 1);
    const staff = (await h.read(h.staffPath))!;
    assert.equal(staff.groupDuties.length, 1);
    assert.equal(staff.expiresAt.toMillis(), start + 20_000);
    assert.equal(staff.operatorExpiresAt.toMillis(), start + 5000);
    await globalAccess(h);
    h.clock.now = start + 5001;
    await assert.rejects(globalAccess(h), {code: "permission-denied"});
    await h.progress.get(h.target.uid, h.scope);
    const batch = db.batch();
    for (let n = 0; n < 49; n++) {
      const uid = "extra-" + n;
      batch.set(db.collection("eventStaffGrants").doc(
        eventStaffGrantId(h.scope.context.eventId, uid)), {...staff, uid});
    }
    await batch.commit();
    const another = {...h.target, uid: "beyond-cap"};
    const next = (await h.store.get(manager, another, h.scope)).view;
    await assert.rejects(h.store.set(manager, another, assign(next)),
      {code: "resource-exhausted"});
    await revokeEventStaffHandler({auth: {uid: manager}, data: {
      eventId: h.scope.context.eventId, uid: h.target.uid,
      expectedRevision: staff.revision}} as CallableRequest, deps);
    await assert.rejects(h.progress.get(h.target.uid, h.scope),
      {code: "permission-denied"});
    // The eight concurrent assigns share one receipt under the request's id.
    const receipt = (await db.collection(COMMAND_RECEIPTS).doc(
      commandReceiptId(STAFF_RECEIPT_COMMAND, operationContentHash([
        h.scope, h.target.uid, input.requestId]))).get()).data();
    assert.equal(receipt?.command, STAFF_RECEIPT_COMMAND);
    assert.equal(receipt?.result?.revision, results[0].operationRevision);
  } finally {
    await deleteApp(app);
  }
});
