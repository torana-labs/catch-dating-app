// Firestore rules: programme transport trips and the hotel desk's inbound.
const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} = require("firebase/firestore");
const {accessGrantFromView, accessGrantPath} =
  require("./programAccessGrantFixture.cjs");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-trips",
    firestore: {
      rules,
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080),
    },
  });
});
beforeEach(() => testEnv.clearFirestore());
after(() => testEnv.cleanup());

const authed = (uid) => testEnv.authenticatedContext(uid, {
  phone_number: "+919999999999"}).firestore();
const seedRaw = (segments, data) => testEnv.withSecurityRulesDisabled(
  (ctx) => setDoc(doc(ctx.firestore(), ...segments), data));

function view(uid, overrides = {}) {
  return {programId: "program-1", organizerId: "org-1", uid,
    ownerUid: "owner-1", role: "staff", status: "active",
    activeFromMillis: 0, expiresAtMillis: future(2), duties: {},
    pickupAll: {}, pickupScoped: {}, hotelAll: {}, hotelScoped: {},
    functionAll: {}, functionScoped: {}, workPickup: {}, workHotel: {},
    workFunction: {}, arrivalRoutes: {}, tripRoutes: {}, assignments: [],
    grantExpiresAtMillis: future(2), revision: 1, version: 1, ...overrides};
}
// Rules authorise from the access grant (#2474); fixtures keep the view's
// shape and become the document the transactional writers store.
const seedView = (uid, overrides) => seedRaw(
  accessGrantPath("program-1", uid),
  accessGrantFromView(view(uid, overrides)));

const trip = (tripId, pickupKey, hotelKey, status = "enRoute") => ({
  programId: "program-1", organizerId: "org-1", tripId,
  pickupPointId: pickupKey, destinationHotelId: hotelKey === "~" ? null : hotelKey,
  pickupKey, hotelKey, destinationLabel: "Hotel", vehicleClassId: "sedan",
  plateDisplay: "DL 1", vendorId: null, vendorName: null,
  kind: "guestTransfer", status, passengerCount: 2, departedAtMillis: 1,
  arrivedAtMillis: null, voidReason: null, manifestSource: "dispatchSnapshot",
  vehicleClassLabel: "Sedan", guestNames: ["G"], revision: 1, version: 1});
const inbound = (legId, hotelId) => ({programId: "program-1",
  organizerId: "org-1", legId, hotelId, guestDisplayName: "G",
  partyLabel: null, passengers: 1, curbAtMillis: null,
  readiness: "expected", version: 1});

const getTrip = (uid, id) => getDoc(doc(authed(uid), "programTripViews", id));

describe("programme trip rules", () => {
  it("reads a trip only where one assignment covers its pickup and hotel",
    async () => {
      await seedRaw(["programTripViews", "t1"], trip("t1", "pp-1", "h-1", "arrived"));
      await seedRaw(["programTripViews", "t2"], trip("t2", "pp-1", "h-2", "arrived"));
      await seedRaw(["programTripViews", "t3"], trip("t3", "pp-2", "~", "arrived"));
      await seedView("recon-1", {tripRoutes: {"pp-1|*": future(2)}});
      await seedView("dispatch-1", {tripRoutes: {"pp-1|h-1": future(2),
        "pp-2|h-2": future(2)}});
      await seedView("coord-1", {tripRoutes: {"*|*": future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      // An airport greeter's arrival routes never reach trips.
      await seedView("greeter-1", {arrivalRoutes: {"*|*": future(2)}});
      await assertSucceeds(getTrip("recon-1", "t1"));
      await assertSucceeds(getTrip("recon-1", "t2"));
      await assertFails(getTrip("recon-1", "t3"));
      await assertSucceeds(getTrip("dispatch-1", "t1"));
      await assertFails(getTrip("dispatch-1", "t2"));
      await assertSucceeds(getTrip("coord-1", "t3"));
      await assertSucceeds(getTrip("owner-1", "t3"));
      await assertFails(getTrip("greeter-1", "t1"));
      await assertFails(getTrip("stranger", "t1"));
    });

  it("lets a hotel desk read only trips still en route to its hotel",
    async () => {
      await seedRaw(["programTripViews", "t1"], trip("t1", "pp-1", "h-1"));
      await seedRaw(["programTripViews", "t2"], trip("t2", "pp-1", "h-1", "arrived"));
      await seedRaw(["programTripViews", "t3"], trip("t3", "pp-1", "h-2"));
      await seedView("desk-1", {duties: {hotelDesk: future(2)},
        hotelScoped: {"hotelDesk__h-1": future(2)}});
      await assertSucceeds(getTrip("desk-1", "t1"));
      await assertFails(getTrip("desk-1", "t2"));
      await assertFails(getTrip("desk-1", "t3"));
      const list = (...filters) => getDocs(query(collection(authed("desk-1"),
        "programTripViews"), where("programId", "==", "program-1"), ...filters));
      await assertSucceeds(list(where("hotelKey", "==", "h-1"),
        where("status", "==", "enRoute")));
      await assertFails(list(where("hotelKey", "==", "h-1")));
      await assertFails(list(where("hotelKey", "==", "h-2"),
        where("status", "==", "enRoute")));
    });

  it("stops at expiry, for an inactive view and a deleted account, and denies writes",
    async () => {
      await seedRaw(["programTripViews", "t1"], trip("t1", "pp-1", "h-1", "arrived"));
      await seedView("expired-1", {tripRoutes: {"*|*": Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      await seedView("inactive-1", {status: "inactive",
        tripRoutes: {"*|*": future(2)}});
      await seedView("gone-1", {tripRoutes: {"*|*": future(2)}});
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await assertFails(getTrip("expired-1", "t1"));
      await assertFails(getTrip("inactive-1", "t1"));
      await assertFails(getTrip("gone-1", "t1"));
      await assertFails(setDoc(doc(authed("owner-1"), "programTripViews", "t9"),
        trip("t9", "pp-1", "h-1")));
    });

  it("gives the hotel desk its inbound guests, and no other duty", async () => {
    await seedRaw(["programHotelInboundViews", "l1"], inbound("l1", "h-1"));
    await seedRaw(["programHotelInboundViews", "l2"], inbound("l2", "h-2"));
    await seedView("desk-1", {duties: {hotelDesk: future(2)},
      hotelScoped: {"hotelDesk__h-1": future(2)}});
    await seedView("dispatch-1", {duties: {transportDispatcher: future(2)},
      tripRoutes: {"*|*": future(2)}});
    await seedView("owner-1", {role: "manager", expiresAtMillis: null});
    const get = (uid, id) => getDoc(doc(authed(uid), "programHotelInboundViews", id));
    await assertSucceeds(get("desk-1", "l1"));
    await assertFails(get("desk-1", "l2"));
    await assertSucceeds(get("owner-1", "l2"));
    await assertFails(get("dispatch-1", "l1"));
    await assertFails(get("stranger", "l1"));
    await assertSucceeds(getDocs(query(collection(authed("desk-1"),
      "programHotelInboundViews"), where("programId", "==", "program-1"),
    where("hotelId", "==", "h-1"))));
    await assertFails(getDocs(query(collection(authed("desk-1"),
      "programHotelInboundViews"), where("programId", "==", "program-1"),
    where("hotelId", "==", "h-2"))));
    await assertFails(setDoc(doc(authed("owner-1"), "programHotelInboundViews",
      "l9"), inbound("l9", "h-1")));
  });
});
