import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {
  setAdminAuditLogInTransaction,
  writeAdminAuditLog,
} from "./adminAudit";
import type {AdminDecideSafetyTriageItemCallablePayload} from
  "../shared/generated/adminDecideSafetyTriageItemCallablePayload";
import type {AdminDecideSafetyTriageItemCallableResponse} from
  "../shared/generated/adminDecideSafetyTriageItemCallableResponse";
import type {AdminAssignSafetyTriageItemCallablePayload} from
  "../shared/generated/adminAssignSafetyTriageItemCallablePayload";
import type {AdminAssignSafetyTriageItemCallableResponse} from
  "../shared/generated/adminAssignSafetyTriageItemCallableResponse";
import {
  validateAdminAssignSafetyTriageItemCallablePayload,
} from
  "../shared/generated/validators/adminAssignSafetyTriageItemInput";
import {
  validateAdminDecideSafetyTriageItemCallablePayload,
} from
  "../shared/generated/validators/adminDecideSafetyTriageItemInput";
import {validateEventAssistanceCaseDocument} from
  "../shared/generated/validators/eventAssistanceCaseDocument";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import {validateCallableWithAjv} from "../shared/validation";

const safetyDetailRoles = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;
const safetyDecisionRoles = ["admin", "adminOwner", "safetyReviewer"] as const;

export type AdminSafetyTriageKind =
  | "report"
  | "moderationFlag"
  | "eventSafetyReport"
  | "eventAssistanceCase";

export interface AdminGetSafetyTriageDetailsPayload {
  targetPath: string;
}

export interface AdminSafetyTriageField {
  label: string;
  value: string;
}

export type AdminSafetyTriageSeverity = "high" | "medium" | "watch";
export type AdminSafetyTriageSlaState =
  | "ok"
  | "due_soon"
  | "overdue"
  | "unknown";

export interface AdminSafetyTriageAssignment {
  ownerTeam: string;
  assigneeUid: string | null;
  queue: string;
  severity: AdminSafetyTriageSeverity;
}

export interface AdminSafetyTriageSla {
  dueAt: string | null;
  state: AdminSafetyTriageSlaState;
  policy: string;
}

export interface AdminSafetyTriageEvidence {
  label: string;
  value: string;
  sourcePath: string | null;
  sensitive: boolean;
}

export interface AdminSafetyTriagePriorHistory {
  id: string;
  label: string;
  count: number;
  sampleTargetPaths: string[];
}

export type AdminSafetyTriageOutcomeSeverity =
  | "info"
  | "warning"
  | "critical";

export type AdminSafetyTriageOutcomeActionStatus =
  | "available"
  | "manual"
  | "needs_contract";

export interface AdminSafetyTriageOutcomeGuidance {
  id: string;
  label: string;
  detail: string;
  severity: AdminSafetyTriageOutcomeSeverity;
  actionStatus: AdminSafetyTriageOutcomeActionStatus;
}

export interface AdminSafetyTriageDetails {
  targetPath: string;
  kind: AdminSafetyTriageKind;
  title: string;
  summary: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  primaryUserId: string | null;
  secondaryUserId: string | null;
  eventId: string | null;
  organizerId: string | null;
  source: string | null;
  contextId: string | null;
  assignment: AdminSafetyTriageAssignment;
  sla: AdminSafetyTriageSla;
  evidence: AdminSafetyTriageEvidence[];
  fields: AdminSafetyTriageField[];
  priorHistory: AdminSafetyTriagePriorHistory[];
  outcomeGuidance: AdminSafetyTriageOutcomeGuidance[];
  nextActions: string[];
}

export interface AdminGetSafetyTriageDetailsResponse {
  item: AdminSafetyTriageDetails;
}

export type AdminSafetyTriageDecision = "review" | "dismiss";

export type AdminDecideSafetyTriageItemPayload =
  AdminDecideSafetyTriageItemCallablePayload;

export type AdminDecideSafetyTriageItemResponse =
  AdminDecideSafetyTriageItemCallableResponse;

export type AdminAssignSafetyTriageItemPayload =
  AdminAssignSafetyTriageItemCallablePayload;

export type AdminAssignSafetyTriageItemResponse =
  AdminAssignSafetyTriageItemCallableResponse;

interface SafetyTarget {
  collection: "reports" | "moderationFlags" | "eventSafetyReports" |
    "eventAssistanceCases";
  docId: string;
  kind: AdminSafetyTriageKind;
  targetPath: string;
}

interface SafetyTriageDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: SafetyTriageDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Loads a normalized admin safety queue detail.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SafetyTriageDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetSafetyTriageDetailsResponse>} Detail response.
 */
