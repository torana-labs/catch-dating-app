import {
  listCommercialTerms as listCommercialTermsRequest,
  manageCommercialTerms as manageCommercialTermsRequest,
} from "../../../shared/api/adminApi";
import type {AdminListCommercialTermsCallablePayload} from
  "../../../generated/contracts/adminListCommercialTermsCallablePayload";
import type {AdminListCommercialTermsCallableResponse} from
  "../../../generated/contracts/adminListCommercialTermsCallableResponse";
import type {ManageCommercialTermsCallablePayload} from
  "../../../generated/contracts/manageCommercialTermsCallablePayload";
import type {ManageCommercialTermsCallableResponse} from
  "../../../generated/contracts/manageCommercialTermsCallableResponse";

export type CommercialTermsListing = AdminListCommercialTermsCallableResponse;
export type CommercialTermsReplacement = ManageCommercialTermsCallablePayload & {
  action: "replace";
};

export function loadCommercialTerms(
  payload: AdminListCommercialTermsCallablePayload
): Promise<CommercialTermsListing> {
  return listCommercialTermsRequest(payload);
}

export function replaceCommercialTerms(
  payload: CommercialTermsReplacement
): Promise<ManageCommercialTermsCallableResponse> {
  return manageCommercialTermsRequest(payload);
}
