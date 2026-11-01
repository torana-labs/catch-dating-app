import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  AccountActionDeps,
  adminLiftAccountSafetyActionHandler,
  adminListAccountSafetyActionsHandler,
  adminTakeAccountSafetyActionHandler,
  expireAccountSafetyActionsNow,
} from "./accountActions";
import {
  assertAccountMayBook,
  assertAccountMayMessage,
  deriveAccountSafetyState,
} from "./accountStanding";
import {
  adminDecideSafetyAppealHandler,
  submitSafetyAppealHandler,
} from "./safetyAppeals";
import {fileSafetyReport} from "./reporting";
import {
  bannedIdentityId,
  reconcileBannedIdentityScreensNow,
  screenNewAccountIdentities,
} from "./bannedIdentities";
import {manageOrganizerGuestBlockHandler} from "./organizerGuestBlocks";
import {
  purgeRetainedSafetyRecordsNow,
  retainSafetyRecordsForDeletedAccount,
} from "./safetyRetention";

const DAY = 24 * 3600_000;
const T0 = Date.UTC(2026, 10, 1, 9);

interface Harness {
  db: FakeFirestore;
  deps: AccountActionDeps;
  clock: {millis: number};
  authUsers: Map<string, {disabled: boolean; phoneNumber?: string;
    creationTime: string}>;
  cancelled: string[];
}

function harness(seed: Record<string, Record<string, unknown>> = {}):
  Harness {
  const db = new FakeFirestore({
    "users/guest-1": {displayName: "Arjun M."},
    "users/guest-2": {displayName: "Ana D."},
    "users/owner-1": {displayName: "Suvrat"},
    "users/ops-1": {displayName: "Dev"},
    "reports/report-1": {
      reporterUserId: "guest-2",
      targetUserId: "guest-1",
      status: "open",
      source: "chat",
    },
    ...seed,
  });
  const clock = {millis: T0};
  let ids = 0;
  const authUsers = new Map([
    ["guest-1", {disabled: false, phoneNumber: "+919800000001",
      creationTime: new Date(T0 - 100 * DAY).toUTCString()}],
    ["guest-2", {disabled: false, phoneNumber: "+919800000002",
      creationTime: new Date(T0 - 100 * DAY).toUTCString()}],
  ]);
  const cancelled: string[] = [];
  const deps: AccountActionDeps = {
    firestore: () => db as never,
    auth: () => ({
      getUser: async (uid: string) => {
        const user = authUsers.get(uid);
        if (!user) {
          throw Object.assign(new Error("missing"),
            {code: "auth/user-not-found"});
        }
        return {uid, ...user, metadata: {creationTime: user.creationTime}};
      },
      updateUser: async (uid: string, patch: {disabled?: boolean}) => {
        const user = authUsers.get(uid)!;
        user.disabled = patch.disabled ?? user.disabled;
        return {uid} as never;
      },
      revokeRefreshTokens: async () => undefined,
    }) as never,
    now: () => Timestamp.fromMillis(clock.millis),
    serverTimestamp: () => "SERVER_TS" as never,
    newActionId: () => `action-${String(++ids).padStart(4, "0")}`,
    bookings: {
      cancelSignUp: async (_uid, eventId) => {
        cancelled.push(eventId);
      },
      leaveWaitlist: async (_uid, eventId) => {
        cancelled.push(`waitlist:${eventId}`);
      },
    },
  };
  return {db, deps, clock, authUsers, cancelled};
}

function adminRequest(uid: string, claims: Record<string, boolean>,
  data: unknown) {
  return {
    auth: {uid, token: claims},
    data,
    rawRequest: {headers: {}},
  } as never;
}

const OWNER = {adminOwner: true};
const OPS = {support: true};

function takePayload(overrides: Record<string, unknown> = {}) {
  return {
    uid: "guest-1",
    kind: "restrict",
    durationDays: 7,
    reasonCode: "harassment",
    messageToUser: "Two messages broke our rule on harassment.",
    caseTargetPath: "reports/report-1",
    notifyReporter: true,
    appealable: true,
    note: "Two harassing messages.",
    ...overrides,
  };
}

