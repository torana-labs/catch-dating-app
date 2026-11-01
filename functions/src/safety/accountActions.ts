import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {AdminContext, requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptions, appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  AccountSafetyActionDocument,
  AccountSafetyStateDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminTakeAccountSafetyActionCallablePayload} from
  "../shared/generated/adminTakeAccountSafetyActionCallablePayload";
import type {AdminTakeAccountSafetyActionCallableResponse} from
  "../shared/generated/adminTakeAccountSafetyActionCallableResponse";
import type {AdminLiftAccountSafetyActionCallablePayload} from
  "../shared/generated/adminLiftAccountSafetyActionCallablePayload";
import type {AdminLiftAccountSafetyActionCallableResponse} from
  "../shared/generated/adminLiftAccountSafetyActionCallableResponse";
import type {AdminListAccountSafetyActionsCallablePayload} from
  "../shared/generated/adminListAccountSafetyActionsCallablePayload";
import type {AdminListAccountSafetyActionsCallableResponse} from
  "../shared/generated/adminListAccountSafetyActionsCallableResponse";
import {validateAdminTakeAccountSafetyActionCallablePayload} from
  "../shared/generated/validators/adminTakeAccountSafetyActionInput";
import {validateAdminLiftAccountSafetyActionCallablePayload} from
  "../shared/generated/validators/adminLiftAccountSafetyActionInput";
import {validateAdminListAccountSafetyActionsCallablePayload} from
  "../shared/generated/validators/adminListAccountSafetyActionsInput";
import {
  ACCOUNT_SAFETY_ACTIONS,
  ACCOUNT_SAFETY_STATES,
  REPORT_HANDLED_NOTICE,
  deriveAccountSafetyState,
  safetyNotice,
  safetyNoticeRef,
} from "./accountStanding";
import {
  SafetyBookingDeps,
  SafetyBookingOutcome,
  cancelFutureBookingsForSafety,
  defaultSafetyBookingDeps,
} from "./accountActionBookings";
import {
  BLOCKED_SIGNUP_ATTEMPTS,
  recordBannedIdentities,
  releaseBannedIdentities,
} from "./bannedIdentities";
import {
  SAFETY_OPS_ROLES,
  SafetyStep,
  millisOf,
  readSafetySettings,
  requireSafetyStepAuthority,
  safetyActorRole,
  safetyReasonLabel,
} from "./safetyPolicy";

type ActionDoc = AccountSafetyActionDocument;
type Kind = ActionDoc["kind"];

export interface AccountActionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  auth: () => Pick<admin.auth.Auth,
    "getUser" | "updateUser" | "revokeRefreshTokens">;
  now: () => Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  newActionId: () => string;
  bookings: SafetyBookingDeps;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

export const defaultAccountActionDeps: AccountActionDeps = {
  firestore: () => admin.firestore(),
  auth: () => admin.auth(),
  now: () => Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  newActionId: () => randomUUID().replace(/-/gu, ""),
  bookings: defaultSafetyBookingDeps,
  checkRateLimit: defaultCheckRateLimit,
};

export interface TakeActionInput {
  uid: string;
  kind: Kind;
  durationDays: 7 | 30 | null;
  reasonCode: string;
  messageToUser: string;
  caseTargetPath: string | null;
  /** Mark the linked case handled; false for the automatic restriction. */
  resolveCase: boolean;
  notifyReporter: boolean;
  appealable: boolean;
  decidedByUid: string;
  decidedByRole: ActionDoc["decidedByRole"];
  automatic: boolean;
}

export interface TakeActionAudit {
  context: AdminContext;
  request: CallableRequest<unknown>;
  note: string;
}

const CASE_COLLECTIONS = new Set([
  "reports",
  "moderationFlags",
  "eventSafetyReports",
]);

const NOTICE_COPY: Record<Kind, {kind: "warning" | "restriction" |
  "suspension" | "ban"; title: string}> = {
    warn: {kind: "warning", title: "A warning from Catch"},
    restrict: {kind: "restriction", title: "You can't send messages for now"},
    suspend: {kind: "suspension", title: "Your account is suspended"},
    ban: {kind: "ban", title: "Your account has been closed"},
  };

