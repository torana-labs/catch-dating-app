import {CallableRequest} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {AdminContext} from "./adminAuth";
import {validateAdminAuditLogDocument} from
  "../shared/generated/validators/adminAuditLogDocument";
import {schemaErrorMessages} from
  "../shared/generated/schemaValidationRuntime";

export const ADMIN_AUDIT_LOGS = "adminAuditLogs";

interface AdminAuditInput {
  action: string;
  targetPath: string;
  request?: CallableRequest<unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  note?: string | null;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

/**
 * Who made an audited change. Callers without a callable AdminContext (an
 * HTTP gateway, a reviewed setup run) name the actor and their Admin roles
 * explicitly; the platform validates the roles against the contract.
 */
export interface AdminAuditActor {
  uid: string;
  roles: readonly string[];
}

/** One audit entry; createdAt is always the server clock, never the caller. */
export interface AdminAuditEntry {
  action: string;
  targetPath: string;
  requestId?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  note?: string | null;
}

/** Options for a transactional create. */
export interface AdminAuditCreateOptions {
  /** Deterministic document id; omitted means an auto id. */
  docId?: string;
}

/**
 * Stand-in for the server clock while validating. createdAt is set by the
 * platform from the server timestamp, so validation covers caller fields.
 */
const CREATED_AT_PLACEHOLDER = Object.freeze({_seconds: 0, _nanoseconds: 0});

/**
 * Writes a privileged admin audit entry.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {AdminContext} adminContext Admin actor.
 * @param {AdminAuditInput} input Audit input.
 * @return {Promise<void>} Write completion.
 */
export async function writeAdminAuditLog(
  db: FirebaseFirestore.Firestore,
  adminContext: AdminContext,
  input: AdminAuditInput
): Promise<void> {
  const data = legacyAuditData(adminContext, input);
  await db.collection(ADMIN_AUDIT_LOGS).add(data);
}

/**
 * Writes an admin audit entry inside a surrounding Firestore transaction.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {AdminContext} adminContext Admin actor.
 * @param {AdminAuditInput} input Audit input.
 */
export function setAdminAuditLogInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  adminContext: AdminContext,
  input: AdminAuditInput
): void {
  const data = legacyAuditData(adminContext, input);
  tx.set(db.collection(ADMIN_AUDIT_LOGS).doc(), data);
}

/**
 * Creates an admin audit entry inside a surrounding transaction. With a
 * deterministic docId a retried or replayed command cannot write it twice:
 * the create fails if the entry already exists.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {AdminAuditActor} actor Actor uid and Admin roles.
 * @param {AdminAuditEntry} entry Audit entry.
 * @param {AdminAuditCreateOptions} options Optional deterministic id.
 * @return {FirebaseFirestore.DocumentReference} The audit document.
 */
export function createAdminAuditLogInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  actor: AdminAuditActor,
  entry: AdminAuditEntry,
  options: AdminAuditCreateOptions = {}
): FirebaseFirestore.DocumentReference {
  const data = validatedAuditData(actor, entry,
    () => FieldValue.serverTimestamp());
  const collection = db.collection(ADMIN_AUDIT_LOGS);
  const ref = options.docId === undefined ?
    collection.doc() :
    collection.doc(options.docId);
  tx.create(ref, data);
  return ref;
}

/**
 * Throws unless the document matches contracts/firestore/
 * admin_audit_logs.schema.json. createdAt is checked as the server clock.
 * @param {Record<string, unknown>} data Candidate audit document.
 */
export function assertValidAdminAuditLog(data: Record<string, unknown>): void {
  const candidate = {...data, createdAt: CREATED_AT_PLACEHOLDER};
  if (!validateAdminAuditLogDocument(candidate)) {
    throw new Error("Invalid admin audit log: " +
      schemaErrorMessages(validateAdminAuditLogDocument).join("; "));
  }
}

/**
 * Builds the payload for the AdminContext helpers.
 * @param {AdminContext} adminContext Admin actor.
 * @param {AdminAuditInput} input Audit input.
 * @return {Record<string, unknown>} Validated audit payload.
 */
function legacyAuditData(
  adminContext: AdminContext,
  input: AdminAuditInput
): Record<string, unknown> {
  return validatedAuditData(adminContext, {
    action: input.action,
    targetPath: input.targetPath,
    requestId: input.request ? requestIdFromCallable(input.request) : null,
    before: input.before,
    after: input.after,
    note: input.note,
  }, input.serverTimestamp);
}

/**
 * Builds a contract-conforming audit payload and validates it.
 * @param {AdminAuditActor} actor Actor uid and roles.
 * @param {AdminAuditEntry} entry Audit entry.
 * @param {Function} serverTimestamp Server clock sentinel source.
 * @return {Record<string, unknown>} Audit payload.
 */
function validatedAuditData(
  actor: AdminAuditActor,
  entry: AdminAuditEntry,
  serverTimestamp: () => FirebaseFirestore.FieldValue
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    actorUid: actor.uid,
    roles: [...actor.roles],
    action: entry.action,
    targetPath: entry.targetPath,
    createdAt: serverTimestamp(),
    ...(entry.requestId ? {requestId: entry.requestId} : {}),
    ...(entry.before ? {before: entry.before} : {}),
    ...(entry.after ? {after: entry.after} : {}),
    ...(entry.note ? {note: entry.note} : {}),
  };
  assertValidAdminAuditLog(data);
  return data;
}

/**
 * Extracts a trace/request id from a callable request when available.
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {string | null} Request id.
 */
function requestIdFromCallable(
  request: CallableRequest<unknown>
): string | null {
  const header = request.rawRequest?.headers["x-cloud-trace-context"];
  if (typeof header === "string") return header;
  if (Array.isArray(header)) return header[0] ?? null;
  return null;
}
