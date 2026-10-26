import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {operationContentHash} from "../../operations/durableActions";
import {validateGetEventAssistanceSmsWithdrawalCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceSmsWithdrawalInput";
import {validateWithdrawEventAssistanceSmsCallablePayload} from
  "../../shared/generated/validators/withdrawEventAssistanceSmsInput";
import {validateEventAssistanceSmsWithdrawalCallableResponse} from
  "../../shared/generated/validators/eventAssistanceSmsWithdrawalOutput";
import {SmsWithdrawalStore} from "./smsWithdrawalStore";

export interface SmsWithdrawalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: SmsWithdrawalDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function getEventAssistanceSmsWithdrawalHandler(
  request: CallableRequest<unknown>, deps: SmsWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateGetEventAssistanceSmsWithdrawalCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "getEventAssistanceSmsWithdrawal", {maxRequests: 600, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "getEventAssistanceSmsWithdrawal",
    {maxRequests: 60, windowMs: 60 * 1000});
  const output = await new SmsWithdrawalStore(db, deps.now).get(input);
  if (!validateEventAssistanceSmsWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal", "Text preference unavailable.");
  }
  return output;
}

export async function withdrawEventAssistanceSmsHandler(
  request: CallableRequest<unknown>, deps: SmsWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateWithdrawEventAssistanceSmsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "withdrawEventAssistanceSms", {maxRequests: 120, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "withdrawEventAssistanceSms",
    {maxRequests: 20, windowMs: 60 * 1000});
  const output = await new SmsWithdrawalStore(db, deps.now).withdraw(input);
  if (!validateEventAssistanceSmsWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal", "Text withdrawal could not be confirmed.");
  }
  return output;
}

function networkIdentity(request: CallableRequest<unknown>): string {
  return "sms_withdrawal_ip_" + operationContentHash(request.rawRequest.ip ??
    request.rawRequest.socket?.remoteAddress ?? "unknown");
}
function credentialIdentity(input: {linkId: string; secret: string}): string {
  return "sms_withdrawal_grant_" + operationContentHash([
    input.linkId, input.secret,
  ]);
}
export const getEventAssistanceSmsWithdrawal = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceSmsWithdrawalHandler(request));
export const withdrawEventAssistanceSms = onCall(appCheckCallableOptions,
  (request) => withdrawEventAssistanceSmsHandler(request));
