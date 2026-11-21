import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramStaffGrantDocument,
  ProgramStaffViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  activeProgramDuties,
  programOwnerAuthorizationDeadline,
  programStaffGrantId,
} from "../shared/programAuthority";

export const programStaffViewsCollection = "programStaffViews";

/** programStaffViews document id: one row per programme and staff member. */
export const programStaffViewId = programStaffGrantId;

/**
 * One staff member's row for the administrators' staff list, exactly the
 * member row the retired listProgramStaff callable returned, with the
 * clock-dependent status replaced by the facts it derives from (see the
 * contract).
 * @param {OrganizerProgramDocument} program The programme.
 * @param {string} programId The programme document id.
 * @param {ProgramStaffGrantDocument} grant The staff grant.
 * @param {number} nowMillis The evaluation time.
 * @return {ProgramStaffViewDocument|null} The row, or null when the grant
 *   does not belong to the programme and account its id names.
 */
export function programStaffView(program: OrganizerProgramDocument,
  programId: string, grant: ProgramStaffGrantDocument,
  nowMillis: number): ProgramStaffViewDocument | null {
  if (grant.programId !== programId ||
      grant.organizerId !== program.organizerId) return null;
  let deadline: number | null;
  try {
    deadline = programOwnerAuthorizationDeadline(program, grant);
  } catch {
    deadline = null;
  }
  const activeFromMillis = grant.programAuthorization?.approvedAtMillis ?? 0;
  let activeUntilMillis: number | null = null;
  if (deadline !== null) {
    // Authority starts at the approval instant, so evaluate from there on.
    const live = activeProgramDuties(grant,
      Math.max(nowMillis, activeFromMillis));
    if (live.length > 0) {
      activeUntilMillis = Math.max(...live.map((a) => a.expiresAtMillis));
    }
  }
  return {programId, organizerId: grant.organizerId, uid: grant.uid,
    displayName: grant.displayName ?? null,
    phoneLastFour: grant.phoneLastFour ?? null,
    duties: grant.duties.map((assignment) => ({...assignment,
      expiresAtMillis: Number.isSafeInteger(assignment.expiresAtMillis) &&
        assignment.expiresAtMillis > 0 ? assignment.expiresAtMillis : 1})),
    revoked: grant.status === "revoked" || grant.revokedAt != null ||
      grant.revokedBy != null,
    ownerApproved: deadline !== null, activeFromMillis, activeUntilMillis,
    expiresAtMillis: staffTimestampMillis(grant.expiresAt),
    revision: grant.revision, version: 1};
}

/** One staff view from current sources, read only. */
export async function readProgramStaffView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string, uid: string,
  nowMillis: number): Promise<ProgramStaffViewDocument | null> {
  const programSnap = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  if (!program) return null;
  const grantSnap = await tx.get(db.collection("programStaffGrants")
    .doc(programStaffGrantId(programId, uid)));
  if (!grantSnap.exists) return null;
  return programStaffView(program, programId,
    grantSnap.data() as ProgramStaffGrantDocument, nowMillis);
}

/**
 * Rewrites one staff member's row from current sources inside a transaction,
 * writing only on change. A source that fails its contract is logged and
 * keeps the previous row.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme document id.
 * @param {string} uid The staff member.
 * @param {number} nowMillis The evaluation time.
 * @return {Promise<void>} Resolves once the row matches its sources.
 */
export async function reconcileProgramStaffView(
  db: FirebaseFirestore.Firestore, programId: string, uid: string,
  nowMillis = Date.now()): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programStaffViewsCollection)
      .doc(programStaffViewId(programId, uid));
    const old = await tx.get(ref);
    let next: ProgramStaffViewDocument | null;
    try {
      next = await readProgramStaffView(db, tx, programId, uid, nowMillis);
    } catch (error) {
      logger.warn("Programme staff view kept a source that fails its " +
        "contract.", {programId, uid,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
