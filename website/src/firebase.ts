import type {ManageWebsiteAccountCallablePayload} from "../../functions/src/shared/generated/manageWebsiteAccountCallablePayload";
import type {ManageWebsiteAccountCallableResponse} from "../../functions/src/shared/generated/manageWebsiteAccountCallableResponse";
import type {ManageEventApprovalNotificationsCallablePayload} from "../../functions/src/shared/generated/manageEventApprovalNotificationsCallablePayload";
import type {ManageEventApprovalNotificationsCallableResponse} from "../../functions/src/shared/generated/manageEventApprovalNotificationsCallableResponse";
import type {GetEventViewerStateCallableResponse} from "../../functions/src/shared/generated/getEventViewerStateCallableResponse";
export {beginClaimPhoneLink, signInOrLinkClaimGoogle} from "./firebaseClaimAccountLinking";
import type {ReadPublicOrganizerTrackingSettingsCallablePayload} from "../../functions/src/shared/generated/readPublicOrganizerTrackingSettingsCallablePayload";
import type {PublicOrganizerTrackingSettingsCallableResponse} from "../../functions/src/shared/generated/publicOrganizerTrackingSettingsCallableResponse";
import type {ManagePublicEventCheckoutCallablePayload} from "../../functions/src/shared/generated/managePublicEventCheckoutCallablePayload";
import type {ManagePublicEventCheckoutCallableResponse} from "../../functions/src/shared/generated/managePublicEventCheckoutCallableResponse";
import type {ManageEventOfferCheckoutCallablePayload} from "../../functions/src/shared/generated/manageEventOfferCheckoutCallablePayload";
import type {ManageEventOfferCheckoutCallableResponse} from "../../functions/src/shared/generated/manageEventOfferCheckoutCallableResponse";
import type {ListEventSmsPreferencesCallablePayload} from "../../functions/src/shared/generated/listEventSmsPreferencesInput";
import type {ListEventSmsPreferencesCallableResponse} from "../../functions/src/shared/generated/listEventSmsPreferencesOutput";
import type {GetEventWhatsappPreferenceCallablePayload} from "../../functions/src/shared/generated/getEventWhatsappPreferenceCallablePayload";
import type {SetEventWhatsappPreferenceCallablePayload} from "../../functions/src/shared/generated/setEventWhatsappPreferenceCallablePayload";
import type {EventWhatsappPreferenceCallableResponse} from "../../functions/src/shared/generated/eventWhatsappPreferenceCallableResponse";
import type {ListEventWhatsappPreferencesCallablePayload} from "../../functions/src/shared/generated/listEventWhatsappPreferencesInput";
import type {ListEventWhatsappPreferencesCallableResponse} from "../../functions/src/shared/generated/listEventWhatsappPreferencesOutput";
import type {GetEventRcsPreferenceCallablePayload} from "../../functions/src/shared/generated/getEventRcsPreferenceInput";
import type {SetEventRcsPreferenceCallablePayload} from "../../functions/src/shared/generated/setEventRcsPreferenceInput";
import type {EventRcsPreferenceCallableResponse} from "../../functions/src/shared/generated/eventRcsPreferenceOutput";
import type {ListEventRcsPreferencesCallablePayload} from "../../functions/src/shared/generated/listEventRcsPreferencesInput";
import type {ListEventRcsPreferencesCallableResponse} from "../../functions/src/shared/generated/listEventRcsPreferencesOutput";
import type {GetEventRcsWithdrawalCallablePayload} from "../../functions/src/shared/generated/getEventRcsWithdrawalInput";
import type {WithdrawEventRcsCallablePayload} from "../../functions/src/shared/generated/withdrawEventRcsInput";
import type {EventRcsWithdrawalCallableResponse} from "../../functions/src/shared/generated/eventRcsWithdrawalOutput";
import type {GetEventWhatsappWithdrawalCallablePayload} from "../../functions/src/shared/generated/getEventWhatsappWithdrawalCallablePayload";
import type {WithdrawEventWhatsappCallablePayload} from "../../functions/src/shared/generated/withdrawEventWhatsappCallablePayload";
import type {EventWhatsappWithdrawalCallableResponse} from "../../functions/src/shared/generated/eventWhatsappWithdrawalCallableResponse";
import type {GetEventAssistanceSmsWithdrawalCallablePayload} from "../../functions/src/shared/generated/getEventAssistanceSmsWithdrawalCallablePayload";
import type {WithdrawEventAssistanceSmsCallablePayload} from "../../functions/src/shared/generated/withdrawEventAssistanceSmsCallablePayload";
import type {EventAssistanceSmsWithdrawalCallableResponse} from "../../functions/src/shared/generated/eventAssistanceSmsWithdrawalCallableResponse";
import type {GetEventAssistanceSmsPreferenceCallablePayload} from "../../functions/src/shared/generated/getEventAssistanceSmsPreferenceCallablePayload";
import type {SetEventAssistanceSmsPreferenceCallablePayload} from "../../functions/src/shared/generated/setEventAssistanceSmsPreferenceCallablePayload";
import type {EventAssistanceSmsPreferenceCallableResponse} from "../../functions/src/shared/generated/eventAssistanceSmsPreferenceCallableResponse";
import type {EventAssistanceGuestViewCallableResponse} from "../../functions/src/shared/generated/eventAssistanceGuestViewCallableResponse";
import type {GetEventAssistanceGuestViewCallablePayload} from "../../functions/src/shared/generated/getEventAssistanceGuestViewCallablePayload";
import type {SubmitEventAssistanceGuestChoiceCallablePayload} from "../../functions/src/shared/generated/submitEventAssistanceGuestChoiceCallablePayload";
import type {SubmitEventAssistanceGuestChoiceCallableResponse} from "../../functions/src/shared/generated/submitEventAssistanceGuestChoiceCallableResponse";
import type {FirebaseApp} from "firebase/app";
import type {Auth, User} from "firebase/auth";
import type {Functions} from "firebase/functions";
import type {Firestore} from "firebase/firestore";
import type {CheckInEventRuntimeCallablePayload} from "../../functions/src/shared/generated/checkInEventRuntimeCallablePayload";
import type {CheckInEventRuntimeCallableResponse} from "../../functions/src/shared/generated/checkInEventRuntimeCallableResponse";
import type {ClaimEventRuntimeAccessCallablePayload} from "../../functions/src/shared/generated/claimEventRuntimeAccessCallablePayload";
import type {ClaimEventRuntimeAccessCallableResponse} from "../../functions/src/shared/generated/claimEventRuntimeAccessCallableResponse";
import type {CompleteEventSuccessFirstHelloMissionCallablePayload} from "../../functions/src/shared/generated/completeEventSuccessFirstHelloMissionCallablePayload";
import type {ListParticipantActivityCallablePayload} from "../../functions/src/shared/generated/listParticipantActivityCallablePayload";
import type {ListParticipantActivityCallableResponse} from "../../functions/src/shared/generated/listParticipantActivityCallableResponse";
import type {BeginOrganizerFormResponseCallablePayload} from "../../functions/src/shared/generated/beginOrganizerFormResponseCallablePayload";
import type {BeginOrganizerFormResponseCallableResponse} from "../../functions/src/shared/generated/beginOrganizerFormResponseCallableResponse";
import type {CreateOrganizerFormAssetIntentCallablePayload} from "../../functions/src/shared/generated/createOrganizerFormAssetIntentCallablePayload";
import type {CreateOrganizerFormAssetIntentCallableResponse} from "../../functions/src/shared/generated/createOrganizerFormAssetIntentCallableResponse";
import type {CreateEventInviteLinkCallablePayload} from "../../functions/src/shared/generated/createEventInviteLinkCallablePayload";
import type {CreatePublicOrganizerReviewCallablePayload} from "../../functions/src/shared/generated/createPublicOrganizerReviewCallablePayload";
import type {CreatePublicOrganizerReviewCallableResponse} from "../../functions/src/shared/generated/createPublicOrganizerReviewCallableResponse";
import type {EventSuccessAssignmentDocument} from "../../functions/src/shared/generated/eventSuccessAssignmentDocument";
import type {EventSuccessLateArrivalDocument} from "../../functions/src/shared/generated/eventSuccessLateArrivalDocument";
import type {EventSuccessStandingsDocument} from "../../functions/src/shared/generated/eventSuccessStandingsDocument";
import type {EventRehearsalGuestBootstrapCallableResponse} from "../../functions/src/shared/generated/eventRehearsalGuestBootstrapCallableResponse";
import type {GetEventRehearsalGuestBootstrapCallablePayload} from "../../functions/src/shared/generated/getEventRehearsalGuestBootstrapCallablePayload";
import type {SubmitEventRehearsalGuestActionCallablePayload} from "../../functions/src/shared/generated/submitEventRehearsalGuestActionCallablePayload";
export {
  deriveEventSuccessMomentSeed,
  eventSuccessMomentPresentationCatalog,
  eventSuccessMomentPresentationFor,
  eventSuccessSocialMissionPromptFor,
  resolveEventSuccessCeremonyTimeline,
} from "../../functions/src/shared/generated/eventSuccessMomentPresentations";
export type {
  EventSuccessCeremonyTimeline,
  EventSuccessMomentPresentationContract,
  EventSuccessDisclosureLevel,
  EventSuccessInteractionModel,
  EventSuccessSocialMissionPromptContract,
} from "../../functions/src/shared/generated/eventSuccessMomentPresentations";
import type {EventIdCallablePayload} from "../../functions/src/shared/generated/eventIdCallablePayload";
import type {FetchEventSuccessWingmanCandidatesCallableResponse} from "../../functions/src/shared/generated/fetchEventSuccessWingmanCandidatesCallableResponse";
import type {GetEventRuntimeBootstrapCallablePayload} from "../../functions/src/shared/generated/getEventRuntimeBootstrapCallablePayload";
import type {GetEventRuntimeBootstrapCallableResponse} from "../../functions/src/shared/generated/getEventRuntimeBootstrapCallableResponse";
import type {GetPublicOrganizerFormCallablePayload} from "../../functions/src/shared/generated/getPublicOrganizerFormCallablePayload";
import type {GetPublicOrganizerFormCallableResponse} from "../../functions/src/shared/generated/getPublicOrganizerFormCallableResponse";
import type {FinalizeOrganizerFormAssetCallablePayload} from "../../functions/src/shared/generated/finalizeOrganizerFormAssetCallablePayload";
import type {FinalizeOrganizerFormAssetCallableResponse} from "../../functions/src/shared/generated/finalizeOrganizerFormAssetCallableResponse";
import type {GetEventSuccessConversationGraphCallableResponse} from "../../functions/src/shared/generated/getEventSuccessConversationGraphCallableResponse";
import type {HeartbeatEventSuccessPresenceCallableResponse} from "../../functions/src/shared/generated/heartbeatEventSuccessPresenceCallableResponse";
import type {ListPublicOrganizerReviewsCallablePayload} from "../../functions/src/shared/generated/listPublicOrganizerReviewsCallablePayload";
import type {ListPublicOrganizerReviewsCallableResponse} from "../../functions/src/shared/generated/listPublicOrganizerReviewsCallableResponse";
import type {RecordOrganizerAnalyticsEventCallablePayload} from "../../functions/src/shared/generated/recordOrganizerAnalyticsEventCallablePayload";
import type {RecordOrganizerAnalyticsEventCallableResponse} from "../../functions/src/shared/generated/recordOrganizerAnalyticsEventCallableResponse";
import type {RecordEventInviteLinkOpenCallablePayload} from "../../functions/src/shared/generated/recordEventInviteLinkOpenCallablePayload";
import type {RecordEventShareIntentCallablePayload} from "../../functions/src/shared/generated/recordEventShareIntentCallablePayload";
import type {RegisterPublicEventCallablePayload} from "../../functions/src/shared/generated/registerPublicEventCallablePayload";
import type {RegisterPublicEventCallableResponse} from "../../functions/src/shared/generated/registerPublicEventCallableResponse";
import type {ResolveEventInviteLandingCallablePayload} from "../../functions/src/shared/generated/resolveEventInviteLandingCallablePayload";
import type {ResolveEventInviteLandingCallableResponse} from "../../functions/src/shared/generated/resolveEventInviteLandingCallableResponse";
import type {SaveOrganizerFormResponseDraftCallablePayload} from "../../functions/src/shared/generated/saveOrganizerFormResponseDraftCallablePayload";
import type {SaveOrganizerFormResponseDraftCallableResponse} from "../../functions/src/shared/generated/saveOrganizerFormResponseDraftCallableResponse";
import type {RequestOrganizerClaimCallablePayload} from "../../functions/src/shared/generated/requestOrganizerClaimCallablePayload";
import type {RequestOrganizerClaimCallableResponse} from "../../functions/src/shared/generated/requestOrganizerClaimCallableResponse";
import type {StartEventSuccessFirstHelloMissionCallablePayload} from "../../functions/src/shared/generated/startEventSuccessFirstHelloMissionCallablePayload";
import type {SubmitEventRuntimeProfileCallablePayload} from "../../functions/src/shared/generated/submitEventRuntimeProfileCallablePayload";
import type {SubmitEventRuntimeProfileCallableResponse} from "../../functions/src/shared/generated/submitEventRuntimeProfileCallableResponse";
import type {SubmitEventSuccessConversationGraphCallablePayload} from "../../functions/src/shared/generated/submitEventSuccessConversationGraphCallablePayload";
import type {SubmitEventSuccessConversationGraphCallableResponse} from "../../functions/src/shared/generated/submitEventSuccessConversationGraphCallableResponse";
import type {SubmitEventSuccessWingmanRequestCallablePayload} from "../../functions/src/shared/generated/submitEventSuccessWingmanRequestCallablePayload";
import type {SubmitOrganizerFormResponseCallablePayload} from "../../functions/src/shared/generated/submitOrganizerFormResponseCallablePayload";
import type {SubmitOrganizerFormResponseCallableResponse} from "../../functions/src/shared/generated/submitOrganizerFormResponseCallableResponse";
import type {PromoteFormCommunicationIntentCallablePayload} from "../../functions/src/shared/generated/promoteFormCommunicationIntentCallablePayload";
import type {PromoteFormCommunicationIntentCallableResponse} from "../../functions/src/shared/generated/promoteFormCommunicationIntentCallableResponse";
import type {PrepareOrganizerFormPaymentCallablePayload} from "../../functions/src/shared/generated/prepareOrganizerFormPaymentCallablePayload";
import type {GetProgramHouseholdRsvpViewCallablePayload} from "../../functions/src/shared/generated/getProgramHouseholdRsvpViewCallablePayload";
import type {ProgramHouseholdRsvpViewCallableResponse} from "../../functions/src/shared/generated/programHouseholdRsvpViewCallableResponse";
import type {SubmitProgramHouseholdRsvpCallablePayload} from "../../functions/src/shared/generated/submitProgramHouseholdRsvpCallablePayload";
import type {SubmitProgramHouseholdRsvpCallableResponse} from "../../functions/src/shared/generated/submitProgramHouseholdRsvpCallableResponse";
import type {GetOrganizerFormPaymentCallablePayload} from "../../functions/src/shared/generated/getOrganizerFormPaymentCallablePayload";
import type {FindOrganizerFormPaymentCallablePayload} from "../../functions/src/shared/generated/findOrganizerFormPaymentCallablePayload";
import type {FindOrganizerFormPaymentCallableResponse} from "../../functions/src/shared/generated/findOrganizerFormPaymentCallableResponse";
import type {GetOrganizerFormPaymentCallableResponse} from "../../functions/src/shared/generated/getOrganizerFormPaymentCallableResponse";
import type {WithdrawOrganizerFormResponseCallablePayload} from "../../functions/src/shared/generated/withdrawOrganizerFormResponseCallablePayload";
import type {WithdrawOrganizerFormResponseCallableResponse} from "../../functions/src/shared/generated/withdrawOrganizerFormResponseCallableResponse";
import {
  appCheckSiteKey,
  claimFirebaseConfigured,
  eventRuntimeFirebaseConfigured,
  firebaseConfig as config,
  publicAnalyticsFirebaseConfigured,
  publicEventRegistrationFirebaseConfigured,
  publicFormsFirebaseConfigured,
  publicReviewsFirebaseConfigured,
} from "./firebaseConfig";

