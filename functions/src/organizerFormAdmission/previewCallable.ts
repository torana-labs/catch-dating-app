import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {SeatAuthorityError} from "../events/seatAuthority/seatAuthority";
import {SeatIdentityAuthorityError} from "../events/seatIdentityAuthority";
import {OfferDomainError} from "../organizerEventOffers/eventOfferDomain";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {PreviewOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/previewOrganizerFormAdmissionCallableResponse";
import {validatePreviewOrganizerFormAdmissionCallablePayload} from
  "../shared/generated/validators/previewOrganizerFormAdmissionInput";
import {validatePreviewOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/validators/previewOrganizerFormAdmissionOutput";
import {AdmissionPolicyError} from "./admissionPolicy";
import {previewOrganizerFormAdmission as preview} from "./admissionService";

export interface FormAdmissionPreviewDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  preview: typeof preview;
}
const defaultDeps: FormAdmissionPreviewDependencies = {
  firestore: () => admin.firestore(), checkRateLimit, preview,
};

export async function previewOrganizerFormAdmissionHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const payload = validateCallableWithAjv(request,
    validatePreviewOrganizerFormAdmissionCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "previewOrganizerFormAdmission", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  let result: PreviewOrganizerFormAdmissionCallableResponse;
  try {
    result = await deps.preview({db, actorUid, payload});
  } catch (error) {
    let blocker: PreviewOrganizerFormAdmissionCallableResponse["blocker"];
    if (error instanceof AdmissionPolicyError ||
        error instanceof SeatAuthorityError ||
        error instanceof SeatIdentityAuthorityError ||
        error instanceof OfferDomainError) {
      if (error.code === "denied" || error.code === "invalid") {
        throw new HttpsError(error.code === "denied" ?
          "permission-denied" : "invalid-argument", error.message);
      }
      blocker = {code: error.code, message: error.message};
    } else if (error instanceof HttpsError &&
        error.code === "failed-precondition") {
      blocker = {code: "unavailable", message: error.message};
    } else {
      throw error;
    }
    result = {...payload, canCommit: false, blocker,
      expectedOfferRevision: null, expectedOfferGeneration: null,
      expectedLedgerRevision: null, paymentAuthority: null,
      seatAlreadyOccupied: null};
  }
  if (!validatePreviewOrganizerFormAdmissionCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid admission preview.");
  }
  return result;
}

export const previewOrganizerFormAdmission = onCall(appCheckCallableOptions,
  (request) => previewOrganizerFormAdmissionHandler(request));