export async function adminGetSafetyTriageDetailsHandler(
  request: CallableRequest<unknown>,
  deps: SafetyTriageDeps = defaultDeps
): Promise<AdminGetSafetyTriageDetailsResponse> {
  const adminContext = requireAdminRole(request, safetyDetailRoles);
  const payload = normalizeSafetyDetailPayload(request.data);
  const target = parseSafetyTarget(payload.targetPath);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetSafetyTriageDetails",
    {maxRequests: 60, windowMs: 60 * 1000}
  );

  const snapshot = await db.collection(target.collection).doc(target.docId)
    .get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Safety queue item not found.");
  }

  const baseItem = normalizeSafetyDetail(
    target,
    snapshot.data() ?? {},
    deps.now()
  );
  const priorHistory = await loadPriorHistory(db, target, baseItem);
  const item: AdminSafetyTriageDetails = {
    ...baseItem,
    priorHistory,
    outcomeGuidance: buildOutcomeGuidance(baseItem, priorHistory),
  };
  await writeAdminAuditLog(db, adminContext, {
    action: "adminGetSafetyTriageDetails",
    targetPath: target.targetPath,
    request,
    serverTimestamp: deps.serverTimestamp,
  });
  return {item};
}

/**
 * Records a non-destructive safety triage decision.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SafetyTriageDeps} deps Injectable dependencies.
 * @return {Promise<AdminDecideSafetyTriageItemResponse>} Decision response.
 */
export async function adminDecideSafetyTriageItemHandler(
  request: CallableRequest<unknown>,
  deps: SafetyTriageDeps = defaultDeps
): Promise<AdminDecideSafetyTriageItemResponse> {
  const adminContext = requireAdminRole(request, safetyDecisionRoles);
  validateCallableWithAjv(
    request,
    validateAdminDecideSafetyTriageItemCallablePayload
  );
  const payload = normalizeSafetyDecisionPayload(request.data);
  const target = parseSafetyTarget(payload.targetPath);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideSafetyTriageItem",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const docRef = db.collection(target.collection).doc(target.docId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Safety queue item not found.");
    }
    const before = snapshot.data() ?? {};
    assertSafetyItemEditable(target, before);
    const nextStatus = statusForDecision(target, payload.decision);
    tx.update(docRef, buildSafetyDecisionPatch(
      target,
      before,
      payload.decision,
      nextStatus,
      adminContext.uid,
      deps.serverTimestamp(),
      deps.now()
    ));
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideSafetyTriageItem",
      targetPath: target.targetPath,
      request,
      before: {
        kind: target.kind,
        status: stringValue(before.status) ?? "unknown",
      },
      after: {
        decision: payload.decision,
        status: nextStatus,
      },
      note: payload.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    targetPath: target.targetPath,
    decision: payload.decision,
    status: statusForDecision(target, payload.decision),
  };
}

/**
 * Assigns or clears a safety triage owner without changing outcome status.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SafetyTriageDeps} deps Injectable dependencies.
 * @return {Promise<AdminAssignSafetyTriageItemResponse>} Assignment response.
 */
export async function adminAssignSafetyTriageItemHandler(
  request: CallableRequest<unknown>,
  deps: SafetyTriageDeps = defaultDeps
): Promise<AdminAssignSafetyTriageItemResponse> {
  const adminContext = requireAdminRole(request, safetyDecisionRoles);
  validateCallableWithAjv(
    request,
    validateAdminAssignSafetyTriageItemCallablePayload
  );
  const payload = normalizeSafetyAssignmentPayload(request.data);
  const target = parseSafetyTarget(payload.targetPath);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminAssignSafetyTriageItem",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const docRef = db.collection(target.collection).doc(target.docId);
  let assignment: AdminSafetyTriageAssignment | null = null;
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Safety queue item not found.");
    }
    const before = snapshot.data() ?? {};
    assertSafetyItemEditable(target, before);
    const patch = buildSafetyAssignmentPatch(
      target,
      before,
      payload,
      adminContext.uid,
      deps.serverTimestamp(),
      deps.now()
    );
    tx.update(docRef, patch);
    const after = applySafetyPatch(before, patch);
    assignment = assignmentFor(target, after, severityFor(target, after));
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminAssignSafetyTriageItem",
      targetPath: target.targetPath,
      request,
      before: {
        kind: target.kind,
        status: stringValue(before.status) ?? "unknown",
        assigneeUid: assignmentFor(
          target,
          before,
          severityFor(target, before)
        ).assigneeUid,
      },
      after: {
        assigneeUid: payload.assigneeUid,
      },
      note: payload.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  if (!assignment) {
    throw new HttpsError("internal", "Safety assignment did not complete.");
  }
  return {
    targetPath: target.targetPath,
    assignment,
  };
}

