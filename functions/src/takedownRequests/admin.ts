/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminGetTakedownRequestCallablePayload} from "../shared/generated/adminGetTakedownRequestCallablePayload";
import type {AdminGetTakedownRequestCallableResponse} from "../shared/generated/adminGetTakedownRequestCallableResponse";
import type {AdminUpdateTakedownRequestCallablePayload} from "../shared/generated/adminUpdateTakedownRequestCallablePayload";
import type {AdminUpdateTakedownRequestCallableResponse} from "../shared/generated/adminUpdateTakedownRequestCallableResponse";
import type {TakedownRequestDocument} from "../shared/generated/firestoreAdminTypes";
import {validateAdminGetTakedownRequestCallablePayload} from "../shared/generated/validators/adminGetTakedownRequestInput";
import {validateAdminUpdateTakedownRequestCallablePayload} from "../shared/generated/validators/adminUpdateTakedownRequestInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {requireAdminRole, type AdminContext} from "../admin/adminAuth";
import {iso} from "../admin/inbox/model";
import {
  APPEAL_DECIDE_WITHIN_MS, APPEAL_WINDOW_MS, CASE_OUTCOMES, REQUEST_POLICIES, SUSPEND_REQUEST_TYPES,
  SUSPENDED_PUBLISH_STATUSES, TAKEDOWN_REQUESTS_COLLECTION, type RequestStatus, type RequestType,
} from "./model";

/**
 * Admin's steps on a listing request. Ops and support acknowledge, ask for
 * more with a fixed template and record an appeal; admins and the owner
 * action (with a fixed outcome, and the takedown tool's case id where the
 * outcome removes or suspends a page) or decline (with a fixed reason). One
 * appeal per request, decided by someone other than the decider. Admins and
 * the owner may also suspend the organiser page an undecided removal,
 * rights, privacy, impersonation or order request names, in the same
 * transaction as its history entry. Each step is a history entry and an
 * audit log; the Inbox item follows the document.
 * Nothing here sends a message: staff reply by email and record it.
 */

export const takedownReadRoles = ["admin", "adminOwner", "support"] as const;
const deciderRoles = ["admin", "adminOwner"] as const;
const maxHistory = 60;
const maxInfoRequests = 20;

type Row = AdminGetTakedownRequestCallableResponse["request"];
type Action = AdminUpdateTakedownRequestCallablePayload["action"];
type Stored = TakedownRequestDocument;

interface TakedownAdminDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: TakedownAdminDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

function isDecider(context: AdminContext): boolean {
  return context.roles.some((role) => (deciderRoles as readonly string[]).includes(role));
}

function instant(value: unknown): string {
  return iso(value) ?? new Date(0).toISOString();
}

/** The request as Admin reads it. */
export function takedownRow(data: Stored): Row {
  const appeal = data.appeal;
  return {
    requestId: data.requestId, reference: data.reference, requestType: data.requestType, status: data.status,
    target: data.target, requester: data.requester, verification: data.verification as Row["verification"],
    declarations: data.declarations, context: data.context, outcome: data.outcome, declineReason: data.declineReason,
    caseId: data.caseId,
    infoRequests: data.infoRequests.map((entry) => ({template: entry.template, at: instant(entry.at), byUid: entry.byUid})),
    appeal: appeal ? {recordedAt: instant(appeal.recordedAt), recordedByUid: appeal.recordedByUid, dueAt: instant(appeal.dueAt),
      decision: appeal.decision, decidedAt: iso(appeal.decidedAt), decidedByUid: appeal.decidedByUid} : null,
    deciderUid: data.deciderUid,
    ackDueAt: instant(data.ackDueAt), actionDueAt: iso(data.actionDueAt), resolveDueAt: instant(data.resolveDueAt),
    acknowledgedAt: iso(data.acknowledgedAt), decidedAt: iso(data.decidedAt), closedAt: iso(data.closedAt),
    createdAt: instant(data.createdAt),
    history: data.history.map((entry) => ({at: instant(entry.at), action: entry.action, byUid: entry.byUid,
      status: entry.status, detail: entry.detail})),
  };
}

