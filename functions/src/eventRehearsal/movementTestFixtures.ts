import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {validateEventRehearsalMovementCallableResponse} from
  "../shared/generated/validators/eventRehearsalMovementOutput";
import type {ControlEventRehearsalCallablePayload as Control} from
  "../shared/generated/controlEventRehearsalCallablePayload";
import {FakeFirestore} from "../operations/testFirestore";
import {practiceSession} from "./assistanceTestFixtures";
import {buildRehearsalActors, applyRehearsalBehavior} from "./engine";
import {practiceMembershipView, transferPracticeMembership} from "./membership";
import {practiceMovementReview, preparePracticeMovementCommand} from
  "./movement";
import type {MovementScope} from "./movementRecords";
import type {Review} from "./movementSource";
export type Command = NonNullable<Control["movement"]>;
export function harness(now = Date.now(), id: string = randomUUID()) {
  const session = practiceSession(now);
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  const organizer = {...Object.fromEntries(Object.entries(fixture).filter(
    ([k]) => k in schema.properties)), followerCount: 0, organizerPhotos: [],
  organizerType: "community", hostUserIds: ["host-1", "host-2"]} as
    unknown as OrganizerDocument;
  const authority = {organizer, actorUid: "host-1"};
  session.setup.movementSimulation = {routePlan: null, livePositions: [],
    lateArrivalGuidance: null, itinerary: ["one", "two"].map((id, i) => ({
      id, kind: "stop", offsetMinutes: i * 30, title: "Stop " + id,
      location: {name: "Stop " + id, latitude: 22.7, longitude: 75.8}}))};
  const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const read = async (scope: MovementScope = {groupId: "event:whole"}) => {
    const review = await db.runTransaction((tx) => practiceMovementReview(db,
      tx, id, session, actors, scope, authority));
    assert.equal(validateEventRehearsalMovementCallableResponse(review), true,
      JSON.stringify(validateEventRehearsalMovementCallableResponse.errors));
    return review;
  };
  const execute = async (command: Command,
    operationId: string = randomUUID()) => {
    const changedActors = await db.runTransaction(async (tx) => {
      const commit = await preparePracticeMovementCommand(db, tx, id, session,
        actors, command, authority, operationId);
      commit.commit();
      return commit.actorChanges ?? [];
    });
    for (const changed of changedActors) {
      const index = actors.findIndex((a) => a.actorId === changed.actorId);
      actors[index] = changed;
    }
    session.runtimeRevision++; session.actionCount++;
  };
  const arrive = (i = 0) => actors[i] = applyRehearsalBehavior(actors[i],
    "arrive", [], session.virtualNow);
  const leave = (i = 0) => actors[i] = applyRehearsalBehavior(actors[i],
    "leaveEarly", [], session.virtualNow);
  const group = () => {
    session.setup.movementSimulation!.routePlan = {version: 2,
      movementMode: "run", routeShape: "loop", groupStrategy: "paceGroups",
      stopCadence: "hostedStops", stopKinds: ["regroup"], roleKinds: ["pacer"],
      paceGroups: [{id: "easy", label: "Easy pace", sortOrder: 0}],
      path: [{latitude: 22.7, longitude: 75.8},
        {latitude: 22.71, longitude: 75.81}]};
  };
  const place = (i = 0) => {
    const row = practiceMembershipView(session, actors[i], authority);
    actors[i] = transferPracticeMembership(session, actors[i], {
      kind: "transferGroup", actorId: row.attendeeId,
      expectedSourceHash: row.sourceHash, payload: {attendeeId: row.attendeeId,
        episodeId: row.episodeId!, expectedParticipationRevision:
          row.participationRevision, expectedMembershipRevision: row.revision,
        decision: {kind: "place", groupId: "easy"}}}, authority, randomUUID());
  };
  return {id, session, actors, authority, fake, db, read, execute, arrive,
    leave,
    group, place};
}
export function departure(r: Review, ids?: string[], request = false): Command {
  return {kind: "confirmDeparture", expectedSourceHash: r.progress.sourceHash,
    payload: {groupId: r.groupId, expectedProgressRevision: r.progress.revision,
      destination: r.progress.destinations.find((d) =>
        d.target.kind !== "fixedPlace")!.target,
      ...(ids === undefined ? {} : {departureRoster: {
        attendeeIds: ids, expectedSourceHash: r.roster.sourceHash}}),
      ...(request ? {checkpointRequest: {responsibleOperatorId: "host-2",
        dueAt: r.serverTime + 60000}} : {})}};
}
export function report(r: Review, ids: string[],
  correctionReason: string | null = null):
  Command {
  const c = r.checkpoint!;
  return {kind: "recordCheckpoint", expectedSourceHash: c.sourceHash,
    payload: {groupId: r.groupId, expectedProgressRevision: c.progressRevision,
      expectedCheckpointRevision: c.revision, checkpointId: c.checkpointId,
      accountedFor: ids, correctionReason}};
}

export function changeRoute(r: Review, alternativeIndex = 0,
  decisionId = "route-choice"): Command {
  const current = r.progress.guidance?.destination;
  const choices = r.progress.destinations.filter((destination) =>
    JSON.stringify(destination.target) !== JSON.stringify(current));
  const alternative = choices[alternativeIndex];
  if (!alternative) throw new Error("No route alternative available.");
  return {kind: "changeRoute", payload: {groupId: r.groupId,
    routeRevision: r.progress.revision,
    expectedSourceHash: r.progress.sourceHash,
    alternativeId: alternative.alternativeId, decisionId}};
}
