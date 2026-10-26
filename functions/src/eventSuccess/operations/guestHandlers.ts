import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {operationContentHash} from "../../operations/durableActions";
import {validateGetEventAssistanceGuestViewCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceGuestViewInput";
import {validateSubmitEventAssistanceGuestChoiceCallablePayload} from
  "../../shared/generated/validators/submitEventAssistanceGuestChoiceInput";
import {validateEventAssistanceGuestViewCallableResponse} from
  "../../shared/generated/validators/eventAssistanceGuestViewOutput";
import {validateSubmitEventAssistanceGuestChoiceCallableResponse} from
  "../../shared/generated/validators/submitEventAssistanceGuestChoiceOutput";
import {GuestAssistanceStore} from "./guestAssistanceStore";

export interface GuestHandlerDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}

const defaultDeps: GuestHandlerDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function getEventAssistanceGuestViewHandler(
  request: CallableRequest<unknown>, deps: GuestHandlerDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateGetEventAssistanceGuestViewCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "getEventAssistanceGuestView", {maxRequests: 600, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "getEventAssistanceGuestView",
    {maxRequests: 60, windowMs: 60 * 1000});
  const output = await new GuestAssistanceStore(db, deps.now)
    .getView(input.linkId, input.secret);
  if (!validateEventAssistanceGuestViewCallableResponse(output)) {
    throw new HttpsError("internal", "Event update could not be loaded.");
  }
  return output;
}

export async function submitEventAssistanceGuestChoiceHandler(
  request: CallableRequest<unknown>, deps: GuestHandlerDeps = defaultDeps
) {
  const input = validateCallableWithAjv(request,
    validateSubmitEventAssistanceGuestChoiceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, networkIdentity(request),
    "submitEventAssistanceGuestChoice", {maxRequests: 120, windowMs: 60_000});
  await deps.checkRateLimit(db, credentialIdentity(input),
    "submitEventAssistanceGuestChoice",
    {maxRequests: 20, windowMs: 60 * 1000});
  const output = await new GuestAssistanceStore(db, deps.now).submit(input);
  if (!validateSubmitEventAssistanceGuestChoiceCallableResponse(output)) {
    throw new HttpsError("internal", "Your reply could not be confirmed.");
  }
  return output;
}

function networkIdentity(request: CallableRequest<unknown>): string {
  return "assistance_ip_" + operationContentHash(
    request.rawRequest.ip ??
      request.rawRequest.socket?.remoteAddress ?? "unknown"
  );
}

function credentialIdentity(input: {linkId: string; secret: string}): string {
  // An invalid secret cannot consume the legitimate guest's credential quota.
  return "assistance_grant_" + operationContentHash([
    input.linkId, input.secret,
  ]);
}

export const getEventAssistanceGuestView = onCall(
  appCheckCallableOptions,
  (request) => getEventAssistanceGuestViewHandler(request)
);
export const submitEventAssistanceGuestChoice = onCall(
  appCheckCallableOptions,
  (request) => submitEventAssistanceGuestChoiceHandler(request)
);
