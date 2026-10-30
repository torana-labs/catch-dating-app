import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, writeFileSync} from "node:fs";
import {Timestamp} from "firebase-admin/firestore";
import {room, role, roleRead, roleMove, sweep, receiver, assign,
  staffCommand} from "./groupStaffTestFixtures";
import {departure, report} from "./movementTestFixtures";
import {practiceStaffProjection, preparePracticeStaffChange} from
  "./groupStaff";
import {practiceMembershipProjection, practiceMembershipView,
  transferPracticeMembership} from "./membership";
import {practiceAccountabilityProjection, practiceAccountabilityView,
  resolvePracticeAccountability} from "./accountability";
import type {PracticeCaseAuthority} from "./assistanceCases";
import {BRAND} from "../shared/generated/brand";

test("native staff fixtures bind real Host, practice role, and group actions",
  async () => {
    const h = room();
    const samples: Record<string, unknown> = {};
    const sample = async (name: string, authority: PracticeCaseAuthority,
      groupId?: string) => {
      samples[name] = JSON.parse(JSON.stringify({
        session: {id: h.id, ...h.session,
          virtualStartedAtMillis: h.session.virtualStartedAt.toMillis(),
          virtualNowMillis: h.session.virtualNow.toMillis(),
          expiresAtMillis: h.session.expiresAt.toMillis()},
        actors: h.actors, actions: [], guestUrl:
          `${BRAND.web.origin}/rehearse/practicepublic1234567890`,
        canUseInternalFaults: false,
        staffReview: practiceStaffProjection(h.id, h.session, authority),
        membershipReviews: practiceMembershipProjection(h.id, h.session,
          h.actors, authority),
        accountabilityReviews: practiceAccountabilityProjection(h.id,
          h.session, h.actors, authority),
        ...(groupId ? {movementReview: await roleRead(h, authority,
          {groupId})} : {}),
      }));
    };
    await sample("manager", h.authority, "easy");
    await sample("pacer", role(h), "easy");
    await sample("sweep", role(h, sweep), "easy");
    const first = departure(await roleRead(h), h.actors.map((a) => a.actorId),
      true);
    if (first.kind !== "confirmDeparture") {
      throw new Error("Expected departure");
    }
    first.payload.checkpointRequest!.responsibleOperatorId = sweep;
    await roleMove(h, first, h.authority, "practice_departure");
    await sample("sweepDeparted", role(h, sweep), "easy");
    await roleMove(h, report(await roleRead(h), [h.actors[0].actorId]),
      role(h, sweep), "practice_report");
    await sample("sweepReported", role(h, sweep), "easy");
    const missing = practiceAccountabilityView(h.session, h.actors[1],
      role(h, sweep));
    h.actors[1] = resolvePracticeAccountability(h.session, h.actors[1], {
      kind: "resolveAccountability", actorId: missing.attendeeId,
      groupId: missing.groupId, expectedSourceHash: missing.sourceHash,
      payload: {attendeeId: missing.attendeeId, episodeId: missing.episodeId,
        disposition: "departed"}}, role(h, sweep));
    h.session.runtimeRevision++; h.session.actionCount++;
    await sample("sweepCanClose", role(h, sweep), "easy");
    await sample("pacerCannotClose", role(h), "easy");
    const row = practiceMembershipView(h.session, h.actors[0], role(h));
    h.actors[0] = transferPracticeMembership(h.session, h.actors[0], {
      kind: "transferGroup", actorId: row.attendeeId,
      expectedSourceHash: row.sourceHash, payload: {attendeeId: row.attendeeId,
        episodeId: row.episodeId!, expectedParticipationRevision:
          row.participationRevision, expectedMembershipRevision: row.revision,
        decision: {kind: "propose", from: "easy", to: "fast",
          receivingOperatorId: receiver, expiresAtMillis: 61000}}}, role(h),
    "practice_propose");
    h.session.runtimeRevision++; h.session.actionCount++;
    await sample("receiving", role(h, receiver), "fast");
    await sample("sending", role(h), "easy");
    const pending = practiceMembershipView(h.session, h.actors[0],
      role(h, receiver));
    h.actors[0] = transferPracticeMembership(h.session, h.actors[0], {
      kind: "transferGroup", actorId: pending.attendeeId,
      expectedSourceHash: pending.sourceHash, payload: {
        attendeeId: pending.attendeeId, episodeId: pending.episodeId!,
        expectedParticipationRevision: pending.participationRevision,
        expectedMembershipRevision: pending.revision,
        decision: {kind: "accept", transferId: pending.transfer!.transferId}}},
    role(h, receiver), "practice_accept");
    h.session.runtimeRevision++; h.session.actionCount++;
    await sample("accepted", role(h, receiver), "fast");
    await sample("oldGroup", role(h), "easy");
    await sample("beforeStaffEdit", h.authority);
    assign(h, "practice-staff:new", "fast", "sweep");
    await sample("staffAssigned", h.authority);
    const remove = {...staffCommand(h, "practice-staff:new", "fast"),
      decision: {kind: "remove" as const}};
    h.session.staff = preparePracticeStaffChange(h.id, h.session,
      h.authority, remove);
    h.session.runtimeRevision++; h.session.actionCount++;
    await sample("staffRemoved", h.authority);
    assign(h, sweep, "easy", "lead");
    assign(h, "practice-staff:new", "fast", "lead");
    for (let i = 4; i < 50; i++) {
      assign(h, "practice-staff:operator-" + i, "easy", "lead");
    }
    await sample("fullStaff", h.authority);
    assert.equal(practiceMembershipProjection(h.id, h.session, h.actors,
      h.authority).receivingOperatorIds.length, 52);
    assert.throws(() => assign(h, "practice-staff:overflow", "easy", "lead"),
      {code: "resource-exhausted"});
    h.session.virtualNow = Timestamp.fromMillis(3601000);
    await sample("expired", role(h, sweep));
    const path = "../test/event_rehearsal/fixtures/staff_reviews.json";
    if (process.env.UPDATE_REHEARSAL_STAFF_FIXTURE === "1") {
      writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
    }
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), samples);
  });
