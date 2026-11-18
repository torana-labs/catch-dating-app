import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {baseSeed} from "../shared/testing/programFixtures";
import {
  activeProgramDuties,
  programStaffDuties,
} from "../shared/programAuthority";
import type {
  OrganizerProgramDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  ownerProgramAccessView,
  programWriteChangesStaffViews,
  reconcileProgramAccessView,
  staffProgramAccessView,
} from "./programAccessView";

const at = (millis: number) => Timestamp.fromMillis(millis);
const now = 1_800_000_000_000;
const hour = 3_600_000;
const program = {organizerId: "org-1", createdBy: "manager-1",
  status: "active"} as unknown as OrganizerProgramDocument;

function grant(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org-1", programId: "program-1", uid: "staff-1",
    displayName: "Arjun", phoneLastFour: "0001",
    duties: [{duty: "airportGreeter", pickupPointIds: ["pp-1"], hotelIds: [],
      expiresAtMillis: now + hour}],
    status: "active", createdBy: "manager-1", createdAt: at(now - hour),
    expiresAt: at(now + hour), revokedBy: null, revokedAt: null,
    updatedAt: at(now), revision: 4, ...overrides,
  } as unknown as ProgramStaffGrantDocument;
}

test("the owner is a manager with no expiry and no identity fields", () => {
  const view = ownerProgramAccessView(program, "program-1")!;
  assert.equal(view.role, "manager");
  assert.equal(view.uid, "manager-1");
  assert.equal(view.expiresAtMillis, null);
  assert.deepEqual(Object.keys(view).sort(), [
    "activeFromMillis", "arrivalRoutes", "assignments", "duties",
    "expiresAtMillis", "functionAll",
    "functionScoped", "grantExpiresAtMillis", "hotelAll", "hotelScoped",
    "organizerId", "ownerUid",
    "pickupAll", "pickupScoped", "programId", "revision", "role", "status",
    "uid", "version", "workFunction", "workHotel", "workPickup"]);
});

test("a station-scoped duty lists its station and no all-station key", () => {
  const view = staffProgramAccessView(program, "program-1", grant(), now)!;
  assert.equal(view.status, "active");
  assert.deepEqual(view.duties, {airportGreeter: now + hour});
  assert.deepEqual(view.pickupScoped, {"airportGreeter__pp-1": now + hour});
  assert.deepEqual(view.pickupAll, {});
  assert.deepEqual(view.hotelAll, {airportGreeter: now + hour});
  assert.equal(view.expiresAtMillis, now + hour);
  assert.equal(view.revision, 4);
  // The tuples and the grant's own expiry travel for the phone's policies.
  assert.deepEqual(view.assignments, [{duty: "airportGreeter",
    pickupPointIds: ["pp-1"], hotelIds: [], expiresAtMillis: now + hour}]);
  assert.equal(view.grantExpiresAtMillis, now + hour);
});

test("the work lists follow the work-access callable's scope rules", () => {
  const view = staffProgramAccessView(program, "program-1", grant({
    duties: [
      {duty: "airportGreeter", pickupPointIds: ["pp-1"], hotelIds: [],
        expiresAtMillis: now + hour},
      {duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h-1"],
        expiresAtMillis: now + hour},
      {duty: "functionCheckIn", pickupPointIds: [], hotelIds: [],
        functionIds: ["f-1"], expiresAtMillis: now + hour},
      {duty: "programAdmin", pickupPointIds: [], hotelIds: [],
        expiresAtMillis: now + hour},
    ]}), now)!;
  // The hotel desk adds no pickup points, and programAdmin adds nothing.
  assert.deepEqual(view.workPickup, {"pp-1": now + hour,
    // functionCheckIn names no pickup points, so it covers them all.
    "*": now + hour});
  assert.deepEqual(view.workHotel, {"*": now + hour,
    "h-1": now + hour});
  assert.deepEqual(view.workFunction, {"f-1": now + hour});
  const desk = staffProgramAccessView(program, "program-1", grant({
    duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h-1"],
      expiresAtMillis: now + hour}]}), now)!;
  assert.deepEqual(desk.workPickup, {});
  assert.deepEqual(desk.workHotel, {"h-1": now + hour});
  assert.deepEqual(desk.workFunction, {});
});

test("arrival routes pair one assignment's pickup and hotel scopes", () => {
  const view = staffProgramAccessView(program, "program-1", grant({
    duties: [
      {duty: "airportGreeter", pickupPointIds: ["pp-1", "pp-2"],
        hotelIds: [], expiresAtMillis: now + hour},
      {duty: "transportDispatcher", pickupPointIds: ["pp-3"],
        hotelIds: ["h-1"], expiresAtMillis: now + hour},
      {duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h-9"],
        expiresAtMillis: now + hour},
    ]}), now)!;
  assert.deepEqual(view.arrivalRoutes, {"pp-1|*": now + hour,
    "pp-2|*": now + hour, "pp-3|h-1": now + hour});
  // A coordinator reaches every journey.
  const coordinator = staffProgramAccessView(program, "program-1", grant({
    duties: [{duty: "programCoordinator", pickupPointIds: [],
      hotelIds: [], expiresAtMillis: now + hour}]}), now)!;
  assert.deepEqual(coordinator.arrivalRoutes, {"*|*": now + hour});
});

