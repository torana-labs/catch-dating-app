// Firestore rules: the programme guest directory read model (#2306).
const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {collection, doc, getDoc, getDocs, orderBy, query, setDoc, where} =
  require("firebase/firestore");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-guest-directory",
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
    functionAll: {}, functionScoped: {}, programAll: {}, workPickup: {},
    workHotel: {}, workFunction: {}, arrivalRoutes: {}, tripRoutes: {},
    assignments: [], grantExpiresAtMillis: future(2), organizerManager: false,
    revision: 1, version: 1, ...overrides};
}
const seedView = (uid, overrides) => seedRaw(
  ["programAccessViews", `program-1__${uid}`], view(uid, overrides));

const guestRow = (id, programId = "program-1") => ({programId,
  organizerId: "org-1", kind: "guest", sourceId: id,
  guest: {displayName: "Rohan Sharma", householdId: null, contactId: null,
    phoneE164: "+919999900001", email: null, externalReference: null,
    groupIds: [], invitationStatus: "invited", rsvpStatus: "pending",
    revision: 1, functions: []},
  household: null, group: null, version: 1});

describe("programme guest directory rules", () => {
  it("admits the owner and a whole-programme guest relations duty only",
    async () => {
      await seedRaw(["programGuestDirectoryViews", "guest__g1"],
        guestRow("g1"));
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("desk-1", {duties: {guestRelations: future(2)},
        programAll: {guestRelations: future(2)}});
      // A coordinator holds guest relations over the whole programme.
      await seedView("coord-1", {duties: {programCoordinator: future(2),
        guestRelations: future(2)},
      programAll: {programCoordinator: future(2),
        guestRelations: future(2)}});
      // Every pickup point from one assignment and every hotel from another
      // is not the whole programme.
      await seedView("split-1", {duties: {guestRelations: future(2)},
        pickupAll: {guestRelations: future(2)},
        hotelAll: {guestRelations: future(2)}});
      await seedView("admin-1", {duties: {programAdmin: future(2)},
        programAll: {programAdmin: future(2)}});
      await seedView("expired-1", {duties: {guestRelations: Date.now() - 1000},
        programAll: {guestRelations: Date.now() - 1000}});
      await seedView("inactive-1", {status: "inactive",
        programAll: {guestRelations: future(2)}});
      // An organizer manager with no grant holds setup authority only.
      await seedView("orgmgr-1", {status: "inactive", organizerManager: true,
        expiresAtMillis: null});
      // A view written before programAll existed holds no directory.
      const legacy = view("legacy-1", {duties: {guestRelations: future(2)}});
      delete legacy.programAll;
      await seedRaw(["programAccessViews", "program-1__legacy-1"], legacy);
      await seedView("gone-1", {programAll: {guestRelations: future(2)}});
      await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
      const get = (uid) => getDoc(doc(authed(uid),
        "programGuestDirectoryViews", "guest__g1"));
      await assertSucceeds(get("owner-1"));
      await assertSucceeds(get("desk-1"));
      await assertSucceeds(get("coord-1"));
      await assertFails(get("split-1"));
      await assertFails(get("admin-1"));
      await assertFails(get("expired-1"));
      await assertFails(get("inactive-1"));
      await assertFails(get("orgmgr-1"));
      await assertFails(get("legacy-1"));
      await assertFails(get("gone-1"));
      await assertFails(get("stranger"));
    });

  it("lists one programme's rows by a query naming it, and denies writes",
    async () => {
      await seedRaw(["programGuestDirectoryViews", "guest__g1"],
        guestRow("g1"));
      await seedRaw(["programGuestDirectoryViews", "guest__g2"],
        guestRow("g2", "program-2"));
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("desk-1", {programAll: {guestRelations: future(2)}});
      const guests = (uid, programId = "program-1") => getDocs(query(
        collection(authed(uid), "programGuestDirectoryViews"),
        where("programId", "==", programId), where("kind", "==", "guest"),
        orderBy("guest.displayName"), orderBy("sourceId")));
      const owned = await assertSucceeds(guests("owner-1"));
      if (owned.size !== 1) throw new Error(`expected 1 row, got ${owned.size}`);
      await assertSucceeds(guests("desk-1"));
      await assertSucceeds(getDocs(query(collection(authed("desk-1"),
        "programGuestDirectoryViews"), where("programId", "==", "program-1"),
      where("kind", "==", "household"))));
      await assertFails(guests("stranger"));
      // The query must name a programme the account reaches.
      await assertFails(guests("owner-1", "program-2"));
      await assertFails(getDocs(collection(authed("owner-1"),
        "programGuestDirectoryViews")));
      await assertFails(setDoc(doc(authed("owner-1"),
        "programGuestDirectoryViews", "guest__g9"), guestRow("g9")));
    });
});