/**
 * Validates the duration each step allows.
 * @param {Kind} kind Step.
 * @param {7 | 30 | null} durationDays Duration.
 */
export function assertActionDuration(
  kind: Kind,
  durationDays: 7 | 30 | null
): void {
  if ((kind === "warn" || kind === "ban") && durationDays !== null) {
    throw new HttpsError("invalid-argument",
      "Warnings and bans have no end date.");
  }
}

function parseCasePath(path: string | null):
  {collection: string; docId: string} | null {
  if (!path) return null;
  const [collection, docId, extra] = path.split("/");
  if (!docId || extra || !CASE_COLLECTIONS.has(collection)) {
    throw new HttpsError("invalid-argument",
      "Account actions link reports, flags or event safety reports.");
  }
  return {collection, docId};
}

function activeActionsQuery(db: FirebaseFirestore.Firestore, uid: string) {
  return db.collection(ACCOUNT_SAFETY_ACTIONS)
    .where("uid", "==", uid)
    .where("status", "==", "active");
}

/**
 * Takes one step against an account and makes it hold: the standing every
 * messaging and booking path reads, a notice to the person, sign-out and
 * cancelled future bookings for suspensions and bans, and the phone and
 * devices of a banned account.
 * @param {AccountActionDeps} deps Dependencies.
 * @param {TakeActionInput} input Step.
 * @param {TakeActionAudit=} audit Admin audit context.
 * @return {Promise<AdminTakeAccountSafetyActionCallableResponse>} Result.
 */