export const adminGetSafetyTriageDetails = onCall(
  appCheckCallableOptions,
  (request) => adminGetSafetyTriageDetailsHandler(request)
);

export const adminDecideSafetyTriageItem = onCall(
  appCheckCallableOptions,
  (request) => adminDecideSafetyTriageItemHandler(request)
);

export const adminAssignSafetyTriageItem = onCall(
  appCheckCallableOptions,
  (request) => adminAssignSafetyTriageItemHandler(request)
);

/**
 * Normalizes the detail payload.
 * @param {unknown} data Raw callable data.
 * @return {AdminGetSafetyTriageDetailsPayload} Valid payload.
 */
export function normalizeSafetyDetailPayload(
  data: unknown
): AdminGetSafetyTriageDetailsPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const targetPath = stringValue(data.targetPath);
  if (!targetPath || targetPath.length > 260) {
    throw new HttpsError("invalid-argument", "A valid targetPath is required.");
  }
  parseSafetyTarget(targetPath);
  return {targetPath};
}

/**
 * Normalizes a safety triage decision payload.
 * @param {unknown} data Raw callable data.
 * @return {AdminDecideSafetyTriageItemPayload} Valid payload.
 */
export function normalizeSafetyDecisionPayload(
  data: unknown
): AdminDecideSafetyTriageItemPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const targetPath = stringValue(data.targetPath);
  if (!targetPath || targetPath.length > 260) {
    throw new HttpsError("invalid-argument", "A valid targetPath is required.");
  }
  parseSafetyTarget(targetPath);
  const decision = stringValue(data.decision);
  if (decision !== "review" && decision !== "dismiss") {
    throw new HttpsError("invalid-argument", "Unsupported safety decision.");
  }
  const note = stringValue(data.note);
  if (!note || note.length > 1000) {
    throw new HttpsError(
      "invalid-argument",
      "A review note between 1 and 1000 characters is required."
    );
  }
  return {targetPath, decision, note};
}

/**
 * Normalizes a safety assignment payload.
 * @param {unknown} data Raw callable data.
 * @return {AdminAssignSafetyTriageItemPayload} Valid payload.
 */
export function normalizeSafetyAssignmentPayload(
  data: unknown
): AdminAssignSafetyTriageItemPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const targetPath = stringValue(data.targetPath);
  if (!targetPath || targetPath.length > 260) {
    throw new HttpsError("invalid-argument", "A valid targetPath is required.");
  }
  parseSafetyTarget(targetPath);
  const assigneeUid = nullableUid(data.assigneeUid);
  const note = stringValue(data.note);
  if (!note || note.length > 1000) {
    throw new HttpsError(
      "invalid-argument",
      "An assignment note between 1 and 1000 characters is required."
    );
  }
  return {targetPath, assigneeUid, note};
}

/**
 * Returns the durable status for a safety triage decision.
 * @param {AdminSafetyTriageDecision} decision Admin decision.
 * @return {"reviewed" | "dismissed" | "resolved"} Document status.
 */
function statusForDecision(
  target: SafetyTarget,
  decision: AdminSafetyTriageDecision
): "reviewed" | "dismissed" | "resolved" {
  if (target.kind === "eventAssistanceCase") return "resolved";
  return decision === "review" ? "reviewed" : "dismissed";
}

/**
 * Ensures the source document is still open for a status-only decision.
 * @param {SafetyTarget} target Parsed target.
 * @param {FirebaseFirestore.DocumentData} data Source document data.
 */
function assertSafetyItemEditable(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData
) {
  if (target.kind === "eventAssistanceCase") {
    const restricted = requireRestrictedCase(target, data);
    if (restricted.status !== "open" ||
        restricted.handling.resolution !== null) {
      throw closedSafetyItem();
    }
    return;
  }
  const status = stringValue(data.status);
  const expectedStatus = target.collection === "moderationFlags" ?
    "pending" :
    "open";
  if (status !== expectedStatus) {
    throw closedSafetyItem();
  }
}

/**
 * Builds the schema-safe Firestore decision patch.
 * @param {SafetyTarget} target Parsed target.
 * @param {FirebaseFirestore.DocumentData} data Current source document.
 * @param {AdminSafetyTriageDecision} decision Reviewed outcome.
 * @param {"reviewed" | "dismissed" | "resolved"} status Next status.
 * @param {string} reviewerUid Acting safety reviewer.
 * @param {FirebaseFirestore.FieldValue} timestamp Server timestamp.
 * @param {Date} now Trusted application clock.
 * @return {Record<string, unknown>} Firestore patch.
 */
