import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {HttpsError} from "firebase-functions/v2/https";
import {Identity, CurrentUser} from "./model";
import {DemoDeps, adminGetBlueprint, adminGetCapability, adminGetInvitation,
  adminListBlueprints, adminListInvitations,
  advanceSession, createDemoContinuation, resumeDemoContinuation,
  getPreview, getSession,
  issueInvitation, reviewBlueprint, revokeInvitation, saveBlueprint,
  salesDemoSetup, startSession, withdrawBlueprint} from "./service";

interface Ref {path: string; id: string}
class MemoryDb {
  docs = new Map<string, Record<string, unknown>>();
  versions = new Map<string, number>();
  writes = 0;
  put(path: string, value: Record<string, unknown>): void {
    this.docs.set(path, structuredClone(value));
    this.versions.set(path, (this.versions.get(path) ?? 0) + 1);
    this.writes++;
  }
  collection(name: string) {
    const query = (field: string, target: string,
      cursor: string | null = null, cap = 20) => ({
      orderBy: () => query(field, target, cursor, cap),
      startAfter: (anchor: Ref) => query(field, target, anchor.id, cap),
      limit: (next: number) => query(field, target, cursor, next),
      get: async () => {
        const docs = [...this.docs.entries()]
          .filter(([path, data]) => path.startsWith(`${name}/`) &&
            data[field] === target && (!cursor ||
              path.slice(name.length + 1) > cursor))
          .sort(([a], [b]) => a.localeCompare(b)).slice(0, cap)
          .map(([path]) => this.snap({path,
            id: path.slice(name.length + 1)}));
        return {docs};
      },
    });
    return {where: (field: string, _operator: string, target: string) =>
      query(field, target), doc: (id: string) => {
      const ref = {path: `${name}/${id}`, id};
      return {...ref, get: async () => this.snap(ref)};
    }};
  }
  snap(ref: Ref) {
    const data = this.docs.get(ref.path);
    return {exists: Boolean(data), id: ref.id,
      data: () => data ? structuredClone(data) : undefined};
  }
  async runTransaction<T>(callback: (tx: {
    get(ref: Ref): Promise<ReturnType<MemoryDb["snap"]>>;
    create(ref: Ref, value: Record<string, unknown>): void;
    set(ref: Ref, value: Record<string, unknown>): void;
    update(ref: Ref, value: Record<string, unknown>): void;
  }) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const reads = new Map<string, number>();
      const writes: Array<{kind: "create" | "set" | "update";
        ref: Ref; value: Record<string, unknown>}> = [];
      const result = await callback({
        get: async (ref) => {
          assert.equal(writes.length, 0, "transaction reads precede writes");
          reads.set(ref.path, this.versions.get(ref.path) ?? 0);
          return this.snap(ref);
        },
        create: (ref, value) => writes.push({kind: "create", ref, value}),
        set: (ref, value) => writes.push({kind: "set", ref, value}),
        update: (ref, value) => writes.push({kind: "update", ref, value}),
      });
      if ([...reads].some(([path, version]) =>
        (this.versions.get(path) ?? 0) !== version)) continue;
      for (const write of writes) {
        const existing = this.docs.get(write.ref.path);
        if (write.kind === "create" && existing) {
          throw new Error("duplicate create");
        }
        if (write.kind === "update" && !existing) {
          throw new Error("missing update");
        }
        this.put(write.ref.path, write.kind === "update" ?
          {...existing, ...write.value} : write.value);
      }
      return result;
    }
    throw new Error("transaction contention");
  }
}
const TOKEN_AUTH_TIME = Date.parse("2026-09-28T10:00:00.000Z") / 1000;
const TOKEN_VALID_AFTER = "2026-09-28T09:00:00.000Z";
const owner: Identity = {uid: "owner-uid",
  token: {auth_time: TOKEN_AUTH_TIME}};
const intended: Identity = {uid: "intended-uid", token: {
  email: "host@example.invalid", email_verified: true,
  auth_time: TOKEN_AUTH_TIME}};
const other: Identity = {uid: "other-uid", token: {
  email: "other@example.invalid", email_verified: true,
  auth_time: TOKEN_AUTH_TIME}};
const samplePreview = {brandName: "Example Host", headline: "Try a sample",
  scenario: "Sample application review", steps: ["Review a sample application",
    "Prepare a sample reply", "Admit a sample guest"],
  retainedTools: ["External form remains in place"],
  limitations: ["Simulation only; no real message or admission"],
  cta: "Try sample workflow"};
function fixture() {
  const db = new MemoryDb();
  db.put("salesDemoCapabilities/synthetic_forms_v1",
    {schemaVersion: 1, classification: "sales_private",
      capability: "synthetic_forms_v1", revision: "revision-001",
      evidenceRevision: "evidence-001",
      enabled: true, reviewedByUid: "product-owner-uid",
      reviewedAt: "2026-09-28T09:00:00.000Z"});
  let clock = new Date("2026-09-28T10:00:00.000Z");
  const users = new Map<string, CurrentUser>([
    ["owner-uid", {disabled: false, customClaims: {adminOwner: true},
      tokensValidAfterTime: TOKEN_VALID_AFTER}],
    ["intended-uid", {disabled: false, email: "host@example.invalid",
      emailVerified: true, tokensValidAfterTime: TOKEN_VALID_AFTER}],
    ["other-uid", {disabled: false, email: "other@example.invalid",
      emailVerified: true, tokensValidAfterTime: TOKEN_VALID_AFTER}],
  ]);
  const deps: DemoDeps = {db: db as unknown as FirebaseFirestore.Firestore,
    now: () => clock, getUser: async (uid) => users.get(uid) ??
      {disabled: true}, tokenKey: () => Buffer.alloc(32, 7)};
  return {db, deps, users, setTime: (value: string) => {
    clock = new Date(value);
  }};
}
async function blueprint(deps: DemoDeps, organizerId: string | null = null,
  opportunityId: string | null = null, setupPlan?: unknown) {
  await saveBlueprint(deps, owner, {requestId: "save-demo-001",
    blueprintId: "blueprint-001", expectedRevision: 0,
    organizerId, candidateId: organizerId ? null : "candidate-001",
    opportunityId, evidenceRevision: "evidence-001",
    formCapabilityReview: {questionTypes: "manual", branching: "unsupported",
      requiredFields: "manual", scoringApproval: "unsupported",
      uploads: "retained"}, fieldMappings: [],
    preview: samplePreview, ...(setupPlan ? {setupPlan} : {})});
  await reviewBlueprint(deps, owner, {requestId: "review-demo-001",
    blueprintId: "blueprint-001", expectedRevision: 1});
}
const intendedBinding = {kind: "email", value: "host@example.invalid"};
async function invite(deps: DemoDeps, binding: unknown = intendedBinding) {
  return issueInvitation(deps, owner, {requestId: "issue-demo-001",
    blueprintId: "blueprint-001", blueprintRevision: 2,
    contactBinding: binding, expiresAt: "2026-09-30T10:00:00.000Z",
    sessionCap: 2});
}
async function rejectsCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof HttpsError && error.code === code);
}

