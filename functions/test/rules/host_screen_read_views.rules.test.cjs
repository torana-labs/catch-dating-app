// Firestore rules: the hotel room board, the staff work list and the
// Moments board read models (#1339).
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
    projectId: "demo-catch-host-screen-reads",
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

const board = (hotelId) => ({programId: "program-1", organizerId: "org-1",
  hotelId, hotelName: "Haveli", overflow: false, roomBlocks: [], stays: [],
  unplacedGuests: [], version: 1});

const assignment = (uid, kind, scopeId) => ({uid, kind, scopeId,
  organizerId: "org-1", title: "Wedding", organizerName: "Sharma Weddings",
  status: "active", activeFromMillis: 0, grantExpiresAtMillis: future(2),
  duties: [{duty: "hotelDesk", expiresAtMillis: future(2)}], version: 1});

const moment = (momentId, scope) => ({momentId,
  scopeKind: scope.kind, scopeId: scope.programId ?? scope.eventId,
  programId: scope.programId ?? null, eventId: scope.eventId ?? null,
  moment: {momentId, name: "Reminder"},
  plan: {anchor: {kind: "date", id: null}, sentCount: 0,
    nextRunAtMillis: null},
  version: 1});

describe("hotel room board rules", () => {
  it("gives the hotel desk covering the hotel its board, and no other duty",
    async () => {
      await seedRaw(["programHotelRoomViews", "program-1__h-1"], board("h-1"));
      await seedRaw(["programHotelRoomViews", "program-1__h-2"], board("h-2"));
      await seedRaw(["programHotelRoomViews", "forged"], board("h-1"));
      await seedView("desk-1", {duties: {hotelDesk: future(2)},
        hotelScoped: {"hotelDesk__h-1": future(2)}});
      await seedView("coord-1", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("dispatch-1", {duties: {transportDispatcher: future(2)},
        tripRoutes: {"*|*": future(2)}});
      await seedView("expired-1", {duties: {hotelDesk: Date.now() - 1000},
        hotelAll: {hotelDesk: Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      await seedView("gone-1", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: future(2)}});
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      const get = (uid, id) => getDoc(doc(authed(uid),
        "programHotelRoomViews", id));
      await assertSucceeds(get("desk-1", "program-1__h-1"));
      await assertFails(get("desk-1", "program-1__h-2"));
      await assertFails(get("desk-1", "forged"));
      await assertSucceeds(get("coord-1", "program-1__h-2"));
      await assertSucceeds(get("owner-1", "program-1__h-2"));
      await assertFails(get("dispatch-1", "program-1__h-1"));
      await assertFails(get("expired-1", "program-1__h-1"));
      await assertFails(get("gone-1", "program-1__h-1"));
      await assertFails(get("stranger", "program-1__h-1"));
      await assertFails(getDocs(query(collection(authed("owner-1"),
        "programHotelRoomViews"), where("programId", "==", "program-1"))));
      await assertFails(setDoc(doc(authed("owner-1"), "programHotelRoomViews",
        "program-1__h-9"), board("h-9")));
    });
});

describe("staff work list rules", () => {
  it("lets an account read only its own rows, by a query naming it",
    async () => {
      await seedRaw(["hostAssignmentViews", "staff-1__program_program-1"],
        assignment("staff-1", "program", "program-1"));
      await seedRaw(["hostAssignmentViews", "staff-2__event_event-1"],
        assignment("staff-2", "event", "event-1"));
      await seedRaw(["hostAssignmentViews", "gone-1__team_org-1"],
        assignment("gone-1", "team", "org-1"));
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      const get = (uid, id) => getDoc(doc(authed(uid), "hostAssignmentViews",
        id));
      const list = (uid, owner) => getDocs(query(collection(authed(uid),
        "hostAssignmentViews"), where("uid", "==", owner)));
      await assertSucceeds(get("staff-1", "staff-1__program_program-1"));
      await assertFails(get("staff-1", "staff-2__event_event-1"));
      await assertSucceeds(list("staff-1", "staff-1"));
      await assertFails(list("staff-1", "staff-2"));
      await assertFails(getDocs(collection(authed("staff-1"),
        "hostAssignmentViews")));
      await assertFails(get("gone-1", "gone-1__team_org-1"));
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext()
        .firestore(), "hostAssignmentViews", "staff-1__program_program-1")));
      await assertFails(setDoc(doc(authed("staff-1"), "hostAssignmentViews",
        "staff-1__team_org-9"), assignment("staff-1", "team", "org-9")));
    });
});

describe("Moments board rules", () => {
  it("gives programme rows to the owner and the communications duty",
    async () => {
      await seedRaw(["organizerMomentViews", "m1"],
        moment("m1", {kind: "program", programId: "program-1"}));
      await seedView("comms-1", {duties: {communications: future(2)}});
      await seedView("coord-1", {duties: {communications: future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("desk-1", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: future(2)}});
      await seedView("expired-1", {duties: {communications: Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      const list = (uid) => getDocs(query(collection(authed(uid),
        "organizerMomentViews"), where("scopeKind", "==", "program"),
      where("programId", "==", "program-1")));
      await assertSucceeds(list("comms-1"));
      await assertSucceeds(list("coord-1"));
      await assertSucceeds(list("owner-1"));
      await assertFails(list("desk-1"));
      await assertFails(list("expired-1"));
      await assertFails(list("stranger"));
      await assertSucceeds(getDoc(doc(authed("comms-1"), "organizerMomentViews",
        "m1")));
      await assertFails(getDocs(query(collection(authed("comms-1"),
        "organizerMomentViews"), where("programId", "==", "program-1"))));
    });

  it("gives event rows to the event organiser's managers only", async () => {
    await seedRaw(["organizers", "org-1"], {hostUserId: "host-1",
      ownerUserId: "owner-9", hostUserIds: ["host-1", "cohost-1"]});
    await seedRaw(["events", "event-1"], {organizerId: "org-1",
      name: "Winter Mixer"});
    await seedRaw(["organizerMomentViews", "m2"],
      moment("m2", {kind: "event", eventId: "event-1"}));
    await seedRaw(["deletedUsers", "cohost-1"], {deletedAt: new Date()});
    const list = (uid) => getDocs(query(collection(authed(uid),
      "organizerMomentViews"), where("scopeKind", "==", "event"),
    where("eventId", "==", "event-1")));
    await assertSucceeds(list("host-1"));
    await assertSucceeds(list("owner-9"));
    await assertFails(list("cohost-1"));
    await assertFails(list("staff-1"));
    await assertFails(setDoc(doc(authed("host-1"), "organizerMomentViews",
      "m9"), moment("m9", {kind: "event", eventId: "event-1"})));
  });
});