export type RequestOrganizerClaimPayload = RequestOrganizerClaimCallablePayload;
export type OrganizerClaimRole = RequestOrganizerClaimPayload["requesterRole"];
export type RequestOrganizerClaimResponse = RequestOrganizerClaimCallableResponse;
export type PublicOrganizerReview =
  CreatePublicOrganizerReviewCallableResponse["review"];

export type CreatePublicOrganizerReviewPayload =
  CreatePublicOrganizerReviewCallablePayload;
export type CreatePublicOrganizerReviewResponse =
  CreatePublicOrganizerReviewCallableResponse;

export type ListPublicOrganizerReviewsPayload =
  ListPublicOrganizerReviewsCallablePayload;
export type ListPublicOrganizerReviewsResponse =
  ListPublicOrganizerReviewsCallableResponse;

export type RecordOrganizerAnalyticsEventPayload =
  RecordOrganizerAnalyticsEventCallablePayload;
export type RecordOrganizerAnalyticsEventResponse =
  RecordOrganizerAnalyticsEventCallableResponse;
export type RegisterPublicEventPayload = RegisterPublicEventCallablePayload;
export type RegisterPublicEventResponse = RegisterPublicEventCallableResponse;
export type EventRuntimeBootstrap = GetEventRuntimeBootstrapCallableResponse;
export type EventRehearsalGuestBootstrap =
  EventRehearsalGuestBootstrapCallableResponse;
