// Firestore rules: programme arrivals, departures and dispatcher vendors.
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
    projectId: "demo-catch-program-arrivals",
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
    workFunction: {}, arrivalRoutes: {}, assignments: [],
    grantExpiresAtMillis: future(2), revision: 1, version: 1, ...overrides};
}
// Rules authorise from the access grant (#2474); fixtures keep the view's
// shape and become the document the transactional writers store.
const seedView = (uid, overrides) => seedRaw(
  accessGrantPath("program-1", uid),
  accessGrantFromView(view(uid, overrides)));

const arrival = (legId, pickupKey, hotelKey) => ({programId: "program-1",
  organizerId: "org-1", legId, guestId: "g1", partyId: null,
  pickupPointId: pickupKey === "~" ? null : pickupKey, pickupKey, hotelKey,
  guestDisplayName: "G", partyLabel: null, partyGuestIds: ["g1"],
  passengers: 1, luggageUnits: 0, flightNumber: null, originIata: null,
  arrivalTerminal: null, flightStatus: "scheduled", curbAtMillis: null,
  curbSource: null, unavailableReason: null, readiness: "expected",
  claimedByDisplay: null, claimedByUid: null,
  destinationHotelId: hotelKey === "~" ? null : hotelKey,
  destinationLabel: "Hotel", requiredCapabilities: [],
  dedicatedVehicle: false, revision: 1, version: 1});
const departure = (legId, hotelId) => ({programId: "program-1",
  organizerId: "org-1", legId, hotelId, guestId: "g1",
  guestDisplayName: "G", partyLabel: null, passengers: 1, luggageUnits: 0,
  flightNumber: null, flightAtMillis: null, leaveByMillis: null,
  roomLabel: null, state: "inRoom", revision: 1, version: 1});

const getArrival = (uid, id) => getDoc(doc(authed(uid), "programArrivalViews",
  id));

