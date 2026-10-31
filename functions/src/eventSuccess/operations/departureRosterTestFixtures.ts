import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {EventDepartureRosterStore} from "./departureRosterStore";
import {EventGroupProgressStore} from "./groupProgressStore";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {EventMembershipStore} from "./membershipStore";
import {EventGroupStaffStore} from "./groupStaffStore";

const manager = progressFixtureManager;
const start = 1_000_000;
export async function departureRosterHarness(real?: Firestore,
  fixtureId: string = randomUUID()) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const id = fixtureId;
  const context = {mode: "live" as const, eventId: "e-" + id,
    organizerId: "o-" + id};
  const scope = {context, groupId: "event:whole"};
  const seed = await seedJoiningProgress(db, context, start, 3_000_000);
  const attendeeId = "a-" + id;
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
  const attendeePath = "eventAttendees/" + attendeeId;
  await put(attendeePath, attendee);
  const clock = {now: start};
  const store = new EventDepartureRosterStore(db, () => clock.now);
  const progress = new EventGroupProgressStore(db, () => clock.now);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const membership = new EventMembershipStore(db, () => clock.now);
  const staff = new EventGroupStaffStore(db, () => clock.now);
  const review = (ids = [attendeeId], actor = manager,
    groupId = scope.groupId) => store.get(actor, {...scope, groupId,
    attendeeIds: ids});
  async function command(ids = [attendeeId], actor = manager,
    groupId = scope.groupId) {
    const view = (await progress.get(actor, {...scope, groupId})).view;
    const roster = await review(ids, actor, groupId);
    return {expectedSourceHash: view.sourceHash, command: {
      kind: "confirmDeparture" as const, context, eventId: context.eventId,
      operationId: randomUUID(), payload: {groupId,
        destination: view.destinations.find((d) =>
          d.target.kind !== "fixedPlace")!.target,
        expectedProgressRevision: view.revision,
        departureRoster: roster.selection}}};
  }
  async function groups() {
    await put("events/" + context.eventId, {...seed.event, eventFormat: {
      version: 1, activityKind: "socialRun", interactionModel: "pacePods",
      activityDetails: {routePlan: {version: 2, movementMode: "run",
        routeShape: "loop", groupStrategy: "paceGroups",
        stopCadence: "hostedStops", stopKinds: ["regroup"],
        roleKinds: ["pacer", "sweep"], path: [
          {latitude: 22.7, longitude: 75.8},
          {latitude: 22.8, longitude: 75.8}],
        paceGroups: ["easy", "fast"].map((id, sortOrder) =>
          ({id, label: id, sortOrder}))}}}});
    await guests.startEpisode(context, attendeeId, "begin", null);
  }
  async function place(groupId: string) {
    const view = (await membership.get(manager, {context, attendeeId})).view;
    await membership.transfer(manager, {expectedSourceHash: view.sourceHash,
      command: {kind: "transferGroup", context, eventId: context.eventId,
        operationId: randomUUID(), payload: {attendeeId,
          episodeId: view.episodeId, expectedMembershipRevision: view.revision,
          expectedParticipationRevision: view.participationRevision,
          decision: {kind: "place", groupId}}}});
  }
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
  return {fake, db, scope, seed, attendeeId, attendee, attendeePath,
    clock, store, progress, guests, membership, put, read, review, command,
    groups, place, grant};
}