function buildSafetyDecisionPatch(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  decision: AdminSafetyTriageDecision,
  status: "reviewed" | "dismissed" | "resolved",
  reviewerUid: string,
  timestamp: FirebaseFirestore.FieldValue,
  now: Date
): Record<string, unknown> {
  if (target.kind === "eventAssistanceCase") {
    const restricted = requireRestrictedCase(target, data);
    const at = eventAssistanceClock(now, restricted);
    return {status: "resolved", handling: {
      ...restricted.handling,
      revision: restricted.handling.revision + 1,
      updatedAt: at,
      resolution: {
        outcome: decision === "review" ? "resolved" : "declined",
        actorUid: reviewerUid,
        at,
      },
    }};
  }
  if (target.collection === "moderationFlags") {
    return {status, reviewedAt: timestamp};
  }
  if (target.collection === "eventSafetyReports") {
    return {status, updatedAt: timestamp};
  }
  return {status};
}

/**
 * Builds the schema-safe Firestore assignment patch.
 * @param {AdminAssignSafetyTriageItemPayload} payload Assignment payload.
 * @param {string} reviewerUid Acting admin uid.
 * @param {FirebaseFirestore.FieldValue} timestamp Server timestamp.
 * @return {Record<string, unknown>} Firestore patch.
 */
function buildSafetyAssignmentPatch(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  payload: AdminAssignSafetyTriageItemPayload,
  reviewerUid: string,
  timestamp: FirebaseFirestore.FieldValue,
  now: Date
): Record<string, unknown> {
  if (target.kind === "eventAssistanceCase") {
    const restricted = requireRestrictedCase(target, data);
    const at = eventAssistanceClock(now, restricted);
    return {handling: {
      ...restricted.handling,
      revision: restricted.handling.revision + 1,
      assigneeUid: payload.assigneeUid,
      updatedAt: at,
    }};
  }
  return {
    assigneeUid: payload.assigneeUid,
    assignmentUpdatedAt: timestamp,
    assignmentUpdatedByUid: reviewerUid,
  };
}

/**
 * Parses and allowlists supported safety target paths.
 * @param {string} targetPath Firestore document path.
 * @return {SafetyTarget} Parsed target.
 */
export function parseSafetyTarget(targetPath: string): SafetyTarget {
  const [collection, docId, extra] = targetPath.split("/");
  if (!docId || extra) {
    throw new HttpsError("invalid-argument", "Unsupported safety target path.");
  }
  if (collection === "reports") {
    return {collection, docId, kind: "report", targetPath};
  }
  if (collection === "moderationFlags") {
    return {collection, docId, kind: "moderationFlag", targetPath};
  }
  if (collection === "eventSafetyReports") {
    return {collection, docId, kind: "eventSafetyReport", targetPath};
  }
  if (collection === "eventAssistanceCases") {
    return {collection, docId, kind: "eventAssistanceCase", targetPath};
  }
  throw new HttpsError("invalid-argument", "Unsupported safety target path.");
}

/**
 * Builds a bounded, UI-safe detail object for supported safety queues.
 * @param {SafetyTarget} target Parsed target.
 * @param {FirebaseFirestore.DocumentData} data Source document data.
 * @return {AdminSafetyTriageDetails} Normalized detail.
 */
export function normalizeSafetyDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  now: Date
): AdminSafetyTriageDetails {
  if (target.kind === "report") return normalizeReportDetail(target, data, now);
  if (target.kind === "moderationFlag") {
    return normalizeModerationDetail(target, data, now);
  }
  if (target.kind === "eventAssistanceCase") {
    return normalizeEventAssistanceCaseDetail(target, data, now);
  }
  return normalizeEventSafetyDetail(target, data, now);
}

function normalizeReportDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  now: Date
): AdminSafetyTriageDetails {
  const reason = stringValue(data.reasonCode) ?? "Safety report";
  const source = stringValue(data.source);
  const reporterUserId = stringValue(data.reporterUserId);
  const targetUserId = stringValue(data.targetUserId);
  const contextId = stringValue(data.contextId);
  const notes = boundedText(data.notes, 500);
  return baseDetail(target, data, {
    now,
    title: reason,
    summary: [
      source ? `${source} report` : "User report",
      targetUserId ?
        `target ${targetUserId}` :
        null,
    ].filter(Boolean).join(" - "),
    primaryUserId: targetUserId,
    secondaryUserId: reporterUserId,
    source,
    contextId,
    fields: [
      field("Reason", reason),
      field("Source", source),
      field("Context id", contextId),
      field("Reporter", reporterUserId),
      field("Target user", targetUserId),
      field("Notes preview", notes),
    ],
    evidence: [
      evidence("Reporter", reporterUserId, userPath(reporterUserId), false),
      evidence("Target user", targetUserId, userPath(targetUserId), false),
      evidence("Context", contextId, sourcePathFromValue(contextId), false),
      evidence("Notes preview", notes, null, true),
    ],
    nextActions: [
      "Open reporter and target profile context before resolving.",
      "Check related chat, match, or support context using the context id.",
      "Use an audited safety mutation before changing account state.",
    ],
  });
}

function normalizeModerationDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  now: Date
): AdminSafetyTriageDetails {
  const flagType = stringValue(data.flagType) ?? "Moderation flag";
  const source = stringValue(data.source);
  const targetUserId = stringValue(data.targetUserId);
  const contextId = stringValue(data.contextId);
  const contextPreview = boundedText(data.context, 500);
  const safeSearch = safeSearchSummary(data.safeSearchResults);
  return baseDetail(target, data, {
    now,
    title: flagType,
    summary: [
      source ? `${source} flag` : "Moderation flag",
      targetUserId ?
        `target ${targetUserId}` :
        null,
    ].filter(Boolean).join(" - "),
    primaryUserId: targetUserId,
    secondaryUserId: null,
    source,
    contextId,
    fields: [
      field("Flag type", flagType),
      field("Source", source),
      field("Target user", targetUserId),
      field("Context id", contextId),
      field("Context preview", contextPreview),
      field("SafeSearch", safeSearch),
      field("Reviewed at", isoFromTimestamp(data.reviewedAt)),
    ],
    evidence: [
      evidence("Flag source", source, null, false),
      evidence("Target user", targetUserId, userPath(targetUserId), false),
      evidence("Content path", contextId, sourcePathFromValue(contextId), true),
      evidence("Context preview", contextPreview, null, true),
      evidence("SafeSearch", safeSearch, null, false),
    ],
    nextActions: [
      "Open the referenced content path before approving or dismissing.",
      "Check whether the trigger already redacted or deleted blocked content.",
      "Use an audited moderation mutation before changing flag status.",
    ],
  });
}

function normalizeEventSafetyDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  now: Date
): AdminSafetyTriageDetails {
  const eventId = stringValue(data.eventId);
  const organizerId = stringValue(data.organizerId);
  const reporterUserId = stringValue(data.reporterUserId);
  const feedbackId = stringValue(data.feedbackId);
  const source = stringValue(data.source);
  const notePreview = boundedText(data.note, 500);
  return baseDetail(target, data, {
    now,
    title: eventId ? `Event ${eventId}` : "Event safety report",
    summary: [
      eventId ? `event ${eventId}` : "event unknown",
      organizerId ? `club ${organizerId}` : "club unknown",
    ].join(" - "),
    primaryUserId: reporterUserId,
    secondaryUserId: null,
    eventId,
    organizerId,
    source,
    contextId: feedbackId,
    fields: [
      field("Event", eventId),
      field("Club", organizerId),
      field("Reporter", reporterUserId),
      field("Feedback id", feedbackId),
      field("Source", source),
      field("Note preview", notePreview),
    ],
    evidence: [
      evidence("Event", eventId, eventId ? `events/${eventId}` : null, false),
      evidence("Club", organizerId, organizerId ? `clubs/${organizerId}` : null, false),
      evidence("Reporter", reporterUserId, userPath(reporterUserId), false),
      evidence("Feedback", feedbackId, sourcePathFromValue(feedbackId), false),
      evidence("Note preview", notePreview, null, true),
    ],
    nextActions: [
      "Open the event, host, and feedback context before resolving.",
      "Route attendance or payment issues to their owning workflow.",
      "Use an audited event safety mutation before changing report status.",
    ],
  });
}

function normalizeEventAssistanceCaseDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  now: Date
): AdminSafetyTriageDetails {
  const restricted = requireRestrictedCase(target, data);
  const context = restricted.context;
  return baseDetail(target, {
    ...restricted,
    createdAt: new Date(restricted.receivedAt),
    updatedAt: new Date(restricted.handling.updatedAt),
  }, {
    now,
    title: "Live event safety request",
    summary: [
      `event ${context.eventId}`,
      `attendee ${restricted.attendeeId}`,
    ].join(" - "),
    primaryUserId: null,
    secondaryUserId: null,
    eventId: context.eventId,
    organizerId: context.organizerId,
    source: "event_assistance_guest_response",
    contextId: restricted.responseId,
    fields: [
      field("Event", context.eventId),
      field("Organizer", context.organizerId),
      field("Attendee", restricted.attendeeId),
      field("Category", restricted.category),
      field("Message", restricted.messageId),
      field("Guest response", restricted.responseId),
      field("Assigned reviewer", restricted.handling.assigneeUid),
    ],
    evidence: [
      evidence("Event", context.eventId,
        `events/${context.eventId}`, false),
      evidence("Organizer", context.organizerId,
        `organizers/${context.organizerId}`, false),
      evidence("Attendee", restricted.attendeeId,
        `eventAttendees/${restricted.attendeeId}`, true),
      evidence("Message", restricted.messageId,
        `eventAssistanceMessages/${restricted.messageId}`, true),
    ],
    nextActions: [
      "Review the live event, attendee, message, and guest response context.",
      "Coordinate immediate operational support with the event lead when " +
        "needed.",
      "Record the reviewed or declined outcome in this restricted queue item.",
    ],
  });
}