test("preview is minimal and does not mutate or consume an invitation",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const before = db.writes;
    const first = await getPreview(deps,
      {invitationId: issued.invitationId});
    const second = await getPreview(deps,
      {invitationId: issued.invitationId});
    assert.deepEqual(second, first);
    assert.equal(first.preview.brandName, "Catch Host");
    assert.equal(first.expiresAt, null);
    assert.equal(first.interactiveAvailable, false);
    assert.equal(db.writes, before);
    assert.deepEqual(Object.keys(first).sort(),
      ["expiresAt", "interactiveAvailable", "invitationId", "notice",
        "preview", "schemaVersion", "synthetic"]);
    assert.equal(JSON.stringify(first).includes("host@example.invalid"),
      false);
    assert.equal([...db.docs.keys()].some((key) =>
      key.startsWith("salesDemoSessions/")), false);
  });

test("owner management reads are scoped, paginated and omit invitation secrets",
  async () => {
    const {db, deps, users} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const before = db.writes;
    const capability = await adminGetCapability(deps, owner, {});
    assert.ok(capability.templateOptions.some((item) =>
      item.templateId === "blank"));
    assert.deepEqual({...capability, templateOptions: undefined},
      {templateOptions: undefined, capability: "synthetic_forms_v1",
        revision: "revision-001", evidenceRevision: "evidence-001",
        enabled: true});
    const otherBlueprint = {...db.docs.get("salesDemoBlueprints/blueprint-001"),
      blueprintId: "blueprint-002", organizerId: "organizer-002"};
    db.put("salesDemoBlueprints/blueprint-002", otherBlueprint);
    db.put("salesDemoBlueprints/blueprint-003", {...otherBlueprint,
      blueprintId: "blueprint-003"});
    const first = await adminListBlueprints(deps, owner,
      {organizerId: "organizer-002", limit: 1});
    assert.deepEqual(first.rows.map((row) => row.blueprintId),
      ["blueprint-002"]);
    assert.equal(first.nextCursor, "blueprint-002");
    const second = await adminListBlueprints(deps, owner,
      {organizerId: "organizer-002", cursor: first.nextCursor, limit: 1});
    assert.deepEqual(second.rows.map((row) => row.blueprintId),
      ["blueprint-003"]);
    assert.equal(second.nextCursor, null);
    await rejectsCode(adminListBlueprints(deps, owner,
      {organizerId: "organizer-002", cursor: "blueprint-001"}),
    "invalid-argument");
    const invites = await adminListInvitations(deps, owner,
      {blueprintId: "blueprint-001", limit: 1});
    assert.equal(invites.rows.length, 1);
    assert.equal(JSON.stringify(invites)
      .includes(String(issued.grantToken)), false);
    assert.equal(JSON.stringify(invites).includes("tokenDigest"), false);
    assert.equal(JSON.stringify(invites).includes("contactBinding"), false);
    assert.equal(db.writes, before + 2);
    users.set(owner.uid, {disabled: false, customClaims: {adminOwner: true},
      tokensValidAfterTime: "2026-09-28T10:00:01.000Z"});
    await rejectsCode(adminGetCapability(deps, owner, {}),
      "permission-denied");
    await rejectsCode(adminListBlueprints(deps, owner,
      {organizerId: "organizer-002"}), "permission-denied");
    await rejectsCode(adminListInvitations(deps, owner,
      {blueprintId: "blueprint-001"}), "permission-denied");
  });

test("owner revocation during a management read denies its result",
  async () => {
    const {deps, users} = fixture();
    await blueprint(deps);
    const original = deps.getUser;
    let reads = 0;
    deps.getUser = async (uid) => {
      const current = await original(uid);
      if (uid === owner.uid && ++reads === 1) {
        users.set(owner.uid, {disabled: false,
          customClaims: {adminOwner: true},
          tokensValidAfterTime: "2026-09-28T10:00:01.000Z"});
      }
      return current;
    };
    await rejectsCode(adminListBlueprints(deps, owner,
      {organizerId: "organizer-001"}), "permission-denied");
  });

test("preview-only invitation cannot start without contact binding",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps, null);
    const preview = await getPreview(deps,
      {invitationId: issued.invitationId});
    assert.equal(preview.interactiveAvailable, false);
    await rejectsCode(startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"}),
    "permission-denied");
  });

