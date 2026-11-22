import {
  validateGetSalesPartnerDemoReviewsCallablePayload,
} from "../shared/generated/validators/getSalesPartnerDemoReviewsInput";
import {
  validateProposeSalesPartnerDemoWordingCallablePayload,
} from "../shared/generated/validators/proposeSalesPartnerDemoWordingInput";
import {
  listPartnerDemoReviews,
  proposePartnerDemoWording,
} from "../salesDemo/partnerReview";
import {
  validateGenerateSalesPartnerOutreachCallablePayload,
} from "../shared/generated/validators/generateSalesPartnerOutreachInput";
import {
  validateGetSalesPartnerOutreachJobCallablePayload,
} from "../shared/generated/validators/getSalesPartnerOutreachJobInput";
import {
  validateGetSalesPartnerOutreachDraftCallablePayload,
} from "../shared/generated/validators/getSalesPartnerOutreachDraftInput";
import {
  validateReviewSalesPartnerOutreachDraftCallablePayload,
} from "../shared/generated/validators/reviewSalesPartnerOutreachDraftInput";
import {
  validateCopySalesPartnerOutreachDraftCallablePayload,
} from "../shared/generated/validators/copySalesPartnerOutreachDraftInput";
import {generatePartnerOutreachDraft} from "../admin/salesIntelligence/runtime";
import {getPartnerDraftJob} from "../admin/salesIntelligence/job";
import {
  copyPartnerOutreachDraft,
  getPartnerOutreachDraft,
  getPartnerPreparation,
  recordPartnerManualSend,
  reviewPartnerOutreachDraft,
} from "../admin/salesIntelligence/service";
import {
  validateGetSalesPartnerPreparationCallablePayload,
} from "../shared/generated/validators/getSalesPartnerPreparationInput";
import {
  validateRecordSalesPartnerManualSendCallablePayload,
} from "../shared/generated/validators/recordSalesPartnerManualSendInput";
import type {ValidateFunction} from "ajv";
import {validateCallableWithAjv} from "../shared/validation";
import {
  validateRegisterSalesPartnerCallablePayload,
} from "../shared/generated/validators/registerSalesPartnerInput";
import {
  validateNominateSalesOrganizerCallablePayload,
} from "../shared/generated/validators/nominateSalesOrganizerInput";
import {
  validateUpdateSalesPartnerAssignmentCallablePayload,
} from "../shared/generated/validators/updateSalesPartnerAssignmentInput";
import {
  validateGetSalesPartnerWorkspaceCallablePayload,
} from "../shared/generated/validators/getSalesPartnerWorkspaceInput";
import {
  validateDecideSalesPartnerAssignmentCallablePayload,
} from "../shared/generated/validators/decideSalesPartnerAssignmentInput";
import {
  validateAdminAssignSalesPartnerCallablePayload,
} from "../shared/generated/validators/adminAssignSalesPartnerInput";
import {
  validateAdminRevokeSalesPartnerAccessCallablePayload,
} from "../shared/generated/validators/adminRevokeSalesPartnerAccessInput";
import {
  validateAdminGetSalesPartnerAccessCallablePayload,
} from "../shared/generated/validators/adminGetSalesPartnerAccessInput";
import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {currentSalesEmployee} from "../admin/sales/callables";
import {adminRolesFromToken} from "../platform/adminAuth";
import type {PartnerActor, PartnerDeps} from "./model";
import {
  assignPartner,
  decideAssignment,
  getPartnerAccess,
  getPartnerWorkspace,
  nominateOrganizer,
  registerPartner,
  revokePartnerAccess,
  updateAssignment,
} from "./service";

