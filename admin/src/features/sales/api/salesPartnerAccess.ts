import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";

export type PartnerAssignmentState = "offered" | "accepted" | "declined" | "revoked" | "expired";
export interface PartnerAccess {
  organizerId: string;
  assignment: {
    partnerUid: string; state: PartnerAssignmentState; revision: number;
    reviewAt: string; expiresAt: string; updatedAt: string;
  } | null;
  membership: {
    partnerUid: string; displayName: string; state: "active" | "revoked" | "expired";
    revision: number; expiresAt: string;
  } | null;
  evaluatedAt: string;
}
/** organizerId set: only this host's reservation. Null: the partner's whole membership. */
export interface PartnerRevokeInput {
  requestId: string; organizerId: string | null; partnerUid: string;
  expectedRevision: number; reason: string;
}
export interface PartnerRevokeResult {
  organizerId: string | null; partnerUid: string; revision: number; status: "revoked";
}
export interface SalesPartnerAccessApi {
  get(organizerId: string): Promise<PartnerAccess>;
  revoke(input: PartnerRevokeInput): Promise<PartnerRevokeResult>;
}

async function call<T>(name: string, input: unknown): Promise<T> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, input);
  const value = (await httpsCallable<unknown, unknown>(functions, name)(input)).data;
  validateAdminCallableResponse(name, value);
  return value as T;
}

export const salesPartnerAccessApi: SalesPartnerAccessApi = {
  get: async (organizerId) => {
    if (dataMode() === "sample") {
      return {organizerId, assignment: null, membership: null, evaluatedAt: new Date().toISOString()};
    }
    const value = await call<PartnerAccess>("adminGetSalesPartnerAccess", {organizerId});
    if (value.organizerId !== organizerId ||
        (value.membership && value.membership.partnerUid !== value.assignment?.partnerUid)) {
      throw new Error("Partner access came back for a different host. Refresh the page.");
    }
    return value;
  },
  revoke: async (input) => {
    if (dataMode() === "sample") throw new Error("Revoking partner access needs a live administrator session.");
    const value = await call<PartnerRevokeResult>("adminRevokeSalesPartnerAccess", input);
    if (value.organizerId !== input.organizerId || value.partnerUid !== input.partnerUid ||
        value.revision !== input.expectedRevision + 1 || value.status !== "revoked") {
      throw new Error("The revoke was not confirmed. Retry the same request to check whether it went through.");
    }
    return value;
  },
};