export async function takeAccountSafetyAction(
  deps: AccountActionDeps,
  input: TakeActionInput,
  audit?: TakeActionAudit
): Promise<AdminTakeAccountSafetyActionCallableResponse> {
  assertActionDuration(input.kind, input.durationDays);
  const casePath = parseCasePath(input.caseTargetPath);
  const db = deps.firestore();
  const now = deps.now();
  const nowMillis = now.toMillis();
  const actionId = deps.newActionId();
  const endsAt = input.durationDays === null ? null :
    Timestamp.fromMillis(nowMillis + input.durationDays * 24 * 3600_000);
  const actionRef = db.collection(ACCOUNT_SAFETY_ACTIONS).doc(actionId);
  const stateRef = db.collection(ACCOUNT_SAFETY_STATES).doc(input.uid);
  const caseRef = casePath ?
    db.collection(casePath.collection).doc(casePath.docId) : null;

  const [userSnap, deletedSnap] = await Promise.all([
    db.collection("users").doc(input.uid).get(),
    db.collection("deletedUsers").doc(input.uid).get(),
  ]);
  if (!userSnap.exists || deletedSnap.exists) {
    throw new HttpsError("not-found", "Account not found.");
  }

  await db.runTransaction(async (tx) => {
    const [stateSnap, actives, caseSnap] = await Promise.all([
      tx.get(stateRef),
      tx.get(activeActionsQuery(db, input.uid)),
      caseRef ? tx.get(caseRef) : Promise.resolve(null),
    ]);
    if (caseRef && !caseSnap?.exists) {
      throw new HttpsError("not-found", "Safety case not found.");
    }
    const caseData = caseSnap?.data() ?? {};
    const action: ActionDoc = {
      schemaVersion: 1,
      actionId,
      uid: input.uid,
      kind: input.kind,
      reasonCode: input.reasonCode,
      messageToUser: input.messageToUser,
      durationDays: input.durationDays,
      startsAt: now,
      endsAt,
      status: "active",
      caseTargetPaths: input.caseTargetPath ? [input.caseTargetPath] : [],
      decidedByUid: input.decidedByUid,
      decidedByRole: input.decidedByRole,
      automatic: input.automatic,
      appealable: input.appealable,
      appeal: null,
      bookings: {
        cancelledEventIds: [],
        needsOrganizerEventIds: [],
        failedEventIds: [],
      },
      lifted: null,
      retainUntil: null,
      createdAt: now,
      updatedAt: now,
    };
    const previous = stateSnap.data() as AccountSafetyStateDocument |
      undefined;
    const others = actives.docs.map((doc) => doc.data() as ActionDoc);
    tx.create(actionRef, action);
    tx.set(stateRef, deriveAccountSafetyState(input.uid, [...others, action],
      nowMillis, previous?.authDisabledBySafety ?? false, now));
    const copy = NOTICE_COPY[input.kind];
    tx.set(safetyNoticeRef(db, input.uid, `action-${actionId}`), safetyNotice({
      noticeId: `action-${actionId}`,
      uid: input.uid,
      kind: copy.kind,
      title: copy.title,
      body: input.messageToUser,
      actionId,
      appealable: input.appealable,
      createdAt: now,
    }));
    if (caseRef && casePath) {
      const priorIds = Array.isArray(caseData.actionIds) ?
        caseData.actionIds as string[] : [];
      const patch: Record<string, unknown> = {};
      if (casePath.collection === "reports") {
        patch.actionIds = [...priorIds, actionId].slice(-20);
      }
      const reporterUid = typeof caseData.reporterUserId === "string" ?
        caseData.reporterUserId : null;
      if (input.resolveCase) {
        const open = caseData.status === "open" ||
          caseData.status === "pending";
        if (open) patch.status = "reviewed";
        if (casePath.collection === "reports") {
          patch.resolvedAt = now;
          if (!caseData.firstLookAt) patch.firstLookAt = now;
        }
        if (input.notifyReporter && reporterUid &&
            casePath.collection === "reports" && !caseData.reporterNotifiedAt) {
          patch.reporterNotifiedAt = now;
          const noticeId = `report-handled-${casePath.docId}`;
          tx.set(safetyNoticeRef(db, reporterUid, noticeId), safetyNotice({
            noticeId,
            uid: reporterUid,
            kind: "reportHandled",
            ...REPORT_HANDLED_NOTICE,
            actionId: null,
            appealable: false,
            createdAt: now,
          }));
        }
      }
      if (Object.keys(patch).length > 0) tx.update(caseRef, patch);
    }
    if (audit) {
      setAdminAuditLogInTransaction(tx, db, audit.context, {
        action: "adminTakeAccountSafetyAction",
        targetPath: `users/${input.uid}`,
        request: audit.request,
        before: {level: previous?.level ?? "none"},
        after: {
          actionId,
          kind: input.kind,
          durationDays: input.durationDays,
          reasonCode: input.reasonCode,
          caseTargetPath: input.caseTargetPath,
        },
        note: audit.note,
        serverTimestamp: deps.serverTimestamp,
      });
    }
  });

  const bookings = await enforceSignOutAndBookings(deps, input.uid, actionId,
    input.kind, nowMillis);
  return {
    actionId,
    kind: input.kind,
    status: "active",
    endsAtMillis: endsAt?.toMillis() ?? null,
    bookings: {
      cancelled: bookings.cancelledEventIds.length,
      needsOrganizer: bookings.needsOrganizerEventIds.length,
      failed: bookings.failedEventIds.length,
    },
  };
}

async function enforceSignOutAndBookings(
  deps: AccountActionDeps,
  uid: string,
  actionId: string,
  kind: Kind,
  nowMillis: number
): Promise<SafetyBookingOutcome> {
  const empty: SafetyBookingOutcome = {
    cancelledEventIds: [],
    needsOrganizerEventIds: [],
    failedEventIds: [],
  };
  if (kind !== "suspend" && kind !== "ban") return empty;
  const db = deps.firestore();
  const auth = deps.auth();
  let wasDisabled = false;
  try {
    wasDisabled = (await auth.getUser(uid)).disabled;
  } catch (error) {
    if ((error as {code?: string}).code !== "auth/user-not-found") throw error;
    wasDisabled = true;
  }
  if (!wasDisabled) {
    await auth.updateUser(uid, {disabled: true});
    await auth.revokeRefreshTokens(uid);
    await db.collection(ACCOUNT_SAFETY_STATES).doc(uid)
      .update({authDisabledBySafety: true});
  }
  const bookings = await cancelFutureBookingsForSafety(db, uid, nowMillis,
    deps.bookings);
  await db.collection(ACCOUNT_SAFETY_ACTIONS).doc(actionId).update({
    bookings,
    updatedAt: deps.now(),
  });
  if (kind === "ban") {
    await recordBannedIdentities({
      firestore: deps.firestore,
      auth: deps.auth,
      now: deps.now,
    }, uid, actionId);
  }
  return bookings;
}

