import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {pathToFileURL} from "node:url";
import * as admin from "firebase-admin";
import {FakeData, FakeDocRef, FakeFirestore} from
  "../shared/testing/programFirestore";
import {
  DemoWorld,
  WorldClock,
  civilToInstantMs,
  eventStateAt,
} from "./demoWorld";
import {
  SuvbotDeps,
  ensureSuvbotThread,
  isSuvbotAction,
  runSuvbotDemoOperationForUser,
  suvbotActionCatalog,
  suvbotMatchId,
  SUVBOT_UID,
} from "./suvbot";
import {assertValidSuvbotDocument} from "./suvbotDocValidation";
import {
  SUVBOT_DEMO_MOMENTS,
  SuvbotDemoMoment,
  suvbotDemoWorldChoices,
  suvbotSeedPrefix,
} from "./suvbotWorld";
import {suvbotWorldBundle} from "./generated/suvbotDemoWorlds";

const repoRoot = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-10-25T08:00:00.000Z");
const TESTER_CITIES = [
  "in-mh-mumbai",
  "in-mh-pune",
  "in-ka-bengaluru",
  "in-dl-delhi-ncr",
  "in-tg-hyderabad",
];
const DAY_MS = 24 * 60 * 60 * 1000;

// The shared fake models one process's Firestore. Suvbot also needs
// subcollections, getAll, and deletes of missing documents (a no-op in
// Firestore).
const docRefPrototype = FakeDocRef.prototype as unknown as {
  collection(this: FakeDocRef, name: string): unknown;
  delete(this: FakeDocRef): Promise<void>;
};
docRefPrototype.collection = function(name) {
  return this.firestore.collection(`${this.path}/${name}`);
};
docRefPrototype.delete = async function() {
  this.firestore.deleteDoc(this.path);
};

class SuvbotFakeFirestore extends FakeFirestore {
  async getAll(...refs: FakeDocRef[]) {
    return Promise.all(refs.map((ref) => ref.get()));
  }
  deleteDoc(docPath: string) {
    if (this.docs.has(docPath)) super.deleteDoc(docPath);
  }
}

/**
 * @param {SuvbotFakeFirestore} store Fake store.
 * @param {Date} now Clock.
 * @return {SuvbotDeps} Deps.
 */
function depsFor(store: SuvbotFakeFirestore, now = NOW): SuvbotDeps {
  return {
    firestore: () => store as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => ({kind: "serverTimestamp"}) as
      unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
    now: () => now,
  };
}

/**
 * A complete tester profile in one market.
 * @param {string} city Market id.
 * @param {object} overrides Field overrides.
 * @return {FakeData} users/{uid} document.
 */
function testerProfile(city: string, overrides: FakeData = {}): FakeData {
  const epoch = admin.firestore.Timestamp.fromMillis(0);
  return {
    name: "Asha Tester",
    firstName: "Asha",
    lastName: "Tester",
    displayName: "Asha",
    dateOfBirth: admin.firestore.Timestamp.fromDate(
      new Date("1994-05-10T00:00:00.000Z")),
    gender: "woman",
    phoneNumber: "+919811100001",
    profileComplete: true,
    email: "asha@example.test",
    profilePrompts: [],
    profilePhotos: [1, 2].map((index) => ({
      id: `photo${index}`,
      url: `https://example.test/asha/${index}.jpg`,
      thumbnailUrl: `https://example.test/asha/${index}_t.jpg`,
      storagePath: `users/tester/photos/${index}.jpg`,
      thumbnailStoragePath: `users/tester/photos/${index}_t.jpg`,
      position: index - 1,
      createdAt: epoch,
      updatedAt: epoch,
    })),
    city,
    interestedInGenders: ["man", "woman"],
    minAgePreference: 21,
    maxAgePreference: 45,
    languages: ["english"],
    activityPreferences: {running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: [],
      runningReasons: [],
      preferredRunTimes: [],
      version: 1,
    }},
    prefsNewCatches: true,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: true,
    prefsClubUpdates: true,
    prefsWeeklyDigest: false,
    prefsShowOnMap: false,
    ...overrides,
  };
}

/**
 * A store with one enabled tester.
 * @param {string} uid Tester uid.
 * @param {string} city Market id.
 * @param {object} overrides Profile overrides.
 * @return {SuvbotFakeFirestore} Store.
 */
