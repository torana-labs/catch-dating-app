/**
 * The website's Firebase services, one module per backend domain under
 * services/firebase/ (runtime.ts holds the shared runtime and callable
 * invoke). Callers import from here; the service modules are the only files
 * that load the browser Firebase SDK (tool/web/check_website_import_boundaries.mjs).
 */
export {
  getWebsiteAppCheckToken,
  getWebsiteReferrerIdToken,
  getSignedInFirestore,
} from "./services/firebase/runtime";
export type {
  User,
} from "./services/firebase/runtime";
export {
  beginClaimPhoneLink,
  signInOrLinkClaimGoogle,
  watchClaimAuthState,
  watchSalesDemoAuthState,
  watchEventRuntimeAuthState,
  watchPublicFormAuthState,
  signInForClaim,
  signOutClaimUser,
  beginWebsiteAccountPhoneVerification,
  beginPublicEventPhoneVerification,
  signOutGuestUser,
  verifyGuestEmail,
  refreshGuestIdentity,
  beginSalesDemoPhoneVerification,
  watchWebsiteAccountAuthState,
  signOutWebsiteAccount,
} from "./services/firebase/auth";
export type {
  PublicEventPhoneVerification,
} from "./services/firebase/auth";
export {
  manageWebsiteAccount,
  setWebsiteOrganizerFollow,
  followWebsiteOrganizerByPhone,
  getWebsiteEventTicketCode,
  withdrawWebsiteMessagingPermission,
} from "./services/firebase/account";
export type {
  WebsiteAccount,
  WebsiteAccountSection,
  WebsiteEventTicketCode,
} from "./services/firebase/account";
export {
  getPublicOrganizerForm,
  listParticipantFormActivity,
  beginOrganizerFormResponse,
  saveOrganizerFormResponseDraft,
  createOrganizerFormAssetIntent,
  uploadOrganizerFormAsset,
  finalizeOrganizerFormAsset,
  submitOrganizerFormResponse,
  promoteFormCommunicationIntent,
  findOrganizerFormPayment,
  prepareOrganizerFormPayment,
  getOrganizerFormPayment,
  withdrawOrganizerFormResponse,
  sendPublicFormEmailSignInLink,
  completePublicFormEmailSignIn,
} from "./services/firebase/forms";
export type {
  PublicOrganizerForm,
  ParticipantFormActivityPage,
  PublicOrganizerFormDraft,
  PublicOrganizerFormReceipt,
  PublicOrganizerFormAssetIntent,
  PublicOrganizerFormPayment,
  PublicOrganizerFormPaymentRequest,
} from "./services/firebase/forms";
export {
  deriveEventSuccessMomentSeed,
  eventSuccessMomentPresentationCatalog,
  eventSuccessMomentPresentationFor,
  eventSuccessSocialMissionPromptFor,
  resolveEventSuccessCeremonyTimeline,
  getEventRuntimeBootstrap,
  claimEventRuntimeAccess,
  submitEventRuntimeProfile,
  checkInEventRuntime,
  requestEventRuntimeHostHelp,
  heartbeatEventRuntimePresence,
  getEventSuccessConversationGraph,
  submitEventSuccessConversationGraph,
  createEventRuntimeAttendeeInviteLink,
  recordEventRuntimeShareIntent,
  startEventRuntimeFirstHello,
  completeEventRuntimeFirstHello,
  fetchEventRuntimeWingmanCandidates,
  submitEventRuntimeWingmanRequest,
  withdrawEventRuntimeWingmanRequest,
  watchEventRuntimeLiveState,
  eventRuntimeTimestampMillis,
  saveEventRuntimeCompatibilityAnswers,
  saveEventRuntimeFeedback,
  getEventRehearsalGuestBootstrap,
  submitEventRehearsalGuestAction,
} from "./services/firebase/eventRuntime";
export type {
  EventSuccessCeremonyTimeline,
  EventSuccessMomentPresentationContract,
  EventSuccessDisclosureLevel,
  EventSuccessInteractionModel,
  EventSuccessSocialMissionPromptContract,
  EventRuntimeBootstrap,
  EventRehearsalGuestBootstrap,
  EventRehearsalGuestAction,
  EventSuccessConversationGraph,
  EventRuntimeAttendeeInviteLink,
  EventRuntimeMission,
  EventRuntimeLiveState,
  EventRuntimePlanState,
  EventRuntimeFeedback,
  EventRuntimeContext,
} from "./services/firebase/eventRuntime";
export {
  manageEventOfferCheckout,
  registerPublicEvent,
  recordEventInviteLinkOpen,
  resolveEventInviteLanding,
  managePublicEventCheckout,
  subscribePublicCatchEvents,
  watchGuestEventDocuments,
  manageEventApprovalNotifications,
} from "./services/firebase/events";
export type {
  RegisterPublicEventPayload,
  RegisterPublicEventResponse,
  EventInviteLanding,
  EventOfferCheckoutResponse,
  GuestEventDocuments,
} from "./services/firebase/events";
export {
  requestOrganizerClaim,
  getOrganizerClaimVerificationOptions,
  startOrganizerClaimVerification,
  confirmOrganizerClaimVerification,
  watchOrganizerClaimAttempt,
} from "./services/firebase/claims";
export type {
  RequestOrganizerClaimPayload,
  OrganizerClaimRole,
  RequestOrganizerClaimResponse,
  OrganizerClaimVerificationOptions,
  OrganizerClaimVerificationStart,
  OrganizerClaimVerificationConfirm,
  OrganizerClaimVerificationMethod,
  OrganizerClaimAttemptState,
} from "./services/firebase/claims";
export {
  watchPublicFoundingHostOffer,
  createPublicOrganizerReview,
  recordOrganizerAnalyticsEvent,
  invokeHostBillingCallable,
  getOrganizerOwnerView,
  manageOrganizerOwnerPage,
  updateOrganizerDescription,
  setReviewResponse,
  setOrganizerTrackingSettings,
} from "./services/firebase/organizers";
export type {
  PublicOrganizerReview,
  CreatePublicOrganizerReviewPayload,
  CreatePublicOrganizerReviewResponse,
  RecordOrganizerAnalyticsEventPayload,
  RecordOrganizerAnalyticsEventResponse,
  HostBillingCallable,
} from "./services/firebase/organizers";
export {
  getEventAssistanceGuestView,
  submitEventAssistanceGuestChoice,
  listEventSmsPreferences,
  getEventAssistanceSmsPreference,
  setEventAssistanceSmsPreference,
  getEventAssistanceSmsWithdrawal,
  withdrawEventAssistanceSms,
  getEventWhatsappWithdrawal,
  withdrawEventWhatsapp,
  getEventRcsWithdrawal,
  withdrawEventRcs,
  listEventRcsPreferences,
  getEventRcsPreference,
  setEventRcsPreference,
  listEventWhatsappPreferences,
  getEventWhatsappPreference,
  setEventWhatsappPreference,
} from "./services/firebase/eventMessaging";
export {
  getProgramHouseholdRsvpView,
  submitProgramHouseholdRsvp,
  programHouseholdItineraryIcsUrl,
  getProgramGuestIdStatus,
  createProgramAssetUpload,
  uploadProgramAsset,
  submitProgramGuestId,
  getProgramHotelHandover,
  getProgramDriverTrip,
  getProgramVendorRunSheet,
  getProgramFamilyView,
  getProgramHamperWebView,
  upsertProgramHamper,
} from "./services/firebase/programmes";
export type {
  ProgramAssetUploadCallableResponse,
  ProgramDriverTripCallableResponse,
  ProgramFamilyViewCallableResponse,
  ProgramGuestIdStatusCallableResponse,
  ProgramHamperWebViewCallableResponse,
  ProgramHotelHandoverCallableResponse,
  ProgramHouseholdRsvpViewCallableResponse,
  ProgramVendorRunSheetCallableResponse,
  SubmitProgramGuestIdCallablePayload,
  UpsertProgramHamperCallablePayload,
} from "./services/firebase/programmes";
export {
  readTryItCaller,
  invokeTryItCommand,
  createTryItRehearsal,
} from "./services/firebase/tryIt";
export type {
  TryItCommandCallables,
  TryItCaller,
  TryItRehearsalPayload,
  TryItRehearsalResponse,
} from "./services/firebase/tryIt";
export {
  invokeSalesDemoCallable,
} from "./services/firebase/salesDemo";
export {
  getWalkthroughSlots,
  bookWalkthrough,
  manageWalkthroughBooking,
  readWalkthroughCaller,
} from "./services/firebase/walkthroughs";
export type {
  BookWalkthroughCallablePayload,
  BookWalkthroughCallableResponse,
  GetWalkthroughSlotsCallableResponse,
  ManageWalkthroughBookingCallablePayload,
  ManageWalkthroughBookingCallableResponse,
} from "./services/firebase/walkthroughs";
