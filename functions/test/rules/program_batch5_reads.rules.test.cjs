// Firestore rules: programme WhatsApp inbox, photo records and the
// organizer's programme setup view.
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
const {writeOrganizerWithAccess} =
  require("./organizerAccessGrantFixture.cjs");
const {accessGrantFromView, accessGrantPath} =
  require("./programAccessGrantFixture.cjs");

const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");
let testEnv;
const hour = 3_600_000;
const future = (hours) => Date.now() + hours * hour;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-catch-program-batch5-reads",
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
const seedOrganizer = (organizerId, data) => testEnv.withSecurityRulesDisabled(
  (ctx) => writeOrganizerWithAccess(ctx.firestore(), organizerId, data));
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

// Who holds what: the creator, a communications staff member, a greeter,
// a coordinator (every duty but programAdmin), and one who lost the duty.
async function seedPeople() {
  await seedView("owner-1", {role: "manager", expiresAtMillis: null});
  await seedView("comms-1", {duties: {communications: future(2)}});
  await seedView("greeter-1", {duties: {airportGreeter: future(2)}});
  await seedView("coord-1", {duties: {communications: future(2),
    programCoordinator: future(2)}});
  await seedView("expired-1", {duties: {communications: Date.now() - 1000},
    expiresAtMillis: Date.now() - 1000});
  await seedView("gone-1", {duties: {communications: future(2)}});
  await seedRaw(["deletedUsers", "gone-1"], {deletedAt: new Date()});
}

const inboxReaders = ["owner-1", "comms-1", "coord-1"];
const inboxDenied = ["greeter-1", "expired-1", "gone-1", "stranger"];

async function readsByProgram(collectionName, ...filters) {
  const list = (uid) => getDocs(query(collection(authed(uid), collectionName),
    where("programId", "==", "program-1"), ...filters));
  for (const uid of inboxReaders) await assertSucceeds(list(uid));
  for (const uid of inboxDenied) await assertFails(list(uid));
}

describe("programme WhatsApp rules", () => {
  it("lists thread views for managers and the communications duty only",
    async () => {
      await seedPeople();
      await seedRaw(["programWhatsappThreadViews", "program-1_h1"], {
        programId: "program-1", organizerId: "org-1", threadId: "program-1_h1",
        displayName: "The Mehra family", lastMessagePreview: "Hi",
        unreadCount: 1, version: 1});
      await readsByProgram("programWhatsappThreadViews");
      for (const uid of inboxReaders) {
        await assertSucceeds(getDoc(doc(authed(uid),
          "programWhatsappThreadViews", "program-1_h1")));
      }
      for (const uid of inboxDenied) {
        await assertFails(getDoc(doc(authed(uid),
          "programWhatsappThreadViews", "program-1_h1")));
      }
      // A different programme's views are not reached by this duty.
      await seedRaw(["programWhatsappThreadViews", "program-2_h1"], {
        programId: "program-2", organizerId: "org-1", threadId: "program-2_h1",
        displayName: "Other", version: 1});
      await assertFails(getDoc(doc(authed("comms-1"),
        "programWhatsappThreadViews", "program-2_h1")));
      await assertFails(getDocs(collection(authed("comms-1"),
        "programWhatsappThreadViews")));
      await assertFails(setDoc(doc(authed("owner-1"),
        "programWhatsappThreadViews", "program-1_h9"), {programId: "program-1"}));
    });

  it("reads one thread's messages, never the server-only thread",
    async () => {
      await seedPeople();
      await seedRaw(["programWhatsappMessages", "m1"], {
        programId: "program-1", organizerId: "org-1", threadId: "program-1_h1",
        messageId: "m1", text: "Is there a bus?", author: "guest",
        providerMessageId: "wamid.1"});
      await readsByProgram("programWhatsappMessages",
        where("threadId", "==", "program-1_h1"));
      await seedRaw(["programWhatsappThreads", "program-1_h1"], {
        programId: "program-1", endpointHash: "x".repeat(64)});
      await seedRaw(["programWhatsappReplyOperations", "op1"],
        {programId: "program-1"});
      for (const uid of inboxReaders) {
        await assertFails(getDoc(doc(authed(uid), "programWhatsappThreads",
          "program-1_h1")));
        await assertFails(getDoc(doc(authed(uid),
          "programWhatsappReplyOperations", "op1")));
      }
      await assertFails(setDoc(doc(authed("comms-1"),
        "programWhatsappMessages", "m2"), {programId: "program-1"}));
    });

  it("reads saved replies and photo records by the same duty", async () => {
    await seedPeople();
    await seedRaw(["programWhatsappCannedReplies", "program-1_bus"], {
      programId: "program-1", organizerId: "org-1", cannedReplyId: "bus",
      label: "Bus times", variants: [{language: "en", text: "7am"}]});
    await seedRaw(["programPhotos", "program-1_photo_" + "a".repeat(40)], {
      programId: "program-1", organizerId: "org-1",
      photoId: "photo_" + "a".repeat(40), storagePath: "programs/program-1/photos/x",
      status: "visible"});
    await readsByProgram("programWhatsappCannedReplies");
    await readsByProgram("programPhotos");
    await assertFails(setDoc(doc(authed("owner-1"), "programPhotos", "p9"),
      {programId: "program-1"}));
    await assertFails(setDoc(doc(authed("comms-1"),
      "programWhatsappCannedReplies", "program-1_x"), {programId: "program-1"}));
  });
});

