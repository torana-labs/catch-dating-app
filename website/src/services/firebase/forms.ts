import type {BeginOrganizerFormResponseCallablePayload} from "../../../../functions/src/shared/generated/beginOrganizerFormResponseCallablePayload";
import type {BeginOrganizerFormResponseCallableResponse} from "../../../../functions/src/shared/generated/beginOrganizerFormResponseCallableResponse";
import type {CreateOrganizerFormAssetIntentCallablePayload} from "../../../../functions/src/shared/generated/createOrganizerFormAssetIntentCallablePayload";
import type {CreateOrganizerFormAssetIntentCallableResponse} from "../../../../functions/src/shared/generated/createOrganizerFormAssetIntentCallableResponse";
import type {FinalizeOrganizerFormAssetCallablePayload} from "../../../../functions/src/shared/generated/finalizeOrganizerFormAssetCallablePayload";
import type {FinalizeOrganizerFormAssetCallableResponse} from "../../../../functions/src/shared/generated/finalizeOrganizerFormAssetCallableResponse";
import type {FindOrganizerFormPaymentCallablePayload} from "../../../../functions/src/shared/generated/findOrganizerFormPaymentCallablePayload";
import type {FindOrganizerFormPaymentCallableResponse} from "../../../../functions/src/shared/generated/findOrganizerFormPaymentCallableResponse";
import type {GetOrganizerFormPaymentCallablePayload} from "../../../../functions/src/shared/generated/getOrganizerFormPaymentCallablePayload";
import type {GetOrganizerFormPaymentCallableResponse} from "../../../../functions/src/shared/generated/getOrganizerFormPaymentCallableResponse";
import type {GetPublicOrganizerFormCallablePayload} from "../../../../functions/src/shared/generated/getPublicOrganizerFormCallablePayload";
import type {GetPublicOrganizerFormCallableResponse} from "../../../../functions/src/shared/generated/getPublicOrganizerFormCallableResponse";
import type {ListParticipantActivityCallablePayload} from "../../../../functions/src/shared/generated/listParticipantActivityCallablePayload";
import type {ListParticipantActivityCallableResponse} from "../../../../functions/src/shared/generated/listParticipantActivityCallableResponse";
import type {PrepareOrganizerFormPaymentCallablePayload} from "../../../../functions/src/shared/generated/prepareOrganizerFormPaymentCallablePayload";
import type {PromoteFormCommunicationIntentCallablePayload} from "../../../../functions/src/shared/generated/promoteFormCommunicationIntentCallablePayload";
import type {PromoteFormCommunicationIntentCallableResponse} from "../../../../functions/src/shared/generated/promoteFormCommunicationIntentCallableResponse";
import type {SaveOrganizerFormResponseDraftCallablePayload} from "../../../../functions/src/shared/generated/saveOrganizerFormResponseDraftCallablePayload";
import type {SaveOrganizerFormResponseDraftCallableResponse} from "../../../../functions/src/shared/generated/saveOrganizerFormResponseDraftCallableResponse";
import type {SubmitOrganizerFormResponseCallablePayload} from "../../../../functions/src/shared/generated/submitOrganizerFormResponseCallablePayload";
import type {SubmitOrganizerFormResponseCallableResponse} from "../../../../functions/src/shared/generated/submitOrganizerFormResponseCallableResponse";
import type {WithdrawOrganizerFormResponseCallablePayload} from "../../../../functions/src/shared/generated/withdrawOrganizerFormResponseCallablePayload";
import type {WithdrawOrganizerFormResponseCallableResponse} from "../../../../functions/src/shared/generated/withdrawOrganizerFormResponseCallableResponse";
import {publicFormsFirebaseConfigured} from "../../firebaseConfig";
import type {User} from "firebase/auth";
import {getFirebaseRuntime, invokeWebsiteCallable} from "./runtime";

/**
 * Public organiser forms: reading a form, drafts, assets, submission, payment and withdrawal.
 */
export type PublicOrganizerForm = GetPublicOrganizerFormCallableResponse;
export type ParticipantFormActivityPage = ListParticipantActivityCallableResponse;
export type PublicOrganizerFormDraft =
  BeginOrganizerFormResponseCallableResponse;
export type PublicOrganizerFormReceipt =
  SubmitOrganizerFormResponseCallableResponse;
export type PublicOrganizerFormAssetIntent =
  CreateOrganizerFormAssetIntentCallableResponse;

export async function getPublicOrganizerForm(
  payload: GetPublicOrganizerFormCallablePayload
): Promise<GetPublicOrganizerFormCallableResponse> {
  // The public runtime: reading a form loads neither Auth nor Firestore.
  return invokeWebsiteCallable<GetPublicOrganizerFormCallablePayload, GetPublicOrganizerFormCallableResponse>(
    "getPublicOrganizerForm", payload, publicFormsFirebaseConfigured, "Public forms", "public");
}