export interface EndActionInput {
  actionId: string;
  status: "lifted" | "expired" | "replaced";
  endedByUid: string;
  note: string;
  notify: boolean;
  /** Check the step authority of the action before ending it. */
  authorize?: (action: ActionDoc) => void;
}

/**
 * Ends one action (lifted, expired or replaced by a lighter step) and
 * restores what it held once nothing else holds it.
 * @param {AccountActionDeps} deps Dependencies.
 * @param {EndActionInput} input Which action and why.
 * @param {TakeActionAudit=} audit Admin audit context.
 * @return {Promise<boolean>} False when the action was no longer active.
 */
export async function endAccountSafetyAction(
  deps: AccountActionDeps,
  input: EndActionInput,
  audit?: TakeActionAudit
): Promise<boolean> {
  const db = deps.firestore();
  const now = deps.now();
  const actionRef = db.collection(ACCOUNT_SAFETY_ACTIONS).doc(input.actionId);
  let ended: ActionDoc | null = null;
  let nextState: AccountSafetyStateDocument | null = null;
  await db.runTransaction(async (tx) => {
    ended = null;
    const snap = await tx.get(actionRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Account action not found.");
    }
    const action = snap.data() as ActionDoc;
    if (action.status !== "active") return;
    input.authorize?.(action);
    const [stateSnap, actives] = await Promise.all([
      tx.get(db.collection(ACCOUNT_SAFETY_STATES).doc(action.uid)),
      tx.get(activeActionsQuery(db, action.uid)),
    ]);
    const previous = stateSnap.data() as AccountSafetyStateDocument |
      undefined;
    const remaining = actives.docs.map((doc) => doc.data() as ActionDoc)
      .filter((other) => other.actionId !== action.actionId);
    nextState = deriveAccountSafetyState(action.uid, remaining,
      now.toMillis(), previous?.authDisabledBySafety ?? false, now);
    tx.update(actionRef, {
      status: input.status,
      lifted: input.status === "expired" ? null :
        {at: now, byUid: input.endedByUid, note: input.note},
      updatedAt: now,
    });
    tx.set(db.collection(ACCOUNT_SAFETY_STATES).doc(action.uid), nextState);
    if (input.notify) {
      const noticeId = `ended-${action.actionId}`;
      tx.set(safetyNoticeRef(db, action.uid, noticeId), safetyNotice({
        noticeId,
        uid: action.uid,
        kind: "lifted",
        title: endedTitle(action.kind),
        body: input.status === "expired" ?
          "This has ended. Thank you for keeping Catch safe." :
          input.note,
        actionId: action.actionId,
        appealable: false,
        createdAt: now,
      }));
    }
    if (audit) {
      setAdminAuditLogInTransaction(tx, db, audit.context, {
        action: "adminLiftAccountSafetyAction",
        targetPath: `${ACCOUNT_SAFETY_ACTIONS}/${action.actionId}`,
        request: audit.request,
        before: {status: action.status, kind: action.kind},
        after: {status: input.status},
        note: audit.note,
        serverTimestamp: deps.serverTimestamp,
      });
    }
    ended = action;
  });
  const action = ended as ActionDoc | null;
  const state = nextState as AccountSafetyStateDocument | null;
  if (!action || !state) return false;
  if (state.authDisabledBySafety && !state.booking.held) {
    await deps.auth().updateUser(action.uid, {disabled: false});
    await db.collection(ACCOUNT_SAFETY_STATES).doc(action.uid)
      .update({authDisabledBySafety: false});
  }
  if (action.kind === "ban") {
    await releaseBannedIdentities({
      firestore: deps.firestore,
      auth: deps.auth,
      now: deps.now,
    }, action.actionId);
  }
  return true;
}

