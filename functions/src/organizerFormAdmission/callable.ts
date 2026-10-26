import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {SeatAuthorityError} from "../events/seatAuthority/seatAuthority";
import {SeatIdentityAuthorityError} from "../events/seatIdentityAuthority";
import {OfferDomainError} from "../organizerEventOffers/eventOfferDomain";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateCommitOrganizerFormAdmissionCallablePayload} from
  "../shared/generated/validators/commitOrganizerFormAdmissionInput";
import {validateCommitOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/validators/commitOrganizerFormAdmissionOutput";
import {AdmissionPolicyError} from "./admissionPolicy";
import {commitOrganizerFormAdmission as commit} from "./admissionService";

export interface FormAdmissionCallableDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  commit: typeof commit;
}

const defaultDeps: FormAdmissionCallableDependencies = {
  firestore: () => admin.firestore(), checkRateLimit, commit,
};

/** Resolves authority inside the service transaction, never in the client. */
export async function commitOrganizerFormAdmissionHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv(request,
    validateCommitOrganizerFormAdmissionCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "commitOrganizerFormAdmission", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  try {
    const result = await deps.commit({db, actorUid, payload});
    if (!validateCommitOrganizerFormAdmissionCallableResponse(result)) {
      throw new HttpsError("internal", "Invalid admission result.");
    }
    return result;
  } catch (error) {
    if (error instanceof AdmissionPolicyError ||
        error instanceof SeatAuthorityError ||
        error instanceof SeatIdentityAuthorityError ||
        error instanceof OfferDomainError) {
      const codes = {invalid: "invalid-argument", denied: "permission-denied",
        stale: "failed-precondition", conflict: "failed-precondition",
        unavailable: "failed-precondition"} as const;
      throw new HttpsError(codes[error.code], error.message,
        {reason: "admission_review_required"});
    }
    throw error;
  }
}

export const commitOrganizerFormAdmission = onCall(appCheckCallableOptions,
  (request) => commitOrganizerFormAdmissionHandler(request));