export async function listParticipantFormActivity(
  payload: ListParticipantActivityCallablePayload
): Promise<ParticipantFormActivityPage> {
  return invokeWebsiteCallable(
    "listParticipantActivity", payload, publicFormsFirebaseConfigured, "Public forms"
  );
}

export async function beginOrganizerFormResponse(
  payload: BeginOrganizerFormResponseCallablePayload
): Promise<BeginOrganizerFormResponseCallableResponse> {
  return invokeWebsiteCallable(
    "beginOrganizerFormResponse",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function saveOrganizerFormResponseDraft(
  payload: SaveOrganizerFormResponseDraftCallablePayload
): Promise<SaveOrganizerFormResponseDraftCallableResponse> {
  return invokeWebsiteCallable(
    "saveOrganizerFormResponseDraft",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function createOrganizerFormAssetIntent(
  payload: CreateOrganizerFormAssetIntentCallablePayload
): Promise<CreateOrganizerFormAssetIntentCallableResponse> {
  return invokeWebsiteCallable(
    "createOrganizerFormAssetIntent",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function uploadOrganizerFormAsset(
  intent: CreateOrganizerFormAssetIntentCallableResponse,
  file: Blob
): Promise<void> {
  const body = new FormData();
  for (const [key, value] of Object.entries(intent.uploadFields)) {
    body.append(key, value);
  }
  body.append("file", file);
  const response = await fetch(intent.uploadUrl, {method: "POST", body});
  if (!response.ok) {
    throw new Error("The secure file upload failed. Please try again.");
  }
}

export async function finalizeOrganizerFormAsset(
  payload: FinalizeOrganizerFormAssetCallablePayload
): Promise<FinalizeOrganizerFormAssetCallableResponse> {
  return invokeWebsiteCallable(
    "finalizeOrganizerFormAsset",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function submitOrganizerFormResponse(
  payload: SubmitOrganizerFormResponseCallablePayload
): Promise<SubmitOrganizerFormResponseCallableResponse> {
  return invokeWebsiteCallable(
    "submitOrganizerFormResponse",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function promoteFormCommunicationIntent(
  payload: PromoteFormCommunicationIntentCallablePayload
): Promise<PromoteFormCommunicationIntentCallableResponse> {
  return invokeWebsiteCallable(
    "promoteFormCommunicationIntent",
    payload,
    publicFormsFirebaseConfigured,
    "Public form messaging preferences"
  );
}

export type PublicOrganizerFormPayment = GetOrganizerFormPaymentCallableResponse;
export type PublicOrganizerFormPaymentRequest = PrepareOrganizerFormPaymentCallablePayload;

export async function findOrganizerFormPayment(
  payload: FindOrganizerFormPaymentCallablePayload
): Promise<FindOrganizerFormPaymentCallableResponse> {
  return invokeWebsiteCallable("findOrganizerFormPayment", payload,
    publicFormsFirebaseConfigured, "Public form payment recovery");
}

export async function prepareOrganizerFormPayment(
  payload: PrepareOrganizerFormPaymentCallablePayload
): Promise<PublicOrganizerFormPayment> {
  return invokeWebsiteCallable("prepareOrganizerFormPayment", payload,
    publicFormsFirebaseConfigured, "Public form payment");
}

export async function getOrganizerFormPayment(
  payload: GetOrganizerFormPaymentCallablePayload
): Promise<PublicOrganizerFormPayment> {
  return invokeWebsiteCallable("getOrganizerFormPayment", payload,
    publicFormsFirebaseConfigured, "Public form payment");
}

export async function withdrawOrganizerFormResponse(
  payload: WithdrawOrganizerFormResponseCallablePayload
): Promise<WithdrawOrganizerFormResponseCallableResponse> {
  return invokeWebsiteCallable(
    "withdrawOrganizerFormResponse",
    payload,
    publicFormsFirebaseConfigured,
    "Public forms"
  );
}

export async function sendPublicFormEmailSignInLink(
  email: string,
  returnUrl: string
): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicFormsFirebaseConfigured) {
    throw new Error("Public forms are not configured for this build.");
  }
  const {sendSignInLinkToEmail} = await import("firebase/auth");
  await sendSignInLinkToEmail(runtime.auth, email, {
    url: returnUrl,
    handleCodeInApp: true,
  });
}

export async function completePublicFormEmailSignIn(
  email: string,
  emailLink: string
): Promise<User> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicFormsFirebaseConfigured) {
    throw new Error("Public forms are not configured for this build.");
  }
  const {signInOrLinkEmailLink} = await import("../../firebaseClaimAccountLinking");
  return signInOrLinkEmailLink(runtime.auth, email, emailLink);
}
