import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {AdminContext} from "./adminAuth";
import {
  AdminActionExecutionRecord,
  adminListActionExecutionsHandler,
  adminRecordActionExecutionHandler,
  nextAdminActionExecution,
} from "./adminActionExecutions";

const context: AdminContext = {uid: "admin-1", roles: ["adminOwner"]};
const startedAt = new Date("2026-07-23T00:00:00.000Z");
const finishedAt = new Date("2026-07-23T00:01:00.000Z");
const startInput = {
  executionId: "00000000-0000-4000-8000-000000000000",
  actionId: "overview.get",
  callable: "adminGetOverview",
  status: "started" as const,
  requestHash: "a".repeat(64),
  target: null,
  cliVersion: "1.0.0",
};

test("action execution reducer advances one immutable start to success", () => {
  const started = nextAdminActionExecution(
    null,
    startInput,
    context,
    startedAt
  );
  const succeeded = nextAdminActionExecution(started, {
    ...startInput,
    status: "succeeded",
    responseHash: "b".repeat(64),
  }, context, finishedAt);
  assert.equal(started.status, "started");
  assert.equal(succeeded.status, "succeeded");
  assert.equal(succeeded.responseHash, "b".repeat(64));
  assert.equal(succeeded.finishedAt, finishedAt.toISOString());
});

test("action execution reducer preserves an indeterminate terminal outcome",
  () => {
    const started = nextAdminActionExecution(
      null,
      startInput,
      context,
      startedAt
    );
    const indeterminate = nextAdminActionExecution(started, {
      ...startInput,
      status: "indeterminate",
      errorCode: "ADMIN_CALLABLE_TIMEOUT",
      errorMessage: "The callable result was not received.",
    }, context, finishedAt);
    assert.equal(indeterminate.status, "indeterminate");
    assert.equal(indeterminate.responseHash, null);
    assert.equal(indeterminate.errorCode, "ADMIN_CALLABLE_TIMEOUT");
    assert.equal(indeterminate.finishedAt, finishedAt.toISOString());
  });

test("action execution reducer is idempotent for exact replay", () => {
  const started = nextAdminActionExecution(
    null,
    startInput,
    context,
    startedAt
  );
  assert.deepEqual(
    nextAdminActionExecution(started, startInput, context, finishedAt),
    started
  );
  const failed = nextAdminActionExecution(started, {
    ...startInput,
    status: "failed",
    errorCode: "ADMIN_CALLABLE_PERMISSION_DENIED",
    errorMessage: "denied",
  }, context, finishedAt);
  assert.deepEqual(nextAdminActionExecution(failed, {
    ...startInput,
    status: "failed",
    errorCode: "ADMIN_CALLABLE_PERMISSION_DENIED",
    errorMessage: "denied",
  }, context, new Date("2026-07-23T00:02:00.000Z")), failed);
});

test("action execution reducer rejects changed and conflicting evidence",
  () => {
    const started = nextAdminActionExecution(
      null,
      startInput,
      context,
      startedAt
    );
    assert.throws(() => nextAdminActionExecution(started, {
      ...startInput,
      status: "succeeded",
      responseHash: "b".repeat(64),
      requestHash: "c".repeat(64),
    }, context, finishedAt), HttpsError);
    const succeeded = nextAdminActionExecution(started, {
      ...startInput,
      status: "succeeded",
      responseHash: "b".repeat(64),
    }, context, finishedAt);
    assert.throws(() => nextAdminActionExecution(succeeded, {
      ...startInput,
      status: "failed",
      errorCode: "changed",
    }, context, finishedAt), HttpsError);
  });

test("terminal execution cannot exist without a start receipt", () => {
  assert.throws(() => nextAdminActionExecution(null, {
    ...startInput,
    status: "failed",
    errorCode: "failed",
  }, context, finishedAt), HttpsError);
});

test("record handler accepts an action-authorized specialist role",
  async () => {
    let recordedContext: AdminContext | null = null;
    const result = await adminRecordActionExecutionHandler(
      request(startInput, {safetyReviewer: true}),
      {
        firestore: () => ({}) as FirebaseFirestore.Firestore,
        now: () => startedAt,
        checkRateLimit: async () => undefined,
        repository: {
          record: async (input, actor, now) => {
            recordedContext = actor;
            return nextAdminActionExecution(null, input, actor, now);
          },
          list: async () => ({rows: [], nextCursor: null}),
        },
      }
    );
    assert.deepEqual(recordedContext, {
      uid: "admin-1",
      roles: ["safetyReviewer"],
    });
    assert.equal(result.execution.status, "started");
  });

test("record handler rejects callable drift from the catalog", async () => {
  await assert.rejects(
    () => adminRecordActionExecutionHandler(
      request({...startInput, callable: "adminGetUserAnalytics"}),
      {
        firestore: () => ({}) as FirebaseFirestore.Firestore,
        now: () => startedAt,
        checkRateLimit: async () => undefined,
      }
    ),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("list handler remains limited to action-monitor roles", async () => {
  await assert.rejects(
    () => adminListActionExecutionsHandler(
      request({}, {salesStaff: true}),
      {
        firestore: () => ({}) as FirebaseFirestore.Firestore,
        now: () => startedAt,
        checkRateLimit: async () => undefined,
      }
    ),
    (error) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("Sales staff cannot use generic execution fallback", async () => {
  const deps = {firestore: () => ({}) as FirebaseFirestore.Firestore,
    now: () => startedAt, checkRateLimit: async () => undefined};
  const denied = (error: unknown) =>
    error instanceof HttpsError && error.code === "permission-denied";
  await assert.rejects(adminRecordActionExecutionHandler(
    request(startInput, {salesStaff: true}), deps), denied);
  await assert.rejects(adminListActionExecutionsHandler(
    request({}, {salesStaff: true}), deps), denied);
});

test("Owner execution retains a mixed Sales staff claim without new authority",
  async () => {
    const result = await adminRecordActionExecutionHandler(
      request(startInput, {adminOwner: true, salesStaff: true}),
      {firestore: () => ({}) as FirebaseFirestore.Firestore,
        now: () => startedAt, checkRateLimit: async () => undefined,
        repository: {
          record: async (input, actor, now) =>
            nextAdminActionExecution(null, input, actor, now),
          list: async () => ({rows: [], nextCursor: null}),
        }});
    assert.deepEqual(result.execution.actorRoles, ["adminOwner", "salesStaff"]);
  });

void ({} as AdminActionExecutionRecord);

function request(
  data: Record<string, unknown>,
  token: Record<string, unknown> = {adminOwner: true}
): CallableRequest<unknown> {
  return {
    auth: {uid: "admin-1", token} as CallableRequest["auth"],
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}
