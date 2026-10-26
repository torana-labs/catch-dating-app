import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {ADMIN_ACTION_CATALOG, AdminActionId} from
  "../shared/generated/adminActionCatalog";
import type {AdminListActionExecutionsCallablePayload} from
  "../shared/generated/adminListActionExecutionsCallablePayload";
import type {AdminRecordActionExecutionCallablePayload} from
  "../shared/generated/adminRecordActionExecutionCallablePayload";
import {
  validateAdminListActionExecutionsCallablePayload,
} from
  "../shared/generated/validators/adminListActionExecutionsInput";
import {
  validateAdminRecordActionExecutionCallablePayload,
} from
  "../shared/generated/validators/adminRecordActionExecutionInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  ADMIN_ROLE_CLAIMS,
  AdminContext,
  AdminRoleClaim,
  requireAdminRole,
} from "./adminAuth";

const listExecutionRoles = ["admin", "adminOwner", "support"] as const;
const executionCollection = "adminActionExecutions";

export type AdminActionExecutionStatus =
  "started" | "succeeded" | "failed" | "indeterminate";

export interface AdminActionExecutionRecord {
  schemaVersion: 1;
  executionId: string;
  actionId: AdminActionId;
  callable: string;
  actorUid: string;
  actorRoles: AdminRoleClaim[];
  status: AdminActionExecutionStatus;
  requestHash: string;
  responseHash: string | null;
  target: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  cliVersion: string | null;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
}

export interface AdminListActionExecutionsResponse {
  schemaVersion: 1;
  generatedAt: string;
  rows: AdminActionExecutionRecord[];
  nextCursor: string | null;
}

interface AdminActionExecutionPage {
  rows: AdminActionExecutionRecord[];
  nextCursor: string | null;
}

interface AdminActionExecutionRepository {
  record(
    input: AdminRecordActionExecutionCallablePayload,
    context: AdminContext,
    now: Date
  ): Promise<AdminActionExecutionRecord>;
  list(input: AdminListActionExecutionsCallablePayload):
    Promise<AdminActionExecutionPage>;
}

interface AdminActionExecutionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  repository?: AdminActionExecutionRepository;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: AdminActionExecutionDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function adminRecordActionExecutionHandler(
  request: CallableRequest<unknown>,
  deps: AdminActionExecutionDeps = defaultDeps
): Promise<{execution: AdminActionExecutionRecord}> {
  const context = requireAdminRole(request, ADMIN_ROLE_CLAIMS);
  const input = validateCallableWithAjv<
    AdminRecordActionExecutionCallablePayload
  >(
    request,
    validateAdminRecordActionExecutionCallablePayload
  );
  assertCatalogAuthority(input, context);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    context.uid,
    "adminRecordActionExecution",
    {maxRequests: 120, windowMs: 60 * 1000}
  );
  const repository = deps.repository ??
    new FirestoreAdminActionExecutionRepository(db);
  return {execution: await repository.record(input, context, deps.now())};
}