// Single-step controls. Assistance replies and required-data submissions need
// their own structured payloads and cannot use the generic action button.
export type EventRehearsalGuestAction = Exclude<
  SubmitEventRehearsalGuestActionCallablePayload["action"],
  "respondToAssistance" | "submitRequiredData"
>;
export type EventSuccessConversationGraph =
  GetEventSuccessConversationGraphCallableResponse;
export type EventInviteLanding = ResolveEventInviteLandingCallableResponse;
export type PublicOrganizerForm = GetPublicOrganizerFormCallableResponse;
export type ParticipantFormActivityPage = ListParticipantActivityCallableResponse;
export type PublicOrganizerFormDraft =
  BeginOrganizerFormResponseCallableResponse;
export type PublicOrganizerFormReceipt =
  SubmitOrganizerFormResponseCallableResponse;
export type PublicOrganizerFormAssetIntent =
  CreateOrganizerFormAssetIntentCallableResponse;

export interface PublicEventPhoneVerification {
  clear: () => void;
  confirm: (code: string) => Promise<User>;
}

export interface EventRuntimeAttendeeInviteLink {
  inviteLinkId: string;
  inviteToken: string;
  eventId: string;
  label: string;
  source: string | null;
}

let runtimePromise: Promise<FirebaseRuntime | null> | null = null;
let publicRuntimePromise: Promise<PublicFirebaseRuntime | null> | null = null;