function canDecideAppeal(context: AdminContext, data: Stored): boolean {
  return data.status === "appealed" && isDecider(context) && data.deciderUid !== context.uid;
}

const undecided: readonly RequestStatus[] = ["received", "acknowledged", "verifying"];

/** The organiser id a request names, if it names one. */
function namedOrganizerId(data: Stored): string | null {
  return data.target.kind === "organizer" && data.target.id ? data.target.id : null;
}

function canSuspendOrganizer(context: AdminContext, data: Stored): boolean {
  return isDecider(context) && undecided.includes(data.status) &&
    SUSPEND_REQUEST_TYPES.includes(data.requestType as RequestType) && namedOrganizerId(data) !== null;
}

/** One request with what the caller may do. */
export async function adminGetTakedownRequestHandler(request: CallableRequest<unknown>,
  deps: TakedownAdminDeps = defaultDeps): Promise<AdminGetTakedownRequestCallableResponse> {
  const context = requireAdminRole(request, takedownReadRoles);
  const data = validateCallableWithAjv<AdminGetTakedownRequestCallablePayload>(request,
    validateAdminGetTakedownRequestCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminGetTakedownRequest", {maxRequests: 240, windowMs: 60 * 1000});
  const snap = await db.collection(TAKEDOWN_REQUESTS_COLLECTION).doc(data.requestId).get();
  if (!snap.exists) throw new HttpsError("not-found", "This request was not found.");
  const stored = snap.data() as Stored;
  const policy = REQUEST_POLICIES[stored.requestType as RequestType];
  return {
    request: takedownRow(stored),
    allowedOutcomes: [...policy.outcomes],
    caseOutcomes: policy.outcomes.filter((outcome) => CASE_OUTCOMES.includes(outcome)),
    canDecide: isDecider(context),
    canDecideAppeal: canDecideAppeal(context, stored),
    canSuspendOrganizer: canSuspendOrganizer(context, stored),
  };
}

/**
 * The next document for one step, or an HttpsError naming why it cannot be
 * taken. Pure, so the rules are tested without Firestore.
 * @param {Stored} before The request now.
 * @param {AdminUpdateTakedownRequestCallablePayload} step The step.
 * @param {AdminContext} context Who takes it.
 * @param {Date} now The time.
 * @return {object} The changed fields and the history entry.
 */
export function nextTakedownState(before: Stored, step: AdminUpdateTakedownRequestCallablePayload,
  context: AdminContext, now: Date): {changes: Partial<Stored>; status: RequestStatus; detail: string | null} {
  const stamp = admin.firestore.Timestamp.fromDate(now) as unknown as Stored["createdAt"];
  const refuse = (message: string): never => {
    throw new HttpsError("failed-precondition", message);
  };
  const needDecider = () => {
    if (!isDecider(context)) throw new HttpsError("permission-denied", "Only an admin or the owner decides requests.");
  };
  const policy = REQUEST_POLICIES[before.requestType as RequestType];
  const acknowledged = before.acknowledgedAt ? {} : {acknowledgedAt: stamp};
  switch (step.action as Action) {
  case "acknowledge":
    if (before.status !== "received") refuse("This request was already acknowledged.");
    return {changes: {status: "acknowledged", acknowledgedAt: stamp}, status: "acknowledged", detail: null};
  case "requestInfo": {
    if (!undecided.includes(before.status)) refuse("Ask for more only before a decision.");
    if (!step.infoTemplate) throw new HttpsError("invalid-argument", "Choose what to ask for.");
    if (before.infoRequests.length >= maxInfoRequests) refuse("Decide this request instead of asking again.");
    return {changes: {...acknowledged, status: "verifying",
      infoRequests: [...before.infoRequests, {template: step.infoTemplate, at: stamp, byUid: context.uid}]},
    status: "verifying", detail: step.infoTemplate};
  }
  case "action": {
    needDecider();
    if (!undecided.includes(before.status)) refuse("This request is already decided.");
    if (!step.outcome || !policy.outcomes.includes(step.outcome)) {
      throw new HttpsError("invalid-argument", "Choose an outcome this kind of request allows.");
    }
    if (CASE_OUTCOMES.includes(step.outcome) && !step.caseId) {
      throw new HttpsError("invalid-argument", "Add the takedown case id the takedown tool ran under.");
    }
    return {changes: {...acknowledged, status: "actioned", outcome: step.outcome, declineReason: null,
      caseId: step.caseId ?? before.caseId, deciderUid: context.uid, decidedAt: stamp},
    status: "actioned", detail: step.caseId ? `${step.outcome} · ${step.caseId}` : step.outcome};
  }
  case "decline":
    needDecider();
    if (!undecided.includes(before.status)) refuse("This request is already decided.");
    if (!step.declineReason) throw new HttpsError("invalid-argument", "Choose why it is declined.");
    return {changes: {...acknowledged, status: "declined", declineReason: step.declineReason, outcome: null,
      deciderUid: context.uid, decidedAt: stamp}, status: "declined", detail: step.declineReason};
  case "recordAppeal": {
    if (before.status !== "actioned" && before.status !== "declined") refuse("Only a decided request can be appealed.");
    if (before.appeal) refuse("This request has had its one appeal.");
    const decidedAt = iso(before.decidedAt);
    if (!decidedAt || now.getTime() - Date.parse(decidedAt) > APPEAL_WINDOW_MS) {
      refuse("The 30-day appeal window has passed.");
    }
    return {changes: {status: "appealed", appeal: {recordedAt: stamp, recordedByUid: context.uid,
      dueAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + APPEAL_DECIDE_WITHIN_MS)) as unknown as Stored["createdAt"],
      decision: null, decidedAt: null, decidedByUid: null}}, status: "appealed", detail: null};
  }
  case "decideAppeal": {
    needDecider();
    if (before.status !== "appealed" || !before.appeal) refuse("There is no appeal to decide.");
    if (before.deciderUid === context.uid) {
      throw new HttpsError("permission-denied", "Someone other than the decider decides the appeal.");
    }
    if (!step.appealDecision) throw new HttpsError("invalid-argument", "Choose whether the decision stands.");
    const appeal = {...before.appeal!, decision: step.appealDecision, decidedAt: stamp, decidedByUid: context.uid};
    // Upheld closes the request; overturned reopens it for a new decision by the reviewer.
    return step.appealDecision === "upheld" ?
      {changes: {status: "closed", appeal, closedAt: stamp}, status: "closed", detail: "upheld"} :
      {changes: {status: "verifying", appeal, outcome: null, declineReason: null, deciderUid: null, decidedAt: null},
        status: "verifying", detail: "overturned"};
  }
  case "close":
    if (before.status !== "actioned" && before.status !== "declined") refuse("Only a decided request can be closed.");
    return {changes: {status: "closed", closedAt: stamp}, status: "closed", detail: null};
  case "suspendOrganizer": {
    // The interim step: the page comes down now, the decision follows once
    // the takedown tool has run. Suspending acknowledges a new request.
    needDecider();
    if (!undecided.includes(before.status)) refuse("Suspend a page only before the request is decided.");
    if (!SUSPEND_REQUEST_TYPES.includes(before.requestType as RequestType)) {
      refuse("This kind of request does not take a page down.");
    }
    if (!namedOrganizerId(before)) refuse("This request names no organiser page to suspend.");
    const status: RequestStatus = before.status === "received" ? "acknowledged" : before.status;
    return {changes: {...acknowledged, status}, status, detail: null};
  }
  }
  throw new HttpsError("invalid-argument", "Unknown step.");
}

