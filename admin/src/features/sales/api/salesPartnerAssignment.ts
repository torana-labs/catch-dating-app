import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";

export interface PartnerOfferInput {
  requestId: string; organizerId: string; partnerUid: string;
  expectedRevision: 0; nextAction: string; reviewAt: string; expiresAt: string;
  reason: string; originatorUid: null;
}
export async function offerSalesPartner(input: PartnerOfferInput): Promise<void> {
  if (dataMode() === "sample") throw new Error("Partner offers require a live administrator session.");
  const {validateAdminCallableRequest} =
    await loadAdminCallableValidators("adminAssignSalesPartner");
  validateAdminCallableRequest("adminAssignSalesPartner", input);
  const {data} = await httpsCallable<PartnerOfferInput, unknown>(functions, "adminAssignSalesPartner")(input);
  if (!data || typeof data !== "object" || !("organizerId" in data) ||
      data.organizerId !== input.organizerId || !("partnerUid" in data) ||
      data.partnerUid !== input.partnerUid || !("revision" in data) || data.revision !== 1 ||
      !("status" in data) || data.status !== "offered") {
    throw new Error("The offer was not confirmed. Retry the unchanged request to reconcile it.");
  }
}
