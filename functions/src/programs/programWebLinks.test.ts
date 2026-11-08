import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps, request, now} from "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {mintHouseholdToken, verifyHouseholdToken} from
  "../programRsvp/rsvpLinkTokens";
import {
  getProgramDriverTripHandler,
  getProgramVendorRunSheetHandler,
  issueProgramWebLinkHandler,
  mintWebLinkToken,
  verifyWebLinkToken,
} from "./programWebLinks";

const SECRET = "test-secret";
const linkDeps = (db: FakeFirestore) =>
  deps(db, {secret: () => SECRET}) as never;
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

const seed = (): Record<string, FakeData> => {
  const base = baseSeed();
  return {
    ...base,
    "transportVendors/shree": {organizerId: "org-1", name: "Shree Travels",
      contactName: "Mahesh", phoneE164: "+919999911111",
      programIds: ["program-1"], active: true},
    "transportTrips/trip-1": {programId: "program-1", organizerId: "org-1",
      kind: "pickup", pickupPointId: null, destinationHotelId: null,
      destinationLabel: "Taj Fateh Prakash", vehicleClassId: "innova",
      vendorId: "shree", plateDisplay: "RJ 27 TA 4471", legIds: [],
      passengerCount: 0, status: "enRoute",
      departedAt: admin.firestore.Timestamp.fromMillis(now.toMillis())},
    "programFunctions/sangeet": {programId: "program-1", organizerId: "org-1",
      name: "Sangeet", venueName: "Durbar hall", status: "active",
      startsAt: now, endsAt: now},
  };
};

test("web link tokens are signed per kind and expire", () => {
  const token = mintWebLinkToken({kind: "driverTrip", programId: "p",
    subjectId: "t", expiresAtMillis: 2_000}, SECRET);
  assert.equal(verifyWebLinkToken(token, "driverTrip", SECRET, 1_000).ok,
    true);
  assert.deepEqual(verifyWebLinkToken(token, "vendorRunSheet", SECRET, 1_000),
    {ok: false, reason: "badSignature"});
  assert.deepEqual(verifyWebLinkToken(token, "driverTrip", SECRET, 2_000),
    {ok: false, reason: "expired"});
  assert.deepEqual(verifyWebLinkToken(token, "driverTrip", "other", 1_000),
    {ok: false, reason: "badSignature"});
  // Household tokens and web links never verify as each other.
  const household = mintHouseholdToken({programId: "p", householdId: "h",
    expiresAtMillis: 2_000}, SECRET);
  assert.equal(verifyWebLinkToken(household, "driverTrip", SECRET, 1_000).ok,
    false);
  assert.equal(verifyHouseholdToken(token, SECRET, 1_000).ok, false);
});

test("a manager mints both links; the reads return no contact data",
  async () => {
    const db = new FakeFirestore(seed());
    const driver = await issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "driverTrip", subjectId: "trip-1",
    }, "manager-1"), linkDeps(db));
    assert.equal(driver.expiresAtMillis, now.toMillis() + 86_400_000);
    const trip = await getProgramDriverTripHandler(
      request({token: driver.token}, "anyone"), linkDeps(db));
    assert.equal(trip.plateDisplay, "RJ 27 TA 4471");
    assert.equal(trip.destinationLabel, "Taj Fateh Prakash");

    const vendor = await issueProgramWebLinkHandler(request({
      programId: "program-1", kind: "vendorRunSheet", subjectId: "shree",
    }, "manager-1"), linkDeps(db));
    const sheet = await getProgramVendorRunSheetHandler(
      request({token: vendor.token}, "anyone"), linkDeps(db));
    assert.equal(sheet.vendorName, "Shree Travels");
    assert.deepEqual(sheet.functions.map((fn) => fn.name), ["Sangeet"]);
    assert.deepEqual(sheet.trips.map((t) => t.tripId), ["trip-1"]);
    assert.equal(JSON.stringify(sheet).includes("+91"), false);

    await assert.rejects(getProgramVendorRunSheetHandler(
      request({token: driver.token}, "anyone"), linkDeps(db)),
    code("permission-denied"));
  });

test("links refuse unknown subjects and voided trips", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(issueProgramWebLinkHandler(request({
    programId: "program-1", kind: "vendorRunSheet", subjectId: "nobody",
  }, "manager-1"), linkDeps(db)), code("not-found"));
  const driver = await issueProgramWebLinkHandler(request({
    programId: "program-1", kind: "driverTrip", subjectId: "trip-1",
  }, "manager-1"), linkDeps(db));
  await db.doc("transportTrips/trip-1").update({status: "voided"});
  await assert.rejects(getProgramDriverTripHandler(
    request({token: driver.token}, "anyone"), linkDeps(db)),
  code("not-found"));
});
