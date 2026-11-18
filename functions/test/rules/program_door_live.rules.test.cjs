// Firestore rules: the programme door and the live board read models.
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

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-door-live",
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
    workFunction: {}, assignments: [], grantExpiresAtMillis: future(2),
    revision: 1, version: 1, ...overrides};
}
const seedView = (uid, overrides) => seedRaw(
  ["programAccessViews", `program-1__${uid}`], view(uid, overrides));

// A door hand covering function f1 only, a lead covering every function, a
// coordinator (holds every duty in the view), a greeter and the owner.
async function seedPeople() {
  await seedView("door-f1", {duties: {functionCheckIn: future(2)},
    functionScoped: {"functionCheckIn__f1": future(2)}});
  await seedView("lead-1", {duties: {functionLead: future(2),
    functionCheckIn: future(2)},
  functionAll: {functionLead: future(2), functionCheckIn: future(2)}});
  await seedView("lead-only-1", {duties: {functionLead: future(2)},
    functionAll: {functionLead: future(2)}});
  await seedView("coord-1", {duties: {programCoordinator: future(2),
    functionLead: future(2), functionCheckIn: future(2)},
  functionAll: {functionLead: future(2), functionCheckIn: future(2)}});
  await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
  await seedView("owner-1", {role: "manager", expiresAtMillis: null});
  await seedView("expired-1", {duties: {functionCheckIn: Date.now() - 1000},
    functionAll: {functionCheckIn: Date.now() - 1000},
    expiresAtMillis: Date.now() - 1000});
}

const row = (functionId, guestId) => ({programId: "program-1",
  organizerId: "org-1", functionId, guestId, displayName: guestId,
  invited: true, rsvpStatus: "pending", attendanceStatus: "expected",
  partySize: null, householdLabel: null, responseNote: null, version: 1});
const journal = (functionId) => ({programId: "program-1",
  organizerId: "org-1", functionId, guestId: "g1", displayName: "G",
  action: "checkIn", occurredAtMillis: 1, partySize: null, note: null,
  actorLabel: null, version: 1});
const alert = (alertId, duty, overrides = {}) => ({programId: "program-1",
  organizerId: "org-1", alertId, source: duty ? "staffAttention" : "flight",
  severity: "urgent", title: "t", subjectId: "s", createdAtMillis: 1,
  expiresAtMillis: null, duty, state: "open", assigneeUid: null,
  assigneeName: null, revision: 0, version: 1, ...overrides});

const listRows = (uid, functionId) => getDocs(query(
  collection(authed(uid), "programDoorRows"),
  where("programId", "==", "program-1"),
  where("functionId", "==", functionId)));

describe("programme door rules", () => {
  it("reads a function's door only where a door duty covers it", async () => {
    await seedPeople();
    await seedRaw(["programDoorFunctions", "f1"], {programId: "program-1",
      organizerId: "org-1", functionId: "f1", name: "Sangeet", version: 1});
    await seedRaw(["programDoorFunctions", "f2"], {programId: "program-1",
      organizerId: "org-1", functionId: "f2", name: "Wedding", version: 1});
    const header = (uid, id) => getDoc(doc(authed(uid),
      "programDoorFunctions", id));
    await assertSucceeds(header("door-f1", "f1"));
    await assertFails(header("door-f1", "f2"));
    await assertSucceeds(header("lead-only-1", "f2"));
    await assertSucceeds(header("coord-1", "f2"));
    await assertSucceeds(header("owner-1", "f2"));
    await assertFails(header("greeter-1", "f1"));
    await assertFails(header("expired-1", "f1"));
    await assertFails(header("stranger", "f1"));
    await assertFails(getDocs(collection(authed("owner-1"),
      "programDoorFunctions")));
  });

  it("lists door rows and journal entries for one covered function",
    async () => {
      await seedPeople();
      await seedRaw(["programDoorRows", "f1__g1"], row("f1", "g1"));
      await seedRaw(["programDoorRows", "f2__g1"], row("f2", "g1"));
      await seedRaw(["programDoorJournalViews", "j1"], journal("f1"));
      await assertSucceeds(listRows("door-f1", "f1"));
      await assertFails(listRows("door-f1", "f2"));
      await assertSucceeds(listRows("lead-1", "f2"));
      await assertFails(listRows("greeter-1", "f1"));
      await assertFails(listRows("expired-1", "f1"));
      // A scoped hand's query must name the function; a lead covering every
      // function may list the programme's rows without naming one.
      await assertFails(getDocs(query(collection(authed("door-f1"),
        "programDoorRows"), where("programId", "==", "program-1"))));
      await assertSucceeds(getDocs(query(collection(authed("lead-1"),
        "programDoorRows"), where("programId", "==", "program-1"))));
      await assertSucceeds(getDocs(query(collection(authed("door-f1"),
        "programDoorJournalViews"), where("programId", "==", "program-1"),
      where("functionId", "==", "f1"))));
      await assertFails(getDocs(query(collection(authed("door-f1"),
        "programDoorJournalViews"), where("programId", "==", "program-1"),
      where("functionId", "==", "f2"))));
      await assertFails(setDoc(doc(authed("owner-1"), "programDoorRows",
        "f1__g9"), row("f1", "g9")));
    });
});

