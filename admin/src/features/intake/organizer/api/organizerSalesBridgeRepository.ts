import {httpsCallable} from "firebase/functions";
import {functions} from "../../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../../shared/api/dataMode";

export interface IntakeSalesLinkInput {
  workItemId: string;
  candidateId: string;
  expectedWorkItemRevision: number;
  expectedCandidateHash: string;
  organizerId: string;
  curationPath: string;
  requestId: string;
}

export interface IntakeSalesLinkResult {
  link: {linkId: string; organizerId: string; curationPath: string;
    sourceCandidateHash: string; sourceWorkItemRevision: number};
  account: {organizerId: string; researchStatus: string};
  accountCreated: boolean;
}

export async function linkOrganizerIntakeToSales(
  input: IntakeSalesLinkInput,
): Promise<IntakeSalesLinkResult> {
  if (dataMode() === "sample") {
    throw new Error("Intake identity linking requires live reviewed records.");
  }
  const name = "adminLinkOrganizerIntakeToSales";
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, input);
  const response = await httpsCallable<IntakeSalesLinkInput,
    IntakeSalesLinkResult>(functions, "adminLinkOrganizerIntakeToSales")(input);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}
