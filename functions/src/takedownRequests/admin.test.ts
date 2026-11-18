/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {adminGetTakedownRequestHandler, adminUpdateTakedownRequestHandler} from "./admin";
import {handleListingRequest} from "./intake";
import {projectTakedownRequest} from "./inbox";
import type {RequestType} from "./model";
import {STAFF_UID, assertContract, harness, validRequests} from "./testHarness";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function staff(role = "admin", uid = STAFF_UID) {
  return {uid, token: {[role]: true}};
}

async function filed(type: RequestType = "removeAndDoNotList") {
  const h = harness();
  const result = await handleListingRequest(h.request(), clone(validRequests[type]), h.deps);
  if (!("ok" in result.body)) throw new Error(JSON.stringify(result.body));
  const requestId = result.body.request.requestId;
  let now = new Date("2026-11-18T08:00:00.000Z");
  const deps = {
    firestore: () => h.db.asFirestore(),
    serverTimestamp: () => "server-time" as unknown as FirebaseFirestore.FieldValue,
    now: () => now,
  };
  const call = (data: unknown, auth: unknown = staff()) =>
    ({auth, data, rawRequest: {headers: {}, ip: "203.0.113.4"}}) as unknown as CallableRequest<unknown>;
  const step = (data: Record<string, unknown>, auth: unknown = staff()) =>
    adminUpdateTakedownRequestHandler(call({requestId, ...data}, auth), deps);
  return {h, requestId, deps, call, step, setNow: (value: string) => {
    now = new Date(value);
  }};
}

async function refused(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: {code?: string}) => {
    assert.equal(error.code, code, String(error));
    return true;
  });
}

test("only Catch staff open and work listing requests", async () => {
  const f = await filed();
  for (const auth of [null, {uid: "member", token: {}}, staff("salesStaff")]) {
    await refused(adminGetTakedownRequestHandler(f.call({requestId: f.requestId}, auth), f.deps), auth ? "permission-denied" : "unauthenticated");
    await refused(f.step({action: "acknowledge"}, auth), auth ? "permission-denied" : "unauthenticated");
  }
  const read = await adminGetTakedownRequestHandler(f.call({requestId: f.requestId}, staff("support")), f.deps);
  assertContract("AdminGetTakedownRequestCallableResponse", read);
  assert.deepEqual([read.canDecide, read.allowedOutcomes, read.caseOutcomes], [false, ["removedAndSuppressed"], ["removedAndSuppressed"]]);
});

test("acknowledge, ask for more with a fixed template, then action with the takedown case id", async () => {
  const f = await filed();
  const acknowledged = await f.step({action: "acknowledge"}, staff("support"));
  assertContract("AdminUpdateTakedownRequestCallableResponse", acknowledged);
  assert.equal(acknowledged.request.status, "acknowledged");
  assert.equal(acknowledged.request.acknowledgedAt, "2026-11-18T08:00:00.000Z");
  await refused(f.step({action: "acknowledge"}), "failed-precondition");
  const asked = await f.step({action: "requestInfo", infoTemplate: "replyFromDomainEmail"}, staff("support"));
  assert.equal(asked.request.status, "verifying");
  assert.deepEqual(asked.request.infoRequests.map((entry) => entry.template), ["replyFromDomainEmail"]);
  // Support cannot decide; an outcome must be the type's and needs the case id.
  await refused(f.step({action: "action", outcome: "removedAndSuppressed", caseId: "TD-0001"}, staff("support")), "permission-denied");
  await refused(f.step({action: "action", outcome: "relabelled", caseId: "TD-0001"}), "invalid-argument");
  await refused(f.step({action: "action", outcome: "removedAndSuppressed"}), "invalid-argument");
  const actioned = await f.step({action: "action", outcome: "removedAndSuppressed", caseId: "TD-0001", note: "Suspended same day"});
  assert.deepEqual([actioned.request.status, actioned.request.outcome, actioned.request.caseId, actioned.request.deciderUid],
    ["actioned", "removedAndSuppressed", "TD-0001", STAFF_UID]);
  assert.deepEqual(actioned.request.history.map((entry) => entry.action), ["received", "acknowledged", "infoRequested", "actioned"]);
  assert.equal(actioned.request.history.at(-1)?.detail, "removedAndSuppressed · TD-0001 · Suspended same day");
  assert.equal(f.h.db.paths("adminAuditLogs/").length, 3, "every step is audited");
  await refused(f.step({action: "decline", declineReason: "duplicate"}), "failed-precondition");
});