test("verified intended contact gets one bounded synthetic session",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const input = {invitationId: issued.invitationId,
      grantToken: issued.grantToken, requestId: "start-demo-001"};
    const first = await startSession(deps, intended, input);
    const retry = await startSession(deps, intended, input);
    const doubleClick = await startSession(deps, intended,
      {...input, requestId: "start-demo-002"});
    assert.equal(first.sessionId, retry.sessionId);
    assert.equal(first.sessionId, doubleClick.sessionId);
    assert.equal([...db.docs.keys()].filter((key) =>
      key.startsWith("salesDemoSessions/")).length, 1);
    const sessionId = first.sessionId;
    assert.equal(typeof sessionId, "string");
    let next = await advanceSession(deps, intended, {sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1, action: "reviewApplication", choice: "approve"});
    assert.equal(next.step, "reply");
    assert.deepEqual(await advanceSession(deps, intended, {sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1, action: "reviewApplication", choice: "approve"}),
    next);
    next = await advanceSession(deps, intended, {sessionId,
      grantToken: issued.grantToken, requestId: "reply-step-001",
      expectedRevision: 2, action: "prepareReply", choice: "welcome"});
    assert.equal(next.reply &&
      (next.reply as Record<string, unknown>).status, "prepared");
    next = await advanceSession(deps, intended, {sessionId,
      grantToken: issued.grantToken, requestId: "admit-step-001",
      expectedRevision: 3, action: "admitGuest"});
    assert.equal(next.status, "completed");
    assert.equal(JSON.stringify(next).includes("host@example.invalid"),
      false);
    const forbidden = [...db.docs.keys()].filter((key) =>
      /^(eventRehearsal|organizers|events|bookings|payments|messages|guests)/u
        .test(key));
    assert.deepEqual(forbidden, []);
    const allowed = ["salesDemoBlueprints/", "salesDemoCapabilities/",
      "salesDemoInvitations/", "salesDemoSessions/",
      "commandReceipts/salesDemo_", "adminAuditLogs/"];
    assert.ok([...db.docs.keys()].every((path) =>
      allowed.some((prefix) => path.startsWith(prefix))));
  });

test("completed sessions renew only within the invitation cap",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const complete = async (sessionId: unknown, suffix: string) => {
      await advanceSession(deps, intended, {sessionId,
        grantToken: issued.grantToken, requestId: `review-${suffix}`,
        expectedRevision: 1, action: "reviewApplication",
        choice: "approve"});
      await advanceSession(deps, intended, {sessionId,
        grantToken: issued.grantToken, requestId: `reply-${suffix}`,
        expectedRevision: 2, action: "prepareReply",
        choice: "welcome"});
      await advanceSession(deps, intended, {sessionId,
        grantToken: issued.grantToken, requestId: `admit-${suffix}`,
        expectedRevision: 3, action: "admitGuest"});
    };
    const first = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    await complete(first.sessionId, "one-001");
    const second = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-002"});
    assert.notEqual(second.sessionId, first.sessionId);
    await complete(second.sessionId, "two-002");
    await rejectsCode(startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-003"}),
    "resource-exhausted");
    assert.equal(db.docs.get(`salesDemoInvitations/${issued.invitationId}`)
      ?.sessionCount, 2);
  });

/** Start receipts are the demo replay receipts whose result is a session id. */
function startReceipts(db: {docs: Map<string, Record<string, unknown>>}):
  number {
  return [...db.docs].filter(([path, doc]) =>
    path.startsWith("commandReceipts/salesDemo_") &&
    JSON.stringify(Object.keys(doc.result as object)) === "[\"sessionId\"]")
    .length;
}

test("distinct start receipts are capped, throttled and exact retry stays free",
  async () => {
    const {db, deps, setTime} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const start = (number: number) => startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken,
        requestId: `start-demo-${String(number).padStart(3, "0")}`});
    const first = await start(1);
    for (let number = 2; number <= 6; number++) {
      assert.equal((await start(number)).sessionId, first.sessionId);
    }
    await rejectsCode(start(7), "resource-exhausted");
    const writesBeforeRetry = db.writes;
    assert.equal((await start(1)).sessionId, first.sessionId);
    assert.equal(db.writes, writesBeforeRetry);
    setTime("2026-09-28T10:01:00.000Z");
    for (let number = 7; number <= 12; number++) {
      assert.equal((await start(number)).sessionId, first.sessionId);
    }
    for (let number = 13; number <= 1001; number++) {
      await rejectsCode(start(number), "resource-exhausted");
    }
    const invitation = db.docs.get(
      `salesDemoInvitations/${issued.invitationId}`);
    assert.equal(invitation?.startReceiptCount, 12);
    assert.equal(invitation?.sessionCount, 1);
    assert.equal(startReceipts(db), 12);
    const replayWrites = db.writes;
    assert.equal((await start(1)).sessionId, first.sessionId);
    assert.equal(db.writes, replayWrites);
  });

test("concurrent distinct starts cannot exceed the minute ceiling",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const settled = await Promise.allSettled(Array.from({length: 20},
      (_, index) => startSession(deps, intended,
        {invitationId: issued.invitationId,
          grantToken: issued.grantToken,
          requestId: `parallel-${String(index).padStart(3, "0")}`})));
    const successes = settled.filter((result) =>
      result.status === "fulfilled").length;
    assert.ok(successes > 0 && successes <= 6);
    assert.equal(db.docs.get(
      `salesDemoInvitations/${issued.invitationId}`)?.startReceiptCount,
    successes);
    assert.equal(startReceipts(db), successes);
  });

test("needs-info branch prepares a reply without admitting a guest",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    await advanceSession(deps, intended, {sessionId: started.sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1, action: "reviewApplication",
      choice: "needs_info"});
    await rejectsCode(advanceSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken,
        requestId: "reply-step-bad", expectedRevision: 2,
        action: "prepareReply", choice: "welcome"}),
    "failed-precondition");
    const final = await advanceSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken,
        requestId: "reply-step-001", expectedRevision: 2,
        action: "prepareReply", choice: "clarify"});
    assert.equal(final.status, "completed");
    assert.equal((final.guest as Record<string, unknown>).status,
      "not_admitted");
  });

test("cross-account, token, and unverified contact attempts fail",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const input = {invitationId: issued.invitationId,
      grantToken: issued.grantToken, requestId: "start-demo-001"};
    await rejectsCode(startSession(deps, other, input), "permission-denied");
    await rejectsCode(startSession(deps, intended,
      {...input, grantToken: "x".repeat(43)}), "permission-denied");
    await rejectsCode(startSession(deps, {uid: intended.uid, token: {
      email: "host@example.invalid", email_verified: false,
      auth_time: TOKEN_AUTH_TIME}}, input),
    "permission-denied");
    await rejectsCode(startSession(deps, intended,
      {...input, phoneVerified: true}), "invalid-argument");
  });

