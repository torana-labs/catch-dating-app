// Firestore rules: programme authority. The helpers that mirror
// requireProgramAccess read accessGrants (#2474). They are exercised through
// a probe collection appended to the real rules text in this test's own
// emulator environment, so the production rules gain no test-only match.
// Request time is the emulator's clock, so expiries are written relative to
// now.
const fs = require("node:fs");
const path = require("node:path");
const {after, before, beforeEach, describe, it} = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} = require("firebase/firestore");
const {accessGrantFromView, accessGrantPath} =
  require("./programAccessGrantFixture.cjs");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
const probes = `
    match /rulesProbes/{probeId} {
      allow get: if (resource.data.kind == 'manager'
          && isProgramManager(resource.data.programId))
        || (resource.data.kind == 'duty'
          && hasProgramDuty(resource.data.programId, resource.data.duty))
        || (resource.data.kind == 'pickup'
          && programDutyCoversPickup(resource.data.programId,
            resource.data.duty, resource.data.scopeId))
        || (resource.data.kind == 'hotel'
          && programDutyCoversHotel(resource.data.programId,
            resource.data.duty, resource.data.scopeId))
        || (resource.data.kind == 'function'
          && programDutyCoversFunction(resource.data.programId,
            resource.data.duty, resource.data.scopeId))
        || (resource.data.kind == 'workPickup'
          && programWorkCoversPickup(resource.data.programId,
            resource.data.scopeId))
        || (resource.data.kind == 'workHotel'
          && programWorkCoversHotel(resource.data.programId,
            resource.data.scopeId))
        || (resource.data.kind == 'workFunction'
          && programWorkCoversFunction(resource.data.programId,
            resource.data.scopeId));
      allow list, write: if false;
    }
`;
const lastBrace = rules.lastIndexOf("}");
const secondLast = rules.lastIndexOf("}", lastBrace - 1);
const probedRules = rules.slice(0, secondLast) + probes + rules.slice(secondLast);

let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-access",
    firestore: {
      rules: probedRules,
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ?? "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080),
    },
  });
});
beforeEach(() => testEnv.clearFirestore());
after(() => testEnv.cleanup());

const authed = (uid) => testEnv.authenticatedContext(uid, {
  phone_number: "+919999999999"}).firestore();

async function seedRaw(segments, data) {
  await testEnv.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), ...segments), data));
}

function view(uid, overrides = {}) {
  return {programId: "program-1", organizerId: "org-1", uid,
    ownerUid: "owner-1", role: "staff", status: "active",
    activeFromMillis: 0, expiresAtMillis: future(2),
    duties: {}, pickupAll: {}, pickupScoped: {}, hotelAll: {},
    hotelScoped: {}, functionAll: {}, functionScoped: {}, workPickup: {},
    workHotel: {}, workFunction: {}, revision: 1,
    version: 1, ...overrides};
}

// The view stays for released Host builds, which read it; the helpers
// authorise from the access grant written beside it (#2474).
async function seedView(uid, overrides) {
  const fixture = view(uid, overrides);
  await seedRaw(["programAccessViews", `program-1__${uid}`], fixture);
  await seedRaw(accessGrantPath("program-1", uid),
    accessGrantFromView(fixture));
}

async function probe(uid, kind, extra = {}) {
  await seedRaw(["rulesProbes", `${kind}-${extra.duty ?? "x"}-${extra.scopeId ?? "x"}`],
    {programId: "program-1", kind, ...extra});
  return getDoc(doc(authed(uid), "rulesProbes",
    `${kind}-${extra.duty ?? "x"}-${extra.scopeId ?? "x"}`));
}

