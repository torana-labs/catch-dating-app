import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import type {FitQueueApi, FitQueuePage, FitQueueView,
  FitRefreshResult, FitBatchResult} from "./salesFitQueueTypes";

async function call<Request, Response>(name: string,
  payload: Request): Promise<Response> {
  if (dataMode() === "sample") {
    throw new Error("Live reviewed fit is unavailable in sample mode.");
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

export const salesFitQueueApi: FitQueueApi = {
  list: (view: FitQueueView, cursor?: string) =>
    call<unknown, FitQueuePage>("adminListSalesFitQueue",
      cursor ? {view, cursor, limit: 25} : {view, limit: 25}),
  refresh: (input) =>
    call<typeof input, FitRefreshResult>("adminRefreshSalesFitQueue", input),
  refreshBatch: (input) =>
    call<typeof input, FitBatchResult>("adminRefreshSalesFitQueueBatch", input),
};
