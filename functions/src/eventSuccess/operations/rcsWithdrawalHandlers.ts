import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {operationContentHash} from "../../operations/durableActions";
import {validateGetEventRcsWithdrawalCallablePayload} from
  "../../shared/generated/validators/getEventRcsWithdrawalInput";
import {validateWithdrawEventRcsCallablePayload} from
  "../../shared/generated/validators/withdrawEventRcsInput";
import {validateEventRcsWithdrawalCallableResponse} from
  "../../shared/generated/validators/eventRcsWithdrawalOutput";
import {RcsWithdrawalStore} from "./rcsWithdrawalStore";

export interface RcsWithdrawalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: RcsWithdrawalDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function getEventRcsWithdrawalHandler(
  request: CallableRequest<unknown>, deps: RcsWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateGetEventRcsWithdrawalCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "getEventRcsWithdrawal", {maxRequests: 600, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "getEventRcsWithdrawal",
    {maxRequests: 60, windowMs: 60 * 1000});
  const output = await new RcsWithdrawalStore(db, deps.now).get(input);
  if (!validateEventRcsWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal", "RCS preference unavailable.");
  }
  return output;
}

export async function withdrawEventRcsHandler(
  request: CallableRequest<unknown>, deps: RcsWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateWithdrawEventRcsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "withdrawEventRcs", {maxRequests: 120, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "withdrawEventRcs",
    {maxRequests: 20, windowMs: 60 * 1000});
  const output = await new RcsWithdrawalStore(db, deps.now)
    .withdraw(input);
  if (!validateEventRcsWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal",
      "RCS withdrawal could not be confirmed.");
  }
  return output;
}

function networkIdentity(request: CallableRequest<unknown>): string {
  return "rcs_withdrawal_ip_" + operationContentHash(
    request.rawRequest.ip ??
      request.rawRequest.socket?.remoteAddress ?? "unknown");
}
function credentialIdentity(input: {linkId: string; secret: string}): string {
  return "rcs_withdrawal_grant_" + operationContentHash([
    input.linkId, input.secret,
  ]);
}
export const getEventRcsWithdrawal = onCall(appCheckCallableOptions,
  (request) => getEventRcsWithdrawalHandler(request));
export const withdrawEventRcs = onCall(appCheckCallableOptions,
  (request) => withdrawEventRcsHandler(request));