interface PublicFirebaseRuntime {
  app: FirebaseApp;
  functions: Functions;
}

interface FirebaseRuntime {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

export type {User};

export function watchClaimAuthState(
  callback: (user: User | null) => void
): () => void {
  if (!claimFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;
  void getFirebaseRuntime()
    .then(async (runtime) => {
      if (!runtime) {
        callback(null);
        return;
      }
      const {onAuthStateChanged} = await import("firebase/auth");
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(runtime.auth, callback);
    })
    .catch(() => {
      callback(null);
    });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

/** Sales contact verification can refresh credentials without changing UID. */
export function watchSalesDemoAuthState(callback: (user: User | null) => void): () => void {
  if (!claimFirebaseConfigured) {callback(null); return () => undefined;}
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;
  void getFirebaseRuntime().then(async (runtime) => {
    if (cancelled) return;
    if (!runtime) {callback(null); return;}
    const {onIdTokenChanged} = await import("firebase/auth");
    if (cancelled) return;
    unsubscribe = onIdTokenChanged(runtime.auth, callback);
  }).catch(() => {if (!cancelled) callback(null);});
  return () => {cancelled = true; unsubscribe();};
}

export const watchEventRuntimeAuthState = watchClaimAuthState;
export const watchPublicFormAuthState = watchClaimAuthState;

export async function getPublicOrganizerForm(
  payload: GetPublicOrganizerFormCallablePayload
): Promise<GetPublicOrganizerFormCallableResponse> {
  const runtime = await getPublicFirebaseRuntime();
  if (!runtime || !publicFormsFirebaseConfigured) {
    throw new Error("Public forms are not configured for this build.");
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<GetPublicOrganizerFormCallablePayload,
    GetPublicOrganizerFormCallableResponse>(
    runtime.functions, "getPublicOrganizerForm"
  );
  return (await callable(payload)).data;
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

export type EventOfferCheckoutResponse = ManageEventOfferCheckoutCallableResponse;

export async function manageEventOfferCheckout(
  payload: ManageEventOfferCheckoutCallablePayload
): Promise<ManageEventOfferCheckoutCallableResponse> {
  return invokeWebsiteCallable("manageEventOfferCheckout", {...payload, includeEventAccess: true},
    publicFormsFirebaseConfigured, "Event invitation checkout");
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
  const {signInOrLinkEmailLink} = await import("./firebaseClaimAccountLinking");
  return signInOrLinkEmailLink(runtime.auth, email, emailLink);
}

export interface EventRuntimeMission {
  observerUid: string;
  targetUid: string;
  targetDisplayName: string;
  targetContext: string;
  question: string;
  answerOptions: Array<{id: string; label: string}>;
  status: "active" | "completed" | "expired";
  selectedAnswerId?: string | null;
}

export interface EventRuntimeLiveState {
  assignments: EventSuccessAssignmentDocument[];
  compatibilityAnswerIds: string[];
  feedback: EventRuntimeFeedback | null;
  mission: EventRuntimeMission | null;
  lateArrival: EventSuccessLateArrivalDocument | null;
  plan: EventRuntimePlanState | null;
  standings: EventSuccessStandingsDocument | null;
  wingmanTargetUid: string | null;
}

export interface EventRuntimePlanState {
  attendeePrompt: string | null;
  activeStepIndex: number;
  activeRevealRoundIndex: number;
  publishedRevealRoundIndex: number;
  publishedRotationRoundIndex: number;
  revealCountdownSeconds: number | null;
  revealStartedAtMillis: number | null;
  revealStatus: "idle" | "countingDown" | "revealed";
  status: "setup" | "live" | "complete";
}

export interface EventRuntimeFeedback {
  welcomeRating: number;
  structureRating: number;
  metNewPeopleCount: number;
  safetyConcern: boolean;
  privateNote: string | null;
}

export interface EventRuntimeContext {
  eventId: string;
  organizerId: string;
  uid: string;
}

export async function getEventRuntimeBootstrap(
  payload: GetEventRuntimeBootstrapCallablePayload
): Promise<GetEventRuntimeBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "getEventRuntimeBootstrap",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function claimEventRuntimeAccess(
  payload: ClaimEventRuntimeAccessCallablePayload
): Promise<ClaimEventRuntimeAccessCallableResponse> {
  return invokeWebsiteCallable(
    "claimEventRuntimeAccess",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventRuntimeProfile(
  payload: SubmitEventRuntimeProfileCallablePayload
): Promise<SubmitEventRuntimeProfileCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventRuntimeProfile",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function checkInEventRuntime(
  payload: CheckInEventRuntimeCallablePayload
): Promise<CheckInEventRuntimeCallableResponse> {
  return invokeWebsiteCallable(
    "checkInEventRuntime",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function heartbeatEventRuntimePresence(
  eventId: string
): Promise<HeartbeatEventSuccessPresenceCallableResponse> {
  return invokeWebsiteCallable(
    "heartbeatEventSuccessPresence",
    {eventId, surface: "web"},
    eventRuntimeFirebaseConfigured
  );
}

export async function getEventSuccessConversationGraph(
  eventId: string
): Promise<GetEventSuccessConversationGraphCallableResponse> {
  return invokeWebsiteCallable(
    "getEventSuccessConversationGraph",
    {eventId},
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventSuccessConversationGraph(
  payload: SubmitEventSuccessConversationGraphCallablePayload
): Promise<SubmitEventSuccessConversationGraphCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventSuccessConversationGraph",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function createEventRuntimeAttendeeInviteLink(
  eventId: string,
  label: string
): Promise<EventRuntimeAttendeeInviteLink> {
  const payload: CreateEventInviteLinkCallablePayload = {
    eventId,
    label,
    source: "runtime_web",
    linkKind: "attendeeReferrer",
  };
  return invokeWebsiteCallable(
    "createAttendeeInviteLink",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function recordEventRuntimeShareIntent(
  payload: Pick<
    RecordEventShareIntentCallablePayload,
    "eventId" | "inviteLinkId" | "channelHint"
  >
): Promise<{recorded: boolean}> {
  return invokeWebsiteCallable(
    "recordEventShareIntent",
    {...payload, surface: "runtimeWeb"},
    eventRuntimeFirebaseConfigured
  );
}

export async function startEventRuntimeFirstHello(
  payload: StartEventSuccessFirstHelloMissionCallablePayload
): Promise<{missionId: string; attended?: boolean}> {
  return invokeWebsiteCallable(
    "startEventSuccessFirstHelloMission",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function completeEventRuntimeFirstHello(
  payload: CompleteEventSuccessFirstHelloMissionCallablePayload
): Promise<{attended: boolean}> {
  return invokeWebsiteCallable(
    "completeEventSuccessFirstHelloMission",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function fetchEventRuntimeWingmanCandidates(
  payload: EventIdCallablePayload
): Promise<FetchEventSuccessWingmanCandidatesCallableResponse> {
  return invokeWebsiteCallable(
    "fetchEventSuccessWingmanCandidates",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventRuntimeWingmanRequest(
  payload: SubmitEventSuccessWingmanRequestCallablePayload
): Promise<{saved: boolean}> {
  return invokeWebsiteCallable(
    "submitEventSuccessWingmanRequest",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function withdrawEventRuntimeWingmanRequest(
  payload: EventIdCallablePayload
): Promise<{withdrawn: boolean}> {
  return invokeWebsiteCallable(
    "withdrawEventSuccessWingmanRequest",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function watchEventRuntimeLiveState(
  context: EventRuntimeContext,
  onValue: (state: EventRuntimeLiveState) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, onSnapshot} = await import("firebase/firestore");
  const state: EventRuntimeLiveState = {
    assignments: [],
    compatibilityAnswerIds: [],
    feedback: null,
    mission: null,
    lateArrival: null,
    plan: null,
    standings: null,
    wingmanTargetUid: null,
  };
  const assignmentByModule = new Map<string, EventSuccessAssignmentDocument>();
  const emit = () => onValue({
    ...state,
    assignments: [...assignmentByModule.values()],
    compatibilityAnswerIds: [...state.compatibilityAnswerIds],
  });
  const subscriptions = ["micro_pods", "guided_rotations"].map((moduleId) =>
    onSnapshot(
      doc(
        runtime.firestore,
        "eventSuccessAssignments",
        `${context.eventId}_${moduleId}_${context.uid}`
      ),
      (snapshot) => {
        if (snapshot.exists()) {
          assignmentByModule.set(
            moduleId,
            snapshot.data() as EventSuccessAssignmentDocument
          );
        } else {
          assignmentByModule.delete(moduleId);
        }
        emit();
      },
      (error) => onError(error)
    ));
  subscriptions.push(onSnapshot(
    doc(runtime.firestore, "eventSuccessPlans", context.eventId),
    (snapshot) => {
      const data = snapshot.data();
      const structureConfig = isRecord(data?.structureConfig) ?
        data.structureConfig : null;
      state.plan = data ? {
        attendeePrompt: typeof data.attendeePrompt === "string" ?
          data.attendeePrompt : null,
        activeStepIndex: Number.isInteger(data.activeStepIndex) ?
          Number(data.activeStepIndex) : 0,
        activeRevealRoundIndex: Number.isInteger(data.activeRevealRoundIndex) ?
          Number(data.activeRevealRoundIndex) : 0,
        publishedRevealRoundIndex: Number.isInteger(data.publishedRevealRoundIndex) ?
          Number(data.publishedRevealRoundIndex) : -1,
        publishedRotationRoundIndex: Number.isInteger(
          data.publishedRotationRoundIndex
        ) ? Number(data.publishedRotationRoundIndex) : -1,
        revealCountdownSeconds: Number.isInteger(
          structureConfig?.revealCountdownSeconds
        ) ? Number(structureConfig?.revealCountdownSeconds) : null,
        revealStartedAtMillis: eventRuntimeTimestampMillis(
          data.revealStartedAt
        ),
        revealStatus: data.revealStatus === "countingDown" ||
          data.revealStatus === "revealed" ? data.revealStatus : "idle",
        status: data.status === "live" || data.status === "complete" ?
          data.status : "setup",
      } : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessLateArrivals",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      state.lateArrival = snapshot.exists() ?
        snapshot.data() as EventSuccessLateArrivalDocument : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(runtime.firestore, "eventSuccessStandings", context.eventId),
    (snapshot) => {
      state.standings = snapshot.exists() ?
        snapshot.data() as EventSuccessStandingsDocument : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessArrivalMissions",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      state.mission = snapshot.exists() ?
        snapshot.data() as EventRuntimeMission : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessFeedback",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const data = snapshot.data();
      state.feedback = data ? {
        welcomeRating: Number(data.welcomeRating),
        structureRating: Number(data.structureRating),
        metNewPeopleCount: Number(data.metNewPeopleCount),
        safetyConcern: data.safetyConcern === true,
        privateNote: typeof data.privateNote === "string" ? data.privateNote : null,
      } : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessCompatibilityResponses",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const answerIds = snapshot.data()?.answerIds;
      state.compatibilityAnswerIds = Array.isArray(answerIds) ?
        answerIds.filter((value): value is string => typeof value === "string") :
        [];
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessWingmanRequests",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const data = snapshot.data();
      state.wingmanTargetUid = data?.status === "active" &&
        typeof data.targetUid === "string" ? data.targetUid : null;
      emit();
    },
    (error) => onError(error)
  ));
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function eventRuntimeTimestampMillis(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const toMillis = value.toMillis;
  if (typeof toMillis === "function") {
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) ? millis : null;
  }
  const seconds = value.seconds ?? value._seconds;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
  if (typeof seconds !== "number" || typeof nanoseconds !== "number") {
    return null;
  }
  const millis = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
  return Number.isFinite(millis) ? millis : null;
}

export async function saveEventRuntimeCompatibilityAnswers(
  context: EventRuntimeContext,
  answerIds: string[]
): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, getDoc, serverTimestamp, setDoc} = await import(
    "firebase/firestore"
  );
  const ref = doc(
    runtime.firestore,
    "eventSuccessCompatibilityResponses",
    `${context.eventId}_${context.uid}`
  );
  const existing = await getDoc(ref);
  await setDoc(ref, {
    eventId: context.eventId,
    organizerId: context.organizerId,
    uid: context.uid,
    answerIds,
    createdAt: existing.data()?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveEventRuntimeFeedback(
  context: EventRuntimeContext,
  feedback: EventRuntimeFeedback
): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, getDoc, serverTimestamp, setDoc} = await import(
    "firebase/firestore"
  );
  const ref = doc(
    runtime.firestore,
    "eventSuccessFeedback",
    `${context.eventId}_${context.uid}`
  );
  const existing = await getDoc(ref);
  await setDoc(ref, {
    eventId: context.eventId,
    organizerId: context.organizerId,
    uid: context.uid,
    ...feedback,
    createdAt: existing.data()?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function signInForClaim() {
  const runtime = await getFirebaseRuntime();
  if (!runtime) {
    throw new Error("Claim sign-in is not configured for this build.");
  }
  const {signInOrLinkClaimGoogle} = await import("./firebaseClaimAccountLinking");
  await signInOrLinkClaimGoogle(runtime.auth);
}

export async function signOutClaimUser() {
  const runtime = await getFirebaseRuntime();
  if (!runtime) return;
  const {signOut} = await import("firebase/auth");
  await signOut(runtime.auth);
}

export async function requestOrganizerClaim(
  payload: RequestOrganizerClaimPayload
): Promise<RequestOrganizerClaimResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !claimFirebaseConfigured) {
    throw new Error("Claim requests are not configured for this build.");
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<
    RequestOrganizerClaimPayload,
    RequestOrganizerClaimResponse
  >(runtime.functions, "requestOrganizerClaim");
  const result = await callable(payload);
  return result.data;
}

export async function createPublicOrganizerReview(
  payload: CreatePublicOrganizerReviewPayload
): Promise<CreatePublicOrganizerReviewResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicReviewsFirebaseConfigured) {
    throw new Error("Public review writes are not configured for this build.");
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<
    CreatePublicOrganizerReviewPayload,
    CreatePublicOrganizerReviewResponse
  >(runtime.functions, "createPublicOrganizerReview");
  const result = await callable(payload);
  return result.data;
}

export async function listPublicOrganizerReviews(
  payload: ListPublicOrganizerReviewsPayload
): Promise<ListPublicOrganizerReviewsResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicReviewsFirebaseConfigured) {
    return {reviews: []};
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<
    ListPublicOrganizerReviewsPayload,
    ListPublicOrganizerReviewsResponse
  >(runtime.functions, "listPublicOrganizerReviews");
  const result = await callable(payload);
  return result.data;
}

export async function recordOrganizerAnalyticsEvent(
  payload: RecordOrganizerAnalyticsEventPayload
): Promise<RecordOrganizerAnalyticsEventResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicAnalyticsFirebaseConfigured) {
    return {accepted: false};
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<
    RecordOrganizerAnalyticsEventPayload,
    RecordOrganizerAnalyticsEventResponse
  >(runtime.functions, "recordOrganizerAnalyticsEvent");
  const result = await callable(payload);
  return result.data;
}

export async function beginWebsiteAccountPhoneVerification(
  phoneNumber: string, recaptchaContainerId: string
): Promise<PublicEventPhoneVerification> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !claimFirebaseConfigured) {
    throw new Error("Account verification is not configured for this build.");
  }
  const {RecaptchaVerifier} = await import("firebase/auth");
  const {beginClaimPhoneLink} = await import("./firebaseClaimAccountLinking");
  const verifier = new RecaptchaVerifier(runtime.auth, recaptchaContainerId, {size: "invisible"});
  try {
    const challenge = await beginClaimPhoneLink(runtime.auth, phoneNumber, verifier);
    return {clear: () => verifier.clear(),
      confirm: async (code) => (await challenge.confirm(code)).user};
  } catch (error) {verifier.clear(); throw error;}
}

export async function beginPublicEventPhoneVerification(
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<PublicEventPhoneVerification> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !(
    publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured
  )) {
    throw new Error("Website phone verification is not configured for this build.");
  }
  const {RecaptchaVerifier} = await import("firebase/auth");
  const {beginClaimPhoneLink} = await import("./firebaseClaimAccountLinking");
  const verifier = new RecaptchaVerifier(
    runtime.auth,
    recaptchaContainerId,
    {size: "invisible"}
  );
  try {
    const confirmation = await beginClaimPhoneLink(
      runtime.auth,
      phoneNumber,
      verifier
    );
    return {
      clear: () => verifier.clear(),
      confirm: async (code) => (await confirmation.confirm(code)).user,
    };
  } catch (error) {
    verifier.clear();
    throw error;
  }
}

export async function registerPublicEvent(
  payload: RegisterPublicEventPayload
): Promise<RegisterPublicEventResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !publicEventRegistrationFirebaseConfigured) {
    throw new Error("Website event registration is not configured for this build.");
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<
    RegisterPublicEventPayload,
    RegisterPublicEventResponse
  >(runtime.functions, "registerPublicEvent");
  return (await callable(payload)).data;
}

export async function recordEventInviteLinkOpen(
  payload: RecordEventInviteLinkOpenCallablePayload
): Promise<{accepted: boolean; inviteLinkId: string}> {
  return invokeWebsiteCallable(
    "recordEventInviteLinkOpen",
    payload,
    publicEventRegistrationFirebaseConfigured || eventRuntimeFirebaseConfigured
  );
}

export async function resolveEventInviteLanding(
  payload: ResolveEventInviteLandingCallablePayload
): Promise<ResolveEventInviteLandingCallableResponse> {
  return invokeWebsiteCallable(
    "resolveEventInviteLanding",
    payload,
    publicEventRegistrationFirebaseConfigured || eventRuntimeFirebaseConfigured
  );
}

export async function getEventRehearsalGuestBootstrap(
  payload: GetEventRehearsalGuestBootstrapCallablePayload
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "getEventRehearsalGuestBootstrap",
    payload,
    eventRuntimeFirebaseConfigured,
    "Event rehearsal"
  );
}

export async function submitEventRehearsalGuestAction(
  payload: SubmitEventRehearsalGuestActionCallablePayload
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventRehearsalGuestAction",
    payload,
    eventRuntimeFirebaseConfigured,
    "Event rehearsal"
  );
}

async function getFirebaseRuntime() {
  if (!config || !appCheckSiteKey) return null;
  runtimePromise ??= loadFirebaseRuntime();
  return runtimePromise;
}

async function getPublicFirebaseRuntime() {
  if (!config || !appCheckSiteKey) return null;
  publicRuntimePromise ??= loadPublicFirebaseRuntime();
  return publicRuntimePromise;
}

async function loadPublicFirebaseRuntime():
  Promise<PublicFirebaseRuntime | null> {
  if (!config || !appCheckSiteKey) return null;
  const [
    {initializeApp},
    {initializeAppCheck, ReCaptchaEnterpriseProvider},
    {getFunctions},
  ] = await Promise.all([
    import("firebase/app"),
    import("firebase/app-check"),
    import("firebase/functions"),
  ]);
  const app = initializeApp(config);
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return {app, functions: getFunctions(app, "asia-south1")};
}

async function loadFirebaseRuntime(): Promise<FirebaseRuntime | null> {
  const [publicRuntime, {getAuth}, {getFirestore}] = await Promise.all([
    getPublicFirebaseRuntime(),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  if (!publicRuntime) return null;
  const {app, functions} = publicRuntime;
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    functions,
  };
}

async function invokeWebsiteCallable<Request, Response>(
  name: string,
  payload: Request,
  configured: boolean,
  capabilityLabel = "Event runtime"
): Promise<Response> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !configured) {
    throw new Error(`${capabilityLabel} are not configured for this build.`);
  }
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<Request, Response>(runtime.functions, name);
  return (await callable(payload)).data;
}

export async function getEventAssistanceGuestView(
  payload: GetEventAssistanceGuestViewCallablePayload
): Promise<EventAssistanceGuestViewCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceGuestView", payload,
    eventRuntimeFirebaseConfigured, "Event updates");
}

export async function submitEventAssistanceGuestChoice(
  payload: SubmitEventAssistanceGuestChoiceCallablePayload
): Promise<SubmitEventAssistanceGuestChoiceCallableResponse> {
  return invokeWebsiteCallable("submitEventAssistanceGuestChoice", payload,
    eventRuntimeFirebaseConfigured, "Event updates");
}

export async function listEventSmsPreferences(payload: ListEventSmsPreferencesCallablePayload): Promise<ListEventSmsPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventSmsPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function getEventAssistanceSmsPreference(
  payload: GetEventAssistanceSmsPreferenceCallablePayload
): Promise<EventAssistanceSmsPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceSmsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function setEventAssistanceSmsPreference(
  payload: SetEventAssistanceSmsPreferenceCallablePayload
): Promise<EventAssistanceSmsPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventAssistanceSmsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function getEventAssistanceSmsWithdrawal(
  payload: GetEventAssistanceSmsWithdrawalCallablePayload
): Promise<EventAssistanceSmsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceSmsWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event text withdrawal");
}
export async function withdrawEventAssistanceSms(
  payload: WithdrawEventAssistanceSmsCallablePayload
): Promise<EventAssistanceSmsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventAssistanceSms", payload,
    eventRuntimeFirebaseConfigured, "Event text withdrawal");
}

export async function getEventWhatsappWithdrawal(
  payload: GetEventWhatsappWithdrawalCallablePayload
): Promise<EventWhatsappWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventWhatsappWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp withdrawal");
}
export async function withdrawEventWhatsapp(
  payload: WithdrawEventWhatsappCallablePayload
): Promise<EventWhatsappWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventWhatsapp", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp withdrawal");
}

export async function getEventRcsWithdrawal(
  payload: GetEventRcsWithdrawalCallablePayload
): Promise<EventRcsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventRcsWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event RCS withdrawal");
}
export async function withdrawEventRcs(
  payload: WithdrawEventRcsCallablePayload
): Promise<EventRcsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventRcs", payload,
    eventRuntimeFirebaseConfigured, "Event RCS withdrawal");
}

export async function listEventRcsPreferences(payload: ListEventRcsPreferencesCallablePayload): Promise<ListEventRcsPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventRcsPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function getEventRcsPreference(payload: GetEventRcsPreferenceCallablePayload): Promise<EventRcsPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventRcsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function setEventRcsPreference(payload: SetEventRcsPreferenceCallablePayload): Promise<EventRcsPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventRcsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function listEventWhatsappPreferences(payload: ListEventWhatsappPreferencesCallablePayload): Promise<ListEventWhatsappPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventWhatsappPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}