test("expiry and blueprint revision invalidate preview and trial",
  async () => {
    const {deps, setTime} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    setTime("2026-10-01T00:00:00.000Z");
    await rejectsCode(getPreview(deps, {
      invitationId: issued.invitationId,
      grantToken: issued.grantToken,
    }, intended), "permission-denied");
    await rejectsCode(startSession(deps, intended, {invitationId:
      issued.invitationId, grantToken: issued.grantToken,
    requestId: "start-demo-001"}), "permission-denied");
  });

test("trusted capability gate drift invalidates preview and future actions",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    const path = "salesDemoCapabilities/synthetic_forms_v1";
    db.put(path, {...db.docs.get(path), revision: "revision-002"});
    await rejectsCode(getPreview(deps, {
      invitationId: issued.invitationId,
      grantToken: issued.grantToken,
    }, intended), "permission-denied");
    await rejectsCode(advanceSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken,
        requestId: "review-step-001", expectedRevision: 1,
        action: "reviewApplication", choice: "approve"}),
    "permission-denied");
    db.docs.delete(path);
    await rejectsCode(getPreview(deps, {
      invitationId: issued.invitationId,
      grantToken: issued.grantToken,
    }, intended), "failed-precondition");
  });

test("editing or withdrawing a reviewed blueprint invalidates invitation",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const gatePath = "salesDemoCapabilities/synthetic_forms_v1";
    db.put(gatePath, {...db.docs.get(gatePath),
      evidenceRevision: "evidence-002"});
    await saveBlueprint(deps, owner, {requestId: "save-demo-002",
      blueprintId: "blueprint-001", expectedRevision: 2,
      organizerId: null, candidateId: "candidate-001",
      opportunityId: null, evidenceRevision: "evidence-002",
      formCapabilityReview: {questionTypes: "manual",
        branching: "unsupported", requiredFields: "manual",
        scoringApproval: "unsupported", uploads: "retained"},
      fieldMappings: [], preview: samplePreview});
    await rejectsCode(getPreview(deps, {
      invitationId: issued.invitationId,
      grantToken: issued.grantToken,
    }, intended), "permission-denied");
    await reviewBlueprint(deps, owner, {requestId: "review-demo-002",
      blueprintId: "blueprint-001", expectedRevision: 3});
    await withdrawBlueprint(deps, owner, {requestId: "withdraw-demo-001",
      blueprintId: "blueprint-001", expectedRevision: 4});
    await rejectsCode(issueInvitation(deps, owner,
      {requestId: "issue-demo-002", blueprintId: "blueprint-001",
        blueprintRevision: 5, contactBinding: null,
        expiresAt: "2026-09-30T10:00:00.000Z", sessionCap: 1}),
    "failed-precondition");
  });

test("verified phone claim must match bound current Auth phone",
  async () => {
    const {deps, users} = fixture();
    await blueprint(deps);
    users.set(intended.uid, {disabled: false,
      phoneNumber: "+15550001111",
      tokensValidAfterTime: TOKEN_VALID_AFTER});
    const issued = await invite(deps,
      {kind: "phone", value: "+15550001111"});
    const input = {invitationId: issued.invitationId,
      grantToken: issued.grantToken, requestId: "start-demo-001"};
    await rejectsCode(startSession(deps, intended, input),
      "permission-denied");
    const phoneIdentity: Identity = {uid: intended.uid,
      token: {phone_number: "+15550001112",
        auth_time: TOKEN_AUTH_TIME}};
    await rejectsCode(startSession(deps, phoneIdentity, input),
      "permission-denied");
    phoneIdentity.token.phone_number = "+15550001111";
    assert.equal((await startSession(deps, phoneIdentity, input)).status,
      "active");
  });

test("revoked prospect Firebase token denies reads, writes and replay",
  async () => {
    const {deps, users} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const startInput = {invitationId: issued.invitationId,
      grantToken: issued.grantToken, requestId: "start-demo-001"};
    const started = await startSession(deps, intended, startInput);
    const actionInput = {sessionId: started.sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1, action: "reviewApplication", choice: "approve"};
    await advanceSession(deps, intended, actionInput);
    users.set(intended.uid, {disabled: false,
      email: "host@example.invalid", emailVerified: true,
      tokensValidAfterTime: "2026-09-28T10:00:01.000Z"});
    await rejectsCode(getSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken}),
    "permission-denied");
    await rejectsCode(startSession(deps, intended, startInput),
      "permission-denied");
    await rejectsCode(advanceSession(deps, intended, actionInput),
      "permission-denied");
    await rejectsCode(startSession(deps, intended,
      {...startInput, requestId: "start-demo-002"}),
    "permission-denied");
  });

test("revoked owner Firebase token denies reads and management replay",
  async () => {
    const {deps, users} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    users.set(owner.uid, {disabled: false,
      customClaims: {adminOwner: true},
      tokensValidAfterTime: "2026-09-28T10:00:01.000Z"});
    await rejectsCode(adminGetBlueprint(deps, owner,
      {blueprintId: "blueprint-001"}), "permission-denied");
    await rejectsCode(adminGetInvitation(deps, owner,
      {invitationId: issued.invitationId}), "permission-denied");
    await rejectsCode(invite(deps), "permission-denied");
    await rejectsCode(revokeInvitation(deps, owner,
      {requestId: "revoke-demo-001", invitationId: issued.invitationId,
        expectedRevision: 1}), "permission-denied");
  });

test("revocation during a transaction prevents a trial commit",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const original = deps.getUser;
    let changed = false;
    deps.getUser = async (uid) => {
      if (uid === intended.uid && !changed) {
        changed = true;
        const path = `salesDemoInvitations/${issued.invitationId}`;
        db.put(path, {...db.docs.get(path), revoked: true});
      }
      return original(uid);
    };
    await rejectsCode(startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"}),
    "permission-denied");
    assert.equal([...db.docs.keys()].some((path) =>
      path.startsWith("salesDemoSessions/")), false);
  });