describe("organizer programme setup view rules", () => {
  const programView = (overrides = {}) => ({programId: "program-1",
    organizerId: "org-1", createdBy: "creator-1", title: "Wedding",
    functionCount: 0, functions: [], pickupPoints: [], hotels: [],
    version: 1, ...overrides});

  async function seedOrganizers() {
    await seedOrganizer("org-1", {hostUserId: "host-1",
      ownerUserId: "host-1", hostUserIds: ["host-1", "host-2"]});
    await seedOrganizer("org-2", {hostUserId: "other-1",
      ownerUserId: "other-1", hostUserIds: ["other-1"]});
  }
  const list = (uid, ...filters) => getDocs(query(collection(authed(uid),
    "organizerProgramViews"), ...filters));
  const get = (uid, id = "program-1") => getDoc(doc(authed(uid),
    "organizerProgramViews", id));

  it("admits the creator and the organizer's managers, by their queries",
    async () => {
      await seedOrganizers();
      await seedRaw(["organizerProgramViews", "program-1"], programView());
      await seedRaw(["organizerProgramViews", "program-2"],
        programView({programId: "program-2", createdBy: "host-2"}));
      await assertSucceeds(get("creator-1"));
      await assertSucceeds(get("host-1"));
      await assertSucceeds(get("host-2"));
      await assertFails(get("other-1"));
      await assertFails(get("stranger"));
      await assertFails(get("creator-1", "program-2"));
      // A manager lists the organizer; a creator lists their own.
      await assertSucceeds(list("host-1", where("organizerId", "==", "org-1")));
      await assertSucceeds(list("creator-1", where("createdBy", "==", "creator-1"),
        where("organizerId", "==", "org-1")));
      await assertSucceeds(list("host-2", where("createdBy", "==", "host-2")));
      await assertFails(list("creator-1", where("organizerId", "==", "org-1")));
      await assertFails(list("other-1", where("organizerId", "==", "org-1")));
      await assertFails(list("host-1", where("organizerId", "==", "org-2")));
      await assertFails(list("host-1"));
    });

  it("lets a live programAdmin duty read its one programme, not list",
    async () => {
      await seedOrganizers();
      await seedRaw(["organizerProgramViews", "program-1"], programView());
      await seedView("admin-1", {duties: {programAdmin: future(2)}});
      await seedView("coord-1", {duties: {programCoordinator: future(2),
        communications: future(2)}});
      await seedView("late-1", {duties: {programAdmin: Date.now() - 1000},
        expiresAtMillis: Date.now() - 1000});
      await assertSucceeds(get("admin-1"));
      // Coordinators hold every duty but programAdmin.
      await assertFails(get("coord-1"));
      await assertFails(get("late-1"));
      await assertFails(list("admin-1", where("organizerId", "==", "org-1")));
    });

  it("denies a deleted account and every write", async () => {
    await seedOrganizers();
    await seedRaw(["organizerProgramViews", "program-1"], programView());
    await seedRaw(["deletedUsers", "creator-1"], {deletedAt: new Date()});
    await seedRaw(["deletedUsers", "host-1"], {deletedAt: new Date()});
    await assertFails(get("creator-1"));
    await assertFails(get("host-1"));
    await assertFails(list("creator-1", where("createdBy", "==", "creator-1")));
    await assertFails(setDoc(doc(authed("host-2"), "organizerProgramViews",
      "program-1"), programView({title: "x"})));
  });
});