function baseDetail(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  input: {
    now: Date;
    title: string;
    summary: string;
    primaryUserId: string | null;
    secondaryUserId: string | null;
    eventId?: string | null;
    organizerId?: string | null;
    source: string | null;
    contextId: string | null;
    fields: Array<AdminSafetyTriageField | null>;
    evidence: Array<AdminSafetyTriageEvidence | null>;
    nextActions: string[];
  }
): AdminSafetyTriageDetails {
  const severity = severityFor(target, data);
  return {
    targetPath: target.targetPath,
    kind: target.kind,
    title: input.title,
    summary: input.summary,
    status: stringValue(data.status) ?? "unknown",
    createdAt: isoFromTimestamp(data.createdAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
    primaryUserId: input.primaryUserId,
    secondaryUserId: input.secondaryUserId,
    eventId: input.eventId ?? null,
    organizerId: input.organizerId ?? null,
    source: input.source,
    contextId: input.contextId,
    assignment: assignmentFor(target, data, severity),
    sla: slaFor(target, data, severity, input.now),
    evidence: input.evidence.filter((item): item is
      AdminSafetyTriageEvidence => item !== null
    ),
    fields: input.fields.filter((item): item is AdminSafetyTriageField =>
      item !== null
    ),
    priorHistory: [],
    outcomeGuidance: [],
    nextActions: input.nextActions,
  };
}

async function loadPriorHistory(
  db: FirebaseFirestore.Firestore,
  target: SafetyTarget,
  item: AdminSafetyTriageDetails
): Promise<AdminSafetyTriagePriorHistory[]> {
  const signals = await Promise.all([
    item.primaryUserId ?
      loadHistorySignal(
        db.collection("reports").where(
          "targetUserId",
          "==",
          item.primaryUserId
        ).limit(12),
        "reports",
        "reportsAboutPrimaryUser",
        "Reports about primary user",
        target.targetPath
      ) :
      null,
    item.primaryUserId ?
      loadHistorySignal(
        db.collection("moderationFlags").where(
          "targetUserId",
          "==",
          item.primaryUserId
        ).limit(12),
        "moderationFlags",
        "moderationForPrimaryUser",
        "Moderation flags for primary user",
        target.targetPath
      ) :
      null,
    item.secondaryUserId ?
      loadHistorySignal(
        db.collection("reports").where(
          "reporterUserId",
          "==",
          item.secondaryUserId
        ).limit(12),
        "reports",
        "reportsBySecondaryUser",
        "Reports by secondary user",
        target.targetPath
      ) :
      null,
    item.eventId ?
      loadHistorySignal(
        db.collection("eventSafetyReports").where(
          "eventId",
          "==",
          item.eventId
        ).limit(12),
        "eventSafetyReports",
        "eventSafetyForEvent",
        "Event safety reports for event",
        target.targetPath
      ) :
      null,
    item.organizerId ?
      loadHistorySignal(
        db.collection("eventSafetyReports").where(
          "organizerId",
          "==",
          item.organizerId
        ).limit(12),
        "eventSafetyReports",
        "eventSafetyForOrganizer",
        "Event safety reports for organizer",
        target.targetPath
      ) :
      null,
  ]);
  return signals.filter((signal): signal is AdminSafetyTriagePriorHistory =>
    signal !== null && signal.count > 0
  );
}

async function loadHistorySignal(
  query: FirebaseFirestore.Query,
  collectionPath: string,
  id: string,
  label: string,
  currentTargetPath: string
): Promise<AdminSafetyTriagePriorHistory> {
  const snapshot = await query.get();
  const sampleTargetPaths = snapshot.docs
    .map((doc) => docPath(collectionPath, doc))
    .filter((path) => path !== currentTargetPath)
    .slice(0, 5);
  return {
    id,
    label,
    count: sampleTargetPaths.length,
    sampleTargetPaths,
  };
}

function docPath(
  collectionPath: string,
  doc: FirebaseFirestore.QueryDocumentSnapshot
): string {
  const maybeDoc = doc as unknown as {
    ref?: {path?: unknown};
    path?: unknown;
  };
  if (typeof maybeDoc.ref?.path === "string") return maybeDoc.ref.path;
  if (typeof maybeDoc.path === "string") return maybeDoc.path;
  return `${collectionPath}/${doc.id}`;
}

function buildOutcomeGuidance(
  item: AdminSafetyTriageDetails,
  priorHistory: AdminSafetyTriagePriorHistory[]
): AdminSafetyTriageOutcomeGuidance[] {
  const guidance: AdminSafetyTriageOutcomeGuidance[] = [];
  const priorCount = priorHistory.reduce(
    (sum, signal) => sum + signal.count,
    0
  );
  if (item.sla.state === "overdue" || item.assignment.severity === "high") {
    const isOverdue = item.sla.state === "overdue";
    guidance.push({
      id: "escalate_safety_lead",
      label: "Escalate to safety lead",
      detail: isOverdue ?
        "High-risk or overdue item. Assign an owner and escalate " +
          "manually until the escalation callable exists." :
        "High-severity item. Keep a safety reviewer assigned before any " +
          "account action.",
      severity: "critical",
      actionStatus: "manual",
    });
  }
  if (priorCount > 0) {
    guidance.push({
      id: "review_prior_history",
      label: "Review prior history before disposition",
      detail:
        `${priorCount} related safety ` +
        `item${priorCount === 1 ? "" : "s"} found. ` +
        "Use those source documents before dismissing or resolving.",
      severity: "warning",
      actionStatus: "available",
    });
  }
  if (item.primaryUserId && (
    item.kind === "moderationFlag" ||
    item.assignment.severity === "high"
  )) {
    guidance.push({
      id: "restriction_requires_contract",
      label: "Restriction requires separate account action",
      detail:
        "This tab does not restrict accounts. Use a dedicated " +
        "account-safety callable before changing user state.",
      severity: "warning",
      actionStatus: "needs_contract",
    });
  }
  if (item.kind === "eventSafetyReport") {
    guidance.push({
      id: "route_event_owner",
      label: "Route event follow-up",
      detail:
        "Review event, host, attendance, and feedback context before " +
        "resolving the event safety report.",
      severity: "warning",
      actionStatus: "manual",
    });
  }
  if (item.kind === "eventAssistanceCase") {
    guidance.push({
      id: "resolve_live_event_request",
      label: "Close the live safety handoff",
      detail:
        "Record whether the request was handled or declined after reviewing " +
        "the event and attendee context.",
      severity: "critical",
      actionStatus: "available",
    });
  }
  if (!item.contextId) {
    guidance.push({
      id: "request_more_context",
      label: "Request more information",
      detail:
        "No source context id is present. Ask for supporting detail " +
        "before closing the queue item.",
      severity: "info",
      actionStatus: "manual",
    });
  }
  guidance.push({
    id: "status_only_resolution",
    label: "Reviewed/dismissed is queue-only",
    detail:
      "The current mutation only updates the queue document status. " +
      "Account, content, event, and payment changes require their owning " +
      "workflow.",
    severity: "info",
    actionStatus: "available",
  });
  return guidance;
}

function assignmentFor(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  severity: AdminSafetyTriageSeverity
): AdminSafetyTriageAssignment {
  const handling = isRecord(data.handling) ? data.handling : null;
  return {
    ownerTeam: ownerTeamFor(target, data),
    assigneeUid:
      stringValue(handling?.assigneeUid) ??
      stringValue(data.assigneeUid) ??
      stringValue(data.assignedToUid) ??
      stringValue(data.reviewerUid),
    queue: target.collection,
    severity,
  };
}

function ownerTeamFor(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData
): string {
  if (target.kind === "eventSafetyReport" ||
      target.kind === "eventAssistanceCase") return "Event safety";
  if (target.kind === "moderationFlag") return "Moderation";
  const source = stringValue(data.source)?.toLowerCase() ?? "";
  if (source.includes("chat") || source.includes("match")) {
    return "Trust and safety";
  }
  return "Support review";
}

function severityFor(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData
): AdminSafetyTriageSeverity {
  if (target.kind === "eventSafetyReport" ||
      target.kind === "eventAssistanceCase") return "high";
  const haystack = [
    stringValue(data.reasonCode),
    stringValue(data.flagType),
    stringValue(data.source),
    stringValue(data.status),
    stringValue(data.notes),
    stringValue(data.note),
  ].filter(Boolean).join(" ").toLowerCase();
  if (haystack.includes("harassment") ||
    haystack.includes("explicit") ||
    haystack.includes("violence") ||
    haystack.includes("threat") ||
    haystack.includes("unsafe")) {
    return "high";
  }
  if (haystack.includes("fake") ||
    haystack.includes("pending") ||
    haystack.includes("banned")) {
    return "medium";
  }
  return "watch";
}

type RestrictedCase = Extract<EventAssistanceCaseDocument, {
  owner: "authorizedSafetyOperator";
  handling: unknown;
}>;

function requireRestrictedCase(
  target: SafetyTarget,
  data: FirebaseFirestore.DocumentData
): RestrictedCase {
  if (target.kind !== "eventAssistanceCase" ||
      !validateEventAssistanceCaseDocument(data) ||
      data.caseId !== target.docId ||
      data.context.mode !== "live" ||
      data.owner !== "authorizedSafetyOperator" ||
      data.category !== "comfortSafety" ||
      !("handling" in data)) {
    throw new HttpsError("failed-precondition",
      "This restricted event request has no current safety-owned state.");
  }
  return data as RestrictedCase;
}

function eventAssistanceClock(now: Date, restricted: RestrictedCase): number {
  const at = now.getTime();
  if (!Number.isSafeInteger(at) || at < restricted.receivedAt ||
      at < restricted.handling.updatedAt) {
    throw new HttpsError("failed-precondition",
      "The restricted event request has a newer source revision.");
  }
  return at;
}

function applySafetyPatch(
  current: FirebaseFirestore.DocumentData,
  patch: Record<string, unknown>
): FirebaseFirestore.DocumentData {
  return {...current, ...patch};
}

function closedSafetyItem(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "Only open safety items can be reviewed or dismissed."
  );
}

