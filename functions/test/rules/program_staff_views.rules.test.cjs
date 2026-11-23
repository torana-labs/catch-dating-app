// Firestore rules: the programme administrators' staff list.
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
    projectId: "demo-catch-program-staff-views",
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

const staffRow = (uid) => ({programId: "program-1", organizerId: "org-1", uid,
  displayName: "Arjun", phoneLastFour: "0001", duties: [], revoked: false,
  ownerApproved: true, activeFromMillis: 0, activeUntilMillis: future(1),
  expiresAtMillis: future(1), revision: 2, version: 1});

describe("programme staff list rules", () => {
  it("lets administrators and the owner read the list, and no other duty",
    async () => {
      await seedRaw(["programStaffViews", "program-1__s1"], staffRow("s1"));
      await seedView("admin-1", {duties: {programAdmin: future(2)}});
      // A coordinator holds every duty but programAdmin.
      await seedView("coord-1", {duties: {programCoordinator: future(2),
        guestRelations: future(2), functionLead: future(2)}});
      await seedView("guest-1", {duties: {guestRelations: future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("expired-1", {duties: {programAdmin: Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      await seedView("inactive-1", {status: "inactive",
        duties: {programAdmin: future(2)}});
      await seedView("gone-1", {duties: {programAdmin: future(2)}});
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      const get = (uid) => getDoc(doc(authed(uid), "programStaffViews",
        "program-1__s1"));
      await assertSucceeds(get("admin-1"));
      await assertSucceeds(get("owner-1"));
      await assertFails(get("coord-1"));
      await assertFails(get("guest-1"));
      await assertFails(get("expired-1"));
      await assertFails(get("inactive-1"));
      await assertFails(get("gone-1"));
      await assertFails(get("stranger"));
    });

  it("lists by a query naming the programme, and denies writes", async () => {
    await seedRaw(["programStaffViews", "program-1__s1"], staffRow("s1"));
    await seedView("admin-1", {duties: {programAdmin: future(2)}});
    await seedView("owner-1", {role: "manager", expiresAtMillis: null});
    const list = (uid) => getDocs(query(collection(authed(uid),
      "programStaffViews"), where("programId", "==", "program-1")));
    await assertSucceeds(list("admin-1"));
    await assertSucceeds(list("owner-1"));
    await assertFails(list("stranger"));
    await assertFails(getDocs(query(collection(authed("admin-1"),
      "programStaffViews"), where("programId", "==", "program-2"))));
    await assertFails(setDoc(doc(authed("owner-1"), "programStaffViews",
      "program-1__s9"), staffRow("s9")));
  });
});
