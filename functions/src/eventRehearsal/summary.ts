import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {GetEventRehearsalSummaryCallablePayload} from
  "../shared/generated/getEventRehearsalSummaryCallablePayload";
import type {EventRehearsalSummaryCallableResponse} from
  "../shared/generated/eventRehearsalSummaryCallableResponse";
import {validateGetEventRehearsalSummaryCallablePayload} from
  "../shared/generated/validators/getEventRehearsalSummaryInput";
import {validateEventRehearsalMilestoneDocument} from
  "../shared/generated/validators/eventRehearsalMilestoneDocument";

/** Reads durable completion without returning sessions or roster identity. */
export async function getEventRehearsalSummaryHandler(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore = admin.firestore()
): Promise<EventRehearsalSummaryCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<GetEventRehearsalSummaryCallablePayload>(
    request, validateGetEventRehearsalSummaryCallablePayload
  );
  await checkRateLimit(db, uid, "getEventRehearsalSummary", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId,
    actorUid: uid});
  const milestone = await db.collection("eventRehearsalMilestones")
    .doc(data.organizerId).get();
  if (milestone.exists) {
    const stored = milestone.data();
    if (!validateEventRehearsalMilestoneDocument(stored) ||
        stored?.organizerId !== data.organizerId) {
      throw new HttpsError("failed-precondition",
        "Rehearsal completion evidence needs review.");
    }
    return {hasCompletedRehearsal: true};
  }
  // Legacy completion is only knowable while the original session survives.
  // firestore-index: eventRehearsals (organizerId:ASCENDING, status:ASCENDING)
  const completed = await db.collection("eventRehearsals")
    .where("organizerId", "==", data.organizerId)
    .where("status", "==", "complete").limit(1).get();
  return {hasCompletedRehearsal: !completed.empty};
}

export const getEventRehearsalSummary = onCall(appCheckCallableOptions,
  (request) => getEventRehearsalSummaryHandler(request));
