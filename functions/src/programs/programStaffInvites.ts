/* firestore-index: programStaffInvites (
  programId:ASCENDING,
  phoneE164:ASCENDING,
  status:ASCENDING,
  expiresAt:ASCENDING
) */
/* firestore-index: programStaffGrants (
  programId:ASCENDING,
  organizerId:ASCENDING,
  status:ASCENDING,
  expiresAt:ASCENDING
) */
import * as admin from "firebase-admin";
import {randomUUID} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  activeProgramDuties,
  loadProgramBundle,
  nextRevision,
  programStaffGrantId,
  programOwnerAuthorizationDeadline,
  requireActiveProgramActor,
  requireProgramAccess,
  requireProgramMutable,
} from "../shared/programAuthority";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {normalizeRosterPhone} from "../events/eventAttendees";
import {
  dedupeDuties,
  authorizeProgramStaffGrant,
  grantDuties,
  maxGrantDurationMillis,
  maxProgramStaff,
  programAdministrationDeadline,
  requireProgramManager,
  validateDutyStations,
} from "./programStaffPolicy";
import type {
  ProgramStaffGrantDocument,
  ProgramStaffInviteDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {InviteProgramStaffCallablePayload} from
  "../shared/generated/inviteProgramStaffCallablePayload";
import type {ClaimProgramStaffInviteCallablePayload} from
  "../shared/generated/claimProgramStaffInviteCallablePayload";
import type {RevokeProgramStaffInviteCallablePayload} from
  "../shared/generated/revokeProgramStaffInviteCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import type {ProgramInviteClaimCallableResponse} from
  "../shared/generated/programInviteClaimCallableResponse";
import {
  validateInviteProgramStaffCallablePayload,
} from "../shared/generated/validators/inviteProgramStaffInput";
import {
  validateClaimProgramStaffInviteCallablePayload,
} from "../shared/generated/validators/claimProgramStaffInviteInput";
import {
  validateRevokeProgramStaffInviteCallablePayload,
} from "../shared/generated/validators/revokeProgramStaffInviteInput";

interface ProgramStaffInviteDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProgramStaffInviteDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const inviteCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

/**
 * Issue a phone-bound invite under current manager and resource authority.
 * Only an exact request may replay a pending invite for this program/phone.
 */
export async function inviteProgramStaffHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffInviteDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<InviteProgramStaffCallablePayload>(
    request, validateInviteProgramStaffCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "inviteProgramStaff", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const phone = normalizeRosterPhone(data.phoneNumber);
  if (!phone.value || phone.issue) {
    throw new HttpsError("invalid-argument", phone.issue ?? "Invalid phone.");
  }
  const duties = dedupeDuties(data.duties);
  const displayName = data.displayName.trim();
  if (!displayName) {
    throw new HttpsError("invalid-argument", "Staff name is required.");
  }
  const invites = db.collection("programStaffInvites");
  const ref = invites.doc(`inv_${randomUUID()}`);
  return db.runTransaction(async (tx) => {
    const bundle = await requireProgramManager(
      db, data.programId, actorUid, tx, deps.now());
    requireProgramMutable(bundle.program);
    const now = deps.now();
    if (data.expiresAtMillis <= now.toMillis() ||
        data.expiresAtMillis > now.toMillis() + maxGrantDurationMillis) {
      throw new HttpsError("invalid-argument",
        "Invite expiry must be within the staff access window.");
    }
    authorizeProgramStaffGrant(bundle, actorUid, data.expiresAtMillis,
      now.toMillis());
    await validateDutyStations({db, programId: data.programId,
      organizerId: bundle.program.organizerId, duties, transaction: tx});
    const existingSnap = await tx.get(invites
      .where("programId", "==", data.programId)
      .where("phoneE164", "==", phone.value)
      .where("status", "==", "pending")
      .where("expiresAt", ">", now)
      .limit(2));
    if (existingSnap.size > 0) {
      const existing = existingSnap.docs[0];
      const invite = existing.data() as ProgramStaffInviteDocument;
      if (existingSnap.size !== 1 || invite.revokedAt != null ||
          invite.revokedBy != null ||
          invite.organizerId !== bundle.program.organizerId ||
          invite.displayName !== displayName ||
          staffTimestampMillis(invite.expiresAt) !== data.expiresAtMillis ||
          scopeFingerprint(invite.duties) !== scopeFingerprint(duties)) {
        throw new HttpsError("failed-precondition",
          "A different invite is pending. Revoke it before changing access.");
      }
      const committedAt = deps.now();
      if (staffTimestampMillis(invite.expiresAt) <= committedAt.toMillis()) {
        throw new HttpsError("failed-precondition", "Staff invite expired.");
      }
      const programAuthorization = authorizeProgramStaffGrant(bundle, actorUid,
        data.expiresAtMillis, committedAt.toMillis());
      if (programOwnerAuthorizationDeadline(bundle.program, invite) === null &&
          bundle.role !== "manager") {
        throw new HttpsError("permission-denied",
          "The program creator must approve this legacy invite.");
      }
      // The creator can explicitly approve an identical legacy request. An
      // admin can explicitly reapprove an already owner-approved request.
      const approvedBy = invite.programAuthorization?.approvedByUid ??
        invite.createdBy;
      if (programOwnerAuthorizationDeadline(bundle.program, invite) === null ||
          approvedBy !== actorUid) {
        const revision = nextRevision(invite.revision, committedAt);
        tx.set(existing.ref, {...invite, programAuthorization,
          updatedAt: committedAt, revision});
        return {entityId: existing.id, revision, alreadyApplied: false};
      }
      return {entityId: existing.id, revision: invite.revision,
        alreadyApplied: true};
    }
    const committedAt = deps.now();
    if (data.expiresAtMillis <= committedAt.toMillis()) {
      throw new HttpsError("failed-precondition", "Staff invite expired.");
    }
    const programAuthorization = authorizeProgramStaffGrant(bundle, actorUid,
      data.expiresAtMillis, committedAt.toMillis());
    const document: ProgramStaffInviteDocument = {
      organizerId: bundle.program.organizerId,
      programId: data.programId,
      phoneE164: phone.value!,
      displayName,
      duties,
      status: "pending",
      createdBy: actorUid,
      programAuthorization,
      createdAt: committedAt,
      expiresAt: admin.firestore.Timestamp.fromMillis(data.expiresAtMillis),
      claimedByUid: null,
      claimedAt: null,
      revokedBy: null,
      revokedAt: null,
      updatedAt: committedAt,
      revision: nextRevision(undefined, committedAt),
    };
    tx.set(ref, document);
    return {entityId: ref.id, revision: document.revision,
      alreadyApplied: false};
  });
}

/**
 * Redeem an invite. The caller's verified auth-token phone must match the
 * invite's bound number; success writes/merges the staff grant and consumes
 * the invite atomically.
 */
export async function claimProgramStaffInviteHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffInviteDeps = defaultDeps
): Promise<ProgramInviteClaimCallableResponse> {
  const uid = requireAuth(request);
  const data =
    validateCallableWithAjv<ClaimProgramStaffInviteCallablePayload>(
      request, validateClaimProgramStaffInviteCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "claimProgramStaffInvite", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const rawPhone = request.auth?.token.phone_number;
  const callerPhone = typeof rawPhone === "string" ?
    normalizeRosterPhone(rawPhone).value : null;
  if (!callerPhone) {
    throw new HttpsError(
      "failed-precondition",
      "Sign in with a verified phone number to claim a staff invite."
    );
  }
  const inviteRef = db.collection("programStaffInvites").doc(data.inviteId);
  const now = deps.now();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    const invite = snap.data() as ProgramStaffInviteDocument | undefined;
    if (!invite) {
      throw new HttpsError("not-found", "Staff invite not found.");
    }
    await requireActiveProgramActor({db, actorUid: uid, transaction: tx});
    if (invite.revokedAt != null || invite.revokedBy != null) {
      throw new HttpsError("failed-precondition",
        "This staff invite is no longer valid.");
    }
    if (invite.status === "claimed") {
      if (invite.claimedByUid === uid) {
        if (invite.phoneE164 !== callerPhone) {
          throw new HttpsError("permission-denied", "Invite phone changed.");
        }
        const access = await requireProgramAccess({db,
          programId: invite.programId, actorUid: uid,
          transaction: tx, now: deps.now()});
        if (access.program.organizerId !== invite.organizerId) {
          throw new HttpsError("failed-precondition",
            "Invite ownership changed.");
        }
        return {programId: invite.programId, alreadyApplied: true};
      }
      throw new HttpsError(
        "failed-precondition", "This staff invite was already claimed.");
    }
    if (invite.status !== "pending" ||
        staffTimestampMillis(invite.expiresAt) <= now.toMillis()) {
      throw new HttpsError(
        "failed-precondition", "This staff invite is no longer valid.");
    }
    if (invite.phoneE164 !== callerPhone) {
      throw new HttpsError(
        "permission-denied",
        "This invite was sent to a different phone number."
      );
    }
    const {program} = await loadProgramBundle({
      db, programId: invite.programId, transaction: tx,
    });
    requireProgramMutable(program);
    if (program.organizerId !== invite.organizerId) {
      throw new HttpsError("failed-precondition", "Invite ownership changed.");
    }
    const inviteDeadline = programOwnerAuthorizationDeadline(program, invite);
    if (inviteDeadline === null || inviteDeadline <= now.toMillis() ||
        staffTimestampMillis(invite.expiresAt) > inviteDeadline ||
        (invite.programAuthorization !== undefined &&
          invite.programAuthorization.approvedAtMillis > now.toMillis())) {
      throw new HttpsError("permission-denied",
        "The program creator must approve this invite.");
    }
    const issuerUid = invite.programAuthorization?.approvedByUid ??
      invite.createdBy;
    const issuer = await requireProgramManager(db, invite.programId, issuerUid,
      tx, deps.now());
    await validateDutyStations({db, programId: invite.programId,
      organizerId: program.organizerId, duties: invite.duties,
      transaction: tx});
    const grantRef = db.collection("programStaffGrants")
      .doc(programStaffGrantId(invite.programId, uid));
    const [grantSnap, activeSnap] = await Promise.all([
      tx.get(grantRef),
      tx.get(db.collection("programStaffGrants")
        .where("programId", "==", invite.programId)
        .where("organizerId", "==", program.organizerId)
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .limit(maxProgramStaff)),
    ]);
    const current = grantSnap.data() as ProgramStaffGrantDocument | undefined;
    if (current && (current.programId !== invite.programId ||
        current.organizerId !== invite.organizerId || current.uid !== uid)) {
      throw new HttpsError("failed-precondition",
        "Staff grant ownership changed.");
    }
    const committedAt = deps.now();
    if (staffTimestampMillis(invite.expiresAt) <= committedAt.toMillis() ||
        inviteDeadline <= committedAt.toMillis()) {
      throw new HttpsError("failed-precondition", "Staff invite expired.");
    }
    const authorization = authorizeProgramStaffGrant(issuer, issuerUid,
      staffTimestampMillis(invite.expiresAt), committedAt.toMillis());
    if (current && programOwnerAuthorizationDeadline(program, current) ===
        null && issuer.role !== "manager") {
      throw new HttpsError("permission-denied",
        "The program creator must approve legacy staff access.");
    }
    const currentOccupiesSlot = current?.status === "active" &&
      current.programId === invite.programId &&
      current.organizerId === invite.organizerId && current.uid === uid &&
      staffTimestampMillis(current.expiresAt) > committedAt.toMillis();
    if (!currentOccupiesSlot && activeSnap.size >= maxProgramStaff) {
      throw new HttpsError(
        "resource-exhausted",
        "This program already has the maximum number of staff grants."
      );
    }
    const currentActive = currentOccupiesSlot && current!.revokedAt == null &&
      current!.revokedBy == null &&
      programOwnerAuthorizationDeadline(program, current!) !== null;
    const mergedDuties = dedupeDuties([
      ...(currentActive ?
        activeProgramDuties(current!, committedAt.toMillis()) : []),
      ...grantDuties(invite.duties, staffTimestampMillis(invite.expiresAt)),
    ]);
    const grantExpiryMillis = Math.max(
      ...mergedDuties.map((assignment) => assignment.expiresAtMillis));
    // Existing owner-approved tuples retain their exact deadlines. The
    // document ceiling is only an inventory bound; it never renews a tuple.
    const programAuthorization = {...authorization,
      authorizedUntilMillis: grantExpiryMillis};
    const grant: ProgramStaffGrantDocument = {
      organizerId: invite.organizerId,
      programId: invite.programId,
      uid,
      displayName: invite.displayName,
      phoneLastFour: invite.phoneE164.slice(-4),
      duties: mergedDuties,
      status: "active",
      programAuthorization,
      createdBy: current?.createdBy ?? invite.createdBy,
      createdAt: current?.createdAt ?? committedAt,
      expiresAt:
        admin.firestore.Timestamp.fromMillis(grantExpiryMillis),
      revokedBy: null,
      revokedAt: null,
      updatedAt: committedAt,
      revision: current ? nextRevision(current.revision, committedAt) : 1,
    };
    tx.set(grantRef, grant);
    tx.set(inviteRef, {
      ...invite,
      status: "claimed",
      claimedByUid: uid,
      claimedAt: committedAt,
      updatedAt: committedAt,
      revision: nextRevision(invite.revision, committedAt),
    });
    return {programId: invite.programId, alreadyApplied: false};
  });
}

