import {CallableRequest} from "firebase-functions/v2/https";
import {AdminContext} from "./adminAuth";

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
  await db.collection("adminAuditLogs").add(
    adminAuditData(adminContext, input)
  );
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
  tx.set(
    db.collection("adminAuditLogs").doc(),
    adminAuditData(adminContext, input)
  );
}

/**
 * Builds a Firestore-safe audit log payload.
 * @param {AdminContext} adminContext Admin actor.
 * @param {AdminAuditInput} input Audit input.
 * @return {Record<string, unknown>} Audit payload.
 */
function adminAuditData(
  adminContext: AdminContext,
  input: AdminAuditInput
): Record<string, unknown> {
  return {
    actorUid: adminContext.uid,
    roles: adminContext.roles,
    action: input.action,
    targetPath: input.targetPath,
    createdAt: input.serverTimestamp(),
    ...(input.request ? {requestId: requestIdFromCallable(input.request)} : {}),
    ...(input.before ? {before: input.before} : {}),
    ...(input.after ? {after: input.after} : {}),
    ...(input.note ? {note: input.note} : {}),
  };
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
