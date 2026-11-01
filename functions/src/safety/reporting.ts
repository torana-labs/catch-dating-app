import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {ReportUserCallablePayload} from
  "../shared/generated/reportUserCallablePayload";
import {
  validateReportUserCallablePayload,
} from "../shared/generated/validators/reportUserInput";
import type {ReportGuestCallablePayload} from
  "../shared/generated/reportGuestCallablePayload";
import {validateReportGuestCallablePayload} from
  "../shared/generated/validators/reportGuestInput";
import type {ReportGuestCallableResponse} from
  "../shared/generated/reportGuestCallableResponse";
import type {EventDocument, ReportDocument} from
  "../shared/generated/firestoreAdminTypes";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {requireEventOperatorPermission} from
  "../shared/eventOperatorAuthority";
import {eventOrganizerRef, requireEventOrganizer} from
  "../shared/eventOrganizers";
import {
  AccountActionDeps,
  defaultAccountActionDeps,
  takeAccountSafetyAction,
} from "./accountActions";
import {
  ACCOUNT_SAFETY_STATES,
  REPORT_RECEIVED_NOTICE,
  holdApplies,
  safetyNotice,
  safetyNoticeRef,
} from "./accountStanding";
import {
  readSafetySettings,
  reportDeadlines,
  safetyReasonFor,
} from "./safetyPolicy";

export interface ReportingDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  accountActions: AccountActionDeps;
}

const defaultDeps: ReportingDeps = {
  firestore: () => admin.firestore(),
  now: () => Timestamp.now(),
  accountActions: defaultAccountActionDeps,
};

/**
 * Normalizes optional report text so reports stay bounded and reviewable.
 * @param {string | undefined} value Raw text value.
 * @param {number} maxLength Maximum retained characters.
 * @return {string | undefined} Trimmed text or undefined.
 */
