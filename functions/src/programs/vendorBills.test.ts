import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {reconcileProgramVendorBillHandler} from "./vendorBills";
import {contractValidator} from "../shared/contractTestValidators";

const validateDocument = contractValidator("ProgramVendorBillDocument");
const validateResponse =
  contractValidator("ProgramVendorBillCallableResponse");
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

function trip(id: string, amountMinor: number | null,
  status = "arrived"): Record<string, FakeData> {
  return {[`transportTrips/${id}`]: {programId: "program-1",
    organizerId: "org-1", kind: "pickup", pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1", destinationLabel: "Taj Palace",
    vehicleClassId: "suv", vendorId: "vendor-1",
    vendorNameSnapshot: "Sharma Cabs", plateNormalized: "RJ27TA4471",
    plateDisplay: "RJ 27 TA 4471", partyIds: [], legIds: [],
    passengerCount: 4, status,
    departedAt: admin.firestore.Timestamp.fromMillis(now.toMillis()),
    rateSnapshot: amountMinor === null ? null :
      {currency: "INR", amountMinor, pricingKind: "perTrip"}}};
}

function setup() {
  const db = new FakeFirestore({
    ...baseSeed(),
    ...trip("tripaaaa-0001", 200000),
    ...trip("tripbbbb-0002", 200000),
    ...trip("tripcccc-0003", null),
    ...trip("tripdddd-0004", 150000, "voided"),
    ...trip("tripeeee-0005", 180000),
  });
  return {db, billDeps: deps(db)};
}

const lines = [
  {reference: "tripaaaa", billedMinor: 200000},
  {reference: "tripbbbb", billedMinor: 240000},
  {reference: "T-099 airport run", billedMinor: 90000},
  {reference: "x", tripId: "tripaaaa-0001", billedMinor: 200000},
  {reference: "tripcccc-0003", billedMinor: 100000},
  {reference: "tripdddd", billedMinor: 150000},
];

test("a bill is checked line by line against recorded trips", async () => {
  const {db, billDeps} = setup();
  const empty = await reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "review"},
  "manager-1"), billDeps);
  assert.equal(empty.bill, null);
  assert.equal(empty.recordedTrips, 4);
  assert.equal(empty.recordedMinor, 580000);

  const checked = await reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "check",
    invoiceNumber: "2026-118", receivedAtMillis: now.toMillis(), lines,
    expectedRevision: 0, requestId: "bill-request-1"}, "manager-1"),
  billDeps);
  assert.equal(validateResponse(checked), true,
    JSON.stringify(validateResponse.errors));
  assert.deepEqual(checked.bill!.lines.map((line) => line.check), [
    "matches", "amountDiffers", "noTrip", "duplicate", "noRate", "voided"]);
  assert.deepEqual(checked.bill!.totals, {billedMinor: 980000,
    recordedMinor: 400000, questionMinor: 580000, billedTrips: 6,
    recordedTrips: 4, unbilledTrips: 1});
  assert.deepEqual(checked.unbilled.map((entry) => entry.tripId),
    ["tripeeee-0005"]);
  const doc = db.getDoc("programVendorBills/program-1_vendor-1")!;
  assert.equal(validateDocument(doc), true,
    JSON.stringify(validateDocument.errors));

  // Replay returns the stored bill; a stale revision is refused.
  const replay = await reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "check",
    invoiceNumber: "2026-118", receivedAtMillis: now.toMillis(), lines,
    expectedRevision: 0, requestId: "bill-request-1"}, "manager-1"),
  billDeps);
  assert.equal(replay.bill!.revision, 1);
  await assert.rejects(reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "approve",
    expectedRevision: 0, requestId: "bill-request-2"}, "manager-1"),
  billDeps), code("aborted"));

  const questioned = await reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "question",
    note: "Three trips do not match our records.", expectedRevision: 1,
    requestId: "bill-request-3"}, "manager-1"), billDeps);
  assert.equal(questioned.bill!.status, "questioned");
  const approved = await reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "approve",
    expectedRevision: 2, requestId: "bill-request-4"}, "manager-1"),
  billDeps);
  assert.equal(approved.bill!.status, "approved");
  assert.equal(approved.bill!.approvedMinor, 400000);
  await assert.rejects(reconcileProgramVendorBillHandler(request({
    programId: "program-1", vendorId: "vendor-1", action: "question",
    note: "Again", expectedRevision: 3, requestId: "bill-request-5"},
  "manager-1"), billDeps), code("failed-precondition"));
});

test("only managers change a bill; other vendors are not found",
  async () => {
    const {billDeps} = setup();
    await assert.rejects(reconcileProgramVendorBillHandler(request({
      programId: "program-1", vendorId: "vendor-1", action: "review"},
    "greeter-1"), billDeps), code("permission-denied"));
    await assert.rejects(reconcileProgramVendorBillHandler(request({
      programId: "program-1", vendorId: "vendor-9", action: "review"},
    "manager-1"), billDeps), code("not-found"));
    await assert.rejects(reconcileProgramVendorBillHandler(request({
      programId: "program-1", vendorId: "vendor-1", action: "question",
      note: "Hello", expectedRevision: 0, requestId: "bill-request-6"},
    "manager-1"), billDeps), code("failed-precondition"));
  });