export async function getEventWhatsappPreference(payload: GetEventWhatsappPreferenceCallablePayload): Promise<EventWhatsappPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventWhatsappPreference", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}

export async function setEventWhatsappPreference(payload: SetEventWhatsappPreferenceCallablePayload): Promise<EventWhatsappPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventWhatsappPreference", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}

export async function getProgramHouseholdRsvpView(
  payload: GetProgramHouseholdRsvpViewCallablePayload
): Promise<ProgramHouseholdRsvpViewCallableResponse> {
  return invokeWebsiteCallable("getProgramHouseholdRsvpView", payload,
    eventRuntimeFirebaseConfigured, "Household RSVP");
}

export async function submitProgramHouseholdRsvp(
  payload: SubmitProgramHouseholdRsvpCallablePayload
): Promise<SubmitProgramHouseholdRsvpCallableResponse> {
  return invokeWebsiteCallable("submitProgramHouseholdRsvp", payload,
    eventRuntimeFirebaseConfigured, "Household RSVP");
}

/**
 * Absolute URL for the server-generated household itinerary feed. The token
 * rides in the query string of a plain navigation/download, matching how
 * calendar clients fetch webcal URLs; it is never embedded in page state or
 * analytics.
 */
export function programHouseholdItineraryIcsUrl(token: string): string | null {
  const projectId = config?.projectId;
  if (!projectId) return null;
  return `https://asia-south1-${projectId}.cloudfunctions.net/` +
    `programHouseholdItineraryIcs?token=${encodeURIComponent(token)}`;
}

