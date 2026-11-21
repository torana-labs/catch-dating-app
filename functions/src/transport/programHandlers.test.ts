import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {
  createOrganizerProgramHandler,
  updateOrganizerProgramHandler,
} from "../programs/programs";
import {
  getProgramWorkAccessHandler,
  grantProgramStaffHandler,
} from "../programs/programStaff";
import {upsertProgramGuestHandler} from "../programs/programGuests";
import {
  getProgramTransportPlanHandler,
  setProgramTravelReadinessHandler,
} from "./programArrivals";
import {
  dispatchProgramTripHandler,
  voidProgramTripHandler,
} from "./programDispatch";

import {FakeFirestore} from
  "../shared/testing/programFirestore";

import {baseSeed, deps, now, readySeed, request, transportSettings} from
  "../shared/testing/programFixtures";

test("createOrganizerProgram requires organizer management", async () => {
  const firestore = new FakeFirestore(baseSeed());
  await assert.rejects(
    createOrganizerProgramHandler(request({
      organizerId: "org-1",
      kind: "wedding",
      title: "Test",
      timezone: "Asia/Kolkata",
      startsAtMillis: 1,
      endsAtMillis: 2,
      capabilities: ["arrivalsTransport"],
    }, "stranger"), deps(firestore)),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
  const created = await createOrganizerProgramHandler(request({
    organizerId: "org-1",
    kind: "wedding",
    title: "New Program",
    timezone: "Asia/Kolkata",
    startsAtMillis: 1_800_000_000_000,
    endsAtMillis: 1_800_300_000_000,
    capabilities: ["arrivalsTransport"],
  }, "manager-1"), deps(firestore));
  assert.equal(created.revision, 1);
  const stored = firestore.getDoc(`organizerPrograms/${created.entityId}`);
  assert.equal(stored?.status, "draft");
  // Premium default: 30-minute bands, 10-minute ready wait.
  const settings = stored?.transportSettings as Record<string, unknown>;
  assert.equal(settings.bandWindowMillis, 30 * 60 * 1000);
  assert.equal(settings.maxReadyWaitMillis, 10 * 60 * 1000);
});

test("updateOrganizerProgram fences on revision and stores settings",
  async () => {
    const firestore = new FakeFirestore(baseSeed());
    await assert.rejects(
      updateOrganizerProgramHandler(request({
        programId: "program-1",
        expectedRevision: 99,
        transportSettings: {
          ...transportSettings,
          maxReadyWaitMillis: 5 * 60 * 1000,
        },
      }, "manager-1"), deps(firestore)),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "aborted"
    );
    const updated = await updateOrganizerProgramHandler(request({
      programId: "program-1",
      expectedRevision: 3,
      transportSettings: {
        ...transportSettings,
        maxReadyWaitMillis: 5 * 60 * 1000,
      },
    }, "manager-1"), deps(firestore));
    const stored = firestore.getDoc("organizerPrograms/program-1");
    const settings = stored?.transportSettings as Record<string, unknown>;
    assert.equal(settings.maxReadyWaitMillis, 5 * 60 * 1000);
    assert.equal(updated.revision, stored?.revision);
  });

test("rsvpDeadlineAt stores and clears; date moves replan anchored runs",
  async () => {
    const firestore = new FakeFirestore(baseSeed());
    // An armed scopeStart-anchored moment — the update must replan it now,
    // not when the sweep cursor next reaches it. scopeKind/scopeId are the
    // denormalized lookup fields momentToDocument writes.
    firestore.setDoc("organizerMoments/m_start", {
      momentId: "m_start",
      scope: {kind: "program", programId: "program-1"},
      scopeKind: "program", scopeId: "program-1",
      name: "Program starts soon",
      initiation: {kind: "anchored", anchorKind: "scopeStart",
        anchorId: null, offsetMinutes: -15},
      sense: "audience",
      audience: {kind: "households", rsvpPendingOnly: false},
      action: {kind: "sendTemplate", connectionId: "conn-1",
        templateId: "tpl-1", variables: {}},
      status: "armed",
      approval: {approvedByUid: "manager-1", approvedAtMillis: 1},
      origin: "organizer", revision: 1,
    });
    const updated = await updateOrganizerProgramHandler(request({
      programId: "program-1",
      expectedRevision: 3,
      startsAtMillis: 1_800_100_000_000,
      rsvpDeadlineAtMillis: 1_700_000_000_000,
    }, "manager-1"), deps(firestore));
    const stored = firestore.getDoc("organizerPrograms/program-1");
    assert.equal(
      (stored?.rsvpDeadlineAt as {toMillis(): number}).toMillis(),
      1_700_000_000_000);
    // due = 1_800_100_000_000 - 15m = 1_800_099_100_000 under the new
    // anchor revision — the occurrence identity moved with the anchor.
    const run = firestore.getDoc(
      `organizerMomentRuns/m_start_${updated.revision}_1800099100000`);
    assert.equal(run?.status, "planned");
    assert.equal(run?.nominalDueAtMillis, 1_800_099_100_000);
    // A before-the-anchor reminder dies at the anchor, not on retries.
    assert.equal(run?.expiresAtMillis, 1_800_100_000_000);
    // Clearing the deadline is an explicit null write.
    await updateOrganizerProgramHandler(request({
      programId: "program-1",
      expectedRevision: updated.revision,
      rsvpDeadlineAtMillis: null,
    }, "manager-1"), deps(firestore));
    assert.equal(
      firestore.getDoc("organizerPrograms/program-1")?.rsvpDeadlineAt,
      null);
  });

test("staff grants are duty-scoped, expiring, and station-checked",
  async () => {
    const firestore = new FakeFirestore(baseSeed());
    await assert.rejects(
      grantProgramStaffHandler(request({
        programId: "program-1",
        phoneNumber: "+91 90000 00009",
        duties: [{duty: "airportGreeter", pickupPointIds: [], hotelIds: []}],
        expiresAtMillis: now.toMillis() + 86_400_000,
      }, "greeter-1"), deps(firestore)),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
    await assert.rejects(
      grantProgramStaffHandler(request({
        programId: "program-1",
        phoneNumber: "+91 90000 00009",
        duties: [{
          duty: "airportGreeter",
          pickupPointIds: ["pp-foreign"],
          hotelIds: [],
        }],
        expiresAtMillis: now.toMillis() + 86_400_000,
      }, "manager-1"), deps(firestore)),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument"
    );
    const receipt = await grantProgramStaffHandler(request({
      programId: "program-1",
      phoneNumber: "+91 90000 00009",
      duties: [{
        duty: "airportGreeter",
        pickupPointIds: ["pp-t1"],
        hotelIds: [],
      }],
      expiresAtMillis: now.toMillis() + 86_400_000,
    }, "manager-1"), deps(firestore));
    assert.equal(receipt.entityId, "new-staff-1");
    const grant = firestore.getDoc("programStaffGrants/program-1__new-staff-1");
    assert.equal(grant?.status, "active");
  });

test("work access redacts a greeter to their station scope", async () => {
  const firestore = new FakeFirestore(baseSeed());
  const access = await getProgramWorkAccessHandler(request({
    programId: "program-1",
  }, "greeter-1"), deps(firestore));
  assert.equal(access.actorRole, "staff");
  assert.deepEqual(access.pickupPoints.map((p) => p.pickupPointId),
    ["pp-t3"]);
  // Greeters still see labeled destinations for roster context.
  assert.deepEqual(access.hotels.map((h) => h.hotelId).sort(),
    ["hotel-1", "hotel-2"]);
  await assert.rejects(
    getProgramWorkAccessHandler(request({programId: "program-1"},
      "stranger"), deps(firestore)),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("two guests sharing a phone stay distinct people", async () => {
  const firestore = new FakeFirestore(baseSeed());
  const managerDeps = deps(firestore);
  const first = await upsertProgramGuestHandler(request({
    programId: "program-1",
    displayName: "Kid One",
    phoneE164: "+919111111111",
  }, "manager-1"), managerDeps);
  const second = await upsertProgramGuestHandler(request({
    programId: "program-1",
    displayName: "Kid Two",
    phoneE164: "+919111111111",
  }, "manager-1"), managerDeps);
  assert.notEqual(first.entityId, second.entityId);
});

test("claims are exclusive, releasable, and replay-safe", async () => {
  const firestore = new FakeFirestore(baseSeed());
  const greeterDeps = deps(firestore);
  const claim = await setProgramTravelReadinessHandler(request({
    programId: "program-1",
    legId: "leg-1",
    action: "claim",
    observedAtMillis: now.toMillis(),
    expectedRevision: 1,
    clientOperationId: "op-claim-1",
  }, "greeter-1"), greeterDeps);
  assert.equal(claim.alreadyApplied, false);
  // Same request replayed returns the stored result.
  const replay = await setProgramTravelReadinessHandler(request({
    programId: "program-1",
    legId: "leg-1",
    action: "claim",
    observedAtMillis: now.toMillis(),
    expectedRevision: 1,
    clientOperationId: "op-claim-1",
  }, "greeter-1"), greeterDeps);
  assert.equal(replay.alreadyApplied, true);
  assert.equal(replay.revision, claim.revision);
  // A second greeter cannot steal the claim.
  await assert.rejects(
    setProgramTravelReadinessHandler(request({
      programId: "program-1",
      legId: "leg-1",
      action: "claim",
      observedAtMillis: now.toMillis(),
      expectedRevision: claim.revision,
      clientOperationId: "op-claim-2",
    }, "greeter-2"), greeterDeps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "already-exists"
  );
  // Same operation id with a different payload is rejected.
  await assert.rejects(
    setProgramTravelReadinessHandler(request({
      programId: "program-1",
      legId: "leg-1",
      action: "claim",
      observedAtMillis: now.toMillis(),
      expectedRevision: 7,
      clientOperationId: "op-claim-1",
    }, "greeter-1"), greeterDeps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "aborted"
  );
  // Claimants may release their own claim.
  await setProgramTravelReadinessHandler(request({
    programId: "program-1",
    legId: "leg-1",
    action: "unclaim",
    observedAtMillis: now.toMillis(),
    expectedRevision: claim.revision,
    clientOperationId: "op-unclaim-1",
  }, "greeter-1"), greeterDeps);
  assert.equal(
    firestore.getDoc("programTravelLegs/leg-1")?.claimedByUid, null);
  // Greeters cannot touch a leg at a station outside their scope.
  await assert.rejects(
    setProgramTravelReadinessHandler(request({
      programId: "program-1",
      legId: "leg-2",
      action: "claim",
      observedAtMillis: now.toMillis(),
      expectedRevision: 1,
      clientOperationId: "op-claim-3",
    }, "greeter-1"), greeterDeps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("dispatch writes trip, assignments and receipt atomically", async () => {
  const firestore = new FakeFirestore(readySeed());
  const dispatchDeps = deps(firestore);
  const dispatched = await dispatchProgramTripHandler(request({
    programId: "program-1",
    pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1",
    vehicleClassId: "suv",
    plateDisplay: "DL-1T-4471",
    vendorId: "vendor-1",
    legIds: ["leg-1"],
    expectedLegRevisions: [{legId: "leg-1", revision: 1}],
    clientOperationId: "op-dispatch-1",
  }, "dispatcher-1"), dispatchDeps);
  assert.equal(dispatched.passengerCount, 2);
  const trip = firestore.getDoc(`transportTrips/${dispatched.tripId}`);
  assert.equal(trip?.plateNormalized, "DL1T4471");
  assert.equal(trip?.vendorNameSnapshot, "Harbour Line Cabs");
  assert.equal(trip?.status, "enRoute");
  assert.equal(
    firestore.getDoc("programTravelLegs/leg-1")?.readiness, "dispatched");
  const assignment = firestore.getDoc(
    "transportActiveAssignments/program-1__leg-1");
  assert.equal(assignment?.status, "active");
  assert.equal(assignment?.tripId, dispatched.tripId);
  // Exact replay returns the original trip, not a duplicate.
  const replay = await dispatchProgramTripHandler(request({
    programId: "program-1",
    pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1",
    vehicleClassId: "suv",
    plateDisplay: "DL-1T-4471",
    vendorId: "vendor-1",
    legIds: ["leg-1"],
    expectedLegRevisions: [{legId: "leg-1", revision: 1}],
    clientOperationId: "op-dispatch-1",
  }, "dispatcher-1"), dispatchDeps);
  assert.equal(replay.alreadyApplied, true);
  assert.equal(replay.tripId, dispatched.tripId);
  // A second dispatch of an assigned leg is rejected.
  await assert.rejects(
    dispatchProgramTripHandler(request({
      programId: "program-1",
      pickupPointId: "pp-t3",
      destinationHotelId: "hotel-1",
      vehicleClassId: "sedan",
      plateDisplay: "DL-9Z-0001",
      legIds: ["leg-1"],
      expectedLegRevisions: [{legId: "leg-1", revision: 1}],
      clientOperationId: "op-dispatch-2",
    }, "dispatcher-1"), dispatchDeps),
    (error: unknown) =>
      error instanceof HttpsError &&
      ["already-exists", "failed-precondition", "aborted"].includes(error.code)
  );
  // A greeter cannot dispatch.
  await assert.rejects(
    dispatchProgramTripHandler(request({
      programId: "program-1",
      pickupPointId: "pp-t1",
      destinationHotelId: "hotel-1",
      vehicleClassId: "sedan",
      plateDisplay: "DL-9Z-0002",
      legIds: ["leg-2"],
      expectedLegRevisions: [{legId: "leg-2", revision: 1}],
      clientOperationId: "op-dispatch-3",
    }, "greeter-1"), dispatchDeps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
  // Voiding releases the assignment and returns the leg to ready.
  const tripDoc = firestore.getDoc(`transportTrips/${dispatched.tripId}`);
  const voided = await voidProgramTripHandler(request({
    programId: "program-1",
    tripId: dispatched.tripId,
    reason: "Wrong vehicle dispatched",
    expectedRevision: tripDoc?.revision as number,
    clientOperationId: "op-void-1",
  }, "dispatcher-1"), dispatchDeps);
  assert.equal(voided.alreadyApplied, false);
  assert.equal(
    firestore.getDoc(`transportTrips/${dispatched.tripId}`)?.status,
    "voided");
  assert.equal(
    firestore.getDoc(`transportTrips/${dispatched.tripId}`)?.voidReason,
    "Wrong vehicle dispatched");
  assert.equal(
    firestore.getDoc("transportActiveAssignments/program-1__leg-1")?.status,
    "released");
  assert.equal(
    firestore.getDoc("programTravelLegs/leg-1")?.readiness, "ready");
});

test("hotel staff cannot void a dispatched trip", async () => {
  const firestore = new FakeFirestore(readySeed());
  const dispatchDeps = deps(firestore);
  const dispatched = await dispatchProgramTripHandler(request({
    programId: "program-1",
    pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1",
    vehicleClassId: "suv",
    plateDisplay: "DL-1T-4471",
    vendorId: "vendor-1",
    legIds: ["leg-1"],
    expectedLegRevisions: [{legId: "leg-1", revision: 1}],
    clientOperationId: "op-dispatch-9",
  }, "dispatcher-1"), dispatchDeps);
  // Hotel staff cannot void a dispatched trip.
  const tripDoc = firestore.getDoc(`transportTrips/${dispatched.tripId}`);
  await assert.rejects(
    voidProgramTripHandler(request({
      programId: "program-1",
      tripId: dispatched.tripId,
      reason: "Hotel cannot void",
      expectedRevision: tripDoc?.revision as number,
      clientOperationId: "op-void-hotel",
    }, "hotelier-1"), dispatchDeps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("transport plan groups by station, destination and readiness",
  async () => {
    const firestore = new FakeFirestore(baseSeed());
    // leg-1 (T3, hotel-1, scheduled) vs leg-2 (T1, hotel-1): separate
    // stations, so the dispatcher sees each station's plan independently.
    const plan = await getProgramTransportPlanHandler(request({
      programId: "program-1",
      pickupPointId: "pp-t3",
    }, "dispatcher-1"), deps(firestore));
    assert.equal(plan.groups.length, 1);
    const group = plan.groups[0];
    assert.deepEqual(group.legIds, ["leg-1"]);
    assert.equal(group.vehicleClassId, "sedan");
    assert.equal(group.readiness, "expected");
    assert.equal(group.waitOverdue, false);
    // A dispatcher without station restriction sees the T1 plan too.
    const t1 = await getProgramTransportPlanHandler(request({
      programId: "program-1",
      pickupPointId: "pp-t1",
    }, "dispatcher-1"), deps(firestore));
    assert.equal(t1.groups.length, 1);
    assert.deepEqual(t1.groups[0].legIds, ["leg-2"]);
  });