function storeWithTester(
  uid: string,
  city: string,
  overrides: FakeData = {}
): SuvbotFakeFirestore {
  return new SuvbotFakeFirestore({
    [`users/${uid}`]: testerProfile(city, overrides),
    [`demoSelfServiceAccess/${uid}`]: {uid, enabled: true},
  });
}

/**
 * Runs one Suvbot action without the confirmation round trip.
 * @param {SuvbotFakeFirestore} store Store.
 * @param {string} uid Tester.
 * @param {string} action Action id.
 * @param {string} text Optional text.
 * @param {Date} now Clock.
 * @return {Promise<string>} Reply.
 */
async function run(
  store: SuvbotFakeFirestore,
  uid: string,
  action: string,
  text?: string,
  now = NOW
): Promise<string> {
  const result = await runSuvbotDemoOperationForUser({
    uid,
    action,
    text,
    deps: depsFor(store, now),
    options: {skipConfirmation: true},
  });
  return result.reply;
}

/**
 * Every stored document under a contracted path passes its contract.
 * @param {SuvbotFakeFirestore} store Store.
 */
function assertStoreMatchesContracts(store: SuvbotFakeFirestore): void {
  for (const [docPath, data] of store.docs) {
    assertValidSuvbotDocument({path: docPath, data});
  }
}

/**
 * @param {SuvbotFakeFirestore} store Store.
 * @param {string} prefix Seed prefix or path prefix.
 * @return {string[]} Paths whose data carries the tester's seed prefix.
 */
function pathsWithSeedPrefix(
  store: SuvbotFakeFirestore,
  prefix: string
): string[] {
  return [...store.docs]
    .filter(([docPath, data]) =>
      data.seedPrefix === prefix || docPath.includes(prefix))
    .map(([docPath]) => docPath);
}

/**
 * @param {unknown} value Timestamp.
 * @return {number} Millis.
 */
function millis(value: unknown): number {
  return (value as admin.firestore.Timestamp).toMillis();
}

test("suvbotMatchId is deterministic", () => {
  assert.equal(suvbotMatchId("runner-1"), "suvbot_runner-1");
});

test("suvbotActionCatalog exposes backend-owned controls", () => {
  const actions = suvbotActionCatalog();
  const byId = new Map(actions.map((action) => [action.id, action]));

  assert.equal(byId.get("startDemoWorld")?.requiresText, true);
  assert.equal(byId.get("refreshDemoState")?.destructive, true);
  assert.equal(byId.get("clearDemoState")?.destructive, true);
  assert.equal(byId.get("resetChats")?.destructive, true);
  assert.equal(byId.get("resetBookings")?.destructive, true);
  assert.equal(byId.get("resetNotifications")?.destructive, true);
  assert.equal(byId.get("matchTesterByPhone")?.requiresText, true);
  for (const id of [
    "warmSignupState",
    "warmPostEventState",
    "warmChatState",
    "warmPaymentState",
  ]) {
    assert.ok(byId.has(id as never), id);
  }
  assert.ok(actions.every((action) => isSuvbotAction(action.id)));
  assert.equal(isSuvbotAction("message"), true);
  assert.equal(isSuvbotAction("unknown"), false);
});

test(
  "ensureSuvbotThread creates profile, match, and welcome message",
  async () => {
    const store = new SuvbotFakeFirestore({});
    const result = await ensureSuvbotThread(
      store as unknown as FirebaseFirestore.Firestore,
      "runner-1",
      depsFor(store)
    );

    assert.deepEqual(result, {matchId: "suvbot_runner-1", created: true});
    assert.equal(store.getDoc(`publicProfiles/${SUVBOT_UID}`)?.name, "Suvbot");
    assert.equal(store.getDoc("matches/suvbot_runner-1")?.user1Id, SUVBOT_UID);
    assert.ok(store.getDoc("matches/suvbot_runner-1/messages/suvbot_welcome"));
    assertStoreMatchesContracts(store);
  }
);

test("the bundled worlds match the scenario and persona files", async () => {
  const generator = await import(pathToFileURL(
    path.join(repoRoot, "functions/scripts/generate-suvbot-worlds.mjs")
  ).href);
  const expected = await generator.suvbotWorldBundleSource();
  const current = fs.readFileSync(generator.suvbotWorldBundlePath, "utf8");
  assert.equal(current, expected,
    "Run: node functions/scripts/generate-suvbot-worlds.mjs");
});