export async function adminListActionExecutionsHandler(
  request: CallableRequest<unknown>,
  deps: AdminActionExecutionDeps = defaultDeps
): Promise<AdminListActionExecutionsResponse> {
  const context = requireAdminRole(request, listExecutionRoles);
  const input = validateCallableWithAjv<
    AdminListActionExecutionsCallablePayload
  >(
    request,
    validateAdminListActionExecutionsCallablePayload,
    normalizeListPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    context.uid,
    "adminListActionExecutions",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const repository = deps.repository ??
    new FirestoreAdminActionExecutionRepository(db);
  const page = await repository.list(input);
  return {
    schemaVersion: 1,
    generatedAt: deps.now().toISOString(),
    ...page,
  };
}

class FirestoreAdminActionExecutionRepository implements
AdminActionExecutionRepository {
  constructor(private readonly db: FirebaseFirestore.Firestore) {}

  async record(
    input: AdminRecordActionExecutionCallablePayload,
    context: AdminContext,
    now: Date
  ): Promise<AdminActionExecutionRecord> {
    const ref = this.db.collection(executionCollection).doc(input.executionId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const current = snapshot.exists ?
        firestoreExecutionRecord(snapshot.id, snapshot.data() ?? {}) : null;
      const next = nextAdminActionExecution(current, input, context, now);
      tx.set(ref, executionRecordData(next));
      return next;
    });
  }

  async list(
    input: AdminListActionExecutionsCallablePayload
  ): Promise<AdminActionExecutionPage> {
    const limit = input.limit ?? 50;
    let query: FirebaseFirestore.Query = this.db
      .collection(executionCollection)
      .orderBy("startedAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc");
    const cursor = decodeCursor(input.cursor ?? null);
    if (cursor) {
      query = query.startAfter(
        admin.firestore.Timestamp.fromMillis(cursor.startedAtMillis),
        cursor.executionId
      );
    }
    const snapshot = await query.limit(limit + 1).get();
    const documents = snapshot.docs.slice(0, limit);
    const rows = documents.map((document) =>
      firestoreExecutionRecord(document.id, document.data()));
    return {
      rows,
      nextCursor: snapshot.docs.length > limit && rows.length > 0 ?
        encodeCursor(rows.at(-1) as AdminActionExecutionRecord) : null,
    };
  }
}

export function nextAdminActionExecution(
  current: AdminActionExecutionRecord | null,
  input: AdminRecordActionExecutionCallablePayload,
  context: AdminContext,
  now: Date
): AdminActionExecutionRecord {
  const timestamp = now.toISOString();
  const actionId = input.actionId as AdminActionId;
  const target = input.target ?? null;
  const cliVersion = input.cliVersion ?? null;
  if (input.status === "started") {
    const started: AdminActionExecutionRecord = {
      schemaVersion: 1,
      executionId: input.executionId,
      actionId,
      callable: input.callable,
      actorUid: context.uid,
      actorRoles: [...context.roles],
      status: "started",
      requestHash: input.requestHash,
      responseHash: null,
      target,
      errorCode: null,
      errorMessage: null,
      cliVersion,
      startedAt: timestamp,
      finishedAt: null,
      updatedAt: timestamp,
    };
    if (!current) return started;
    if (current.status === "started" &&
        current.actionId === actionId &&
        current.callable === input.callable &&
        current.actorUid === context.uid &&
        current.requestHash === input.requestHash &&
        current.target === target &&
        current.cliVersion === cliVersion) return current;
    throw new HttpsError(
      "already-exists",
      "Execution id already belongs to different action evidence."
    );
  }
  if (!current) {
    throw new HttpsError(
      "failed-precondition",
      "Execution must be started before it can become terminal."
    );
  }
  assertImmutableExecution(current, input, context);
  const terminal: AdminActionExecutionRecord = {
    ...current,
    status: input.status,
    responseHash: input.status === "succeeded" ?
      input.responseHash ?? null : null,
    errorCode: input.status === "failed" || input.status === "indeterminate" ?
      input.errorCode ?? null : null,
    errorMessage: input.status === "failed" ||
        input.status === "indeterminate" ?
      input.errorMessage ?? null : null,
    finishedAt: timestamp,
    updatedAt: timestamp,
  };
  if (current.status === "started") return terminal;
  if (current.status === terminal.status &&
      current.responseHash === terminal.responseHash &&
      current.errorCode === terminal.errorCode &&
      current.errorMessage === terminal.errorMessage) return current;
  throw new HttpsError(
    "failed-precondition",
    "A terminal execution receipt is immutable."
  );
}

