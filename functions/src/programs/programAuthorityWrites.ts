/**
 * One person's programme authority, written inside the transaction of the
 * command that changes it (issue #2474, FIX-10): the accessGrants document
 * security rules decide from, and the programAccessViews and
 * programStaffViews rows released Host builds read. All three come from the
 * same sources and the same builders, programAccessViewFor and
 * programStaffView, in one commit, so no reader can see a revoked grant
 * as live and no trigger stands between the command and the rules.
 */

import type {
  OrganizerDocument,
  OrganizerProgramDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {stageProgramAccessGrant} from "../domain/access/programAccessGrants";
import {
  managesProgramOrganizer,
  programAccessViewFor,
  programAccessViewId,
  programAccessViewsCollection,
} from "./programAccessView";
import {
  programStaffView,
  programStaffViewId,
  programStaffViewsCollection,
} from "./programStaffViews";

type Writer = Pick<FirebaseFirestore.Transaction, "set" | "delete">;

/**
 * Stages the programme authority of [uid] on the caller's transaction, from
 * the documents the transaction read and the grant it is writing. Call it
 * after every read, once per account whose authority the command changes.
 * @param {Writer} tx The caller's transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params The sources.
 * @param {string} params.programId The programme document id.
 * @param {OrganizerProgramDocument} params.program The programme as the
 *   transaction writes it.
 * @param {string} params.uid The account.
 * @param {ProgramStaffGrantDocument|undefined} params.grant The account's
 *   grant as the transaction writes it; undefined for the owner.
 * @param {OrganizerDocument|FirebaseFirestore.DocumentData|undefined}
 *   params.organizer The programme's organizer, for the view's organizer
 *   manager flag.
 * @param {number} params.nowMillis The commit time, in milliseconds.
 * @param {FirebaseFirestore.Timestamp} params.updatedAt The commit time.
 */
export function stageProgramAuthority(tx: Writer,
  db: FirebaseFirestore.Firestore, params: {
    programId: string;
    program: OrganizerProgramDocument;
    uid: string;
    grant: ProgramStaffGrantDocument | undefined;
    organizer: OrganizerDocument | FirebaseFirestore.DocumentData | undefined;
    nowMillis: number;
    updatedAt: FirebaseFirestore.Timestamp;
  }): void {
  const {programId, program, uid, grant, nowMillis} = params;
  const organizerManager = managesProgramOrganizer(program,
    params.organizer, program.organizerId, uid);
  const view = programAccessViewFor(program, programId, uid, grant,
    organizerManager, nowMillis);
  const viewRef = db.collection(programAccessViewsCollection)
    .doc(programAccessViewId(programId, uid));
  if (view) tx.set(viewRef, view);
  else tx.delete(viewRef);
  stageProgramAccessGrant(tx, db, {
    programId, uid,
    view: programAccessViewFor(program, programId, uid, grant, false,
      nowMillis),
    grantedBy: grant ?
      grant.programAuthorization?.approvedByUid ?? grant.createdBy : null,
    updatedAt: params.updatedAt,
  });
  if (!grant) return;
  const staffRef = db.collection(programStaffViewsCollection)
    .doc(programStaffViewId(programId, uid));
  const staff = programStaffView(program, programId, grant, nowMillis);
  if (staff) tx.set(staffRef, staff);
  else tx.delete(staffRef);
}