test("eventStateAt matches tool/demo/lib/demo_world.mjs", async () => {
  const reference = await import(pathToFileURL(
    path.join(repoRoot, "tool/demo/lib/demo_world.mjs")
  ).href);
  assert.ok(suvbotWorldBundle.worlds.length > 0);
  for (const world of suvbotWorldBundle.worlds) {
    for (const event of world.events) {
      for (const moment of Object.keys(world.moments)) {
        assert.deepEqual(
          eventStateAt(world, event.id, moment),
          reference.eventStateAt(world, event.id, moment),
          `${world.id} ${event.id} ${moment}`
        );
      }
    }
  }
});

test("every bundled world offers every Suvbot moment", () => {
  for (const {world, moments} of suvbotDemoWorldChoices()) {
    assert.deepEqual(moments, SUVBOT_DEMO_MOMENTS.map((item) => item.id),
      world.id);
  }
});

test("civil times convert through the world's time zone", () => {
  assert.equal(
    new Date(civilToInstantMs("2026-10-17T18:30:00", "Asia/Kolkata"))
      .toISOString(),
    "2026-10-17T13:00:00.000Z"
  );
  // New York leaves daylight time on 2026-11-01.
  assert.equal(
    new Date(civilToInstantMs("2026-10-31T19:00:00", "America/New_York"))
      .toISOString(),
    "2026-10-31T23:00:00.000Z"
  );
  assert.equal(
    new Date(civilToInstantMs("2026-11-02T19:00:00", "America/New_York"))
      .toISOString(),
    "2026-11-03T00:00:00.000Z"
  );
  const world = suvbotWorldBundle.worlds[0];
  const clock = new WorldClock(world, world.moments.live, NOW);
  const shiftedLive = clock.at(world.moments.live).getTime();
  assert.ok(shiftedLive <= NOW.getTime());
  assert.ok(NOW.getTime() - shiftedLive < 60_000);
});

for (const city of TESTER_CITIES) {
  for (const world of suvbotWorldBundle.worlds) {
    for (const moment of SUVBOT_DEMO_MOMENTS) {
      test(
        `a ${city} tester starts ${world.id} at ${moment.id}`,
        async () => {
          const uid = `tester_${city.replace(/-/gu, "_")}`;
          const store = storeWithTester(uid, city);
          const reply = await run(store, uid, "startDemoWorld",
            `${world.id} ${moment.id}`);
          assert.match(reply, /^Done\./u);
          assertStoreMatchesContracts(store);
          assertConsistentWorld({store, uid, world, moment: moment.id});

          await run(store, uid, "clearDemoState");
          assert.deepEqual(pathsWithSeedPrefix(store, suvbotSeedPrefix(uid)),
            [], "clear leaves nothing from the world");
          assert.ok(store.getDoc(`matches/${suvbotMatchId(uid)}`));
          assertStoreMatchesContracts(store);
        }
      );
    }
  }
}

/**
 * Checks events, guests, chats and notifications agree with each other and
 * with the world's derived state at the moment.
 * @param {object} params Store, tester, world and moment.
 */
