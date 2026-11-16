import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateListParticipantActivityCallablePayload} from
  "../shared/generated/validators/listParticipantActivityInput";
import type {ListParticipantActivityCallableResponse as Page} from
  "../shared/generated/listParticipantActivityCallableResponse";
import {ParticipantActivityInputError,
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

const limits = {timeoutSeconds: 30, maxInstances: 20};
export const listParticipantActivity = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => listParticipantActivityHandler(request));