async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error) =>
    error instanceof HttpsError && error.code === code);
}

async function mayMessage(h: Harness, uid: string): Promise<boolean> {
  try {
    await h.db.runTransaction((tx) => assertAccountMayMessage(tx as never,
      h.db as never, uid, h.clock.millis));
    return true;
  } catch {
    return false;
  }
}

async function mayBook(h: Harness, uid: string, organizerId: string | null):
  Promise<boolean> {
  try {
    await h.db.runTransaction((tx) => assertAccountMayBook(tx as never,
      h.db as never, uid, organizerId, h.clock.millis));
    return true;
  } catch {
    return false;
  }
}

test("ops restrict an account: messaging held, case closed, reporter " +
  "told it was handled", async () => {
  const h = harness();
  const result = await adminTakeAccountSafetyActionHandler(
    adminRequest("ops-1", OPS, takePayload()), h.deps);
  assert.equal(result.kind, "restrict");
  assert.equal(result.endsAtMillis, T0 + 7 * DAY);
  assert.equal(await mayMessage(h, "guest-1"), false);
  assert.equal(await mayBook(h, "guest-1", null), true);
  const report = h.db.getDoc("reports/report-1")!;
  assert.equal(report.status, "reviewed");
  assert.deepEqual(report.actionIds, [result.actionId]);
  const reporterNotice = h.db.getDoc(
    "accountSafetyNotices/guest-2/items/report-handled-report-1")!;
  assert.equal(reporterNotice.kind, "reportHandled");
  assert.doesNotMatch(String(reporterNotice.body), /restrict/iu);
  const notice = h.db.getDoc(
    `accountSafetyNotices/guest-1/items/action-${result.actionId}`)!;
  assert.equal(notice.appealable, true);
  assert.equal(h.authUsers.get("guest-1")!.disabled, false);
});

test("suspend and ban are owner-only", async () => {
  const h = harness();
  for (const kind of ["suspend", "ban"]) {
    await rejectsWith(adminTakeAccountSafetyActionHandler(
      adminRequest("ops-1", OPS, takePayload({kind,
        durationDays: kind === "ban" ? null : 30})), h.deps),
    "permission-denied");
  }
});

test("a ban signs the person out, cancels future bookings, blocks their " +
  "phone, and lifting it restores everything", async () => {
  const h = harness({
    "eventParticipations/e1__guest-1": {uid: "guest-1", eventId: "e1",
      status: "signedUp"},
    "eventParticipations/e2__guest-1": {uid: "guest-1", eventId: "e2",
      status: "signedUp"},
    "events/e1": {startTime: Timestamp.fromMillis(T0 + DAY)},
    "events/e2": {startTime: Timestamp.fromMillis(T0 - DAY)},
  });
  const result = await adminTakeAccountSafetyActionHandler(
    adminRequest("owner-1", OWNER, takePayload({kind: "ban",
      durationDays: null})), h.deps);
  assert.deepEqual(h.cancelled, ["e1"]);
  assert.equal(result.bookings.cancelled, 1);
  assert.equal(h.authUsers.get("guest-1")!.disabled, true);
  assert.equal(await mayBook(h, "guest-1", null), false);
  const phoneId = bannedIdentityId({kind: "phone", value: "+919800000001"});
  assert.equal(h.db.getDoc(`bannedIdentities/${phoneId}`)!.active, true);

  await rejectsWith(adminLiftAccountSafetyActionHandler(
    adminRequest("ops-1", OPS, {actionId: result.actionId, note: "x"}),
    h.deps), "permission-denied");
  await adminLiftAccountSafetyActionHandler(adminRequest("owner-1", OWNER,
    {actionId: result.actionId, note: "Mistaken identity."}), h.deps);
  assert.equal(h.authUsers.get("guest-1")!.disabled, false);
  assert.equal(await mayBook(h, "guest-1", null), true);
  assert.equal(h.db.getDoc(`bannedIdentities/${phoneId}`)!.active, false);
});