test("revocation during a session action prevents its commit",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    const original = deps.getUser;
    let changed = false;
    deps.getUser = async (uid) => {
      if (uid === intended.uid && !changed) {
        changed = true;
        const path = `salesDemoInvitations/${issued.invitationId}`;
        db.put(path, {...db.docs.get(path), revoked: true});
      }
      return original(uid);
    };
    await rejectsCode(advanceSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken,
        requestId: "review-step-001", expectedRevision: 1,
        action: "reviewApplication", choice: "approve"}),
    "permission-denied");
    assert.equal(db.docs.get(`salesDemoSessions/${started.sessionId}`)
      ?.revision, 1);
  });

test("revoke and changed blueprint stop downstream session actions",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    await revokeInvitation(deps, owner, {requestId: "revoke-demo-001",
      invitationId: issued.invitationId, expectedRevision: 1});
    await rejectsCode(advanceSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken,
        requestId: "review-step-001", expectedRevision: 1,
        action: "reviewApplication", choice: "approve"}),
    "permission-denied");
    await rejectsCode(getSession(deps, intended,
      {sessionId: started.sessionId, grantToken: issued.grantToken}),
    "permission-denied");
  });

test("unsafe action injection, stale revision, and changed request fail",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    const base = {sessionId: started.sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1};
    await rejectsCode(advanceSession(deps, intended,
      {...base, action: "publish"}), "invalid-argument");
    await rejectsCode(advanceSession(deps, intended,
      {...base, action: "reviewApplication", choice: "approve",
        paymentStatus: "paid"}), "invalid-argument");
    await advanceSession(deps, intended,
      {...base, action: "reviewApplication", choice: "approve"});
    await rejectsCode(advanceSession(deps, intended,
      {...base, action: "reviewApplication", choice: "needs_info"}),
    "already-exists");
    await rejectsCode(advanceSession(deps, intended,
      {...base, requestId: "review-step-002",
        action: "reviewApplication", choice: "approve"}),
    "failed-precondition");
  });

test("management retry returns same grant without persisting token",
  async () => {
    const {db, deps, users} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const revoked = await revokeInvitation(deps, owner,
      {requestId: "revoke-demo-001",
        invitationId: issued.invitationId, expectedRevision: 1});
    const retry = await invite(deps);
    assert.deepEqual(retry, issued);
    assert.equal((await revokeInvitation(deps, owner,
      {requestId: "revoke-demo-001", invitationId: issued.invitationId,
        expectedRevision: 1})).revokedAt, revoked.revokedAt);
    assert.equal(JSON.stringify([...db.docs.values()])
      .includes(String(issued.grantToken)), false);
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("adminAuditLogs/sales_demo_")).length, 4);
    users.set(owner.uid, {disabled: false, customClaims: {}});
    await rejectsCode(invite(deps), "permission-denied");
  });

test("grant key rotation fails replay instead of returning unusable token",
  async () => {
    const {deps} = fixture();
    await blueprint(deps);
    await invite(deps);
    deps.tokenKey = () => Buffer.alloc(32, 8);
    await rejectsCode(invite(deps), "failed-precondition");
  });

test("persisted demo records satisfy their strict private contracts",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps);
    const issued = await invite(deps);
    const started = await startSession(deps, intended,
      {invitationId: issued.invitationId,
        grantToken: issued.grantToken, requestId: "start-demo-001"});
    await advanceSession(deps, intended, {sessionId: started.sessionId,
      grantToken: issued.grantToken, requestId: "review-step-001",
      expectedRevision: 1, action: "reviewApplication", choice: "approve"});
    const ajv = new Ajv({allErrors: true, strict: false});
    addFormats(ajv);
    ajv.addSchema(JSON.parse(readFileSync(resolve(__dirname,
      "../../../contracts/shared/sales_demo_setup_plan.schema.json"), "utf8")));
    const schemas = new Map([
      ["salesDemoCapabilities", "sales_demo_capabilities"],
      ["salesDemoBlueprints", "sales_demo_blueprints"],
      ["salesDemoInvitations", "sales_demo_invitations"],
      ["salesDemoSessions", "sales_demo_sessions"],
    ]);
    for (const [collection, filename] of schemas) {
      const schema = JSON.parse(readFileSync(
        resolve(__dirname, "../../../contracts/firestore",
          `${filename}.schema.json`), "utf8"));
      const validate = ajv.compile(schema);
      const docs = [...db.docs].filter(([path]) =>
        path.startsWith(`${collection}/`));
      assert.ok(docs.length > 0, collection);
      for (const [path, doc] of docs) {
        assert.ok(validate(doc), `${path}: ${JSON.stringify(validate.errors)}`);
      }
    }
    // Replay receipts are shared commandReceipts entries with no actor ids.
    const receipts = [...db.docs].filter(([path]) =>
      path.startsWith("commandReceipts/salesDemo_"));
    assert.ok(receipts.length > 0);
    for (const [path, doc] of receipts) {
      assert.equal(doc.command, "salesDemo", path);
      assert.match(String(doc.requestHash), /^[a-f0-9]{64}$/u, path);
      assert.deepEqual(Object.keys(doc).sort(),
        ["command", "createdAt", "expiresAt", "requestHash", "result"], path);
      assert.equal(JSON.stringify(doc.result).includes(intended.uid), false,
        path);
    }
  });

