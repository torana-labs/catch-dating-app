import type {ConfirmOrganizerClaimVerificationCallablePayload} from "../../../../functions/src/shared/generated/confirmOrganizerClaimVerificationCallablePayload";
import type {ConfirmOrganizerClaimVerificationCallableResponse} from "../../../../functions/src/shared/generated/confirmOrganizerClaimVerificationCallableResponse";
import type {GetOrganizerClaimVerificationOptionsCallablePayload} from "../../../../functions/src/shared/generated/getOrganizerClaimVerificationOptionsCallablePayload";
import type {OrganizerClaimVerificationOptionsCallableResponse} from "../../../../functions/src/shared/generated/organizerClaimVerificationOptionsCallableResponse";
import type {RequestOrganizerClaimCallablePayload} from "../../../../functions/src/shared/generated/requestOrganizerClaimCallablePayload";
import type {RequestOrganizerClaimCallableResponse} from "../../../../functions/src/shared/generated/requestOrganizerClaimCallableResponse";
import type {StartOrganizerClaimVerificationCallablePayload} from "../../../../functions/src/shared/generated/startOrganizerClaimVerificationCallablePayload";
import type {StartOrganizerClaimVerificationCallableResponse} from "../../../../functions/src/shared/generated/startOrganizerClaimVerificationCallableResponse";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, invokeWebsiteCallable} from "./runtime";

/**
 * Organiser claim requests and their verification.
 */
export type RequestOrganizerClaimPayload = RequestOrganizerClaimCallablePayload;
export type OrganizerClaimRole = RequestOrganizerClaimPayload["requesterRole"];
export type RequestOrganizerClaimResponse = RequestOrganizerClaimCallableResponse;

export async function requestOrganizerClaim(
  payload: RequestOrganizerClaimPayload
): Promise<RequestOrganizerClaimResponse> {
  return invokeWebsiteCallable<RequestOrganizerClaimPayload, RequestOrganizerClaimResponse>(
    "requestOrganizerClaim", payload, claimFirebaseConfigured, "Claim requests");
}

export type OrganizerClaimVerificationOptions = OrganizerClaimVerificationOptionsCallableResponse;
export type OrganizerClaimVerificationStart = StartOrganizerClaimVerificationCallableResponse;
export type OrganizerClaimVerificationConfirm = ConfirmOrganizerClaimVerificationCallableResponse;
export type OrganizerClaimVerificationMethod = StartOrganizerClaimVerificationCallablePayload["method"];

/** What the claim page needs from a verification attempt it is waiting on. */
export interface OrganizerClaimAttemptState {
  status: "awaitingProof" | "verified" | "expired" | "superseded";
  expiresAtMillis: number | null;
  rejection: "wrongSender" | "codeNotFound" | null;
}

export async function getOrganizerClaimVerificationOptions(
  payload: GetOrganizerClaimVerificationOptionsCallablePayload
): Promise<OrganizerClaimVerificationOptions> {
  return invokeWebsiteCallable("getOrganizerClaimVerificationOptions", payload,
    claimFirebaseConfigured, "Claim checks");
}

export async function startOrganizerClaimVerification(
  payload: StartOrganizerClaimVerificationCallablePayload
): Promise<OrganizerClaimVerificationStart> {
  return invokeWebsiteCallable("startOrganizerClaimVerification", payload,
    claimFirebaseConfigured, "Claim checks");
}

export async function confirmOrganizerClaimVerification(
  payload: ConfirmOrganizerClaimVerificationCallablePayload
): Promise<OrganizerClaimVerificationConfirm> {
  return invokeWebsiteCallable("confirmOrganizerClaimVerification", payload,
    claimFirebaseConfigured, "Claim checks");
}

/** Follows the requester's own attempt, which the Instagram webhook completes. */
export async function watchOrganizerClaimAttempt(
  attemptId: string,
  onValue: (state: OrganizerClaimAttemptState | null) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !claimFirebaseConfigured) {
    throw new Error("Claim checks are not configured for this build.");
  }
  const {doc, onSnapshot} = await import("firebase/firestore");
  return onSnapshot(doc(runtime.firestore, "organizerClaimVerifications", attemptId), (snapshot) => {
    const data = snapshot.data();
    if (!data) {
      onValue(null);
      return;
    }
    const expiresAt = data.expiresAt as {toMillis?: () => number} | undefined;
    const rejection = (data.lastRejection as {reason?: unknown} | null | undefined)?.reason;
    onValue({
      status: data.status as OrganizerClaimAttemptState["status"],
      expiresAtMillis: typeof expiresAt?.toMillis === "function" ? expiresAt.toMillis() : null,
      rejection: rejection === "wrongSender" || rejection === "codeNotFound" ? rejection : null,
    });
  }, (error) => onError(error));
}
