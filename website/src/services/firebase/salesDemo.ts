import {claimFirebaseConfigured} from "../../firebaseConfig";
import {invokeWebsiteCallable} from "./runtime";

/**
 * The private sales demo's callables.
 */
export async function invokeSalesDemoCallable<Request, Response>(
  name: "getSalesDemoPreview" | "startSalesDemo" |
    "getSalesDemoSession" | "advanceSalesDemo" |
    "getSalesDemoSetup" | "prepareSalesDemoFormDraft" |
    "createSalesDemoContinuation" | "getSalesDemoContinuation" | "prepareSalesDemoContinuationForm",
  payload: Request
): Promise<Response> {
  return invokeWebsiteCallable<Request, Response>(name, payload,
    claimFirebaseConfigured, "Private demo");
}