export async function managePublicEventCheckout(payload: ManagePublicEventCheckoutCallablePayload): Promise<ManagePublicEventCheckoutCallableResponse> {
  return invokeWebsiteCallable("managePublicEventCheckout", payload, publicEventRegistrationFirebaseConfigured, "Event registration");
}

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

/** Published-only live feed. Never deliver Firestore's local cache as authority. */
export async function subscribePublicCatchEvents(
  onSnapshotReceived: (snapshot: {
    metadata: {fromCache: boolean; hasPendingWrites: boolean};
    size: number; docs: readonly {id: string; data(): unknown}[];
  }) => void,
  onUnavailable: () => void
): Promise<() => void> {
  const runtime = await getPublicFirebaseRuntime();
  if (!runtime) throw new Error("Public event service is unavailable.");
  const {getFirestore, collection, query, where, limit, onSnapshot} =
    await import("firebase/firestore");
  const source = query(collection(getFirestore(runtime.app), "events"),
    where("publicationState", "==", "published"), limit(401));
  return onSnapshot(source, {includeMetadataChanges: true}, onSnapshotReceived, onUnavailable);

}

export async function readPublicOrganizerTrackingSettings(
  payload: ReadPublicOrganizerTrackingSettingsCallablePayload
): Promise<PublicOrganizerTrackingSettingsCallableResponse> {
  return invokeWebsiteCallable("readPublicOrganizerTrackingSettings", payload,
    publicAnalyticsFirebaseConfigured, "Organizer tracking");
}

