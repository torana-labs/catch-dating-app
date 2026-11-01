import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import type {AccountSafetyActionDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {SubmitSafetyAppealCallablePayload} from
  "../shared/generated/submitSafetyAppealCallablePayload";
import type {SubmitSafetyAppealCallableResponse} from
  "../shared/generated/submitSafetyAppealCallableResponse";
import type {AdminDecideSafetyAppealCallablePayload} from
  "../shared/generated/adminDecideSafetyAppealCallablePayload";
import type {AdminDecideSafetyAppealCallableResponse} from
  "../shared/generated/adminDecideSafetyAppealCallableResponse";
import {validateSubmitSafetyAppealCallablePayload} from
  "../shared/generated/validators/submitSafetyAppealInput";
import {validateAdminDecideSafetyAppealCallablePayload} from
  "../shared/generated/validators/adminDecideSafetyAppealInput";
import {
  AccountActionDeps,
  defaultAccountActionDeps,
  endAccountSafetyAction,
  takeAccountSafetyAction,
} from "./accountActions";
import {
  ACCOUNT_SAFETY_ACTIONS,
  safetyNotice,
  safetyNoticeRef,
} from "./accountStanding";
import {SAFETY_OPS_ROLES, safetyActorRole} from "./safetyPolicy";

type ActionDoc = AccountSafetyActionDocument;

/**
 * The account appeals one action taken against it, once. Suspended and
 * banned accounts are signed out, so their appeals arrive through support
 * (grievance@ or WhatsApp) and are recorded there.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<SubmitSafetyAppealCallableResponse>} Result.
 */
export async function submitSafetyAppealHandler(
  request: CallableRequest<unknown>,
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<SubmitSafetyAppealCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<SubmitSafetyAppealCallablePayload>(
    request, validateSubmitSafetyAppealCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "submitSafetyAppeal",
    {maxRequests: 5, windowMs: 60 * 60_000});
  const text = payload.text.trim();
  if (!text) throw new HttpsError("invalid-argument", "Write your appeal.");
  const ref = db.collection(ACCOUNT_SAFETY_ACTIONS).doc(payload.actionId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const action = snap.data() as ActionDoc | undefined;
    if (!action || action.uid !== uid) {
      throw new HttpsError("not-found", "Nothing to appeal.");
    }
    if (!action.appealable || action.appeal !== null) {
      throw new HttpsError("failed-precondition",
        "This decision can be appealed once, and it already has been.");
    }
    if (action.status !== "active") {
      throw new HttpsError("failed-precondition",
        "This decision is no longer in force.");
    }
    const now = deps.now();
    tx.update(ref, {
      appeal: {
        status: "open",
        text,
        submittedAt: now,
        reviewerUid: null,
        decidedAt: null,
        decisionNote: null,
        replacementActionId: null,
      },
      updatedAt: now,
    });
  });
  return {appealed: true};
}

/**
 * Decides an appeal. The reviewer must not be the person who decided the
 * action; that is the whole review. Keep, reduce to a lighter step, or lift.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<AdminDecideSafetyAppealCallableResponse>} Result.
 */
export async function adminDecideSafetyAppealHandler(
  request: CallableRequest<unknown>,
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<AdminDecideSafetyAppealCallableResponse> {
  const context = requireAdminRole(request, SAFETY_OPS_ROLES);
  const payload = validateCallableWithAjv<
    AdminDecideSafetyAppealCallablePayload>(request,
      validateAdminDecideSafetyAppealCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminDecideSafetyAppeal",
    {maxRequests: 20, windowMs: 60_000});
  if (payload.outcome === "reduce" && !payload.reduceTo) {
    throw new HttpsError("invalid-argument",
      "Choose the lighter step this becomes.");
  }
  const ref = db.collection(ACCOUNT_SAFETY_ACTIONS).doc(payload.actionId);
  const snap = await ref.get();
  const action = snap.data() as ActionDoc | undefined;
  if (!action) throw new HttpsError("not-found", "Account action not found.");
  if (action.appeal?.status !== "open") {
    throw new HttpsError("failed-precondition", "No appeal is waiting.");
  }
  if (action.decidedByUid === context.uid) {
    throw new HttpsError("permission-denied",
      "Someone who did not decide this must review the appeal.");
  }
  if (payload.outcome === "reduce") {
    const lighter = {warn: 0, restrict: 1, suspend: 2, ban: 3};
    if (lighter[payload.reduceTo!.kind] >= lighter[action.kind]) {
      throw new HttpsError("invalid-argument",
        "A reduced step must be lighter than the original.");
    }
  }

  let replacementActionId: string | null = null;
  if (payload.outcome === "reduce") {
    const reduced = await takeAccountSafetyAction(deps, {
      uid: action.uid,
      kind: payload.reduceTo!.kind,
      durationDays: payload.reduceTo!.durationDays as 7 | 30 | null,
      reasonCode: action.reasonCode,
      messageToUser: payload.messageToUser.trim(),
      caseTargetPath: null,
      resolveCase: false,
      notifyReporter: false,
      appealable: false,
      decidedByUid: context.uid,
      decidedByRole: safetyActorRole(context),
      automatic: false,
    });
    replacementActionId = reduced.actionId;
  }
  if (payload.outcome !== "keep") {
    await endAccountSafetyAction(deps, {
      actionId: action.actionId,
      status: payload.outcome === "lift" ? "lifted" : "replaced",
      endedByUid: context.uid,
      note: payload.note,
      notify: false,
    });
  }
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as ActionDoc;
    if (current.appeal?.status !== "open") {
      throw new HttpsError("aborted", "The appeal was decided already.");
    }
    tx.update(ref, {
      appeal: {
        ...current.appeal,
        status: payload.outcome === "keep" ? "kept" :
          payload.outcome === "lift" ? "lifted" : "reduced",
        reviewerUid: context.uid,
        decidedAt: now,
        decisionNote: payload.note,
        replacementActionId,
      },
      updatedAt: now,
    });
    const noticeId = `appeal-${action.actionId}`;
    tx.set(safetyNoticeRef(db, action.uid, noticeId), safetyNotice({
      noticeId,
      uid: action.uid,
      kind: "appealDecision",
      title: payload.outcome === "keep" ?
        "We looked at your appeal again" :
        "Your appeal changed our decision",
      body: payload.messageToUser.trim(),
      actionId: replacementActionId ?? action.actionId,
      appealable: false,
      createdAt: now,
    }));
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminDecideSafetyAppeal",
      targetPath: `${ACCOUNT_SAFETY_ACTIONS}/${action.actionId}`,
      request,
      before: {kind: action.kind, decidedByUid: action.decidedByUid},
      after: {outcome: payload.outcome, replacementActionId},
      note: payload.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return {actionId: action.actionId, outcome: payload.outcome,
    replacementActionId};
}

export const submitSafetyAppeal = onCall(appCheckCallableOptions,
  (request) => submitSafetyAppealHandler(request));

export const adminDecideSafetyAppeal = onCall(appCheckCallableOptions,
  (request) => adminDecideSafetyAppealHandler(request));
