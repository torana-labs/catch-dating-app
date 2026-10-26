import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {ReportUserCallablePayload} from
  "../shared/generated/reportUserCallablePayload";
import {
  validateReportUserCallablePayload,
} from "../shared/generated/validators/reportUserInput";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import {validateCallableWithAjv} from "../shared/validation";

interface ReportingDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

const defaultDeps: ReportingDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
};

/**
 * Normalizes optional report text so reports stay bounded and reviewable.
 * @param {string | undefined} value Raw text value.
 * @param {number} maxLength Maximum retained characters.
 * @return {string | undefined} Trimmed text or undefined.
 */
export function normalizeReportText(
  value: string | undefined,
  maxLength: number
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Callable implementation for filing a safety report.
 * @param {CallableRequest<Partial<ReportUserData> | null>} request Callable.
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
  const reasonCode = normalizeReportText(data.reasonCode, 64);
  const contextId = normalizeReportText(data.contextId, 128);
  const notes = normalizeReportText(data.notes, 2000);

  await deps.firestore().collection("reports").add({
    reporterUserId,
    targetUserId: data.targetUserId,
    createdAt: deps.serverTimestamp(),
    source,
    status: "open",
    ...(reasonCode && {reasonCode}),
    ...(contextId && {contextId}),
    ...(notes && {notes}),
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