describe("programme arrivals rules", () => {
  it("reads a journey only where one assignment covers its pickup and hotel",
    async () => {
      await seedRaw(["programArrivalViews", "l1"], arrival("l1", "pp-1", "h-1"));
      await seedRaw(["programArrivalViews", "l2"], arrival("l2", "pp-1", "h-2"));
      await seedRaw(["programArrivalViews", "l3"], arrival("l3", "pp-2", "h-1"));
      await seedRaw(["programArrivalViews", "l4"], arrival("l4", "~", "~"));
      // A greeter at pp-1 for any hotel.
      await seedView("greeter-1", {arrivalRoutes: {"pp-1|*": future(2)}});
      // A dispatcher whose assignments are (pp-1, h-1) and (pp-2, h-2).
      await seedView("dispatch-1", {arrivalRoutes: {"pp-1|h-1": future(2),
        "pp-2|h-2": future(2)}});
      // A hotel-only route across every pickup point.
      await seedView("hotel-route-1", {arrivalRoutes: {"*|h-1": future(2)}});
      await seedView("coord-1", {arrivalRoutes: {"*|*": future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await assertSucceeds(getArrival("greeter-1", "l1"));
      await assertSucceeds(getArrival("greeter-1", "l2"));
      await assertFails(getArrival("greeter-1", "l3"));
      await assertFails(getArrival("greeter-1", "l4"));
      await assertSucceeds(getArrival("dispatch-1", "l1"));
      // The crossed pairs no single assignment covers are denied.
      await assertFails(getArrival("dispatch-1", "l2"));
      await assertFails(getArrival("dispatch-1", "l3"));
      await assertSucceeds(getArrival("hotel-route-1", "l1"));
      await assertSucceeds(getArrival("hotel-route-1", "l3"));
      await assertFails(getArrival("hotel-route-1", "l2"));
      // Only the all-routes key reaches a journey with no pickup or hotel.
      await assertSucceeds(getArrival("coord-1", "l4"));
      await assertSucceeds(getArrival("owner-1", "l4"));
      await assertFails(getArrival("stranger", "l1"));
    });

  it("stops at the route's expiry, for an inactive view and a deleted account",
    async () => {
      await seedRaw(["programArrivalViews", "l1"], arrival("l1", "pp-1", "h-1"));
      await seedView("expired-1", {arrivalRoutes:
        {"*|*": Date.now() - 1000}, expiresAtMillis: Date.now() - 1000});
      await seedView("mixed-1", {arrivalRoutes: {"pp-1|h-1": Date.now() - 1000,
        "*|h-1": future(2)}});
      await seedView("inactive-1", {status: "inactive", arrivalRoutes:
        {"*|*": future(2)}});
      await seedView("gone-1", {arrivalRoutes: {"*|*": future(2)}});
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      await assertFails(getArrival("expired-1", "l1"));
      await assertSucceeds(getArrival("mixed-1", "l1"));
      await assertFails(getArrival("inactive-1", "l1"));
      await assertFails(getArrival("gone-1", "l1"));
    });

  it("lists one route's journeys, or every journey for the all-routes key",
    async () => {
      await seedRaw(["programArrivalViews", "l1"], arrival("l1", "pp-1", "h-1"));
      await seedRaw(["programArrivalViews", "l2"], arrival("l2", "pp-2", "h-1"));
      await seedView("greeter-1", {arrivalRoutes: {"pp-1|*": future(2)}});
      await seedView("coord-1", {arrivalRoutes: {"*|*": future(2)}});
      const list = (uid, ...filters) => getDocs(query(collection(authed(uid),
        "programArrivalViews"), where("programId", "==", "program-1"),
      ...filters));
      await assertSucceeds(list("coord-1"));
      await assertSucceeds(list("greeter-1", where("pickupKey", "==", "pp-1")));
      await assertFails(list("greeter-1"));
      await assertFails(list("greeter-1", where("pickupKey", "==", "pp-2")));
      await assertFails(list("stranger"));
      await assertFails(setDoc(doc(authed("coord-1"), "programArrivalViews",
        "l9"), arrival("l9", "pp-1", "h-1")));
    });
});

describe("programme departures and vendors rules", () => {
  it("reads a hotel's departures only under a hotel desk duty covering it",
    async () => {
      await seedRaw(["programDepartureViews", "d1"], departure("d1", "h-1"));
      await seedRaw(["programDepartureViews", "d2"], departure("d2", "h-2"));
      await seedView("desk-1", {duties: {hotelDesk: future(2)},
        hotelScoped: {"hotelDesk__h-1": future(2)}});
      await seedView("desk-all", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: future(2)}});
      await seedView("greeter-1", {duties: {airportGreeter: future(2)},
        arrivalRoutes: {"*|*": future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      const get = (uid, id) => getDoc(doc(authed(uid), "programDepartureViews",
        id));
      await assertSucceeds(get("desk-1", "d1"));
      await assertFails(get("desk-1", "d2"));
      await assertSucceeds(get("desk-all", "d2"));
      await assertSucceeds(get("owner-1", "d2"));
      await assertFails(get("greeter-1", "d1"));
      await assertFails(get("stranger", "d1"));
      const list = (uid, hotel) => getDocs(query(collection(authed(uid),
        "programDepartureViews"), where("programId", "==", "program-1"),
      where("hotelId", "==", hotel)));
      await assertSucceeds(list("desk-1", "h-1"));
      await assertFails(list("desk-1", "h-2"));
    });

  it("gives vendors to dispatchers, with no phone number to read", async () => {
    await seedRaw(["programVendorViews", "program-1__v1"], {
      programId: "program-1", organizerId: "org-1", vendorId: "v1",
      name: "City Cabs", active: true, version: 1});
    await seedView("dispatch-1", {duties: {transportDispatcher: future(2)}});
    await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
    await seedView("owner-1", {role: "manager", expiresAtMillis: null});
    const get = (uid) => getDoc(doc(authed(uid), "programVendorViews",
      "program-1__v1"));
    await assertSucceeds(get("dispatch-1"));
    await assertSucceeds(get("owner-1"));
    await assertFails(get("greeter-1"));
    await assertFails(get("stranger"));
    await assertSucceeds(getDocs(query(collection(authed("dispatch-1"),
      "programVendorViews"), where("programId", "==", "program-1"))));
    await assertFails(setDoc(doc(authed("owner-1"), "programVendorViews",
      "program-1__v2"), {programId: "program-1"}));
  });
});