export function normalizeReportText(
  value: string | null | undefined,
  maxLength: number
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

interface NewReport {
  reporterUserId: string;
  reporterRole: "guest" | "organizer";
  targetUserId: string;
  source: ReportDocument["source"];
  reasonCode?: string;
  contextId?: string;
  notes?: string;
  organizerId?: string;
  eventId?: string;
}

/**
 * Files a report with its deadlines, acknowledges the reporter at once, and
 * restricts the reported account pending review when the reason is severe.
 * @param {ReportingDeps} deps Dependencies.
 * @param {NewReport} input Report.
 * @return {Promise<string>} Report id.
 */
export async function fileSafetyReport(
  deps: ReportingDeps,
  input: NewReport
): Promise<string> {
  const db = deps.firestore();
  const now = deps.now();
  const settings = await readSafetySettings(db);
  const reason = safetyReasonFor(settings, input.reasonCode);
  const severe = reason?.active === true && reason.severe;
  const ref = db.collection("reports").doc();
  const report: ReportDocument = {
    reporterUserId: input.reporterUserId,
    reporterRole: input.reporterRole,
    targetUserId: input.targetUserId,
    createdAt: now,
    source: input.source,
    status: "open",
    severity: severe ? "severe" : "standard",
    acknowledgedAt: now,
    ...reportDeadlines(now.toMillis(), reason),
    firstLookAt: null,
    resolvedAt: null,
    reporterNotifiedAt: null,
    actionIds: [],
    retainUntil: null,
    ...(input.reasonCode && {reasonCode: input.reasonCode}),
    ...(input.contextId && {contextId: input.contextId}),
    ...(input.notes && {notes: input.notes}),
    ...(input.organizerId && {organizerId: input.organizerId}),
    ...(input.eventId && {eventId: input.eventId}),
  };
  const noticeId = `report-received-${ref.id}`;
  const batch = db.batch();
  batch.set(ref, report);
  batch.set(safetyNoticeRef(db, input.reporterUserId, noticeId), safetyNotice({
    noticeId,
    uid: input.reporterUserId,
    kind: "reportReceived",
    ...REPORT_RECEIVED_NOTICE,
    actionId: null,
    appealable: false,
    createdAt: now,
  }));
  await batch.commit();

  if (severe && settings.restrictOnSevereReport) {
    const standing = await db.collection(ACCOUNT_SAFETY_STATES)
      .doc(input.targetUserId).get();
    if (!holdApplies(standing.data()?.messaging, now.toMillis())) {
      try {
        await takeAccountSafetyAction(deps.accountActions, {
          uid: input.targetUserId,
          kind: "restrict",
          durationDays: null,
          reasonCode: reason.code,
          messageToUser: "Someone reported something serious. While we " +
            "look into it you can't send messages or post in group chats. " +
            "We'll tell you what we decide.",
          caseTargetPath: `reports/${ref.id}`,
          resolveCase: false,
          notifyReporter: false,
          appealable: true,
          decidedByUid: "system",
          decidedByRole: "system",
          automatic: true,
        });
      } catch (error) {
        logger.error("Severe report could not restrict the account.", {
          reportId: ref.id,
          error: String(error),
        });
      }
    }
  }
  return ref.id;
}

/**
 * Callable implementation for a guest reporting another person.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {ReportingDeps} deps Injectable service dependencies.
 * @return {Promise<{reported: boolean}>} Operation result.
 */
export async function reportUserHandler(
  request: CallableRequest<unknown>,
  deps: ReportingDeps = defaultDeps
): Promise<{reported: boolean}> {
  const reporterUserId = requireAuth(request);
  const data = validateCallableWithAjv<ReportUserCallablePayload>(
    request,
    validateReportUserCallablePayload,
    normalizeReportUserPayload
  );

  if (data.targetUserId === reporterUserId) {
    throw new HttpsError("invalid-argument", "targetUserId is invalid.");
  }

  const source = normalizeReportText(data.source, 64) ?? "profile";
  await fileSafetyReport(deps, {
    reporterUserId,
    reporterRole: "guest",
    targetUserId: data.targetUserId,
    source: (["profile", "chat", "match", "support"].includes(source) ?
      source : "profile") as ReportDocument["source"],
    reasonCode: normalizeReportText(data.reasonCode, 64),
    contextId: normalizeReportText(data.contextId, 128),
    notes: normalizeReportText(data.notes, 1000),
  });
  return {reported: true};
}

/**
 * An organizer, their manager, or the event's team reports a guest.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {ReportingDeps} deps Injectable service dependencies.
 * @return {Promise<ReportGuestCallableResponse>} Operation result.
 */
export async function reportGuestHandler(
  request: CallableRequest<unknown>,
  deps: ReportingDeps = defaultDeps
): Promise<ReportGuestCallableResponse> {
  const reporterUserId = requireAuth(request);
  const data = validateCallableWithAjv<ReportGuestCallablePayload>(
    request, validateReportGuestCallablePayload);
  if (data.targetUserId === reporterUserId) {
    throw new HttpsError("invalid-argument", "targetUserId is invalid.");
  }
  const db = deps.firestore();
  const settings = await readSafetySettings(db);
  if (!settings.organizerReports) {
    throw new HttpsError("failed-precondition",
      "Reporting guests is switched off. Write to Catch support instead.");
  }
  if (data.eventId) {
    const eventSnap = await db.collection("events").doc(data.eventId).get();
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (event.organizerId !== data.organizerId) {
      throw new HttpsError("invalid-argument",
        "That event belongs to another organizer.");
    }
    const organizer = requireEventOrganizer(
      await eventOrganizerRef(db, event).get(), event);
    await requireEventOperatorPermission({
      db,
      organizer,
      event,
      eventId: data.eventId,
      actorUid: reporterUserId,
      permission: "viewRoster",
      now: deps.now(),
    });
  } else {
    await requireOrganizerManager({db, organizerId: data.organizerId,
      actorUid: reporterUserId});
  }
  await fileSafetyReport(deps, {
    reporterUserId,
    reporterRole: "organizer",
    targetUserId: data.targetUserId,
    source: "organizer",
    reasonCode: data.reasonCode,
    contextId: data.eventId ? `events/${data.eventId}` : undefined,
    notes: normalizeReportText(data.notes, 1000),
    organizerId: data.organizerId,
    eventId: data.eventId ?? undefined,
  });
  return {reported: true};
}

/**
 * Trims report payload text before generated schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeReportUserPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: [
      "targetUserId",
      "source",
      "reasonCode",
      "contextId",
      "notes",
    ],
  });
}

export const reportUser = onCall(appCheckCallableOptions, async (request) => {
  if (request.auth) {
    await checkRateLimit(
      admin.firestore(),
      request.auth.uid,
      "reportUser",
      {maxRequests: 5, windowMs: 60 * 1000}
    );
  }
  return reportUserHandler(request);
});

export const reportGuest = onCall(appCheckCallableOptions, async (request) => {
  if (request.auth) {
    await checkRateLimit(admin.firestore(), request.auth.uid, "reportGuest",
      {maxRequests: 10, windowMs: 60 * 1000});
  }
  return reportGuestHandler(request);
});