describe("programme authority rules", () => {
  it("lets an account read only its own access view", async () => {
    await seedView("greeter-1");
    await seedView("greeter-2");
    await assertSucceeds(getDoc(doc(authed("greeter-1"),
      "programAccessViews", "program-1__greeter-1")));
    await assertFails(getDoc(doc(authed("greeter-1"),
      "programAccessViews", "program-1__greeter-2")));
    await assertFails(getDocs(collection(authed("greeter-1"),
      "programAccessViews")));
    await assertFails(setDoc(doc(authed("greeter-1"),
      "programAccessViews", "program-1__greeter-1"), view("greeter-1")));
  });

  it("lists an account's own views by a query naming its uid, and no others",
    async () => {
      await seedView("host-2", {status: "inactive", expiresAtMillis: null,
        organizerManager: true});
      await seedRaw(["programAccessViews", "program-2__host-2"],
        view("host-2", {programId: "program-2", organizerManager: true}));
      await seedView("greeter-1");
      const own = (uid, asUid = uid) => getDocs(query(
        collection(authed(asUid), "programAccessViews"),
        where("uid", "==", uid), where("organizerId", "==", "org-1")));
      const listed = await assertSucceeds(own("host-2"));
      if (listed.size !== 2) {
        throw new Error(`expected 2 views, got ${listed.size}`);
      }
      await assertFails(own("greeter-1", "host-2"));
      await assertFails(getDocs(query(collection(authed("host-2"),
        "programAccessViews"), where("organizerId", "==", "org-1"))));
      await seedRaw(["deletedUsers", "host-2"], {deletedAt: new Date()});
      await assertFails(own("host-2"));
    });

  it("denies a stranger with no view, and the unauthenticated", async () => {
    await assertFails(probe("stranger", "manager"));
    await assertFails(probe("stranger", "duty", {duty: "functionLead"}));
    await seedRaw(["rulesProbes", "p"], {programId: "program-1",
      kind: "manager"});
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
      "rulesProbes", "p")));
  });

  it("lets the programme owner's manager view cover every duty and scope",
    async () => {
      await seedView("owner-1", {role: "manager", expiresAtMillis: null});
      await assertSucceeds(probe("owner-1", "manager"));
      await assertSucceeds(probe("owner-1", "duty", {duty: "programAdmin"}));
      await assertSucceeds(probe("owner-1", "pickup",
        {duty: "airportGreeter", scopeId: "any"}));
      await assertSucceeds(probe("owner-1", "hotel",
        {duty: "hotelDesk", scopeId: "any"}));
      await assertSucceeds(probe("owner-1", "function",
        {duty: "functionLead", scopeId: "any"}));
    });

  it("gives staff their duty but never the manager role", async () => {
    await seedView("lead-1", {duties: {functionLead: future(2)}});
    await assertSucceeds(probe("lead-1", "duty", {duty: "functionLead"}));
    await assertFails(probe("lead-1", "duty", {duty: "guestRelations"}));
    await assertFails(probe("lead-1", "manager"));
  });

  it("stops a duty at its expiry and an unapproved or inactive view",
    async () => {
      await seedView("expired-1", {duties: {functionLead: Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      await assertFails(probe("expired-1", "duty", {duty: "functionLead"}));
      await seedView("unapproved-1", {status: "inactive",
        duties: {functionLead: future(2)}});
      await assertFails(probe("unapproved-1", "duty",
        {duty: "functionLead"}));
      // Approval is in the future: authority has not begun.
      await seedView("early-1", {activeFromMillis: future(1),
        duties: {functionLead: future(2)}});
      await assertFails(probe("early-1", "duty", {duty: "functionLead"}));
    });

  it("lets one duty expire while another stays live", async () => {
    await seedView("mixed-1", {duties: {functionLead: Date.now() - 1000,
      guestRelations: future(2)}});
    await assertFails(probe("mixed-1", "duty", {duty: "functionLead"}));
    await assertSucceeds(probe("mixed-1", "duty", {duty: "guestRelations"}));
  });

  it("keeps station, hotel and function scopes to their named ids",
    async () => {
      await seedView("scoped-1", {
        duties: {airportGreeter: future(2), hotelDesk: future(2),
          functionCheckIn: future(2)},
        pickupScoped: {"airportGreeter__pp-1": future(2)},
        hotelScoped: {"hotelDesk__h-1": future(2)},
        functionScoped: {"functionCheckIn__f-1": future(2)},
      });
      await assertSucceeds(probe("scoped-1", "pickup",
        {duty: "airportGreeter", scopeId: "pp-1"}));
      await assertFails(probe("scoped-1", "pickup",
        {duty: "airportGreeter", scopeId: "pp-2"}));
      await assertSucceeds(probe("scoped-1", "hotel",
        {duty: "hotelDesk", scopeId: "h-1"}));
      await assertFails(probe("scoped-1", "hotel",
        {duty: "hotelDesk", scopeId: "h-2"}));
      await assertSucceeds(probe("scoped-1", "function",
        {duty: "functionCheckIn", scopeId: "f-1"}));
      await assertFails(probe("scoped-1", "function",
        {duty: "functionCheckIn", scopeId: "f-2"}));
      // A scope named for a different duty does not carry over.
      await assertFails(probe("scoped-1", "pickup",
        {duty: "transportDispatcher", scopeId: "pp-1"}));
    });

  it("lets an all-scope assignment cover any id, until it expires",
    async () => {
      await seedView("all-1", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: future(2)}});
      await assertSucceeds(probe("all-1", "hotel",
        {duty: "hotelDesk", scopeId: "h-9"}));
      await seedView("all-2", {duties: {hotelDesk: future(2)},
        hotelAll: {hotelDesk: Date.now() - 1000}});
      await assertFails(probe("all-2", "hotel",
        {duty: "hotelDesk", scopeId: "h-9"}));
    });

  it("lists on the work shell only what the work lists reach", async () => {
    await seedView("work-1", {
      workPickup: {"pp-1": future(2)},
      workHotel: {"*": future(2)},
      workFunction: {"f-1": Date.now() - 1000, "f-2": future(2)},
    });
    await assertSucceeds(probe("work-1", "workPickup", {scopeId: "pp-1"}));
    await assertFails(probe("work-1", "workPickup", {scopeId: "pp-2"}));
    await assertSucceeds(probe("work-1", "workHotel", {scopeId: "any-hotel"}));
    await assertFails(probe("work-1", "workFunction", {scopeId: "f-1"}));
    await assertSucceeds(probe("work-1", "workFunction", {scopeId: "f-2"}));
    await seedView("owner-1", {role: "manager", expiresAtMillis: null});
    await assertSucceeds(probe("owner-1", "workPickup", {scopeId: "x"}));
  });

  it("denies a deleted account even with a live view", async () => {
    await seedView("gone-1", {duties: {functionLead: future(2)}});
    await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
    await assertFails(probe("gone-1", "duty", {duty: "functionLead"}));
    await assertFails(getDoc(doc(authed("gone-1"), "programAccessViews",
      "program-1__gone-1")));
  });

  it("does not let a view for another programme authorize this one",
    async () => {
      const other = view("lead-2", {programId: "program-2",
        duties: {functionLead: future(2)}});
      await seedRaw(["programAccessViews", "program-2__lead-2"], other);
      await seedRaw(accessGrantPath("program-2", "lead-2"),
        accessGrantFromView(other));
      await assertFails(probe("lead-2", "duty", {duty: "functionLead"}));
    });
});