test("one appeal within 30 days, decided by someone other than the decider; upheld closes", async () => {
  const f = await filed("trademark");
  await f.step({action: "decline", declineReason: "insufficientBasis"});
  await refused(f.step({action: "decideAppeal", appealDecision: "upheld"}), "failed-precondition");
  const appealed = await f.step({action: "recordAppeal"}, staff("support", "staff-support"));
  assert.equal(appealed.request.status, "appealed");
  assert.equal(appealed.request.appeal?.dueAt, "2026-11-25T08:00:00.000Z");
  await refused(f.step({action: "decideAppeal", appealDecision: "upheld"}), "permission-denied");
  const read = await adminGetTakedownRequestHandler(f.call({requestId: f.requestId}, staff("adminOwner", "owner-1")), f.deps);
  assert.equal(read.canDecideAppeal, true);
  const decided = await f.step({action: "decideAppeal", appealDecision: "upheld"}, staff("adminOwner", "owner-1"));
  assert.deepEqual([decided.request.status, decided.request.appeal?.decision], ["closed", "upheld"]);
  await refused(f.step({action: "recordAppeal"}), "failed-precondition");
});

test("an overturned appeal reopens the request for a new decision, and no second appeal is allowed", async () => {
  const f = await filed("copyright");
  await f.step({action: "decline", declineReason: "couldNotVerify"});
  await f.step({action: "recordAppeal"});
  const overturned = await f.step({action: "decideAppeal", appealDecision: "overturned"}, staff("admin", "staff-2"));
  assert.deepEqual([overturned.request.status, overturned.request.declineReason, overturned.request.deciderUid], ["verifying", null, null]);
  const actioned = await f.step({action: "action", outcome: "materialRemoved"}, staff("admin", "staff-2"));
  assert.equal(actioned.request.status, "actioned");
  await refused(f.step({action: "recordAppeal"}), "failed-precondition");
  const closed = await f.step({action: "close"});
  assert.equal(closed.request.status, "closed");
});

test("the appeal window is 30 days from the decision", async () => {
  const f = await filed("privacy");
  await f.step({action: "action", outcome: "personalDataRemoved"});
  f.setNow("2026-12-19T08:00:00.000Z");
  await refused(f.step({action: "recordAppeal"}), "failed-precondition");
});

test("the request projects to a takedown Inbox item that waits until decided and returns on appeal", async () => {
  const f = await filed();
  const project = () => projectTakedownRequest(f.requestId, f.h.db.get(`takedownRequests/${f.requestId}`) as Record<string, unknown>);
  const received = project();
  assert.ok(received);
  assert.deepEqual([received.type, received.sourceKind, received.lifecycle, received.state.code], ["takedown", "takedownRequest", "open", "acknowledge"]);
  assert.match(received.title, /^Remove and don't list again · LR-[A-Z2-9]{8}$/u);
  assert.match(received.subtitle ?? "", /^Organiser page · due /u);
  assert.equal(received.itemId, `takedown-${f.requestId}`);
  await f.step({action: "acknowledge"});
  assert.equal(project()?.state.code, "verify");
  await f.step({action: "action", outcome: "removedAndSuppressed", caseId: "TD-0042"});
  const done = project();
  assert.deepEqual([done?.lifecycle, done?.state.code, done?.closedAt], ["closed", "actioned", "2026-11-18T08:00:00.000Z"]);
  await f.step({action: "recordAppeal"});
  assert.deepEqual([project()?.lifecycle, project()?.state.code], ["open", "appeal"]);
  assert.deepEqual(project()?.journey.map((step) => step.title), ["Request received", "Acknowledged", "Actioned", "Appeal recorded"]);
});
