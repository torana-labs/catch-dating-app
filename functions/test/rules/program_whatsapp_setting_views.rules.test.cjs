// Firestore rules: the programme sender and assistant settings read models (#2306).
const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {collection, doc, getDoc, getDocs, query, setDoc, where} =
  require("firebase/firestore");
const {accessGrantFromView, accessGrantPath} =
  require("./programAccessGrantFixture.cjs");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-setting-views",
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
    functionAll: {}, functionScoped: {}, workPickup: {},
    workHotel: {}, workFunction: {}, arrivalRoutes: {}, tripRoutes: {},
    assignments: [], grantExpiresAtMillis: future(2), organizerManager: false,
    revision: 1, version: 1, ...overrides};
}
// Rules authorise from the access grant (#2474); fixtures keep the view's
// shape and become the document the transactional writers store.
const seedView = (uid, overrides) => seedRaw(
  accessGrantPath("program-1", uid),
  accessGrantFromView(view(uid, overrides)));

const senderRow = (programId = "program-1") => ({programId,
  organizerId: "org-1",
  sender: {connectionId: "conn-1", displayPhoneNumber: "+91 98765 00000",
    verifiedName: "Aditi & Kabir", status: "active", boundToProgramme: true},
  organizerActiveConnectionId: "conn-1", version: 1});
const settingsRow = (programId = "program-1") => ({programId,
  organizerId: "org-1", enabled: false, languages: ["en", "hi"],
  replyWithin: "fourHours", escalationStaffUids: [], neverDoes: [],
  tone: "warm", dailyTokenBudget: 200000, answerTopics: [],
  attachmentReads: [], revision: 0, usesDefaults: true, staff: [],
  version: 1});

async function seedViews() {
  await seedRaw(["programSenderViews", "program-1"], senderRow());
  await seedRaw(["programAssistantSettingViews", "program-1"], settingsRow());
  await seedView("owner-1", {role: "manager", expiresAtMillis: null});
  await seedView("comms-1", {duties: {communications: future(2)}});
  // A coordinator holds every duty but programAdmin.
  await seedView("coord-1", {duties: {programCoordinator: future(2),
    communications: future(2)}});
  await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
  await seedView("admin-1", {duties: {programAdmin: future(2)}});
  await seedView("expired-1", {duties: {communications: Date.now() - 1000,
    programCoordinator: Date.now() - 1000}, expiresAtMillis: Date.now() - 1000});
  await seedView("inactive-1", {status: "inactive",
    duties: {communications: future(2), programCoordinator: future(2)}});
  await seedView("orgmgr-1", {status: "inactive", organizerManager: true,
    expiresAtMillis: null});
  await seedView("gone-1", {duties: {communications: future(2),
    programCoordinator: future(2)}});
  await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
}

describe("programme sender and assistant settings view rules", () => {
  it("admits the owner and the communications duty to the sender view, by id only",
    async () => {
      await seedViews();
      const get = (uid) => getDoc(doc(authed(uid), "programSenderViews",
        "program-1"));
      await assertSucceeds(get("owner-1"));
      await assertSucceeds(get("comms-1"));
      await assertSucceeds(get("coord-1"));
      for (const uid of ["greeter-1", "admin-1", "expired-1", "inactive-1",
        "orgmgr-1", "gone-1", "stranger"]) {
        await assertFails(get(uid));
      }
      await assertFails(getDocs(query(collection(authed("owner-1"),
        "programSenderViews"), where("programId", "==", "program-1"))));
      await assertFails(setDoc(doc(authed("owner-1"), "programSenderViews",
        "program-1"), senderRow()));
    });

  it("admits the owner and the coordinator duty to the settings view, by id only",
    async () => {
      await seedViews();
      const get = (uid) => getDoc(doc(authed(uid),
        "programAssistantSettingViews", "program-1"));
      await assertSucceeds(get("owner-1"));
      await assertSucceeds(get("coord-1"));
      for (const uid of ["comms-1", "greeter-1", "admin-1", "expired-1",
        "inactive-1", "orgmgr-1", "gone-1", "stranger"]) {
        await assertFails(get(uid));
      }
      await assertFails(getDocs(query(collection(authed("owner-1"),
        "programAssistantSettingViews"),
      where("programId", "==", "program-1"))));
      await assertFails(setDoc(doc(authed("owner-1"),
        "programAssistantSettingViews", "program-1"), settingsRow()));
    });
});