function slaFor(
  _target: SafetyTarget,
  data: FirebaseFirestore.DocumentData,
  severity: AdminSafetyTriageSeverity,
  now: Date
): AdminSafetyTriageSla {
  const explicitDueAt =
    isoFromTimestamp(data.slaDueAt) ??
    isoFromTimestamp(data.dueAt) ??
    isoFromTimestamp(data.escalationDueAt);
  const responseHours = responseHoursFor(severity);
  const createdAt = dateFromTimestamp(data.createdAt);
  const dueAt = explicitDueAt ?? (
    createdAt ?
      new Date(createdAt.getTime() + responseHours * 3600000).toISOString() :
      null
  );
  return {
    dueAt,
    state: slaState(dueAt, now),
    policy: explicitDueAt ?
      "Source-owned safety SLA dueAt." :
      `${severity} queue default response SLA: ${responseHours}h.`,
  };
}

function responseHoursFor(severity: AdminSafetyTriageSeverity): number {
  if (severity === "high") return 24;
  if (severity === "medium") return 48;
  return 72;
}

function slaState(
  dueAt: string | null,
  now: Date
): AdminSafetyTriageSlaState {
  if (!dueAt) return "unknown";
  const dueDate = dateFromTimestamp(dueAt);
  if (!dueDate) return "unknown";
  const diffMs = dueDate.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 6 * 3600000) return "due_soon";
  return "ok";
}

