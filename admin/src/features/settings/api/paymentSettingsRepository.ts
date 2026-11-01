import {httpsCallable} from "firebase/functions";
import {validateAdminCallableRequest, validateAdminCallableResponse} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminManageMoneySettingsCallablePayload} from
  "../../../generated/contracts/adminManageMoneySettingsCallablePayload";
import type {AdminManageMoneySettingsCallableResponse} from
  "../../../generated/contracts/adminManageMoneySettingsCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

/**
 * Settings → Payments' own record: GST registered, bill due day and the
 * nominator credit rule. Platform terms, who collects and hand-granted
 * plans keep their existing callables.
 */
export type MoneySettingsState = AdminManageMoneySettingsCallableResponse;
export type MoneySettings = MoneySettingsState["settings"];

async function call(payload: AdminManageMoneySettingsCallablePayload):
  Promise<MoneySettingsState> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleMoneySettings(payload);
  }
  validateAdminCallableRequest("adminManageMoneySettings", payload);
  const response = await httpsCallable<AdminManageMoneySettingsCallablePayload,
    MoneySettingsState>(functions, "adminManageMoneySettings")(payload);
  validateAdminCallableResponse("adminManageMoneySettings", response.data);
  return response.data;
}

/** The money settings in force. */
export function loadMoneySettings(): Promise<MoneySettingsState> {
  return call({action: "read", expectedRevision: null, settings: null});
}

/** Replaces the money settings against the revision reviewed. */
export function saveMoneySettings(expectedRevision: number,
  settings: MoneySettings): Promise<MoneySettingsState> {
  return call({action: "replace", expectedRevision, settings});
}

// Sample mode: the owner's 1 Nov decisions, not yet saved (revision 0).
let sample: MoneySettingsState = {revision: 0, settings: {
  gstRegistered: false, gstRateBasisPoints: 1800, billDueDayOfMonth: 15,
  nominatorCredit: {rateBasisPoints: 1000, months: 12, lapseDays: 90,
    minimumPayoutMinor: 50_000, payoutDayOfMonth: 10,
    earningRoles: ["partner", "guest", "organizer"]}},
updatedAtMillis: null, updatedByUid: null, nextInvoiceNumber: "2026-27/032"};

function sampleMoneySettings(payload: AdminManageMoneySettingsCallablePayload):
  MoneySettingsState {
  if (payload.action === "replace" && payload.settings) {
    if (payload.expectedRevision !== sample.revision) {
      throw new Error("Money settings changed. Review them again.");
    }
    sample = {...sample, revision: sample.revision + 1,
      settings: payload.settings, updatedAtMillis: Date.now(),
      updatedByUid: "sample-owner"};
  }
  return sample;
}