test("a coordinator holds every duty but programAdmin, program-wide", () => {
  const view = staffProgramAccessView(program, "program-1", grant({
    duties: [{duty: "programCoordinator", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: now + hour}]}), now)!;
  for (const duty of programStaffDuties) {
    assert.equal(view.duties[duty],
      duty === "programAdmin" ? undefined : now + hour, duty);
  }
  assert.equal(view.functionAll.functionLead, now + hour);
});

test("independent assignments keep independent expiries", () => {
  const view = staffProgramAccessView(program, "program-1", grant({
    expiresAt: at(now + 5 * hour),
    duties: [
      {duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"],
        expiresAtMillis: now + hour},
      {duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1", "h2"],
        expiresAtMillis: now + 3 * hour},
    ]}), now)!;
  assert.deepEqual(view.hotelScoped,
    {"hotelDesk__h1": now + 3 * hour, "hotelDesk__h2": now + 3 * hour});
  assert.equal(view.expiresAtMillis, now + 3 * hour);
});

test("the owner's approval proof bounds every duty and starts the clock",
  () => {
    const proof = {ownerUid: "manager-1", approvedByUid: "manager-1",
      approvedAtMillis: now + hour / 2, authorizedUntilMillis: now + hour};
    const view = staffProgramAccessView(program, "program-1", grant({
      programAuthorization: proof}), now)!;
    assert.equal(view.status, "active");
    assert.equal(view.activeFromMillis, now + hour / 2);
    // A duty reaching past the authorized deadline is dropped.
    const past = staffProgramAccessView(program, "program-1", grant({
      programAuthorization: {...proof, authorizedUntilMillis: now + hour / 4},
    }), now)!;
    assert.equal(past.status, "inactive");
    assert.deepEqual(past.duties, {});
    // A proof from someone other than the program's owner proves nothing.
    const foreign = staffProgramAccessView(program, "program-1", grant({
      programAuthorization: {...proof, ownerUid: "impostor"}}), now)!;
    assert.equal(foreign.status, "inactive");
  });

test("revoked, expired or foreign grants never carry authority", () => {
  const revoked = staffProgramAccessView(program, "program-1",
    grant({status: "revoked", revokedBy: "manager-1",
      revokedAt: at(now)}), now)!;
  assert.equal(revoked.status, "inactive");
  const expired = staffProgramAccessView(program, "program-1",
    grant({expiresAt: at(now - 1)}), now)!;
  assert.equal(expired.status, "inactive");
  assert.equal(staffProgramAccessView(program, "program-1",
    grant({organizerId: "foreign"}), now), null);
  assert.equal(staffProgramAccessView(program, "program-1",
    grant({programId: "other"}), now), null);
});

test("the view's live duties equal activeProgramDuties at any instant", () => {
  const shapes = [
    grant(),
    grant({duties: [
      {duty: "programCoordinator", pickupPointIds: [], hotelIds: [],
        expiresAtMillis: now + 2 * hour},
      {duty: "functionLead", pickupPointIds: [], hotelIds: [],
        functionIds: ["f1"], expiresAtMillis: now + hour}],
    expiresAt: at(now + 2 * hour)}),
    grant({duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: now + hour}]}),
  ];
  for (const source of shapes) {
    const view = staffProgramAccessView(program, "program-1", source, now)!;
    for (const instant of [now, now + hour / 2, now + hour + 1,
      now + 2 * hour - 1]) {
      const live = new Set(activeProgramDuties(source, instant)
        .flatMap((a) => a.duty === "programCoordinator" ?
          programStaffDuties.filter((d) => d !== "programAdmin") : [a.duty]));
      const fromView = new Set(Object.entries(view.duties)
        .filter(([, expiry]) => expiry > instant).map(([duty]) => duty));
      assert.deepEqual([...fromView].sort(), [...live].sort(),
        `${JSON.stringify(source.duties)} at +${instant - now}`);
    }
  }
});

test("reconcile writes the view, skips a no-op and deletes with the grant",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const db = store as unknown as FirebaseFirestore.Firestore;
    store.setDoc("programStaffGrants/program-1__greeter-1", {
      ...baseSeed()["programStaffGrants/program-1__greeter-1"]});
    await reconcileProgramAccessView(db, "program-1", "greeter-1", now);
    const path = "programAccessViews/program-1__greeter-1";
    assert.equal((store.getDoc(path) as {role: string}).role, "staff");
    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramAccessView(db, "program-1", "greeter-1", now);
    assert.equal(writes, 0, "a no-op writes nothing");
    await reconcileProgramAccessView(db, "program-1", "manager-1", now);
    assert.equal((store.getDoc("programAccessViews/program-1__manager-1") as
      {role: string}).role, "manager");
    store.deleteDoc("programStaffGrants/program-1__greeter-1");
    await reconcileProgramAccessView(db, "program-1", "greeter-1", now);
    assert.equal(store.getDoc(path), undefined);
  });

test("only a new, removed or re-owned program rewrites staff views", () => {
  assert.equal(programWriteChangesStaffViews(undefined, {createdBy: "a"}),
    true);
  assert.equal(programWriteChangesStaffViews({createdBy: "a"}, undefined),
    true);
  assert.equal(programWriteChangesStaffViews({createdBy: "a",
    organizerId: "o"}, {createdBy: "a", organizerId: "o", title: "x"}), false);
  assert.equal(programWriteChangesStaffViews({createdBy: "a",
    organizerId: "o"}, {createdBy: "b", organizerId: "o"}), true);
});
