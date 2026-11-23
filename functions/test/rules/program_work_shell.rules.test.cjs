// Firestore rules: the programme work shell's header and resource labels.
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
const fs = require("node:fs");
const path = require("node:path");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-work-shell",
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
    workFunction: {}, revision: 1, version: 1, ...overrides};
}
// Rules authorise from the access grant (#2474); fixtures keep the view's
// shape and become the document the transactional writers store.
const seedView = (uid, overrides) => seedRaw(
  accessGrantPath("program-1", uid),
  accessGrantFromView(view(uid, overrides)));

function resource(kind, id, overrides = {}) {
  return {programId: "program-1", organizerId: "org-1", kind, resourceId: id,
    active: true, label: `${kind} ${id}`, pickupKind: null, iataCode: null,
    terminal: null, venueName: null, startsAtMillis: null, endsAtMillis: null,
    checkInEnabled: null, status: null, expectedCount: null,
    checkedInCount: null, version: 1, ...overrides};
}
const seedResource = (kind, id, overrides) => seedRaw(
  ["programResourceViews", `program-1__${kind}__${id}`],
  resource(kind, id, overrides));
const resourceDoc = (uid, kind, id) => getDoc(doc(authed(uid),
  "programResourceViews", `program-1__${kind}__${id}`));
const listKind = (uid, kind, programId = "program-1") => getDocs(query(
  collection(authed(uid), "programResourceViews"),
  where("programId", "==", programId), where("kind", "==", kind)));

describe("programme work shell rules", () => {
  it("lets any live account with access read the header, and no one else",
    async () => {
      await seedRaw(["programWorkSummaries", "program-1"], {
        programId: "program-1", organizerId: "org-1", title: "Wedding",
        kind: "wedding", timezone: "Asia/Kolkata", status: "active",
        capabilities: [], vehicleClasses: [], version: 1});
      await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await seedView("expired-1", {expiresAtMillis: Date.now() - 1000});
      await seedView("revoked-1", {status: "inactive"});
      const header = (uid) => getDoc(doc(authed(uid),
        "programWorkSummaries", "program-1"));
      await assertSucceeds(header("greeter-1"));
      await assertSucceeds(header("owner-1"));
      await assertFails(header("expired-1"));
      await assertFails(header("revoked-1"));
      await assertFails(header("stranger"));
      await assertFails(getDocs(collection(authed("greeter-1"),
        "programWorkSummaries")));
      await assertFails(setDoc(doc(authed("owner-1"),
        "programWorkSummaries", "program-1"), {title: "x"}));
    });

  it("reads a named resource only when the account's work list reaches it",
    async () => {
      await seedResource("pickupPoint", "pp-1");
      await seedResource("pickupPoint", "pp-2");
      await seedResource("hotel", "h-1");
      await seedResource("function", "f-1");
      await seedView("scoped-1", {
        workPickup: {"pp-1": future(2)},
        workHotel: {"h-1": Date.now() - 1000},
        workFunction: {"f-1": future(2)},
      });
      await assertSucceeds(resourceDoc("scoped-1", "pickupPoint", "pp-1"));
      await assertFails(resourceDoc("scoped-1", "pickupPoint", "pp-2"));
      await assertFails(resourceDoc("scoped-1", "hotel", "h-1"));
      await assertSucceeds(resourceDoc("scoped-1", "function", "f-1"));
      await assertFails(resourceDoc("stranger", "function", "f-1"));
    });

  it("lists every resource of a kind only for an all-reaching work list",
    async () => {
      await seedResource("hotel", "h-1");
      await seedResource("hotel", "h-2");
      await seedResource("pickupPoint", "pp-1");
      await seedView("all-1", {workHotel: {"*": future(2)}});
      await seedView("scoped-1", {workHotel: {"h-1": future(2)}});
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      const all = await assertSucceeds(listKind("all-1", "hotel"));
      if (all.size !== 2) throw new Error(`expected 2 hotels, got ${all.size}`);
      // One kind's all-reach never lists another kind.
      await assertFails(listKind("all-1", "pickupPoint"));
      await assertFails(listKind("scoped-1", "hotel"));
      await assertSucceeds(listKind("owner-1", "pickupPoint"));
      await assertFails(listKind("stranger", "hotel"));
      // The query must name its programme.
      await assertFails(getDocs(query(collection(authed("all-1"),
        "programResourceViews"), where("kind", "==", "hotel"))));
    });

  it("lets the communications duty read every function label, nothing else",
    async () => {
      await seedResource("function", "f-1");
      await seedResource("function", "f-2");
      await seedResource("hotel", "h-1");
      await seedView("comms-1", {duties: {communications: future(2)}});
      await seedView("ended-1", {duties: {communications: Date.now() - 1000}});
      await seedView("lapsed-1", {duties: {communications: future(2)},
        expiresAtMillis: Date.now() - 1000});
      await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
      await seedView("setup-1", {status: "inactive", expiresAtMillis: null,
        organizerManager: true});
      const labels = await assertSucceeds(listKind("comms-1", "function"));
      if (labels.size !== 2) {
        throw new Error(`expected 2 functions, got ${labels.size}`);
      }
      await assertSucceeds(resourceDoc("comms-1", "function", "f-2"));
      // Function labels only: other kinds still follow the work lists.
      await assertFails(listKind("comms-1", "hotel"));
      await assertFails(resourceDoc("comms-1", "hotel", "h-1"));
      // An ended duty, a lapsed view, another duty, an organizer manager's
      // setup-only view and a stranger read none.
      await assertFails(listKind("ended-1", "function"));
      await assertFails(listKind("lapsed-1", "function"));
      await assertFails(listKind("greeter-1", "function"));
      await assertFails(listKind("setup-1", "function"));
      await assertFails(resourceDoc("stranger", "function", "f-1"));
    });

  it("denies a deleted account and any write", async () => {
    await seedResource("hotel", "h-1");
    await seedView("gone-1", {workHotel: {"*": future(2)}});
    await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
    await assertFails(resourceDoc("gone-1", "hotel", "h-1"));
    await assertFails(listKind("gone-1", "hotel"));
    await seedView("owner-1", {role: "manager", expiresAtMillis: null});
    await assertFails(setDoc(doc(authed("owner-1"), "programResourceViews",
      "program-1__hotel__h-9"), resource("hotel", "h-9")));
  });
});