function assertConsistentWorld({
  store,
  uid,
  world,
  moment,
}: {
  store: SuvbotFakeFirestore;
  uid: string;
  world: DemoWorld;
  moment: SuvbotDemoMoment;
}): void {
  const prefix = suvbotSeedPrefix(uid);
  const docs = [...store.docs];
  const participations = docs
    .filter(([docPath]) => docPath.startsWith("eventParticipations/"))
    .map(([, data]) => data);
  const primary = world.events.find((event) => event.guestPerspective) ??
    world.events[0];
  const worldMoment = SUVBOT_DEMO_MOMENTS
    .find((item) => item.id === moment)?.worldMoment as string;
  const nowMs = NOW.getTime();

  for (const event of world.events) {
    const eventId = `${prefix}_${event.id}`;
    const doc = store.getDoc(`events/${eventId}`);
    assert.ok(doc, `events/${eventId}`);
    assert.equal(doc.synthetic, true);
    assert.equal(doc.publicationState, "published");
    const rows = participations.filter((row) => row.eventId === eventId);
    const booked = rows.filter((row) =>
      row.status === "signedUp" || row.status === "attended");
    assert.equal(doc.bookedCount, booked.length, `${eventId} bookedCount`);
    assert.equal(doc.checkedInCount,
      booked.filter((row) => row.status === "attended").length);
    for (const row of rows) {
      if (row.uid === uid) continue;
      assert.ok(store.getDoc(`users/${row.uid}`), `users/${row.uid}`);
      assert.ok(store.getDoc(`publicProfiles/${row.uid}`));
    }
    const state = eventStateAt(world, event.id, worldMoment);
    const testerRows = event.id === primary.id ? 1 : 0;
    // The tester takes a seat; a full event gives up its latest booking.
    assert.equal(doc.bookedCount,
      Math.min(state.booked + testerRows, event.capacity));
    const start = millis(doc.startTime);
    const end = millis(doc.endTime);
    if (event.id === primary.id) {
      if (moment === "before" || moment === "today") {
        assert.ok(start > nowMs, "upcoming");
      } else if (moment === "live") {
        assert.ok(start <= nowMs && nowMs < end, "live");
      } else {
        assert.ok(end <= nowMs && nowMs <= end + DAY_MS, "swipe window open");
      }
    }
  }

  const organizer = store.getDoc(`organizers/${prefix}_${world.organizer.id}`);
  assert.equal(organizer?.appVisibility, "hidden");
  assert.equal(organizer?.synthetic, true);

  const tester = participations.find((row) => row.uid === uid);
  assert.equal(tester?.eventId, `${prefix}_${primary.id}`);
  assert.equal(tester?.status,
    moment === "live" || moment === "after" ? "attended" : "signedUp");
  if (primary.priceInPaise > 0) {
    const payment = store.getDoc(String(tester?.paymentId) ?
      `payments/${tester?.paymentId}` : "");
    assert.equal(payment?.status, "completed");
    assert.equal(payment?.amount, primary.priceInPaise);
    assert.doesNotMatch(String(payment?.orderId), /^order_/u);
  }

  const notifications = docs
    .filter(([docPath]) => docPath.startsWith(`notifications/${uid}/items/`))
    .map(([, data]) => data);
  for (const item of notifications) {
    assert.ok(millis(item.createdAt) <= nowMs, "no alerts from the future");
    if (typeof item.eventId === "string") {
      assert.ok(store.getDoc(`events/${item.eventId}`), String(item.eventId));
    }
    if (typeof item.matchId === "string") {
      assert.ok(store.getDoc(`matches/${item.matchId}`), String(item.matchId));
    }
  }
  assert.ok(notifications.some((item) => item.type === "eventSignup"));

  for (const [docPath, data] of docs) {
    if (!docPath.startsWith("savedEvents/")) continue;
    const saved = store.getDoc(`events/${data.eventId}`);
    assert.ok(saved && millis(saved.startTime) > nowMs, docPath);
  }

  const matches = docs.filter(([docPath, data]) =>
    /^matches\/[^/]+$/u.test(docPath) &&
      docPath !== `matches/${suvbotMatchId(uid)}` &&
      (data.participantIds as string[]).includes(uid));
  if (moment === "after") {
    assert.ok(matches.length >= 2 && matches.length <= 3,
      `${matches.length} catches`);
    for (const [docPath, data] of matches) {
      const partner = (data.participantIds as string[])
        .find((id) => id !== uid) as string;
      assert.ok(store.getDoc(`profileDecisions/${uid}/outgoing/${partner}`));
      assert.ok(store.getDoc(`profileDecisions/${partner}/outgoing/${uid}`));
      const partnerRow = participations.find((row) =>
        row.uid === partner && row.eventId === `${prefix}_${primary.id}`);
      assert.equal(partnerRow?.status, "attended", "catches attended");
      const matchId = docPath.split("/")[1];
      assert.ok(store.getDoc(`notifications/${uid}/items/match_${matchId}`));
      if (data.lastMessageSenderId) {
        const opener = store.getDoc(`${docPath}/messages/suvbot_opener`);
        assert.equal(opener?.senderId, partner);
        assert.equal(data.lastMessageSenderId, partner);
      }
    }
  } else {
    assert.equal(matches.length, 0);
  }
}

test("warm presets and resets keep every write on contract", async () => {
  const uid = "tester_presets";
  const store = storeWithTester(uid, "in-mh-mumbai");
  for (const action of [
    "warmSignupState",
    "warmPostEventState",
    "warmChatState",
    "refreshDemoState",
    "checkDemoState",
    "resetNotifications",
    "resetChats",
    "resetBookings",
    "warmPaymentState",
    "help",
    "clearDemoState",
  ]) {
    const reply = await run(store, uid, action);
    assert.ok(reply.length > 0, action);
    assertStoreMatchesContracts(store);
  }
  assert.deepEqual(pathsWithSeedPrefix(store, suvbotSeedPrefix(uid)), []);
});