function demoActivities(db: MemoryDb) {
  return [...db.docs].filter(([path]) => path.startsWith("salesActivities/"))
    .map(([, value]) => value);
}
function salesAccount(db: MemoryDb, researchStatus = "researching") {
  db.put("organizerSalesAccounts/organizer-001", {
    classification: "sales_private", organizerId: "organizer-001",
    researchStatus,
    suppressionStatus: "clear",
    duplicateReviewRequired: false,
  });
}
for (const choice of ["approve", "needs_info"] as const) {
  test(`confirmed ${choice} demo projects each transition once`, async () => {
    const {db, deps} = fixture();
    salesAccount(db);
    await blueprint(deps, "organizer-001");
    const issued = await invite(deps);
    const start = {invitationId: issued.invitationId,
      grantToken: issued.grantToken, requestId: "start-demo-001"};
    const started = await startSession(deps, intended, start);
    await startSession(deps, intended, start);
    await startSession(deps, intended,
      {...start, requestId: "start-demo-002"});
    assert.deepEqual(demoActivities(db).map((row) => row.type),
      ["demo_started"]);
    const action = {sessionId: started.sessionId,
      grantToken: issued.grantToken};
    await advanceSession(deps, intended, {...action,
      requestId: "review-step-001", expectedRevision: 1,
      action: "reviewApplication", choice});
    const reply = {...action, requestId: "reply-step-001",
      expectedRevision: 2, action: "prepareReply",
      choice: choice === "approve" ? "welcome" : "clarify"};
    let completed = await advanceSession(deps, intended, reply);
    await advanceSession(deps, intended, reply);
    if (choice === "approve") {
      const admit = {...action, requestId: "admit-step-001",
        expectedRevision: 3, action: "admitGuest"};
      completed = await advanceSession(deps, intended, admit);
      await advanceSession(deps, intended, admit);
    }
    await advanceSession(deps, intended, {...action,
      requestId: "assist-step-001", expectedRevision: completed.revision,
      action: "requestAssistance"});
    const before = db.writes;
    await getSession(deps, intended, action);
    await getPreview(deps, {invitationId: issued.invitationId});
    assert.equal(db.writes, before);
    const activities = demoActivities(db);
    assert.deepEqual(activities.map((row) => row.type),
      ["demo_started", "demo_completed"]);
    const ajv = new Ajv({allErrors: true, strict: false});
    addFormats(ajv);
    const validate = ajv.compile(JSON.parse(readFileSync(resolve(__dirname,
      "../../../contracts/firestore/sales_activities.schema.json"), "utf8")));
    for (const activity of activities) {
      assert.ok(validate(activity), JSON.stringify(validate.errors));
      assert.equal(activity.actorUid, intended.uid);
      assert.deepEqual(activity.source, {kind: "sales_demo",
        sessionId: started.sessionId, blueprintId: "blueprint-001",
        blueprintRevision: 2, invitationId: issued.invitationId});
    }
    const serialized = JSON.stringify(activities);
    for (const secret of [String(issued.grantToken), "host@example.invalid",
      "Sample Applicant", "tokenDigest"]) {
      assert.equal(serialized.includes(secret), false);
    }
    assert.equal(validate({...activities[0], type: "note"}), false);
    assert.equal(validate({...activities[0], source: {
      kind: "organizer_claim", claimRequestId: "claim-001",
      transitionId: "transition-001"}}), false);
  });
}

test("candidate, missing and archived accounts never create Sales records",
  async () => {
    for (const state of ["candidate", "missing", "archived"]) {
      const {db, deps} = fixture();

      await blueprint(deps, state === "candidate" ? null : "organizer-001");
      const issued = await invite(deps);
      if (state === "archived") {
        salesAccount(db, "archived");
        await rejectsCode(startSession(deps, intended, {
          invitationId: issued.invitationId, grantToken: issued.grantToken,
          requestId: "start-demo-001"}), "failed-precondition");
        assert.deepEqual(demoActivities(db), []);
        continue;
      }
      const started = await startSession(deps, intended,
        {invitationId: issued.invitationId, grantToken: issued.grantToken,
          requestId: "start-demo-001"});
      await advanceSession(deps, intended, {sessionId: started.sessionId,
        grantToken: issued.grantToken, requestId: "review-step-001",
        expectedRevision: 1, action: "reviewApplication",
        choice: "needs_info"});
      await advanceSession(deps, intended, {sessionId: started.sessionId,
        grantToken: issued.grantToken, requestId: "reply-step-001",
        expectedRevision: 2, action: "prepareReply", choice: "clarify"});
      assert.deepEqual(demoActivities(db), []);
      assert.equal(db.docs.has("organizerSalesAccounts/organizer-001"),
        state === "archived");
    }
  });

test("concurrent starts project only the committed session transition",
  async () => {
    const {db, deps} = fixture();
    salesAccount(db);
    await blueprint(deps, "organizer-001");
    const issued = await invite(deps);
    const results = await Promise.allSettled(Array.from({length: 8},
      (_, i) => startSession(deps, intended,
        {invitationId: issued.invitationId, grantToken: issued.grantToken,
          requestId: `concurrent-demo-${i}`})));
    assert.ok(results.some((result) => result.status === "fulfilled"));
    assert.equal(demoActivities(db).length, 1);
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("salesDemoSessions/")).length, 1);
  });

test("mismatched opportunities fail save, review and start atomically",
  async () => {
    const {db, deps} = fixture();
    salesAccount(db);
    db.put("salesOpportunities/opportunity-001", {
      classification: "sales_private", opportunityId: "opportunity-001",
      organizerId: "organizer-other"});
    const before = db.writes;
    await rejectsCode(blueprint(deps, "organizer-001", "opportunity-001"),
      "failed-precondition");
    assert.equal(db.writes, before);
    await blueprint(deps, "organizer-001");
    const issued = await invite(deps);
    const path = "salesDemoBlueprints/blueprint-001";
    db.put(path, {...db.docs.get(path), opportunityId: "opportunity-001"});
    const invalidBefore = db.writes;
    await rejectsCode(reviewBlueprint(deps, owner, {
      requestId: "review-invalid-001", blueprintId: "blueprint-001",
      expectedRevision: 2}), "failed-precondition");
    await rejectsCode(startSession(deps, intended, {
      invitationId: issued.invitationId, grantToken: issued.grantToken,
      requestId: "start-demo-001"}), "failed-precondition");
    assert.equal(db.writes, invalidBefore);
    assert.deepEqual(demoActivities(db), []);
  });

