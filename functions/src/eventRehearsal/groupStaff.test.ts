import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {harness} from "./movementTestFixtures";
import {room, staffCommand, assign, role, pacer, sweep, receiver} from
  "./groupStaffTestFixtures";
import {preparePracticeStaffChange, practiceStaffProjection,
  practiceGroupPermission, practiceStaffState, practiceRoleAuthority} from
  "./groupStaff";
import {GROUP_DUTY_PERMISSIONS} from
  "../eventSuccess/operations/groupStaffAuthority";
import {validateControlEventRehearsalCallablePayload as validate} from
  "../shared/generated/validators/controlEventRehearsalInput";
import {contractValidator} from "../shared/contractTestValidators";

const validateEventRehearsalDocument =
  contractValidator("EventRehearsalDocument");

test("practice duties use the live role map without granting real " +
  "access", () => {
  const h = room();
  for (const [id, duty] of [[pacer, "pacer"], [sweep, "sweep"]] as const) {
    const view = practiceStaffProjection(h.id, h.session, role(h, id));
    assert.equal(view.hostUid, "host-1");
    assert.equal(view.actorUid, id); assert.equal(view.canAssign, false);
    assert.deepEqual(view.groups.find((g) => g.groupId === "easy")!.permissions,
      GROUP_DUTY_PERMISSIONS[duty]);
    assert.deepEqual(view.groups.find((g) => g.groupId === "fast")!.permissions,
      []);
    assert.deepEqual(view.groups[0].permissions, []);
  }
  assert.equal(validateEventRehearsalDocument(h.session), true);
  assert.throws(() => practiceRoleAuthority(h.id, h.session,
    {...h.authority, actorUid: "outsider"}, pacer),
  {code: "permission-denied"});
  assert.throws(() => practiceRoleAuthority(h.id, h.session, h.authority,
    "host-2"), {code: "permission-denied"});
  assert.throws(() => preparePracticeStaffChange(h.id, h.session, role(h),
    staffCommand(h)), {code: "permission-denied"});
  assert.throws(() => practiceStaffProjection(h.id, h.session,
    {...h.authority, hostUid: "host-1", actorUid: pacer}),
  {code: "permission-denied"});
});

test("virtual expiry and changed groups withhold duties but " +
  "preserve history", () => {
  const h = room(); const now = h.session.virtualNow.toMillis();
  assign(h, pacer, "fast", "lead", now + 2000);
  assign(h, pacer, "easy", "pacer", now + 1000);
  h.session.virtualNow = Timestamp.fromMillis(now + 1000);
  assert.equal(practiceGroupPermission(h.id, h.session, role(h), "easy",
    "confirmDeparture"), null);
  assert.equal(practiceGroupPermission(h.id, h.session, role(h), "fast",
    "confirmDeparture"), now + 2000);
  // Routine clock and destination changes do not invalidate a current duty.
  h.session.setup.movementSimulation!.itinerary[0].title = "New venue label";
  assert.equal(practiceGroupPermission(h.id, h.session, role(h), "fast",
    "confirmDeparture"), now + 2000);
  const route = h.session.setup.movementSimulation!.routePlan!;
  route.paceGroups![1].label = "Faster";
  assert.equal(practiceGroupPermission(h.id, h.session, role(h), "fast",
    "confirmDeparture"), null);
  const command = staffCommand(h, pacer, "fast", "lead");
  h.session.staff = preparePracticeStaffChange(h.id, h.session, h.authority,
    {...command, decision: {kind: "remove"}});
  assert.equal(h.session.staff.operators.find((o) => o.operatorId === pacer)!
    .duties[0].groupId, "easy");
  assert.equal(practiceGroupPermission(h.id, h.session, role(h), "easy",
    "confirmDeparture"), null);
});

test("staff changes bind the review, event window and bounded " +
  "practice roster", () => {
  const h = harness(1000);
  assert.throws(() => preparePracticeStaffChange(h.id, h.session, h.authority,
    staffCommand(h, pacer, "event:whole")), {code: "failed-precondition"});
  const command = staffCommand(h, sweep, "event:whole", "sweep");
  assign(h, sweep, "event:whole", "sweep");
  assert.throws(() => preparePracticeStaffChange(h.id, h.session, h.authority,
    command), {code: "aborted"});
  const end = 1000 + h.session.setup.durationMinutes * 60000;
  for (const expires of [1000, end + 14400001]) {
    assert.throws(() => preparePracticeStaffChange(h.id, h.session, h.authority,
      staffCommand(h, sweep, "event:whole", "sweep", expires)),
    {code: "failed-precondition"});
  }
  h.session.status = "complete";
  const remove = {...staffCommand(h, sweep, "event:whole", "sweep"),
    decision: {kind: "remove" as const}};
  h.session.staff = preparePracticeStaffChange(h.id, h.session, h.authority,
    remove);
  assert.equal(h.session.staff.operators[0].duties.length, 0);
  assert.throws(() => preparePracticeStaffChange(h.id, h.session, h.authority,
    staffCommand(h, sweep, "event:whole", "sweep")),
  {code: "failed-precondition"});
  h.session.setupRevision++;
  assert.throws(() => practiceStaffState(h.id, h.session),
    {code: "failed-precondition"});
  delete h.session.staff;
  assert.equal(practiceStaffState(h.id, h.session).revision, 0);
});

test("corrupt staff identities and virtual history cannot grant a duty", () => {
  for (const corrupt of ["duplicateOperator", "duplicateDuty", "future",
    "blankName", "clock"] as const) {
    const h = room(); const state = h.session.staff!;
    if (corrupt === "duplicateOperator") {
      state.operators.push(state.operators[0]);
    }
    if (corrupt === "duplicateDuty") {
      state.operators[0].duties.push(
        state.operators[0].duties[0]);
    }
    if (corrupt === "future") state.operators[0].duties[0].grantedAtMillis++;
    if (corrupt === "blankName") state.operators[0].displayName = "  ";
    if (corrupt === "clock") state.clockId = "another-clock";
    assert.throws(() => practiceStaffState(h.id, h.session),
      {code: "failed-precondition"}, corrupt);
  }
});

test("wire controls distinguish staff setup, group roles and Host " +
  "lifecycle", () => {
  const h = room();
  const input = {sessionId: h.id, expectedRevision: 0,
    expectedSetupRevision: 0, clientActionId: "staff_action_1", action: "staff",
    staff: staffCommand(h)};
  assert.equal(validate(input), true, JSON.stringify(validate.errors));
  assert.equal(validate({...input, practiceOperatorId: pacer}), false);
  assert.equal(validate({...input, action: "pause"}), false);
  const missingGeneration: Record<string, unknown> = {...input};
  delete missingGeneration.expectedSetupRevision;
  assert.equal(validate(missingGeneration), false);
  assert.equal(validate({...input, staff: {...input.staff,
    operatorId: "real-account-uid"}}), false);
  assert.equal(validate({sessionId: h.id, expectedRevision: 0,
    clientActionId: "pause_action_1", action: "pause"}), true);
  assert.equal(validate({sessionId: h.id, expectedRevision: 0,
    clientActionId: "pause_action_1", action: "pause",
    practiceOperatorId: receiver}), false);
});