const historyActions: Record<Action, Stored["history"][number]["action"]> = {
  acknowledge: "acknowledged", requestInfo: "infoRequested", action: "actioned", decline: "declined",
  recordAppeal: "appealRecorded", decideAppeal: "appealDecided", close: "closed", suspendOrganizer: "organizerSuspended",
};

interface OrganizerSuspension {
  ref: FirebaseFirestore.DocumentReference;
  organizerId: string;
  /** The page's publish state before this step. */
  publishStatus: string;
  /** False when the page is already off the site. */
  write: boolean;
  /** The page is already off and this request already recorded it: the step changes nothing. */
  done: boolean;
  detail: string;
}

/**
 * Reads the organiser a suspend step names, inside the step's transaction.
 * A missing organiser or one with no public page refuses the whole step.
 */
async function readOrganizerSuspension(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore,
  before: Stored): Promise<OrganizerSuspension> {
  const organizerId = namedOrganizerId(before)!;
  const ref = db.collection("organizers").doc(organizerId);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new HttpsError("not-found", "The organiser this request names was not found. Check the page it names; " +
      "a page the takedown tool already removed needs only its outcome recorded.");
  }
  const publicPage = snap.get("publicPage") as {publishStatus?: unknown} | null | undefined;
  if (!publicPage || typeof publicPage !== "object") {
    throw new HttpsError("failed-precondition", "This organiser has no public page to suspend.");
  }
  const publishStatus = typeof publicPage.publishStatus === "string" ? publicPage.publishStatus : "unknown";
  const off = SUSPENDED_PUBLISH_STATUSES.includes(publishStatus);
  const recorded = before.history.some((entry) => entry.action === "organizerSuspended");
  return {ref, organizerId, publishStatus, write: !off, done: off && recorded,
    detail: off ? `page already ${publishStatus}` : `page suspended (was ${publishStatus})`};
}