function field(
  label: string,
  value: string | null
): AdminSafetyTriageField | null {
  if (!value) return null;
  return {label, value};
}

function evidence(
  label: string,
  value: string | null,
  sourcePath: string | null,
  sensitive: boolean
): AdminSafetyTriageEvidence | null {
  if (!value) return null;
  return {label, value, sourcePath, sensitive};
}

function userPath(userId: string | null): string | null {
  return userId ? `users/${userId}` : null;
}

function sourcePathFromValue(value: string | null): string | null {
  if (!value || /\s/u.test(value) || !value.includes("/")) return null;
  return value.replace(/^\/+/u, "");
}

function safeSearchSummary(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return Object.entries(value)
    .filter(([, entryValue]) => typeof entryValue === "string")
    .map(([key, entryValue]) => `${key}: ${entryValue}`)
    .slice(0, 8)
    .join(", ");
}

function boundedText(value: unknown, maxLength: number): string | null {
  const text = stringValue(value);
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isoFromTimestamp(value: unknown): string | null {
  const date = dateFromTimestamp(value);
  return date ? date.toISOString() : null;
}

function dateFromTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof (value as {toDate?: unknown}).toDate === "function") {
    const date = (value as {toDate: () => Date}).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableUid(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const uid = stringValue(value);
  if (!uid) return null;
  if (!/^[A-Za-z0-9_-]{3,128}$/u.test(uid)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid assigneeUid is required."
    );
  }
  return uid;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}