async function completedSetupFixture() {
  const context = fixture();
  const {db, deps} = context;
  db.put("organizers/organizer-001", {ownerUserId: intended.uid,
    hostUserIds: [intended.uid], hostProfiles: [], claim: {state: "claimed"}});
  await blueprint(deps, "organizer-001", null, {mode: "template",
    templateId: "blank", title: "My first form", requirements: [
      "Add your questions and review consent before publishing."]});
  const issued = await invite(deps);
  const started = await startSession(deps, intended, {
    invitationId: issued.invitationId, grantToken: issued.grantToken,
    requestId: "start-demo-001"});
  const input = {sessionId: started.sessionId, grantToken: issued.grantToken};
  await advanceSession(deps, intended, {...input,
    requestId: "review-step-001", expectedRevision: 1,
    action: "reviewApplication", choice: "needs_info"});
  await advanceSession(deps, intended, {...input,
    requestId: "reply-step-001", expectedRevision: 2,
    action: "prepareReply", choice: "clarify"});
  return {...context, input};
}

test("reviewed setup read is inert and preparation preserves subsequent edits",
  async () => {
    const {db, deps, input} = await completedSetupFixture();
    const before = db.writes;
    const view = await salesDemoSetup(deps, intended, input, false);
    assert.equal(view.status, "ready");
    assert.equal(db.writes, before);
    const prepare = {...input, setupHash: view.setupHash};
    const result = await salesDemoSetup(deps, intended, prepare, true);
    assert.equal(result.status, "prepared");
    const formPath = `organizerForms/${result.formId}`;
    const draftPath = `organizerFormDrafts/${result.formId}`;
    const form = db.docs.get(formPath)!;
    assert.equal(form.status, "draft");
    assert.equal(form.activeVersionId, null);
    assert.equal(form.publishedVersion, 0);
    assert.equal(form.defaultTargetKind, "organizer");
    db.put(formPath, {...form, title: "Host edited title", draftRevision: 2});
    db.put(draftPath, {...db.docs.get(draftPath), revision: 2});
    const writes = db.writes;
    assert.deepEqual(await salesDemoSetup(deps, intended, prepare, true),
      result);
    assert.equal(db.writes, writes);
    assert.equal(db.docs.get(formPath)?.title, "Host edited title");
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("organizerForms/")).length, 1);
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("salesDemoSetups/")).length, 1);
    const ajv = new Ajv({strict: false});
    addFormats(ajv);
    const validate = ajv.compile(JSON.parse(readFileSync(resolve(__dirname,
      "../../../contracts/firestore/sales_demo_setups.schema.json"), "utf8")));
    assert.ok(validate([...db.docs].find(([path]) =>
      path.startsWith("salesDemoSetups/"))![1]),
    JSON.stringify(validate.errors));
  });

test("setup denies stale review, claim and manager loss before replay",
  async () => {
    const {db, deps, input} = await completedSetupFixture();
    const view = await salesDemoSetup(deps, intended, input, false);
    const prepare = {...input, setupHash: view.setupHash};
    await rejectsCode(salesDemoSetup(deps, intended,
      {...prepare, setupHash: "0".repeat(64)}, true), "failed-precondition");
    await salesDemoSetup(deps, intended, prepare, true);
    const path = "organizers/organizer-001";
    const original = db.docs.get(path)!;
    db.put(path, {...original, claim: {state: "unclaimed"}});
    assert.equal((await salesDemoSetup(deps, intended, input, false)).status,
      "claim_required");
    await rejectsCode(salesDemoSetup(deps, intended, prepare, true),
      "permission-denied");
    db.put(path, {...original, ownerUserId: other.uid,
      hostUserIds: [other.uid]});
    await rejectsCode(salesDemoSetup(deps, intended, prepare, true),
      "permission-denied");
    db.put(path, original);
    db.put(`salesDemoInvitations/${db.docs.get(
      `salesDemoSessions/${input.sessionId}`)?.invitationId}`, {revoked: true});
    await rejectsCode(salesDemoSetup(deps, intended, prepare, true),
      "permission-denied");
  });

test("changed template review and revoked Firebase token block setup replay",
  async () => {
    const {db, deps, input, users} = await completedSetupFixture();
    const view = await salesDemoSetup(deps, intended, input, false);
    const prepare = {...input, setupHash: view.setupHash};
    await salesDemoSetup(deps, intended, prepare, true);
    const path = "salesDemoBlueprints/blueprint-001";
    const original = db.docs.get(path)!;
    db.put(path, {...original, setupPlan: {
      ...original.setupPlan as Record<string, unknown>,
      templateHash: "0".repeat(64)}});
    await rejectsCode(salesDemoSetup(deps, intended, prepare, true),
      "failed-precondition");
    db.put(path, original);
    users.set(intended.uid, {disabled: false, email: "host@example.invalid",
      emailVerified: true, tokensValidAfterTime: "2026-09-28T10:00:01.000Z"});
    await rejectsCode(salesDemoSetup(deps, intended, prepare, true),
      "permission-denied");
  });

test("concurrent setup preparation creates one form and one durable receipt",
  async () => {
    const {db, deps, input} = await completedSetupFixture();
    const view = await salesDemoSetup(deps, intended, input, false);
    const results = await Promise.all(Array.from({length: 4}, () =>
      salesDemoSetup(deps, intended, {...input, setupHash: view.setupHash},
        true)));
    assert.ok(results.every((result) => result.formId === results[0].formId));
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("organizerForms/")).length, 1);
    assert.equal([...db.docs.keys()].filter((path) =>
      path.startsWith("salesDemoSetups/")).length, 1);
  });