test("resetBookings repairs the world event's counts", async () => {
  const uid = "tester_bookings";
  const store = storeWithTester(uid, "in-mh-mumbai");
  const world = suvbotWorldBundle.worlds[0];
  await run(store, uid, "startDemoWorld", `${world.id} today`);
  const eventPath = `events/${suvbotSeedPrefix(uid)}_${world.events[0].id}`;
  const before = store.getDoc(eventPath)?.bookedCount as number;
  await run(store, uid, "resetBookings");
  const after = store.getDoc(eventPath);
  assert.equal(after?.bookedCount, before - 1);
  assertStoreMatchesContracts(store);
});

test("restarting a world replaces it without leftovers", async () => {
  const uid = "tester_restart";
  const store = storeWithTester(uid, "in-mh-mumbai");
  const world = suvbotWorldBundle.worlds[0];
  await run(store, uid, "startDemoWorld", `${world.id} after`);
  const later = new Date(NOW.getTime() + 3 * DAY_MS);
  await run(store, uid, "startDemoWorld", `${world.id} before`, later);
  const prefix = suvbotSeedPrefix(uid);
  const leftovers = [...store.docs].filter(([docPath, data]) =>
    data.seedPrefix === prefix && data.demoOpsCommand !== undefined &&
      docPath.startsWith("matches/"));
  assert.deepEqual(leftovers.map(([docPath]) => docPath), []);
  const event = store.getDoc(`events/${prefix}_${world.events[0].id}`);
  assert.ok(millis(event?.startTime) > later.getTime());
  assertStoreMatchesContracts(store);
});

test("a tester whose preferences match nobody gets no catches", async () => {
  const uid = "tester_no_match";
  const store = storeWithTester(uid, "in-mh-mumbai",
    {interestedInGenders: ["nonBinary"]});
  const world = suvbotWorldBundle.worlds[0];
  const reply = await run(store, uid, "startDemoWorld", `${world.id} after`);
  assert.match(reply, /Swipe on the guests/u);
  assertStoreMatchesContracts(store);
});

test("Start a demo without a world lists the choices", async () => {
  const uid = "tester_menu";
  const store = storeWithTester(uid, "in-mh-mumbai");
  const reply = await run(store, uid, "startDemoWorld");
  for (const world of suvbotWorldBundle.worlds) {
    assert.ok(reply.includes(world.id), world.id);
  }
});

test("matchTesterByPhone writes a contract-valid tester match", async () => {
  const store = storeWithTester("tester_a", "in-mh-mumbai");
  store.setDoc("users/tester_b", testerProfile("in-mh-pune",
    {phoneNumber: "+919811100002", firstName: "Bina", name: "Bina Tester"}));
  store.setDoc("demoSelfServiceAccess/tester_b", {
    uid: "tester_b",
    enabled: true,
  });
  const reply = await run(store, "tester_a", "matchTesterByPhone",
    "match +919811100002");
  assert.match(reply, /matched you with Bina Tester/u);
  const match = store.getDoc("matches/tester_a_tester_b");
  assert.equal(match?.conversationType, "match");
  assert.equal(match?.demoOpsEntityType, undefined);
  assertStoreMatchesContracts(store);
});

test("contracts reject the fields the old Suvbot wrote", () => {
  const savedAt = admin.firestore.Timestamp.fromDate(NOW);
  assert.throws(() => assertValidSuvbotDocument({
    path: "savedEvents/u_e",
    data: {uid: "u", eventId: "e", savedAt, createdAt: savedAt},
  }), /breaks its contract/u);
  assert.throws(() => assertValidSuvbotDocument({
    path: "notifications/u/items/n",
    data: {uid: "u", type: "payment", title: "t", body: "b",
      createdAt: savedAt},
  }), /breaks its contract/u);
  assert.throws(() => assertValidSuvbotDocument({
    path: "clubs/legacy",
    data: {name: "x"},
  }), /no Firestore contract/u);
  assert.throws(() => assertValidSuvbotDocument({
    path: "savedEvents/u_e",
    data: {uid: "u", eventId: "e", savedAt: {kind: "serverTimestamp"}},
  }), /concrete values|breaks its contract/u);
});