test("a new account on a banned phone is disabled and recorded",
  async () => {
    const h = harness();
    const ban = await adminTakeAccountSafetyActionHandler(
      adminRequest("owner-1", OWNER, takePayload({kind: "ban",
        durationDays: null})), h.deps);
    h.clock.millis += DAY;
    h.authUsers.set("guest-9", {disabled: false,
      phoneNumber: "+919800000001",
      creationTime: new Date(h.clock.millis).toUTCString()});
    const stopped = await screenNewAccountIdentities(h.deps, "guest-9",
      [{kind: "phone", value: "+91 98000 00001"}]);
    assert.equal(stopped, true);
    assert.equal(h.authUsers.get("guest-9")!.disabled, true);
    const attempts = [...h.db.docs.entries()]
      .filter(([path]) => path.startsWith("blockedSignupAttempts/"));
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0][1].actionId, ban.actionId);
    const list = await adminListAccountSafetyActionsHandler(
      adminRequest("owner-1", OWNER, {view: "active", uid: null, limit: 20}),
      h.deps);
    assert.equal(list.items[0].blockedSignupAttempts, 1);
    assert.equal(list.items[0].displayName, "Arjun M.");
  });

test("an account older than the ban is not stopped by a shared device",
  async () => {
    const h = harness();
    await adminTakeAccountSafetyActionHandler(
      adminRequest("owner-1", OWNER, takePayload({kind: "ban",
        durationDays: null})), h.deps);
    const stopped = await screenNewAccountIdentities(h.deps, "guest-2",
      [{kind: "phone", value: "+919800000001"}]);
    assert.equal(stopped, false);
  });

test("restrictions expire on time", async () => {
  const h = harness();
  await adminTakeAccountSafetyActionHandler(
    adminRequest("ops-1", OPS, takePayload()), h.deps);
  h.clock.millis += 7 * DAY + 1;
  assert.equal(await expireAccountSafetyActionsNow(h.deps), 1);
  assert.equal(await mayMessage(h, "guest-1"), true);
  assert.equal(h.db.getDoc("accountSafetyStates/guest-1")!.level, "none");
});

test("an appeal is reviewed once, by someone who did not decide",
  async () => {
    const h = harness();
    const action = await adminTakeAccountSafetyActionHandler(
      adminRequest("ops-1", OPS, takePayload({durationDays: 30})), h.deps);
    await submitSafetyAppealHandler(adminRequest("guest-1", {},
      {actionId: action.actionId, text: "I only returned her jacket."}),
    h.deps);
    await rejectsWith(submitSafetyAppealHandler(adminRequest("guest-1", {},
      {actionId: action.actionId, text: "Again"}), h.deps),
    "failed-precondition");
    const decision = {actionId: action.actionId, outcome: "reduce",
      reduceTo: {kind: "warn", durationDays: null},
      messageToUser: "We changed this to a warning.", note: "First time."};
    await rejectsWith(adminDecideSafetyAppealHandler(
      adminRequest("ops-1", OPS, decision), h.deps), "permission-denied");
    const result = await adminDecideSafetyAppealHandler(
      adminRequest("owner-1", OWNER, decision), h.deps);
    assert.equal(result.outcome, "reduce");
    assert.ok(result.replacementActionId);
    assert.equal(await mayMessage(h, "guest-1"), true);
    const original = h.db.getDoc(`accountSafetyActions/${action.actionId}`)!;
    assert.equal(original.status, "replaced");
    assert.equal((original.appeal as {status: string}).status, "reduced");
    assert.equal(h.db.getDoc("accountSafetyStates/guest-1")!.level,
      "warned");
  });

test("a severe report restricts at once, pending review; a standard one " +
  "does not", async () => {
  const h = harness();
  const reporting = {firestore: h.deps.firestore, now: h.deps.now,
    accountActions: h.deps};
  await fileSafetyReport(reporting, {reporterUserId: "guest-2",
    reporterRole: "guest", targetUserId: "guest-1", source: "chat",
    reasonCode: "harassment"});
  assert.equal(await mayMessage(h, "guest-1"), true);
  const reportId = await fileSafetyReport(reporting, {
    reporterUserId: "guest-2", reporterRole: "guest",
    targetUserId: "guest-1", source: "chat", reasonCode: "intimate_images"});
  assert.equal(await mayMessage(h, "guest-1"), false);
  const report = h.db.getDoc(`reports/${reportId}`)!;
  assert.equal(report.severity, "severe");
  assert.equal(report.status, "open");
  assert.equal((report.takedownDueAt as Timestamp).toMillis(), T0 + DAY);
  assert.equal((report.resolveDueAt as Timestamp).toMillis(), T0 + 15 * DAY);
  assert.ok(h.db.getDoc(
    `accountSafetyNotices/guest-2/items/report-received-${reportId}`));
  const actions = [...h.db.docs.values()].filter((doc) =>
    doc.automatic === true);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].decidedByRole, "system");
});