export type {ReadPublicOrganizerTrackingSettingsCallablePayload, PublicOrganizerTrackingSettingsCallableResponse};

/** Auth-owned guest status; browser hints never supply the subject UID. */
export async function getGuestEventViewerState(eventId: string): Promise<GetEventViewerStateCallableResponse> {
  return invokeWebsiteCallable("getEventViewerState", {eventId, surface: "guest"},
    publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured,
    "Event guest status");
}

/** Explicit account switching is shared by public guest surfaces. */
export const signOutGuestUser = signOutClaimUser;


export async function manageEventApprovalNotifications(
  payload: ManageEventApprovalNotificationsCallablePayload
): Promise<ManageEventApprovalNotificationsCallableResponse> {
  return invokeWebsiteCallable("manageEventApprovalNotifications", payload,
    publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured,
    "Application notifications");
}

/** Verification adds a contact to the current identity; it never signs in as another account. */
export async function verifyGuestEmail(uid: string, email: string, eventId: string): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime) throw new Error("Authentication unavailable");
  const {verifyEmailOnCurrentAccount} = await import("./firebaseClaimAccountLinking");
  await verifyEmailOnCurrentAccount(runtime.auth, uid, email,
    new URL(`/events/${encodeURIComponent(eventId)}/`, window.location.origin).href);
}

export async function refreshGuestIdentity(uid: string): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime) throw new Error("Authentication unavailable");
  const user = runtime.auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Account changed");
  await user.reload();
  if (runtime.auth.currentUser?.uid !== uid) throw new Error("Account changed");
  await user.getIdToken(true);
}

export const beginSalesDemoPhoneVerification = beginWebsiteAccountPhoneVerification;
export const watchWebsiteAccountAuthState = watchSalesDemoAuthState;
export function manageWebsiteAccount(payload: ManageWebsiteAccountCallablePayload): Promise<ManageWebsiteAccountCallableResponse> {
  return invokeWebsiteCallable("manageWebsiteAccount", payload, claimFirebaseConfigured, "Website account");
}
export function setWebsiteOrganizerFollow(organizerId: string, following: boolean, expectedUid: string): Promise<{following: boolean}> {
  return invokeWebsiteCallable(following ? "followOrganizer" : "unfollowOrganizer", {organizerId, expectedUid}, claimFirebaseConfigured, "Organizer following");
}
