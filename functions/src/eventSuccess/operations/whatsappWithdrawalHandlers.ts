import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {operationContentHash} from "../../operations/durableActions";
import {validateGetEventWhatsappWithdrawalCallablePayload} from
  "../../shared/generated/validators/getEventWhatsappWithdrawalInput";
import {validateWithdrawEventWhatsappCallablePayload} from
  "../../shared/generated/validators/withdrawEventWhatsappInput";
import {validateEventWhatsappWithdrawalCallableResponse} from
  "../../shared/generated/validators/eventWhatsappWithdrawalOutput";
import {WhatsappWithdrawalStore} from "./whatsappWithdrawalStore";

export interface WhatsappWithdrawalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: WhatsappWithdrawalDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function getEventWhatsappWithdrawalHandler(
  request: CallableRequest<unknown>, deps: WhatsappWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateGetEventWhatsappWithdrawalCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "getEventWhatsappWithdrawal", {maxRequests: 600, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "getEventWhatsappWithdrawal",
    {maxRequests: 60, windowMs: 60 * 1000});
  const output = await new WhatsappWithdrawalStore(db, deps.now).get(input);
  if (!validateEventWhatsappWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal", "WhatsApp preference unavailable.");
  }
  return output;
}

export async function withdrawEventWhatsappHandler(
  request: CallableRequest<unknown>, deps: WhatsappWithdrawalDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateWithdrawEventWhatsappCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "withdrawEventWhatsapp", {maxRequests: 120, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "withdrawEventWhatsapp",
    {maxRequests: 20, windowMs: 60 * 1000});
  const output = await new WhatsappWithdrawalStore(db, deps.now)
    .withdraw(input);
  if (!validateEventWhatsappWithdrawalCallableResponse(output)) {
    throw new HttpsError("internal",
      "WhatsApp withdrawal could not be confirmed.");
  }
  return output;
}

function networkIdentity(request: CallableRequest<unknown>): string {
  return "whatsapp_withdrawal_ip_" + operationContentHash(
    request.rawRequest.ip ??
      request.rawRequest.socket?.remoteAddress ?? "unknown");
}
function credentialIdentity(input: {linkId: string; secret: string}): string {
  return "whatsapp_withdrawal_grant_" + operationContentHash([
    input.linkId, input.secret,
  ]);
}
export const getEventWhatsappWithdrawal = onCall(appCheckCallableOptions,
  (request) => getEventWhatsappWithdrawalHandler(request));
export const withdrawEventWhatsapp = onCall(appCheckCallableOptions,
  (request) => withdrawEventWhatsappHandler(request));
