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
  changedOrganizerManagers,
  organizerManagers,
  ownerProgramAccessView,
  programAccessViewFor,
  programWriteChangesStaffViews,
  reconcileOrganizerManagerViews,
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
    "organizerId", "organizerManager", "ownerUid",
    "pickupAll", "pickupScoped", "programAll", "programId", "revision",
    "role", "status",
    "tripRoutes", "uid", "version", "workFunction", "workHotel",
    "workPickup"]);
});

test("an organizer manager without a grant gets setup authority only", () => {
  const view = programAccessViewFor(program, "program-1", "host-2",
    undefined, true, now)!;
  assert.equal(view.organizerManager, true);
  // No duty: rules and work screens deny an inactive view.
  assert.equal(view.status, "inactive");
  assert.equal(view.role, "staff");
  assert.equal(view.expiresAtMillis, null);
  assert.deepEqual(view.duties, {});
  assert.deepEqual(view.workFunction, {});
  assert.deepEqual(view.assignments, []);
  assert.equal(view.ownerUid, "manager-1");
  // Someone who manages nothing and holds no grant gets no view.
  assert.equal(programAccessViewFor(program, "program-1", "host-2",
    undefined, false, now), null);
});

test("an organizer manager keeps a live grant's duties beside the flag",
  () => {
    const staff = staffProgramAccessView(program, "program-1", grant(), now)!;
    const both = programAccessViewFor(program, "program-1", "staff-1",
      grant(), true, now)!;
    assert.deepEqual(both, {...staff, organizerManager: true});
    assert.equal(staff.organizerManager, false);
    // A revoked grant leaves the setup flag, with no duty and its revision.
    const revoked = programAccessViewFor(program, "program-1", "staff-1",
      grant({status: "revoked", revokedBy: "manager-1", revokedAt: at(now)}),
      true, now)!;
    assert.equal(revoked.status, "inactive");
    assert.equal(revoked.organizerManager, true);
    assert.deepEqual(revoked.duties, {});
    assert.equal(revoked.revision, 4);
    // The owner stays the manager, flagged as they stand on the organizer.
    assert.equal(programAccessViewFor(program, "program-1", "manager-1",
      undefined, false, now)!.role, "manager");
    assert.equal(programAccessViewFor(program, "program-1", "manager-1",
      undefined, true, now)!.organizerManager, true);
  });

test("organizer writes name only the managers they add or remove", () => {
  const organizer = {hostUserId: "owner-1", ownerUserId: "owner-1",
    hostUserIds: ["owner-1", "host-2"]};
  assert.deepEqual(organizerManagers(organizer), ["owner-1", "host-2"]);
  assert.deepEqual(organizerManagers({hostUserIds: "owner-1"}), []);
  assert.deepEqual(changedOrganizerManagers(organizer,
    {...organizer, title: "Renamed"}), []);
  assert.deepEqual(changedOrganizerManagers(organizer,
    {...organizer, hostUserIds: ["owner-1", "host-3"]}), ["host-2", "host-3"]);
  assert.deepEqual(changedOrganizerManagers(undefined, organizer),
    ["host-2", "owner-1"]);
  assert.deepEqual(changedOrganizerManagers(organizer, undefined),
    ["host-2", "owner-1"]);
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

test("trip routes follow the reconciliation and dispatcher duties", () => {
  const view = staffProgramAccessView(program, "program-1", grant({
    duties: [
      {duty: "reconciliationViewer", pickupPointIds: ["pp-1"], hotelIds: [],
        expiresAtMillis: now + hour},
      {duty: "transportDispatcher", pickupPointIds: ["pp-2"],
        hotelIds: ["h-1"], expiresAtMillis: now + hour},
      {duty: "airportGreeter", pickupPointIds: ["pp-3"], hotelIds: [],
        expiresAtMillis: now + hour},
    ]}), now)!;
  assert.deepEqual(view.tripRoutes, {"pp-1|*": now + hour,
    "pp-2|h-1": now + hour});
  // The greeter reaches arrivals, never trips.
  assert.equal(view.arrivalRoutes["pp-3|*"], now + hour);
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
  assert.equal(view.programAll.guestRelations, now + hour);
  assert.equal(view.programAll.programAdmin, undefined);
});

test("programAll needs one assignment to cover the whole programme", () => {
  // Every pickup point from one assignment and every hotel from another is
  // not the whole programme: the guest directory stays closed.
  const split = staffProgramAccessView(program, "program-1", grant({
    duties: [
      {duty: "guestRelations", pickupPointIds: [], hotelIds: ["h-1"],
        expiresAtMillis: now + hour},
      {duty: "guestRelations", pickupPointIds: ["pp-1"], hotelIds: [],
        expiresAtMillis: now + hour},
    ]}), now)!;
  assert.equal(split.pickupAll.guestRelations, now + hour);
  assert.equal(split.hotelAll.guestRelations, now + hour);
  assert.deepEqual(split.programAll, {});
  const whole = staffProgramAccessView(program, "program-1", grant({
    duties: [
      {duty: "guestRelations", pickupPointIds: ["pp-1"], hotelIds: [],
        expiresAtMillis: now + 2 * hour},
      {duty: "guestRelations", pickupPointIds: [], hotelIds: [],
        expiresAtMillis: now + hour},
    ]}), now)!;
  assert.deepEqual(whole.programAll, {guestRelations: now + hour});
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

test("reconcile gives an organizer manager a view and takes it back",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const db = store as unknown as FirebaseFirestore.Firestore;
    const path = "programAccessViews/program-1__host-2";
    await reconcileProgramAccessView(db, "program-1", "host-2", now);
    assert.equal(store.getDoc(path), undefined, "not yet a manager");
    store.setDoc("organizers/org-1", {...baseSeed()["organizers/org-1"],
      hostUserIds: ["manager-1", "host-2"]});
    await reconcileProgramAccessView(db, "program-1", "host-2", now);
    const view = store.getDoc(path) as {organizerManager: boolean,
      status: string};
    assert.equal(view.organizerManager, true);
    assert.equal(view.status, "inactive");
    await reconcileProgramAccessView(db, "program-1", "manager-1", now);
    assert.equal((store.getDoc("programAccessViews/program-1__manager-1") as
      {organizerManager: boolean}).organizerManager, true);
    store.setDoc("organizers/org-1", {...baseSeed()["organizers/org-1"]});
    await reconcileProgramAccessView(db, "program-1", "host-2", now);
    assert.equal(store.getDoc(path), undefined, "no longer a manager");
  });

test("a manager change reaches every programme of the organizer",
  async () => {
    const store = new FakeFirestore(baseSeed());
    const db = store as unknown as FirebaseFirestore.Firestore;
    const programme = baseSeed()["organizerPrograms/program-1"];
    for (const id of ["program-2", "program-3"]) {
      store.setDoc(`organizerPrograms/${id}`, {...programme});
    }
    store.setDoc("organizerPrograms/program-other", {...programme,
      organizerId: "org-2"});
    store.setDoc("organizers/org-1", {...baseSeed()["organizers/org-1"],
      hostUserIds: ["manager-1", "host-2"]});
    await reconcileOrganizerManagerViews(db, "org-1", ["host-2"], now);
    for (const id of ["program-1", "program-2", "program-3"]) {
      assert.equal((store.getDoc(`programAccessViews/${id}__host-2`) as
        {organizerManager: boolean}).organizerManager, true, id);
    }
    assert.equal(store.getDoc("programAccessViews/program-other__host-2"),
      undefined);
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