function endedTitle(kind: Kind): string {
  if (kind === "restrict") return "You can send messages again";
  if (kind === "suspend") return "Your suspension has ended";
  if (kind === "ban") return "Your account is open again";
  return "Your warning has been removed";
}

/**
 * Admin callable: warn, restrict, suspend or ban one account.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<AdminTakeAccountSafetyActionCallableResponse>} Result.
 */
export async function adminTakeAccountSafetyActionHandler(
  request: CallableRequest<unknown>,
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<AdminTakeAccountSafetyActionCallableResponse> {
  const context = requireAdminRole(request, SAFETY_OPS_ROLES);
  const payload = validateCallableWithAjv<
    AdminTakeAccountSafetyActionCallablePayload>(request,
      validateAdminTakeAccountSafetyActionCallablePayload);
  requireSafetyStepAuthority(context, payload.kind as SafetyStep);
  if (payload.uid === context.uid) {
    throw new HttpsError("invalid-argument",
      "You can't act on your own account.");
  }
  await deps.checkRateLimit?.(deps.firestore(), context.uid,
    "adminTakeAccountSafetyAction", {maxRequests: 20, windowMs: 60_000});
  return takeAccountSafetyAction(deps, {
    uid: payload.uid,
    kind: payload.kind,
    durationDays: payload.durationDays as 7 | 30 | null,
    reasonCode: payload.reasonCode,
    messageToUser: payload.messageToUser.trim(),
    caseTargetPath: payload.caseTargetPath,
    resolveCase: true,
    notifyReporter: payload.notifyReporter,
    appealable: payload.appealable,
    decidedByUid: context.uid,
    decidedByRole: safetyActorRole(context),
    automatic: false,
  }, {context, request, note: payload.note});
}

/**
 * Admin callable: lift one action early.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<AdminLiftAccountSafetyActionCallableResponse>} Result.
 */
export async function adminLiftAccountSafetyActionHandler(
  request: CallableRequest<unknown>,
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<AdminLiftAccountSafetyActionCallableResponse> {
  const context = requireAdminRole(request, SAFETY_OPS_ROLES);
  const payload = validateCallableWithAjv<
    AdminLiftAccountSafetyActionCallablePayload>(request,
      validateAdminLiftAccountSafetyActionCallablePayload);
  await deps.checkRateLimit?.(deps.firestore(), context.uid,
    "adminLiftAccountSafetyAction", {maxRequests: 20, windowMs: 60_000});
  const ended = await endAccountSafetyAction(deps, {
    actionId: payload.actionId,
    status: "lifted",
    endedByUid: context.uid,
    note: payload.note,
    notify: true,
    authorize: (action) => requireSafetyStepAuthority(context, action.kind),
  }, {context, request, note: payload.note});
  if (!ended) {
    throw new HttpsError("failed-precondition",
      "This account action is no longer in force.");
  }
  return {actionId: payload.actionId, status: "lifted"};
}

/**
 * Admin callable: account actions for the Safety queue.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<AdminListAccountSafetyActionsCallableResponse>} Items.
 */
export async function adminListAccountSafetyActionsHandler(
  request: CallableRequest<unknown>,
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<AdminListAccountSafetyActionsCallableResponse> {
  const context = requireAdminRole(request, SAFETY_OPS_ROLES);
  const payload = validateCallableWithAjv<
    AdminListAccountSafetyActionsCallablePayload>(request,
      validateAdminListAccountSafetyActionsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid,
    "adminListAccountSafetyActions", {maxRequests: 60, windowMs: 60_000});
  const collection = db.collection(ACCOUNT_SAFETY_ACTIONS);
  let query: FirebaseFirestore.Query = collection;
  if (payload.uid) query = query.where("uid", "==", payload.uid);
  if (payload.view !== "recent") query = query.where("status", "==", "active");
  const snap = payload.uid || payload.view !== "recent" ?
    await query.limit(500).get() :
    await query.orderBy("createdAt", "desc").limit(payload.limit).get();
  const actions = snap.docs.map((doc) => doc.data() as ActionDoc)
    .filter((action) => payload.view !== "appeals" ||
      action.appeal?.status === "open")
    .sort((a, b) => (millisOf(b.createdAt) ?? 0) -
      (millisOf(a.createdAt) ?? 0))
    .slice(0, payload.limit);
  const settings = await readSafetySettings(db);
  const users = await Promise.all(
    [...new Set(actions.map((action) => action.uid))]
      .map((uid) => db.collection("users").doc(uid).get()));
  const names = new Map(users.map((snapshot) => [snapshot.id,
    typeof snapshot.data()?.displayName === "string" ?
      String(snapshot.data()?.displayName).slice(0, 120) : null]));
  const attempts = await Promise.all(actions.map((action) =>
    action.kind === "ban" ?
      db.collection(BLOCKED_SIGNUP_ATTEMPTS)
        .where("actionId", "==", action.actionId).get()
        .then((result) => result.size) :
      Promise.resolve(0)));
  return {
    items: actions.map((action, index) => ({
      actionId: action.actionId,
      uid: action.uid,
      displayName: names.get(action.uid) ?? null,
      kind: action.kind,
      reasonCode: action.reasonCode,
      reasonLabel: safetyReasonLabel(settings, action.reasonCode).slice(0, 80),
      messageToUser: action.messageToUser,
      durationDays: action.durationDays,
      startsAtMillis: millisOf(action.startsAt) ?? 0,
      endsAtMillis: millisOf(action.endsAt),
      status: action.status,
      decidedByUid: action.decidedByUid,
      decidedByRole: action.decidedByRole,
      automatic: action.automatic,
      appealable: action.appealable,
      caseTargetPaths: action.caseTargetPaths,
      appeal: action.appeal ? {
        status: action.appeal.status,
        text: action.appeal.text,
        submittedAtMillis: millisOf(action.appeal.submittedAt) ?? 0,
        reviewerUid: action.appeal.reviewerUid,
        decidedAtMillis: millisOf(action.appeal.decidedAt),
        decisionNote: action.appeal.decisionNote,
      } : null,
      bookings: {
        cancelled: action.bookings.cancelledEventIds.length,
        needsOrganizer: action.bookings.needsOrganizerEventIds.length,
        failed: action.bookings.failedEventIds.length,
      },
      blockedSignupAttempts: attempts[index],
      canReviewAppeal: action.appeal?.status === "open" &&
        action.decidedByUid !== context.uid,
    })),
  };
}

/**
 * Ends restrictions and suspensions whose time is up.
 * @param {AccountActionDeps} deps Dependencies.
 * @return {Promise<number>} Actions ended.
 */
export async function expireAccountSafetyActionsNow(
  deps: AccountActionDeps = defaultAccountActionDeps
): Promise<number> {
  const db = deps.firestore();
  const due = await db.collection(ACCOUNT_SAFETY_ACTIONS)
    .where("status", "==", "active")
    .where("endsAt", "<=", deps.now())
    .limit(200)
    .get();
  let ended = 0;
  for (const doc of due.docs) {
    try {
      if (await endAccountSafetyAction(deps, {
        actionId: doc.id,
        status: "expired",
        endedByUid: "system",
        note: "Expired",
        notify: true,
      })) ended++;
    } catch (error) {
      logger.error("Account safety action did not expire.", {
        actionId: doc.id,
        error: String(error),
      });
    }
  }
  return ended;
}

// Suspensions and bans cancel every future booking, so allow five minutes.
export const adminTakeAccountSafetyAction = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 300}),
  (request) => adminTakeAccountSafetyActionHandler(request));

export const adminLiftAccountSafetyAction = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120}),
  (request) => adminLiftAccountSafetyActionHandler(request));

export const adminListAccountSafetyActions = onCall(appCheckCallableOptions,
  (request) => adminListAccountSafetyActionsHandler(request));

export const expireAccountSafetyActions = onSchedule(
  {schedule: "every 15 minutes", timeZone: "UTC"},
  async () => {
    await expireAccountSafetyActionsNow();
  }
);
