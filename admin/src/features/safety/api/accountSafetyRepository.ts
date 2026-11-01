import {
  decideSafetyAppeal,
  getSafetySettings,
  liftAccountSafetyAction,
  listAccountSafetyActions,
  takeAccountSafetyAction,
  updateSafetySettings,
} from "../../../shared/api/adminApi";
import type {AdminListAccountSafetyActionsCallablePayload} from
  "../../../generated/contracts/adminListAccountSafetyActionsCallablePayload";
import type {AdminListAccountSafetyActionsCallableResponse} from
  "../../../generated/contracts/adminListAccountSafetyActionsCallableResponse";
import type {AdminTakeAccountSafetyActionCallablePayload} from
  "../../../generated/contracts/adminTakeAccountSafetyActionCallablePayload";
import type {AdminTakeAccountSafetyActionCallableResponse} from
  "../../../generated/contracts/adminTakeAccountSafetyActionCallableResponse";
import type {AdminLiftAccountSafetyActionCallablePayload} from
  "../../../generated/contracts/adminLiftAccountSafetyActionCallablePayload";
import type {AdminDecideSafetyAppealCallablePayload} from
  "../../../generated/contracts/adminDecideSafetyAppealCallablePayload";
import type {AdminDecideSafetyAppealCallableResponse} from
  "../../../generated/contracts/adminDecideSafetyAppealCallableResponse";
import type {AdminGetSafetySettingsCallableResponse} from
  "../../../generated/contracts/adminGetSafetySettingsCallableResponse";
import type {AdminUpdateSafetySettingsCallablePayload} from
  "../../../generated/contracts/adminUpdateSafetySettingsCallablePayload";

export type AccountActionsQuery = AdminListAccountSafetyActionsCallablePayload;
export type AccountActionView = AccountActionsQuery["view"];
export type AccountAction =
  AdminListAccountSafetyActionsCallableResponse["items"][number];
export type AccountActionKind = AccountAction["kind"];
export type TakeAccountAction = AdminTakeAccountSafetyActionCallablePayload;
export type TakeAccountActionResult =
  AdminTakeAccountSafetyActionCallableResponse;
export type LiftAccountAction = AdminLiftAccountSafetyActionCallablePayload;
export type AppealDecision = AdminDecideSafetyAppealCallablePayload;
export type AppealDecisionResult = AdminDecideSafetyAppealCallableResponse;
export type SafetySettingsSnapshot = AdminGetSafetySettingsCallableResponse;
export type SafetySettingsUpdate = AdminUpdateSafetySettingsCallablePayload;
export type SafetyReason = SafetySettingsSnapshot["settings"]["reasons"][
  number];

/** Account actions in force, with an appeal waiting, or most recent. */
export function loadAccountActions(
  query: AccountActionsQuery
): Promise<AdminListAccountSafetyActionsCallableResponse> {
  return listAccountSafetyActions(query);
}

/** Warn or restrict (ops), suspend or ban (owner). */
export function takeAccountAction(
  payload: TakeAccountAction
): Promise<TakeAccountActionResult> {
  return takeAccountSafetyAction(payload);
}

export function liftAccountAction(payload: LiftAccountAction) {
  return liftAccountSafetyAction(payload);
}

/** One review, by someone who did not decide the action. */
export function decideAppeal(
  payload: AppealDecision
): Promise<AppealDecisionResult> {
  return decideSafetyAppeal(payload);
}

export function loadSafetySettings(): Promise<SafetySettingsSnapshot> {
  return getSafetySettings();
}

export function saveSafetySettings(
  payload: SafetySettingsUpdate
): Promise<SafetySettingsSnapshot> {
  return updateSafetySettings(payload);
}
