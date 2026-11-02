import {
  decideEventMessagingBudget,
  getOrganizerEntitlement,
  grantOrganizerEntitlement as grantOrganizerEntitlementCallable,
  reviewEventMessagingBudget,
  revokeOrganizerEntitlementGrant as revokeOrganizerEntitlementGrantCallable,
  stageEventMessagingBudget,
} from "../../../shared/api/adminApi";
import type {AdminApplyEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminApplyEventMessagingBudgetCallablePayload";
import type {AdminApplyEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminApplyEventMessagingBudgetCallableResponse";
import type {AdminDecideEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminDecideEventMessagingBudgetCallablePayload";
import type {AdminDecideEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminDecideEventMessagingBudgetCallableResponse";
import type {AdminGrantOrganizerEntitlementCallablePayload} from
  "../../../generated/contracts/adminGrantOrganizerEntitlementCallablePayload";
import type {AdminRevokeOrganizerEntitlementGrantCallablePayload} from
  "../../../generated/contracts/adminRevokeOrganizerEntitlementGrantCallablePayload";
import type {AdminReviewEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminReviewEventMessagingBudgetCallablePayload";
import type {AdminReviewEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminReviewEventMessagingBudgetCallableResponse";
import type {GetOrganizerEntitlementCallablePayload} from
  "../../../generated/contracts/getOrganizerEntitlementCallablePayload";
import type {OrganizerEntitlementCallableResponse} from
  "../../../generated/contracts/organizerEntitlementCallableResponse";
import type {OrganizerEntitlementMutationCallableResponse} from
  "../../../generated/contracts/organizerEntitlementMutationCallableResponse";

export function loadMessagingBudgetReview(
  payload: AdminReviewEventMessagingBudgetCallablePayload
): Promise<AdminReviewEventMessagingBudgetCallableResponse> {
  return reviewEventMessagingBudget(payload);
}

export function recordMessagingBudgetDecision(
  payload: AdminDecideEventMessagingBudgetCallablePayload
): Promise<AdminDecideEventMessagingBudgetCallableResponse> {
  return decideEventMessagingBudget(payload);
}

export function stageApprovedMessagingBudget(
  payload: AdminApplyEventMessagingBudgetCallablePayload
): Promise<AdminApplyEventMessagingBudgetCallableResponse> {
  return stageEventMessagingBudget(payload);
}

export function loadOrganizerEntitlement(
  payload: GetOrganizerEntitlementCallablePayload
): Promise<OrganizerEntitlementCallableResponse> {
  return getOrganizerEntitlement(payload);
}

export function grantOrganizerEntitlement(
  payload: AdminGrantOrganizerEntitlementCallablePayload
): Promise<OrganizerEntitlementMutationCallableResponse> {
  return grantOrganizerEntitlementCallable(payload);
}

export function revokeOrganizerEntitlementGrant(
  payload: AdminRevokeOrganizerEntitlementGrantCallablePayload
): Promise<OrganizerEntitlementMutationCallableResponse> {
  return revokeOrganizerEntitlementGrantCallable(payload);
}
