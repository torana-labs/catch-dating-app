import {httpsCallable} from "firebase/functions";
import type {AdminListSupplyNominatorsCallableResponse} from
  "../../../../generated/contracts/adminListSupplyNominatorsCallableResponse";
import type {AdminSetSupplyNominatorCallablePayload} from
  "../../../../generated/contracts/adminSetSupplyNominatorCallablePayload";
import type {AdminSetSupplyNominatorCallableResponse} from
  "../../../../generated/contracts/adminSetSupplyNominatorCallableResponse";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type SupplyNominator = AdminListSupplyNominatorsCallableResponse["nominators"][number];
export type SupplyNominatorInput = AdminSetSupplyNominatorCallablePayload;

const sampleNominators: SupplyNominator[] = [{nominatorId: `whatsapp-${"a".repeat(64)}`, channel: "whatsapp",
  phoneLast4: "0000", instagramHandle: null, role: "associate", uid: "sample-associate", displayName: "Sample associate",
  defaultMarket: "mumbai", active: true, updatedAt: "2026-10-30T08:00:00.000Z"}];

/** Who may nominate organizers by messaging Catch's WhatsApp number or Instagram account. */
export async function listSupplyNominators(): Promise<SupplyNominator[]> {
  if (dataMode() === "sample") return structuredClone(sampleNominators);
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators("adminListSupplyNominators"));
  validateAdminCallableRequest("adminListSupplyNominators", {});
  const result = await httpsCallable<Record<string, never>, AdminListSupplyNominatorsCallableResponse>(functions,
    "adminListSupplyNominators")({});
  validateAdminCallableResponse("adminListSupplyNominators", result.data);
  return result.data.nominators;
}

/** Registers a number, or changes or switches off the nominator it belongs to. */
export async function setSupplyNominator(input: SupplyNominatorInput): Promise<AdminSetSupplyNominatorCallableResponse> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators("adminSetSupplyNominator"));
  validateAdminCallableRequest("adminSetSupplyNominator", input);
  const result = await httpsCallable<SupplyNominatorInput, AdminSetSupplyNominatorCallableResponse>(functions,
    "adminSetSupplyNominator")(input);
  validateAdminCallableResponse("adminSetSupplyNominator", result.data);
  return result.data;
}

/** The signed-in staff member's uid, so registering yourself needs no lookup. */
export async function currentStaffUid(): Promise<string | null> {
  if (dataMode() === "sample") return "sample-associate";
  const {auth} = await import("../../../../shared/api/firebase");
  return auth.currentUser?.uid ?? null;
}