export async function currentPartnerActor(
  request: CallableRequest<unknown>,
  getUser = (uid: string) => admin.auth().getUser(uid),
): Promise<PartnerActor> {
  const uid = requireAuth(request);
  const user = await getUser(uid);
  const authTime = request.auth?.token.auth_time;
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) :
    0;
  if (
    user.disabled ||
    typeof authTime !== "number" ||
    !Number.isSafeInteger(authTime) ||
    !Number.isFinite(validAfter) ||
    authTime * 1000 < validAfter
  ) {
    throw new HttpsError(
      "permission-denied",
      "Partner session was revoked; sign in again.",
    );
  }
  return {uid, roles: adminRolesFromToken(user.customClaims)};
}
function callable(
  action: string,
  employee: boolean,
  validator: ValidateFunction,
  service: (
    deps: PartnerDeps,
    actor: PartnerActor,
    payload: unknown,
  ) => Promise<unknown>,
  maxRequests = 20,
) {
  return onCall(appCheckCallableOptionsWithLimits({
    concurrency: 10,
    maxInstances: 5,
    memory: "256MiB",
    timeoutSeconds: 30,
  }), async (request) => {
    const payload = validateCallableWithAjv(request, validator);
    const actor = await (employee ?
      currentSalesEmployee(request) :
      currentPartnerActor(request));
    const db = admin.firestore();
    await checkRateLimit(db, actor.uid, `partner:${action}`, {
      maxRequests,
      windowMs: 60000,
    });
    return service({
      db,
      now: () => new Date(),
      checkAuth: async (expected, staff) => {
        const current = await (staff ?
          currentSalesEmployee(request) :
          currentPartnerActor(request));
        if (current.uid !== expected.uid) {
          throw new HttpsError(
            "permission-denied",
            "Partner identity changed.",
          );
        }
      },
    }, actor, payload);
  });
}
export const registerSalesPartner = callable(
  "register", false, validateRegisterSalesPartnerCallablePayload,
  registerPartner,
  20,
);
export const nominateSalesOrganizer = callable(
  "nominate", false, validateNominateSalesOrganizerCallablePayload,
  nominateOrganizer,
  20,
);
export const getSalesPartnerWorkspace = callable(
  "workspace", false, validateGetSalesPartnerWorkspaceCallablePayload,
  getPartnerWorkspace,
  20,
);
export const decideSalesPartnerAssignment = callable(
  "assignment.decide", false,
  validateDecideSalesPartnerAssignmentCallablePayload, decideAssignment,
  20,
);
export const adminAssignSalesPartner = callable(
  "assign", true, validateAdminAssignSalesPartnerCallablePayload, assignPartner,
  20,
);
export const adminRevokeSalesPartnerAccess = callable(
  "revoke", true, validateAdminRevokeSalesPartnerAccessCallablePayload,
  revokePartnerAccess,
  20,
);
export const adminGetSalesPartnerAccess = callable(
  "access.get", true, validateAdminGetSalesPartnerAccessCallablePayload,
  getPartnerAccess,
  60,
);

export const updateSalesPartnerAssignment = callable(
  "assignment.update", false,
  validateUpdateSalesPartnerAssignmentCallablePayload, updateAssignment,
  20,
);

export const generateSalesPartnerOutreach = callable(
  "generateSalesPartnerOutreach", false,
  validateGenerateSalesPartnerOutreachCallablePayload,
  generatePartnerOutreachDraft,
  5,
);
export const getSalesPartnerOutreachJob = callable(
  "getSalesPartnerOutreachJob", false,
  validateGetSalesPartnerOutreachJobCallablePayload, getPartnerDraftJob,
  20,
);
export const getSalesPartnerOutreachDraft = callable(
  "getSalesPartnerOutreachDraft", false,
  validateGetSalesPartnerOutreachDraftCallablePayload, getPartnerOutreachDraft,
  20,
);
export const reviewSalesPartnerOutreachDraft = callable(
  "reviewSalesPartnerOutreachDraft", false,
  validateReviewSalesPartnerOutreachDraftCallablePayload,
  reviewPartnerOutreachDraft,
  20,
);
export const copySalesPartnerOutreachDraft = callable(
  "copySalesPartnerOutreachDraft", false,
  validateCopySalesPartnerOutreachDraftCallablePayload,
  copyPartnerOutreachDraft,
  20,
);
export const recordSalesPartnerManualSend = callable(
  "recordSalesPartnerManualSend", false,
  validateRecordSalesPartnerManualSendCallablePayload, recordPartnerManualSend,
  20,
);
export const getSalesPartnerPreparation = callable(
  "getSalesPartnerPreparation", false,
  validateGetSalesPartnerPreparationCallablePayload, getPartnerPreparation,
  20,
);

export const getSalesPartnerDemoReviews = callable(
  "demo.reviews", false, validateGetSalesPartnerDemoReviewsCallablePayload,
  listPartnerDemoReviews,
  20,
);
export const proposeSalesPartnerDemoWording = callable(
  "demo.wording.propose", false,
  validateProposeSalesPartnerDemoWordingCallablePayload,
  proposePartnerDemoWording,
  20,
);