/** What a suspension writes: off the site, out of search and every format page count. */
export const organizerSuspensionPatch = {
  "publicPage.publishStatus": "suppressed",
  "publicPage.indexStatus": "noindex",
  "publicPage.robots": "noindex, follow",
} as const;

/** Takes one step on one request. */
export async function adminUpdateTakedownRequestHandler(request: CallableRequest<unknown>,
  deps: TakedownAdminDeps = defaultDeps): Promise<AdminUpdateTakedownRequestCallableResponse> {
  const context = requireAdminRole(request, takedownReadRoles);
  const step = validateCallableWithAjv<AdminUpdateTakedownRequestCallablePayload>(request,
    validateAdminUpdateTakedownRequestCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminUpdateTakedownRequest", {maxRequests: 60, windowMs: 60 * 1000});
  const ref = db.collection(TAKEDOWN_REQUESTS_COLLECTION).doc(step.requestId);
  const now = deps.now();
  const after = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "This request was not found.");
    const before = snap.data() as Stored;
    const {changes, status, detail} = nextTakedownState(before, step, context, now);
    const suspension = step.action === "suspendOrganizer" ? await readOrganizerSuspension(tx, db, before) : null;
    // Repeating a suspension that already holds changes nothing and audits nothing.
    if (suspension?.done) return before;
    const stamp = admin.firestore.Timestamp.fromDate(now) as unknown as Stored["createdAt"];
    const entry = {at: stamp, action: historyActions[step.action], byUid: context.uid, status,
      detail: [suspension?.detail ?? detail, step.note?.trim()].filter(Boolean).join(" · ").slice(0, 500) || null};
    const next: Stored = {...before, ...changes, history: [...before.history, entry].slice(-maxHistory), updatedAt: stamp};
    tx.set(ref, next);
    if (suspension?.write) {
      tx.update(suspension.ref, organizerSuspensionPatch);
      setAdminAuditLogInTransaction(tx, db, context, {
        action: "adminUpdateTakedownRequest",
        targetPath: suspension.ref.path,
        request,
        before: {publishStatus: suspension.publishStatus},
        after: {publishStatus: "suppressed", indexStatus: "noindex", takedownRequestId: before.requestId},
        note: step.note,
        serverTimestamp: deps.serverTimestamp,
      });
    }
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminUpdateTakedownRequest",
      targetPath: ref.path,
      request,
      before: {status: before.status, outcome: before.outcome, declineReason: before.declineReason, caseId: before.caseId},
      after: {status: next.status, outcome: next.outcome, declineReason: next.declineReason, caseId: next.caseId,
        ...(suspension ? {suspendedOrganizerId: suspension.organizerId, organizerWritten: suspension.write} : {})},
      note: step.note,
      serverTimestamp: deps.serverTimestamp,
    });
    return next;
  });
  return {request: takedownRow(after)};
}

export const adminGetTakedownRequest = onCall(appCheckCallableOptions,
  (request) => adminGetTakedownRequestHandler(request));
export const adminUpdateTakedownRequest = onCall(appCheckCallableOptions,
  (request) => adminUpdateTakedownRequestHandler(request));