describe("programme live board rules", () => {
  it("shows an alert to the lead holding its duty, never another duty's",
    async () => {
      await seedPeople();
      await seedRaw(["programAlertViews", "program-1__run-1_functionLead"],
        alert("run-1_functionLead", "functionLead"));
      await seedRaw(["programAlertViews", "program-1__run-2_hotelDesk"],
        alert("run-2_hotelDesk", "hotelDesk"));
      await seedRaw(["programAlertViews", "program-1__flight_l1"],
        alert("flight_l1", null));
      const get = (uid, id) => getDoc(doc(authed(uid), "programAlertViews",
        `program-1__${id}`));
      await assertSucceeds(get("lead-only-1", "run-1_functionLead"));
      await assertFails(get("lead-only-1", "run-2_hotelDesk"));
      await assertFails(get("lead-only-1", "flight_l1"));
      // Full reach reads every alert, travel alerts included.
      await assertSucceeds(get("coord-1", "run-2_hotelDesk"));
      await assertSucceeds(get("coord-1", "flight_l1"));
      await assertSucceeds(get("owner-1", "flight_l1"));
      // Someone without the lead duty reads none, even for their own duty.
      await seedView("hotel-1", {duties: {hotelDesk: future(2)}});
      await assertFails(get("hotel-1", "run-2_hotelDesk"));
      await assertFails(get("expired-1", "run-1_functionLead"));
      await assertFails(get("stranger", "run-1_functionLead"));
    });

  it("lists alerts per duty for a lead and all of them for full reach",
    async () => {
      await seedPeople();
      await seedRaw(["programAlertViews", "program-1__run-1_functionLead"],
        alert("run-1_functionLead", "functionLead"));
      await seedRaw(["programAlertViews", "program-1__flight_l1"],
        alert("flight_l1", null));
      const base = (uid) => collection(authed(uid), "programAlertViews");
      await assertSucceeds(getDocs(query(base("coord-1"),
        where("programId", "==", "program-1"))));
      await assertSucceeds(getDocs(query(base("owner-1"),
        where("programId", "==", "program-1"))));
      await assertSucceeds(getDocs(query(base("lead-only-1"),
        where("programId", "==", "program-1"),
        where("duty", "==", "functionLead"))));
      await assertFails(getDocs(query(base("lead-only-1"),
        where("programId", "==", "program-1"))));
      await assertFails(getDocs(query(base("lead-only-1"),
        where("programId", "==", "program-1"),
        where("duty", "==", "hotelDesk"))));
      await assertFails(setDoc(doc(authed("owner-1"), "programAlertViews",
        "program-1__x"), alert("x", "functionLead")));
    });

  it("gives travel counts to full reach only", async () => {
    await seedPeople();
    await seedRaw(["programTravelCountViews", "program-1"], {
      programId: "program-1", organizerId: "org-1", expected: 3, atCurb: 1,
      disrupted: 0, version: 1});
    const counts = (uid) => getDoc(doc(authed(uid), "programTravelCountViews",
      "program-1"));
    await assertSucceeds(counts("coord-1"));
    await assertSucceeds(counts("owner-1"));
    await assertFails(counts("lead-only-1"));
    await assertFails(counts("greeter-1"));
    await assertFails(counts("stranger"));
    await assertFails(getDocs(collection(authed("owner-1"),
      "programTravelCountViews")));
  });

  it("denies a deleted account", async () => {
    await seedPeople();
    await seedRaw(["deletedUsers", "coord-1"], {deletedAt: new Date()});
    await seedRaw(["programTravelCountViews", "program-1"], {
      programId: "program-1", organizerId: "org-1", expected: 1, atCurb: 0,
      disrupted: 0, version: 1});
    await assertFails(getDoc(doc(authed("coord-1"),
      "programTravelCountViews", "program-1")));
  });
});