function assertCatalogAuthority(
  input: AdminRecordActionExecutionCallablePayload,
  context: AdminContext
) {
  const action = ADMIN_ACTION_CATALOG[input.actionId as AdminActionId];
  if (!action || action.controlPlane) {
    throw new HttpsError(
      "invalid-argument",
      "Execution receipt action id is not an executable catalog action."
    );
  }
  if (action.callable !== input.callable) {
    throw new HttpsError(
      "invalid-argument",
      "Execution receipt callable does not match the action catalog."
    );
  }
  if (!context.roles.some((role) =>
    (action.roles as readonly string[]).includes(role))) {
    throw new HttpsError(
      "permission-denied",
      "This admin role cannot record an execution for that action."
    );
  }
}

function assertImmutableExecution(
  current: AdminActionExecutionRecord,
  input: AdminRecordActionExecutionCallablePayload,
  context: AdminContext
) {
  if (current.executionId !== input.executionId ||
      current.actionId !== input.actionId ||
      current.callable !== input.callable ||
      current.actorUid !== context.uid ||
      current.requestHash !== input.requestHash ||
      current.target !== (input.target ?? null)) {
    throw new HttpsError(
      "failed-precondition",
      "Execution terminal evidence does not match its start receipt."
    );
  }
}

function executionRecordData(
  record: AdminActionExecutionRecord
): Record<string, unknown> {
  return {
    ...record,
    startedAt: admin.firestore.Timestamp.fromDate(new Date(record.startedAt)),
    finishedAt: record.finishedAt ?
      admin.firestore.Timestamp.fromDate(new Date(record.finishedAt)) : null,
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(record.updatedAt)),
  };
}

function firestoreExecutionRecord(
  executionId: string,
  value: Record<string, unknown>
): AdminActionExecutionRecord {
  return {
    schemaVersion: 1,
    executionId,
    actionId: value.actionId as AdminActionId,
    callable: String(value.callable ?? ""),
    actorUid: String(value.actorUid ?? ""),
    actorRoles: Array.isArray(value.actorRoles) ?
      value.actorRoles as AdminRoleClaim[] : [],
    status: value.status as AdminActionExecutionStatus,
    requestHash: String(value.requestHash ?? ""),
    responseHash: nullableString(value.responseHash),
    target: nullableString(value.target),
    errorCode: nullableString(value.errorCode),
    errorMessage: nullableString(value.errorMessage),
    cliVersion: nullableString(value.cliVersion),
    startedAt: timestampIso(value.startedAt),
    finishedAt: value.finishedAt ? timestampIso(value.finishedAt) : null,
    updatedAt: timestampIso(value.updatedAt),
  };
}

function timestampIso(value: unknown): string {
  if (value && typeof value === "object" &&
      typeof (value as {toDate?: unknown}).toDate === "function") {
    return (value as {toDate(): Date}).toDate().toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new HttpsError(
    "failed-precondition",
    "Action execution contains an invalid timestamp."
  );
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function encodeCursor(record: AdminActionExecutionRecord): string {
  return Buffer.from(JSON.stringify({
    startedAtMillis: Date.parse(record.startedAt),
    executionId: record.executionId,
  })).toString("base64url");
}

function decodeCursor(value: string | null): {
  startedAtMillis: number;
  executionId: string;
} | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(parsed.startedAtMillis) ||
        parsed.startedAtMillis < 0 ||
        typeof parsed.executionId !== "string" ||
        !/^[0-9a-f-]{36}$/u.test(parsed.executionId)) throw new Error();
    return parsed;
  } catch {
    throw new HttpsError("invalid-argument", "Execution cursor is invalid.");
  }
}

function normalizeListPayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    ...input,
    cursor: typeof input.cursor === "string" && input.cursor.trim() === "" ?
      null : input.cursor,
  };
}

export const adminRecordActionExecution = onCall(
  appCheckCallableOptions,
  (request) => adminRecordActionExecutionHandler(request)
);

export const adminListActionExecutions = onCall(
  appCheckCallableOptions,
  (request) => adminListActionExecutionsHandler(request)
);
