// Firestore rules: access grants (#2474, STR-2 + FIX-10). Programme
// authority is never a projection: rules decide from
// accessGrants/program__{programId}__{uid}, written in each grant command's
// transaction, and a stale or missing programAccessViews row changes nothing.
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
    projectId: "demo-catch-access-grants",
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

/** A programAccessViews row; also the shape the grant fixture converts. */
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

/** A coordinator over the whole programme: every duty the four reads need. */
const coordinator = {
  duties: {programCoordinator: future(2), guestRelations: future(2),
    communications: future(2), functionLead: future(2),
    functionCheckIn: future(2)},
  programAll: {programCoordinator: future(2), guestRelations: future(2),
    communications: future(2), functionLead: future(2),
    functionCheckIn: future(2)},
  functionAll: {functionLead: future(2), functionCheckIn: future(2)},
};

const seedGrant = (uid, overrides) => seedRaw(accessGrantPath("program-1",
  uid), accessGrantFromView(view(uid, overrides)));
const seedStaleView = (uid, overrides) => seedRaw(
  ["programAccessViews", `program-1__${uid}`], view(uid, overrides));

/** The batch D and A reads, and a door row, as one account. */
function programmeReads(uid) {
  const db = authed(uid);
  return [
    getDoc(doc(db, "programGuestDirectoryViews", "guest__g1")),
    getDoc(doc(db, "programSenderViews", "program-1")),
    getDoc(doc(db, "programAssistantSettingViews", "program-1")),
    getDoc(doc(db, "programDoorRows", "row-1")),
  ];
}

async function seedReadModels() {
  await seedRaw(["programGuestDirectoryViews", "guest__g1"],
    {programId: "program-1", organizerId: "org-1", kind: "guest",
      sourceId: "g1", version: 1});
  await seedRaw(["programSenderViews", "program-1"],
    {programId: "program-1", organizerId: "org-1", version: 1});
  await seedRaw(["programAssistantSettingViews", "program-1"],
    {programId: "program-1", organizerId: "org-1", version: 1});
  await seedRaw(["programDoorRows", "row-1"],
    {programId: "program-1", organizerId: "org-1", functionId: "f-1",
      version: 1});
}

