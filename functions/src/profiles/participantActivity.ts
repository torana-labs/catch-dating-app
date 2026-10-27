import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateListParticipantActivityCallablePayload} from
  "../shared/generated/validators/listParticipantActivityInput";
import {validateGetParticipantActivityCallablePayload} from
  "../shared/generated/validators/getParticipantActivityInput";
import type {ListParticipantActivityCallableResponse as Page} from
  "../shared/generated/listParticipantActivityCallableResponse";
import type {GetParticipantActivityCallableResponse as Detail} from
  "../shared/generated/getParticipantActivityCallableResponse";
import {ParticipantActivityInputError, readParticipantFormActivitySource,
  readParticipantFormActivityPageSource,
  type ParticipantFormActivitySource} from "./participantFormActivitySource";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  nowMillis: () => number;
}
const defaults: Deps = {db: () => admin.firestore(), rateLimit: checkRateLimit,
  nowMillis: Date.now};

function metadata(source: ParticipantFormActivitySource):
  Page["items"][number] {
  return {sourceKind: "formResponse", sourceId: source.responseId,
    organizerId: source.organizerId, formId: source.formId,
    versionId: source.versionId, formTitle: source.formTitle,
    purpose: source.purpose, eventId: source.eventId,
    submittedAtMillis: Math.trunc(source.submittedAtMillis)};
}

export async function listParticipantActivityHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Page> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateListParticipantActivityCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listParticipantActivity", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  let page;
  try {
    page = await readParticipantFormActivityPageSource({db, uid,
      limit: data.limit, cursor: data.cursor, nowMillis: deps.nowMillis()});
  } catch (error) {
    if (error instanceof ParticipantActivityInputError) {
      throw new HttpsError("invalid-argument", "Invalid activity cursor.");
    }
    throw error;
  }
  if (!page) {
    throw new HttpsError("not-found", "Your form activity is unavailable.");
  }
  return {items: page.sources.map(metadata), nextCursor: page.nextCursor};
}

export async function getParticipantActivityHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Detail> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateGetParticipantActivityCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getParticipantActivity", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const source = await readParticipantFormActivitySource({db, uid,
    responseId: data.sourceId, nowMillis: deps.nowMillis()});
  if (!source) {
    throw new HttpsError("not-found", "This form activity is unavailable.");
  }
  return {item: metadata(source)};
}

const limits = {timeoutSeconds: 30, maxInstances: 20};
export const listParticipantActivity = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => listParticipantActivityHandler(request));
export const getParticipantActivity = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => getParticipantActivityHandler(request));
