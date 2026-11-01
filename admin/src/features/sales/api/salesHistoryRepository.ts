import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import type {SalesHistoryApi} from "./salesHistoryTypes";

async function call<Request, Response>(name: string,
  payload: Request): Promise<Response> {
  if (dataMode() === "sample") {
    throw new Error("Imported source history is unavailable in sample mode.");
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}

export const salesHistoryApi: SalesHistoryApi = {
  listRecords: (input) => call("adminListSalesImportHistory", input),
  listRows: (input) => call("adminListSalesImportHistoryRows", input),
};