test("failed setup transaction leaves neither draft nor setup receipt",
  async () => {
    const {db, deps, input} = await completedSetupFixture();
    const view = await salesDemoSetup(deps, intended, input, false);
    const original = db.runTransaction.bind(db);
    db.runTransaction = (callback) => original(async (tx) => {
      await callback(tx);
      throw new Error("injected precommit failure");
    });
    await assert.rejects(salesDemoSetup(deps, intended,
      {...input, setupHash: view.setupHash}, true), /precommit failure/u);
    assert.equal([...db.docs.keys()].some((path) =>
      /^(organizerForms|organizerFormDrafts|salesDemoSetups)\//u.test(path)),
    false);
  });

test("privacy restriction follows invitation scope before reads and replay",
  async () => {
    const {db, deps} = fixture();
    await blueprint(deps, "org-private");
    const issued = await invite(deps);
    db.put("salesPrivacyRestrictions/org-private", {status: "restricted"});
    await rejectsCode(invite(deps), "failed-precondition");
    await rejectsCode(adminGetInvitation(deps, owner,
      {invitationId: issued.invitationId}), "failed-precondition");
    await rejectsCode(getPreview(deps, {
      invitationId: issued.invitationId,
      grantToken: issued.grantToken,
    }, intended), "failed-precondition");
  });


async function continuationFixture() {
  const context = await completedSetupFixture();
  context.db.put("organizerSalesAccounts/organizer-001", {
    classification: "sales_private", organizerId: "organizer-001",
    researchStatus: "researching", suppressionStatus: "clear",
    duplicateReviewRequired: false});
  return context;
}
test("own completed handoff recovers a lost response after session removal " +
  "without renewal", async () => {
  const {db, deps, input, setTime} = await continuationFixture();
  const saved = await createDemoContinuation(deps, intended, input);
  const row = db.docs.get(`salesDemoContinuations/${saved.continuationId}`)!;
  assert.equal(JSON.stringify(row).includes(String(input.grantToken)), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, "grantToken"), false);
  db.docs.delete(`salesDemoSessions/${input.sessionId}`);
  setTime("2026-10-10T10:00:00.000Z");
  const before = db.writes;
  assert.deepEqual(await createDemoContinuation(deps, intended, input), saved);
  const recovered = await resumeDemoContinuation(deps, intended,
    {continuationId: saved.continuationId}, false);
  assert.equal(recovered.expiresAt, saved.expiresAt);
  assert.equal(db.writes, before);
  assert.equal(
    (recovered.organizer as {organizerId: string}).organizerId,
    "organizer-001");
  await rejectsCode(resumeDemoContinuation(deps, other,
    {continuationId: saved.continuationId}, false), "permission-denied");
  setTime(String(saved.expiresAt));
  await rejectsCode(createDemoContinuation(deps, intended, input),
    "permission-denied");
  assert.equal(db.writes, before);
});
test("preserved hidden organizer requires a real claim and never publishes " +
  "or materializes early", async () => {
  const {db, deps, input} = await continuationFixture();
  db.put("organizers/organizer-001", {
    name: "Private organizer", published: false,
    claim: {state: "unclaimed"}});
  const saved = await createDemoContinuation(deps, intended, input);
  const before = db.writes;
  const view = await resumeDemoContinuation(deps, intended,
    {continuationId: saved.continuationId}, false);
  const setup = view.setup as {status: string; setupHash: string};
  assert.equal(setup.status, "claim_required");
  await rejectsCode(resumeDemoContinuation(deps, intended, {
    continuationId: saved.continuationId,
    setupHash: setup.setupHash,
  }, true), "permission-denied");
  assert.equal(db.writes, before);
  assert.deepEqual(db.docs.get("organizers/organizer-001"), {
    name: "Private organizer", published: false, claim: {state: "unclaimed"}});
});
const continuationChanges = [
  "revocation", "review", "capability", "suppression", "privacy", "auth",
  "contact",
] as const;
for (const change of continuationChanges) {
  test(`continuation recovery fails closed after current ${change} changes`,
    async () => {
      const {db, deps, input, users, setTime} = await continuationFixture();
      const saved = await createDemoContinuation(deps, intended, input);
      const row = db.docs.get(
        `salesDemoContinuations/${saved.continuationId}`)!;
      const invitePath = `salesDemoInvitations/${row.invitationId}`;
      if (change === "revocation") {
        db.put(invitePath, {...db.docs.get(invitePath)!, revoked: true});
      }
      if (change === "review") {
        db.put("salesDemoBlueprints/blueprint-001", {
          ...db.docs.get("salesDemoBlueprints/blueprint-001")!, revision: 100});
      }
      if (change === "capability") {
        db.put("salesDemoCapabilities/synthetic_forms_v1", {
          ...db.docs.get("salesDemoCapabilities/synthetic_forms_v1")!,
          enabled: false,
        });
      }
      if (change === "suppression") {
        db.put("organizerSalesAccounts/organizer-001", {
          ...db.docs.get("organizerSalesAccounts/organizer-001")!,
          suppressionStatus: "suppressed",
        });
      }
      if (change === "privacy") {
        db.put("deletedUsers/intended-uid", {deletedAt: "2026-09-28"});
      }
      if (change === "auth") {
        users.set(intended.uid, {
          ...users.get(intended.uid)!, disabled: true,
        });
      }
      if (change === "contact") {
        users.set(intended.uid, {
          ...users.get(intended.uid)!, email: "changed@example.invalid",
        });
      }
      setTime("2026-10-10T10:00:00.000Z");
      const before = db.writes;
      await assert.rejects(createDemoContinuation(deps, intended, input));
      await assert.rejects(resumeDemoContinuation(deps, intended,
        {continuationId: saved.continuationId}, false));
      assert.equal(db.writes, before);
    });
}

test("personalized preview requires both the grant and current invited " +
  "contact", async () => {
  const {db, deps, users} = fixture();
  await blueprint(deps); const issued = await invite(deps);
  const input = {
    invitationId: issued.invitationId,
    grantToken: issued.grantToken,
  };
  const before = db.writes;
  const view = await getPreview(deps, input, intended);
  assert.equal(view.preview.brandName, samplePreview.brandName);
  assert.equal(view.interactiveAvailable, true);
  await rejectsCode(getPreview(deps, input, other), "permission-denied");
  users.set(intended.uid, {...users.get(intended.uid)!, disabled: true});
  await rejectsCode(getPreview(deps, input, intended), "permission-denied");
  assert.equal(db.writes, before);
  users.set(intended.uid, {...users.get(intended.uid)!, disabled: false});
  db.put(`deletedUsers/${intended.uid}`, {deletedAt: "2026-09-28"});
  const deletedBefore = db.writes;
  await rejectsCode(getPreview(deps, input, intended), "permission-denied");
  assert.equal(db.writes, deletedBefore);
});
