import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  hostAssignmentViewId,
  reconcileEventAssignmentView,
  reconcileProgramAssignmentView,
  reconcileTeamAssignmentView,
} from "./hostAssignmentViews";

const NOW = now.toMillis();
const LATER = NOW + 86_400_000;
const SOONER = NOW + 3_600_000;
const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

const programGrant = (uid: string, overrides: FakeData = {}): FakeData => ({
  organizerId: "org-1", programId: "program-1", uid, displayName: "Staff",
  phoneLastFour: "4321",
  duties: [
    {duty: "airportGreeter", pickupPointIds: ["pp-t3"], hotelIds: [],
      expiresAtMillis: LATER},
    {duty: "hotelDesk", pickupPointIds: [], hotelIds: ["hotel-1"],
      expiresAtMillis: SOONER},
    {duty: "guestRelations", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: NOW - 1},
  ],
  status: "active", createdBy: "manager-1", createdAt: now,
  expiresAt: at(LATER), revokedBy: null, revokedAt: null, updatedAt: now,
  revision: 1, ...overrides});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {name: "Sharma Weddings", hostUserIds: ["manager-1"],
    phone: "+919800000000"},
  "organizers/org-2": {name: "Catch Mixers", hostUserIds: ["manager-2"]},
  "organizerPrograms/program-1": {organizerId: "org-1",
    title: "Sharma-Rao Wedding", kind: "wedding", status: "active",
    timezone: "Asia/Kolkata", createdBy: "manager-1", revision: 1},
  "events/event-1": {organizerId: "org-2", name: "Winter Mixer"},
  "organizerTeamMemberships/org-1_manager-1": {organizerId: "org-1",
    uid: "manager-1", role: "owner", status: "active"},
  "programStaffGrants/program-1__staff-1": programGrant("staff-1"),
  "eventStaffGrants/event-1__staff-1": {organizerId: "org-2",
    eventId: "event-1", uid: "staff-1", displayName: "Staff",
    phoneLastFour: "4321", role: "checkInOperator",
    permissions: ["setAttendance"], status: "active",
    createdBy: "manager-2", createdAt: now, expiresAt: at(LATER),
    revokedBy: null, revokedAt: null, updatedAt: now, revision: 1},
});

const row = (db: FakeFirestore, uid: string, kind: "program" | "event" |
  "team", scopeId: string) => db.getDoc(
    `hostAssignmentViews/${hostAssignmentViewId(uid, kind, scopeId)}`) as
  Record<string, unknown> | undefined;

test("a programme row carries the title, organiser and live duties only",
  async () => {
    const db = new FakeFirestore(seed());
    await reconcileProgramAssignmentView(db as never, "staff-1", "program-1",
      NOW);
    const view = row(db, "staff-1", "program", "program-1")!;
    assert.equal(view.title, "Sharma-Rao Wedding");
    assert.equal(view.organizerName, "Sharma Weddings");
    assert.equal(view.status, "active");
    assert.equal(view.grantExpiresAtMillis, LATER);
    assert.deepEqual(view.duties, [
      {duty: "airportGreeter", pickupPointIds: ["pp-t3"],
        expiresAtMillis: LATER},
      {duty: "hotelDesk", hotelIds: ["hotel-1"], expiresAtMillis: SOONER},
    ]);
    const text = JSON.stringify(view);
    for (const secret of ["4321", "9800000000"]) {
      assert.equal(text.includes(secret), false, secret);
    }
  });

test("a revoked or archived grant is inactive; a gone one has no row",
  async () => {
    const db = new FakeFirestore(seed());
    await reconcileProgramAssignmentView(db as never, "staff-1", "program-1",
      NOW);
    db.setDoc("programStaffGrants/program-1__staff-1",
      programGrant("staff-1", {status: "revoked", revokedAt: now}));
    await reconcileProgramAssignmentView(db as never, "staff-1", "program-1",
      NOW);
    assert.equal(row(db, "staff-1", "program", "program-1")!.status,
      "inactive");
    db.setDoc("programStaffGrants/program-1__staff-1", programGrant("staff-1"));
    db.updateDoc("organizerPrograms/program-1", {status: "archived"});
    await reconcileProgramAssignmentView(db as never, "staff-1", "program-1",
      NOW);
    assert.equal(row(db, "staff-1", "program", "program-1")!.status,
      "inactive");
    db.deleteDoc("programStaffGrants/program-1__staff-1");
    await reconcileProgramAssignmentView(db as never, "staff-1", "program-1",
      NOW);
    assert.equal(row(db, "staff-1", "program", "program-1"), undefined);
  });

test("an unapproved future grant starts at the approval instant", async () => {
  const db = new FakeFirestore(seed());
  db.setDoc("programStaffGrants/program-1__staff-2", programGrant("staff-2", {
    createdBy: "coordinator-1",
    programAuthorization: {ownerUid: "manager-1",
      approvedByUid: "manager-1", approvedAtMillis: NOW + 60_000,
      authorizedUntilMillis: LATER}}));
  await reconcileProgramAssignmentView(db as never, "staff-2", "program-1",
    NOW);
  const view = row(db, "staff-2", "program", "program-1")!;
  assert.equal(view.status, "active");
  assert.equal(view.activeFromMillis, NOW + 60_000);
});

test("an event grant maps its role; a team membership is a row while active",
  async () => {
    const db = new FakeFirestore(seed());
    await reconcileEventAssignmentView(db as never, "event-1__staff-1");
    const event = row(db, "staff-1", "event", "event-1")!;
    assert.equal(event.title, "Winter Mixer");
    assert.equal(event.organizerName, "Catch Mixers");
    assert.deepEqual(event.duties, [{duty: "functionCheckIn",
      expiresAtMillis: LATER}]);
    const previous = db.getDoc("eventStaffGrants/event-1__staff-1");
    db.deleteDoc("eventStaffGrants/event-1__staff-1");
    await reconcileEventAssignmentView(db as never, "event-1__staff-1",
      previous as never);
    assert.equal(row(db, "staff-1", "event", "event-1"), undefined);

    await reconcileTeamAssignmentView(db as never, "org-1_manager-1");
    const team = row(db, "manager-1", "team", "org-1")!;
    assert.equal(team.title, "Sharma Weddings");
    assert.equal(team.status, "active");
    db.updateDoc("organizerTeamMemberships/org-1_manager-1",
      {status: "removed"});
    await reconcileTeamAssignmentView(db as never, "org-1_manager-1");
    assert.equal(row(db, "manager-1", "team", "org-1"), undefined);
  });