describe("access grant rules", () => {
  it("lets an account get and list only its own access grants", async () => {
    await seedGrant("desk-1", coordinator);
    await seedGrant("desk-2", coordinator);
    await seedRaw(accessGrantPath("program-2", "desk-1"),
      accessGrantFromView(view("desk-1", {programId: "program-2"})));
    await assertSucceeds(getDoc(doc(authed("desk-1"), "accessGrants",
      "program__program-1__desk-1")));
    await assertFails(getDoc(doc(authed("desk-1"), "accessGrants",
      "program__program-1__desk-2")));
    const own = await assertSucceeds(getDocs(query(collection(
      authed("desk-1"), "accessGrants"), where("uid", "==", "desk-1"))));
    if (own.size !== 2) throw new Error(`expected 2 grants, got ${own.size}`);
    await assertFails(getDocs(query(collection(authed("desk-1"),
      "accessGrants"), where("uid", "==", "desk-2"))));
    await assertFails(getDocs(collection(authed("desk-1"), "accessGrants")));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),
      "accessGrants", "program__program-1__desk-1")));
    await assertFails(setDoc(doc(authed("desk-1"), "accessGrants",
      "program__program-1__desk-1"),
    accessGrantFromView(view("desk-1", coordinator))));
    await assertFails(setDoc(doc(authed("desk-3"), "accessGrants",
      "program__program-1__desk-3"),
    accessGrantFromView(view("desk-3", {role: "manager"}))));
    await seedRaw(["deletedUsers", "desk-1"], {deletedAt: new Date()});
    await assertFails(getDoc(doc(authed("desk-1"), "accessGrants",
      "program__program-1__desk-1")));
  });

  it(
    "decides programme reads from the access grant even when the view is stale or missing",
    async () => {
    await seedReadModels();

    // Revoked in the grant's transaction; the view still says live (as a
    // trigger that has not run, or failed past its retries, would leave it).
    await seedGrant("revoked-1", {...coordinator, status: "inactive",
      duties: {}, programAll: {}, functionAll: {}});
    await seedStaleView("revoked-1", coordinator);
    for (const read of programmeReads("revoked-1")) await assertFails(read);

    // A stale owner view with no access grant at all grants nothing.
    await seedStaleView("former-owner", {role: "manager",
      expiresAtMillis: null});
    for (const read of programmeReads("former-owner")) {
      await assertFails(read);
    }

    // A live grant decides on its own, with no view written yet.
    await seedGrant("coord-1", coordinator);
    for (const read of programmeReads("coord-1")) await assertSucceeds(read);
    await seedGrant("owner-1", {role: "manager", expiresAtMillis: null});
    for (const read of programmeReads("owner-1")) await assertSucceeds(read);

    // An expired duty in the grant ends access whatever the view says.
    const past = Date.now() - 1000;
    await seedGrant("lapsed-1", {expiresAtMillis: past,
      duties: {guestRelations: past}, programAll: {guestRelations: past}});
    await seedStaleView("lapsed-1", coordinator);
    await assertFails(getDoc(doc(authed("lapsed-1"),
      "programGuestDirectoryViews", "guest__g1")));
    });

  it(
    "decides event operator reads from the access grant, not the staff grant record",
    async () => {
      const {Timestamp} = require("firebase/firestore");
      const {eventAccessGrantFromStaffGrant} = require("./rulesHarness.cjs");
      const in2h = Timestamp.fromMillis(future(2));
      const staffGrant = (uid, overrides = {}) => ({organizerId: "club-1",
        eventId: "event-1", uid, displayName: "Casey", phoneLastFour: "3210",
        role: "checkInOperator", permissions: ["viewRoster",
          "reviewRuntimeClaims"], operatorExpiresAt: in2h, groupDuties: [],
        status: "active", createdBy: "host-1", createdAt: Timestamp.now(),
        expiresAt: in2h, revokedBy: null, revokedAt: null,
        updatedAt: Timestamp.now(), revision: 1, ...overrides});
      await seedRaw(["organizers", "club-1"], {hostUserId: "host-1",
        name: "Sunset Striders"});
      await seedRaw(["events", "event-1"], {organizerId: "club-1",
        publicationState: "published"});
      await seedRaw(["events", "event-private"], {organizerId: "club-1",
        publicationState: "private"});
      await seedRaw(["eventAttendees", "attendee-1"], {eventId: "event-1",
        organizerId: "club-1", displayName: "Asha Shah",
        phoneE164: "+919876543210", status: "registered"});
      const roster = (uid) => getDocs(query(collection(authed(uid),
        "eventAttendees"), where("eventId", "==", "event-1")));
      const privateEvent = (uid) => getDoc(doc(authed(uid), "events",
        "event-private"));
      const seedAccess = (eventId, grant) => seedRaw(
        ["accessGrants", `event__${eventId}__${grant.uid}`],
        eventAccessGrantFromStaffGrant({...grant, eventId}));

      // Revoked in the command's transaction; the grant record still reads
      // live (as a writer outside the commands might leave it).
      await seedRaw(["eventStaffGrants", "event-1__revoked-1"],
        staffGrant("revoked-1"));
      await seedAccess("event-1", staffGrant("revoked-1", {
        status: "revoked", revokedBy: "host-1", revokedAt: Timestamp.now()}));
      await assertFails(roster("revoked-1"));

      // A live grant record with no access document grants nothing.
      await seedRaw(["eventStaffGrants", "event-1__unmigrated-1"],
        staffGrant("unmigrated-1"));
      await seedRaw(["eventStaffGrants", "event-private__unmigrated-1"],
        staffGrant("unmigrated-1", {eventId: "event-private"}));
      await assertFails(roster("unmigrated-1"));
      await assertFails(privateEvent("unmigrated-1"));

      // A live access document decides on its own.
      await seedAccess("event-1", staffGrant("live-1"));
      await seedAccess("event-private", staffGrant("live-1"));
      await assertSucceeds(roster("live-1"));
      await assertSucceeds(privateEvent("live-1"));

      // Its permission ends at the operator window, whatever else lives.
      await seedAccess("event-1", staffGrant("lapsed-1", {
        role: "eventOperator",
        operatorExpiresAt: Timestamp.fromMillis(Date.now() - 1000),
        groupDuties: [{groupId: "g1", duty: "sweep",
          expiresAtMillis: future(2)}]}));
      await assertFails(roster("lapsed-1"));
    });
});