/** Revoke a pending invite so its link can no longer be claimed. */
export async function revokeProgramStaffInviteHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffInviteDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<RevokeProgramStaffInviteCallablePayload>(
      request, validateRevokeProgramStaffInviteCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "revokeProgramStaffInvite", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const inviteRef = db.collection("programStaffInvites").doc(data.inviteId);
  return db.runTransaction(async (tx) => {
    const [snap, {program}] = await Promise.all([
      tx.get(inviteRef),
      requireProgramManager(db, data.programId, actorUid, tx, deps.now()),
    ]);
    requireProgramMutable(program);
    const invite = snap.data() as ProgramStaffInviteDocument | undefined;
    if (!invite || invite.programId !== data.programId ||
        invite.organizerId !== program.organizerId) {
      throw new HttpsError("not-found", "Staff invite not found.");
    }
    if (invite.status !== "pending") {
      return {
        entityId: data.inviteId,
        revision: invite.revision,
        alreadyApplied: true,
      };
    }
    const committedAt = deps.now();
    programAdministrationDeadline(await requireProgramManager(db,
      data.programId, actorUid, tx, committedAt), committedAt.toMillis());
    const revision = nextRevision(invite.revision, committedAt);
    tx.set(inviteRef, {
      ...invite,
      status: "revoked",
      revokedBy: actorUid,
      revokedAt: committedAt,
      updatedAt: committedAt,
      revision,
    });
    return {
      entityId: data.inviteId,
      revision,
      alreadyApplied: false,
    };
  });
}

function scopeFingerprint(
  duties: ProgramStaffInviteDocument["duties"]
): string {
  return JSON.stringify(dedupeDuties(duties).map((assignment) =>
    JSON.stringify([assignment.duty, assignment.pickupPointIds,
      assignment.hotelIds, assignment.functionIds ?? []])).sort());
}

export const inviteProgramStaff = onCall(
  appCheckCallableOptionsWithLimits(inviteCallableLimits),
  (request) => inviteProgramStaffHandler(request)
);
export const claimProgramStaffInvite = onCall(
  appCheckCallableOptionsWithLimits(inviteCallableLimits),
  (request) => claimProgramStaffInviteHandler(request)
);
export const revokeProgramStaffInvite = onCall(
  appCheckCallableOptionsWithLimits(inviteCallableLimits),
  (request) => revokeProgramStaffInviteHandler(request)
);