test("an organizer's block stops booking that organizer only", async () => {
  const h = harness({
    "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
      hostProfiles: []},
  });
  await manageOrganizerGuestBlockHandler(adminRequest("host-1", {},
    {organizerId: "org-1", uid: "guest-1", blocked: true}),
  {firestore: h.deps.firestore, now: h.deps.now});
  assert.equal(await mayBook(h, "guest-1", "org-1"), false);
  assert.equal(await mayBook(h, "guest-1", "org-2"), true);
  await rejectsWith(manageOrganizerGuestBlockHandler(adminRequest("guest-2",
    {}, {organizerId: "org-1", uid: "guest-1", blocked: false}),
  {firestore: h.deps.firestore, now: h.deps.now}), "permission-denied");
});

test("case records are kept 180 days after deletion, then purged",
  async () => {
    const h = harness();
    const action = await adminTakeAccountSafetyActionHandler(
      adminRequest("ops-1", OPS, takePayload()), h.deps);
    await retainSafetyRecordsForDeletedAccount(h.db as never, "guest-1",
      h.clock.millis);
    assert.equal(h.db.getDoc("accountSafetyStates/guest-1"), undefined);
    assert.ok(h.db.getDoc(`accountSafetyActions/${action.actionId}`));
    await purgeRetainedSafetyRecordsNow(h.db as never,
      Timestamp.fromMillis(T0 + 179 * DAY));
    assert.ok(h.db.getDoc(`accountSafetyActions/${action.actionId}`));
    await purgeRetainedSafetyRecordsNow(h.db as never,
      Timestamp.fromMillis(T0 + 181 * DAY));
    assert.equal(h.db.getDoc(`accountSafetyActions/${action.actionId}`),
      undefined);
  });

test("standing takes the strongest action and the latest hold", () => {
  const at = Timestamp.fromMillis(T0);
  const state = deriveAccountSafetyState("u", [
    {actionId: "a1", kind: "warn", endsAt: null, status: "active"},
    {actionId: "a2", kind: "restrict",
      endsAt: Timestamp.fromMillis(T0 + 30 * DAY), status: "active"},
    {actionId: "a3", kind: "suspend",
      endsAt: Timestamp.fromMillis(T0 + 7 * DAY), status: "active"},
    {actionId: "a4", kind: "ban", endsAt: null, status: "lifted"},
  ], T0, false, at);
  assert.equal(state.level, "suspended");
  assert.equal((state.messaging.until as Timestamp).toMillis(), T0 + 30 * DAY);
  assert.equal((state.booking.until as Timestamp).toMillis(), T0 + 7 * DAY);
  assert.deepEqual(state.activeActionIds, ["a1", "a2", "a3"]);
});

test("the nightly reconcile stops a new account the trigger missed",
  async () => {
    const h = harness();
    await adminTakeAccountSafetyActionHandler(
      adminRequest("owner-1", OWNER, takePayload({kind: "ban",
        durationDays: null})), h.deps);
    h.clock.millis += DAY;
    const created = new Date(h.clock.millis).toUTCString();
    h.authUsers.set("guest-8", {disabled: false,
      phoneNumber: "+919800000001", creationTime: created});
    const stopped = await reconcileBannedIdentityScreensNow(h.deps,
      async () => ({users: [{uid: "guest-8", phoneNumber: "+919800000001",
        disabled: false, metadata: {creationTime: created}}]}));
    assert.equal(stopped, 1);
    assert.equal(h.authUsers.get("guest-8")!.disabled, true);
  });
