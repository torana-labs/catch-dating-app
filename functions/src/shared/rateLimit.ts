/**
 * Per-user rate limiting for callable Cloud Functions.
 *
 * Uses Firestore transactions to atomically read-and-increment a counter
 * for each (uid, action, timeWindow) tuple. If the counter exceeds the
 * configured limit for that action, the request is rejected with a
 * `resource-exhausted` HttpsError.
 *
 * ## Usage
 *
 * ```ts
 * import {checkRateLimit} from "../shared/rateLimit";
 *
 * // Inside a callable handler:
 * await checkRateLimit(
 *   admin.firestore(),
 *   request.auth!.uid,
 *   "createOrganizer",
 *   {maxRequests: 5, windowMs: 60 * 60 * 1000}  // 5 per hour
 * );
 * ```
 *
 * ## Data model
 *
 * Rate-limit counters are stored in `rateLimits/{key}` where `key` is
 * `${uid}_${action}_${windowKey}`. Documents auto-expire via TTL
 * (`expiresAt` field) so they don't accumulate. You must create a
 * Firestore TTL policy on the `expiresAt` field in the `rateLimits`
 * collection (Firebase Console → Firestore → TTL Policies).
 *
 * ## Trade-offs
 *
 * - **Transaction-based:** Each rate-limited request incurs one Firestore
 *   transaction read + write (~10-20ms). This is fast enough for callable
 *   functions but adds latency proportional to Firestore load.
 * - **Window alignment:** The `windowKey` is `Math.floor(now / windowMs)`,
 *   so a 1-minute window starts at wall-clock minute boundaries (e.g.,
 *   12:34:00–12:34:59). This is simpler than a sliding window and avoids
 *   the need for per-second precision.
 * - **Not a hard guarantee:** Firestore transactions can retry under
 *   contention. At extremely high throughput (>200 req/s for a single
 *   user), counters may slightly exceed limits. For a dating app, this is
 *   acceptable — the goal is abuse prevention, not billing precision.
 */

import {HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum allowed requests in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

// ── Pre-defined limits ─────────────────────────────────────────────────────

/** Limits for each callable/HTTP endpoint keyed by action name. */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  adminReviewCatchWhatsappInbound: {maxRequests: 30, windowMs: 60 * 1000},
  adminSendCatchWhatsappReply: {maxRequests: 5, windowMs: 60 * 1000},
  getEventAttendanceReport: {maxRequests: 10, windowMs: 60 * 1000},
  getEventAttendanceDisposition: {maxRequests: 120, windowMs: 60 * 1000},
  recordEventNoShow: {maxRequests: 60, windowMs: 60 * 1000},
  // 10/min
  createRazorpayOrder: {maxRequests: 10, windowMs: 60 * 1000},
  verifyRazorpayPayment: {maxRequests: 10, windowMs: 60 * 1000},
  createStripeCheckoutSession: {maxRequests: 10, windowMs: 60 * 1000},
  createStripeHostOnboardingLink: {maxRequests: 5, windowMs: 60 * 1000},
  refreshStripeHostPaymentAccount: {maxRequests: 20, windowMs: 60 * 1000},
  createRazorpayHostPaymentAccount: {maxRequests: 5, windowMs: 60 * 1000},
  refreshRazorpayHostPaymentAccount: {maxRequests: 20, windowMs: 60 * 1000},
  createPrivateEventSetup: {maxRequests: 10, windowMs: 60 * 1000},
  previewEventOfferPreferences: {maxRequests: 30, windowMs: 60 * 1000},
  configureEventOfferPreferences: {maxRequests: 10, windowMs: 60 * 1000},
  getEventOfferConfiguration: {maxRequests: 60, windowMs: 60 * 1000},
  prepareEventOfferHandoff: {maxRequests: 30, windowMs: 60 * 1000},
  previewEventOffers: {maxRequests: 20, windowMs: 60 * 1000},
  previewOrganizerFormAdmission: {maxRequests: 30, windowMs: 60 * 1000},
  commitOrganizerFormAdmission: {maxRequests: 20, windowMs: 60 * 1000},
  commitEventOffers: {maxRequests: 10, windowMs: 60 * 1000},
  mutateEventOffer: {maxRequests: 30, windowMs: 60 * 1000},
  getEventOffer: {maxRequests: 60, windowMs: 60 * 1000},
  listEventOffers: {maxRequests: 30, windowMs: 60 * 1000},
  updatePrivateEventPreferences: {maxRequests: 30, windowMs: 60 * 1000},
  updatePrivateEventBasics: {maxRequests: 30, windowMs: 60 * 1000},
  listOfferEventTargets: {maxRequests: 30, windowMs: 60 * 1000},
  listPrivateEventSetups: {maxRequests: 30, windowMs: 60 * 1000},
  listMyHostAssignments: {maxRequests: 30, windowMs: 60 * 1000},
  setEventPublication: {maxRequests: 15, windowMs: 60 * 1000},
  updatePrivateEventDetails: {maxRequests: 30, windowMs: 60 * 1000},
  reconcilePrivateEventSeats: {maxRequests: 30, windowMs: 60 * 1000},
  getPrivateEventSetup: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerTrackingSettings: {maxRequests: 60, windowMs: 60 * 1000},
  setOrganizerTrackingSettings: {maxRequests: 10, windowMs: 60 * 1000},
  readPublicOrganizerTrackingSettings: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerEventSetupDefaults: {maxRequests: 60, windowMs: 60 * 1000},
  updateOrganizerEventSetupDefaults: {maxRequests: 10, windowMs: 60 * 1000},
  queryOrganizerFormResponses: {maxRequests: 12, windowMs: 60 * 1000},
  queryOrganizerFormResponsesOrg: {maxRequests: 60, windowMs: 60 * 1000},
  createEvent: {maxRequests: 10, windowMs: 60 * 1000},
  updateEvent: {maxRequests: 30, windowMs: 60 * 1000},
  cancelEvent: {maxRequests: 10, windowMs: 60 * 1000},
  deleteEvent: {maxRequests: 10, windowMs: 60 * 1000},
  signUpForFreeEvent: {maxRequests: 10, windowMs: 60 * 1000},
  cancelEventSignUp: {maxRequests: 10, windowMs: 60 * 1000},
  joinEventWaitlist: {maxRequests: 10, windowMs: 60 * 1000},
  leaveEventWaitlist: {maxRequests: 10, windowMs: 60 * 1000},
  createEventWaitlistOffers: {maxRequests: 30, windowMs: 60 * 1000},
  acceptEventWaitlistOffer: {maxRequests: 10, windowMs: 60 * 1000},
  declineEventWaitlistOffer: {maxRequests: 10, windowMs: 60 * 1000},
  decideEventJoinRequest: {maxRequests: 30, windowMs: 60 * 1000},
  importEventAttendees: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  // Saved intake review performs bounded preview/revise calls before one apply.
  manageHostRosterIntake: {maxRequests: 60, windowMs: 60 * 1000},
  publishOrganizerApplicationForm: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  },
  createOrganizerForm: {maxRequests: 20, windowMs: 60 * 60 * 1000},
  manageOrganizerFormDomain: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  reserveOrganizerFormDomain: {maxRequests: 3, windowMs: 24 * 60 * 60 * 1000},
  promoteFormCommunicationIntent: {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  },
  updateOrganizerFormDraft: {maxRequests: 120, windowMs: 60 * 1000},
  getOrganizerFormEditor: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerForms: {maxRequests: 60, windowMs: 60 * 1000},
  validateOrganizerFormDraft: {maxRequests: 120, windowMs: 60 * 1000},
  publishOrganizerForm: {maxRequests: 20, windowMs: 60 * 60 * 1000},
  setOrganizerFormLifecycle: {maxRequests: 30, windowMs: 60 * 1000},
  duplicateOrganizerForm: {maxRequests: 20, windowMs: 60 * 60 * 1000},
  deleteOrganizerFormDraft: {maxRequests: 20, windowMs: 60 * 1000},
  listOrganizerFormTemplates: {maxRequests: 60, windowMs: 60 * 1000},
  getPublicOrganizerForm: {maxRequests: 120, windowMs: 60 * 1000},
  beginOrganizerFormResponse: {maxRequests: 20, windowMs: 60 * 1000},
  saveOrganizerFormResponseDraft: {maxRequests: 120, windowMs: 60 * 1000},
  createOrganizerFormAssetIntent: {maxRequests: 30, windowMs: 60 * 1000},
  finalizeOrganizerFormAsset: {maxRequests: 30, windowMs: 60 * 1000},
  submitOrganizerFormResponse: {maxRequests: 20, windowMs: 60 * 1000},
  managePaymentRoutingPolicy: {maxRequests: 20, windowMs: 60 * 1000},
  prepareEventOfferInvitation: {maxRequests: 10, windowMs: 60 * 1000},
  configureEventRegistration: {maxRequests: 20, windowMs: 60 * 1000},
  managePublicEventCheckout: {maxRequests: 30, windowMs: 60 * 1000},
  manageEventOfferCheckout: {maxRequests: 30, windowMs: 60 * 1000},
  prepareOrganizerFormPayment: {maxRequests: 10, windowMs: 60 * 1000},
  getOrganizerFormPayment: {maxRequests: 30, windowMs: 60 * 1000},
  findOrganizerFormPayment: {maxRequests: 15, windowMs: 60 * 1000},
  manageOrganizerFormPaymentConnection: {
    maxRequests: 30, windowMs: 60 * 1000,
  },
  withdrawOrganizerFormResponse: {maxRequests: 10, windowMs: 60 * 1000},
  createOrganizerFormShareLink: {maxRequests: 30, windowMs: 60 * 1000},
  getOrganizerFormShareAssets: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerFormPayments: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerFormResponses: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerFormResponseDetail: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerFormAnalytics: {maxRequests: 60, windowMs: 60 * 1000},
  requestOrganizerFormExport: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  createOrganizerFormAutomation: {maxRequests: 30, windowMs: 60 * 1000},
  setOrganizerFormAutomationState: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerFormAutomationRuns: {maxRequests: 60, windowMs: 60 * 1000},
  previewOrganizerFormConversion: {maxRequests: 60, windowMs: 60 * 1000},
  convertOrganizerFormResponse: {maxRequests: 30, windowMs: 60 * 1000},
  previewOrganizerApplicationImport: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
  },
  importOrganizerApplications: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  listOrganizerApplications: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerAttentionItems: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerApplicationDetail: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  reviewOrganizerApplication: {maxRequests: 60, windowMs: 60 * 1000},
  getParticipantOrganizerApplicationForm: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  submitParticipantOrganizerApplication: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  revokeParticipantOrganizerDataGrant: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  createEventRosterHandoff: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  markEventAttendeeAttendance: {maxRequests: 120, windowMs: 60 * 1000},
  registerPublicEvent: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  getEventRuntimeBootstrap: {maxRequests: 60, windowMs: 60 * 1000},
  getEventSuccessSpatialLayout: {maxRequests: 60, windowMs: 60 * 1000},
  heartbeatEventSuccessPresence: {maxRequests: 6, windowMs: 60 * 1000},
  publishEventLivePosition: {maxRequests: 30, windowMs: 60 * 1000},
  getEventSuccessPresenceSummary: {maxRequests: 6, windowMs: 60 * 1000},
  resolveEventSuccessLateArrival: {maxRequests: 30, windowMs: 60 * 1000},
  configureEventAssignmentFeatures: {
    maxRequests: 20, windowMs: 60 * 60 * 1000,
  },
  previewEventAssignmentFeatures: {
    maxRequests: 30, windowMs: 60 * 1000,
  },
  listEventAssignmentFeatureChoices: {
    maxRequests: 30, windowMs: 60 * 1000,
  },
  setEventAssignmentFeatureConsent: {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  },
  setEventSuccessAccountabilityResolution: {
    maxRequests: 120,
    windowMs: 60 * 1000,
  },
  upsertEventSuccessLayout: {maxRequests: 20, windowMs: 60 * 1000},
  upsertOrganizerEventVenue: {maxRequests: 20, windowMs: 60 * 1000},
  controlEventSuccessSpatial: {maxRequests: 120, windowMs: 60 * 1000},
  claimEventRuntimeAccess: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  submitEventRuntimeProfile: {maxRequests: 30, windowMs: 60 * 60 * 1000},
  checkInEventRuntime: {maxRequests: 20, windowMs: 60 * 1000},
  createEventVenueSession: {maxRequests: 30, windowMs: 60 * 1000},
  approveEventRuntimeClaim: {maxRequests: 60, windowMs: 60 * 1000},
  createEventRehearsal: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  getEventRehearsalSummary: {maxRequests: 30, windowMs: 60 * 1000},
  getEventRehearsalBootstrap: {maxRequests: 90, windowMs: 60 * 1000},
  getEventRehearsalMovement: {maxRequests: 90, windowMs: 60 * 1000},
  updateEventRehearsalSetup: {maxRequests: 30, windowMs: 60 * 1000},
  controlEventRehearsal: {maxRequests: 120, windowMs: 60 * 1000},
  controlEventRehearsalSpatial: {maxRequests: 120, windowMs: 60 * 1000},
  injectEventRehearsalBehavior: {maxRequests: 120, windowMs: 60 * 1000},
  resetEventRehearsal: {maxRequests: 10, windowMs: 60 * 1000},
  rotateEventRehearsalGuestLink: {maxRequests: 10, windowMs: 60 * 1000},
  getEventRehearsalGuestBootstrap: {
    maxRequests: 90,
    windowMs: 60 * 1000,
  },
  submitEventRehearsalGuestAction: {maxRequests: 60, windowMs: 60 * 1000},
  getEventAssistanceSmsWithdrawal: {maxRequests: 60, windowMs: 60 * 1000},
  withdrawEventAssistanceSms: {maxRequests: 20, windowMs: 60 * 1000},
  getEventWhatsappWithdrawal: {maxRequests: 60, windowMs: 60 * 1000},
  withdrawEventWhatsapp: {maxRequests: 20, windowMs: 60 * 1000},
  getEventAssistanceSetting: {maxRequests: 60, windowMs: 60_000},
  getEventAssistanceRuntimeConfig: {maxRequests: 60, windowMs: 60_000},
  listEventAssistanceCases: {maxRequests: 30, windowMs: 60_000},
  listEventAssistanceDeliveries: {maxRequests: 30, windowMs: 60_000},
  repairEventAssistanceDelivery: {maxRequests: 30, windowMs: 60_000},
  resolveEventAssistanceCase: {maxRequests: 30, windowMs: 60_000},
  getEventAssistanceHostGuests: {maxRequests: 30, windowMs: 60_000},
  getEventAssistanceParticipation: {maxRequests: 60, windowMs: 60_000},
  getEventAssistanceCheckpoint: {maxRequests: 60, windowMs: 60_000},
  recordEventAssistanceCheckpoint: {maxRequests: 30, windowMs: 60_000},
  setEventAssistanceCheckpointCloseout: {maxRequests: 30, windowMs: 60_000},
  reassignEventAssistanceCheckpointReporter: {
    maxRequests: 30, windowMs: 60_000},
  getEventAssistanceDepartureRoster: {maxRequests: 60, windowMs: 60_000},
  getEventAssistanceAccountability: {maxRequests: 60, windowMs: 60_000},
  resolveEventAssistanceAccountability: {maxRequests: 30, windowMs: 60_000},
  getEventAssistanceMembership: {maxRequests: 60, windowMs: 60_000},
  transferEventAssistanceGroup: {maxRequests: 30, windowMs: 60_000},
  getEventAssistanceGroupStaff: {maxRequests: 60, windowMs: 60_000},
  setEventAssistanceSetting: {maxRequests: 30, windowMs: 60_000},
  setEventAssistanceRuntimeConfig: {maxRequests: 30, windowMs: 60_000},
  setEventAssistanceParticipation: {maxRequests: 30, windowMs: 60_000},
  setEventAssistanceGroupStaff: {maxRequests: 30, windowMs: 60_000},
  getEventAssistanceGroupProgress: {maxRequests: 60, windowMs: 60_000},
  listEventAssistanceDepartureRosters: {maxRequests: 30, windowMs: 60_000},
  confirmEventAssistanceDeparture: {maxRequests: 30, windowMs: 60_000},
  changeEventAssistanceRoute: {maxRequests: 30, windowMs: 60_000},
  getEventWhatsappPreference: {maxRequests: 60, windowMs: 60_000},
  setEventWhatsappPreference: {maxRequests: 20, windowMs: 60_000},
  getEventAssistanceParticipantContext: {maxRequests: 30, windowMs: 60 * 1000},
  getEventAssistanceSmsPreference: {maxRequests: 60, windowMs: 60 * 1000},
  setEventAssistanceSmsPreference: {maxRequests: 20, windowMs: 60 * 1000},
  getEventRcsWithdrawal: {maxRequests: 60, windowMs: 60 * 1000},
  withdrawEventRcs: {maxRequests: 20, windowMs: 60 * 1000},
  listEventSmsPreferences: {maxRequests: 30, windowMs: 60 * 1000},
  listEventWhatsappPreferences: {maxRequests: 30, windowMs: 60 * 1000},
  listEventRcsPreferences: {maxRequests: 30, windowMs: 60 * 1000},
  getEventRcsPreference: {maxRequests: 60, windowMs: 60 * 1000},
  setEventRcsPreference: {maxRequests: 20, windowMs: 60 * 1000},
  getEventAssistanceGuestView: {maxRequests: 60, windowMs: 60 * 1000},
  submitEventAssistanceGuestChoice: {maxRequests: 20, windowMs: 60 * 1000},
  completeEventRehearsal: {maxRequests: 10, windowMs: 60 * 1000},
  exportEventRehearsalReproduction: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  // Broadcasts can fan out to hundreds of people, so cap them per host rather
  // than inheriting the loose default callable limit.
  sendEventBroadcast: {maxRequests: 3, windowMs: 60 * 60 * 1000},
  createEventInviteLink: {maxRequests: 20, windowMs: 60 * 1000},
  createAttendeeInviteLink: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  disableEventInviteLink: {maxRequests: 20, windowMs: 60 * 1000},
  getEventInviteLinkToken: {maxRequests: 60, windowMs: 60 * 1000},
  recordEventShareIntent: {maxRequests: 60, windowMs: 60 * 1000},
  joinClub: {maxRequests: 30, windowMs: 60 * 1000},
  leaveClub: {maxRequests: 30, windowMs: 60 * 1000},
  createClubPost: {maxRequests: 10, windowMs: 60 * 1000},
  startClubHostConversation: {maxRequests: 5, windowMs: 60 * 1000},
  addClubHost: {maxRequests: 20, windowMs: 60 * 1000},
  removeClubHost: {maxRequests: 20, windowMs: 60 * 1000},
  archiveClub: {maxRequests: 10, windowMs: 60 * 1000},
  deleteClub: {maxRequests: 10, windowMs: 60 * 1000},
  manageWebsiteAccount: {maxRequests: 30, windowMs: 60 * 1000},
  followOrganizer: {maxRequests: 30, windowMs: 60 * 1000},
  unfollowOrganizer: {maxRequests: 30, windowMs: 60 * 1000},
  setOrganizerNotificationPreference: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  createOrganizerPost: {maxRequests: 10, windowMs: 60 * 1000},
  getOrganizerCrmSummary: {maxRequests: 30, windowMs: 60 * 1000},
  getEventRosterInsights: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerContacts: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerContactDetail: {maxRequests: 60, windowMs: 60 * 1000},
  resolveOrganizerCommunicationPlan: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  mutateOrganizerContact: {maxRequests: 60, windowMs: 60 * 1000},
  createOrganizerContactNote: {maxRequests: 30, windowMs: 60 * 1000},
  mutateOrganizerContactNote: {maxRequests: 60, windowMs: 60 * 1000},
  recordOrganizerContactOutreach: {maxRequests: 60, windowMs: 60 * 1000},
  exportOrganizerContacts: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  mergeOrganizerContacts: {maxRequests: 20, windowMs: 60 * 1000},
  unmergeOrganizerContacts: {maxRequests: 20, windowMs: 60 * 1000},
  listOrganizerContactMergeCandidates: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  reviewOrganizerContactMergeCandidate: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  completeOrganizerWhatsappConnection: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  sendOrganizerWhatsappTest: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  resolveOrganizerAudienceMembers: {maxRequests: 60, windowMs: 60 * 1000},
  upsertOrganizerSavedAudience: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerSavedAudiences: {maxRequests: 60, windowMs: 60 * 1000},
  previewOrganizerSavedAudience: {maxRequests: 20, windowMs: 60 * 1000},
  archiveOrganizerSavedAudience: {maxRequests: 20, windowMs: 60 * 1000},
  prepareOrganizerManualSendTask: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerManualSendTasks: {maxRequests: 60, windowMs: 60 * 1000},
  openOrganizerManualSendTask: {maxRequests: 30, windowMs: 60 * 1000},
  validateOrganizerManualSendTaskLaunch: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  markOrganizerManualSendTask: {maxRequests: 30, windowMs: 60 * 1000},
  replanOrganizerManualSendTasks: {maxRequests: 20, windowMs: 60 * 1000},
  upsertOrganizerCampaign: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerCampaigns: {maxRequests: 60, windowMs: 60 * 1000},
  listOrganizerWhatsappThreads: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerWhatsappThread: {maxRequests: 60, windowMs: 60 * 1000},
  sendOrganizerWhatsappReply: {maxRequests: 30, windowMs: 60 * 1000},
  approveOrganizerCampaign: {maxRequests: 20, windowMs: 60 * 1000},
  dispatchOrganizerCampaign: {maxRequests: 3, windowMs: 60 * 60 * 1000},
  getOrganizerProviderSetup: {maxRequests: 60, windowMs: 60 * 1000},
  connectOrganizerLumaProvider: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  listOrganizerLumaEvents: {maxRequests: 30, windowMs: 60 * 1000},
  syncOrganizerProviderEvent: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  disconnectOrganizerProvider: {maxRequests: 10, windowMs: 60 * 60 * 1000},
  getEventOperatorAccess: {maxRequests: 60, windowMs: 60 * 1000},
  listEventStaff: {maxRequests: 60, windowMs: 60 * 1000},
  grantEventStaff: {maxRequests: 20, windowMs: 60 * 1000},
  revokeEventStaff: {maxRequests: 20, windowMs: 60 * 1000},
  // Private programs (weddings/offsites): management writes are rare,
  // operational reads/polls are frequent, dispatch bursts are small.
  createOrganizerProgram: {maxRequests: 10, windowMs: 60 * 1000},
  updateOrganizerProgram: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerPrograms: {maxRequests: 60, windowMs: 60 * 1000},
  getOrganizerProgram: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramWorkAccess: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramStaff: {maxRequests: 60, windowMs: 60 * 1000},
  grantProgramStaff: {maxRequests: 20, windowMs: 60 * 1000},
  revokeProgramStaff: {maxRequests: 20, windowMs: 60 * 1000},
  inviteProgramStaff: {maxRequests: 20, windowMs: 60 * 1000},
  claimProgramStaffInvite: {maxRequests: 30, windowMs: 60 * 1000},
  revokeProgramStaffInvite: {maxRequests: 20, windowMs: 60 * 1000},
  upsertProgramGuest: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramGuests: {maxRequests: 60, windowMs: 60 * 1000},
  upsertProgramGuestGroup: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramGuestGroups: {maxRequests: 60, windowMs: 60 * 1000},
  deleteProgramGuestGroup: {maxRequests: 30, windowMs: 60 * 1000},
  upsertProgramHousehold: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramHouseholds: {maxRequests: 60, windowMs: 60 * 1000},
  upsertProgramFunction: {maxRequests: 60, windowMs: 60 * 1000},
  applyProgramFunctionInvitations: {maxRequests: 30, windowMs: 60 * 1000},
  recordProgramFunctionRsvp: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramHouseholdRsvpView: {maxRequests: 120, windowMs: 60 * 1000},
  issueProgramHouseholdRsvpLink: {maxRequests: 30, windowMs: 60 * 1000},
  submitProgramHouseholdRsvp: {maxRequests: 60, windowMs: 60 * 1000},
  upsertOrganizerMoment: {maxRequests: 60, windowMs: 60 * 1000},
  armOrganizerMoment: {maxRequests: 60, windowMs: 60 * 1000},
  pauseOrganizerMoment: {maxRequests: 60, windowMs: 60 * 1000},
  resumeOrganizerMoment: {maxRequests: 60, windowMs: 60 * 1000},
  runOrganizerMoment: {maxRequests: 30, windowMs: 60 * 1000},
  listOrganizerMoments: {maxRequests: 120, windowMs: 60 * 1000},
  upsertProgramPickupPoint: {maxRequests: 60, windowMs: 60 * 1000},
  upsertProgramHotel: {maxRequests: 60, windowMs: 60 * 1000},
  upsertTransportVendor: {maxRequests: 60, windowMs: 60 * 1000},
  listTransportVendors: {maxRequests: 60, windowMs: 60 * 1000},
  upsertProgramTravelLeg: {maxRequests: 60, windowMs: 60 * 1000},
  upsertProgramTravelParty: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramArrivalsRoster: {maxRequests: 120, windowMs: 60 * 1000},
  getProgramTransportPlan: {maxRequests: 60, windowMs: 60 * 1000},
  setProgramTravelReadiness: {maxRequests: 120, windowMs: 60 * 1000},
  dispatchProgramTrip: {maxRequests: 60, windowMs: 60 * 1000},
  markProgramTripArrived: {maxRequests: 60, windowMs: 60 * 1000},
  voidProgramTrip: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramHotelInbound: {maxRequests: 120, windowMs: 60 * 1000},
  manageProgramLodging: {maxRequests: 30, windowMs: 60 * 1000},
  getProgramHotelRooms: {maxRequests: 120, windowMs: 60 * 1000},
  upsertProgramStay: {maxRequests: 120, windowMs: 60 * 1000},
  upsertProgramRoomBlock: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramTrips: {maxRequests: 60, windowMs: 60 * 1000},
  listProgramStaffAttention: {maxRequests: 60, windowMs: 60 * 1000},
  refreshProgramTravelLeg: {maxRequests: 30, windowMs: 60 * 1000},
  recordProgramDoorJournal: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramFunctionDoorView: {maxRequests: 120, windowMs: 60 * 1000},
  getProgramAttendanceReport: {maxRequests: 60, windowMs: 60 * 1000},
  getProgramStakeholderCounts: {maxRequests: 60, windowMs: 60 * 1000},
  createProgramWalkIn: {maxRequests: 60, windowMs: 60 * 1000},
  importProgramManifest: {maxRequests: 10, windowMs: 60 * 1000},
  archiveProgram: {maxRequests: 10, windowMs: 60 * 1000},
  unarchiveProgram: {maxRequests: 10, windowMs: 60 * 1000},
  setEventAttendeeAttendance: {maxRequests: 120, windowMs: 60 * 1000},
  resolveEventInviteLanding: {maxRequests: 120, windowMs: 60 * 1000},
  startOrganizerConversation: {maxRequests: 5, windowMs: 60 * 1000},
  addOrganizerManager: {maxRequests: 20, windowMs: 60 * 1000},
  removeOrganizerManager: {maxRequests: 20, windowMs: 60 * 1000},
  transferOrganizerOwnership: {maxRequests: 5, windowMs: 60 * 1000},
  updateOrganizer: {maxRequests: 30, windowMs: 60 * 1000},
  archiveOrganizer: {maxRequests: 10, windowMs: 60 * 1000},
  deleteOrganizer: {maxRequests: 10, windowMs: 60 * 1000},
  // 30/min (host toggling attendance for a group)
  markEventAttendance: {maxRequests: 30, windowMs: 60 * 1000},
  // 5/min
  selfCheckInAttendance: {maxRequests: 5, windowMs: 60 * 1000},
  fetchSwipeCandidates: {maxRequests: 30, windowMs: 60 * 1000},
  fetchEventSuccessWingmanCandidates: {maxRequests: 30, windowMs: 60 * 1000},
  submitEventSuccessWingmanRequest: {maxRequests: 10, windowMs: 60 * 1000},
  withdrawEventSuccessWingmanRequest: {maxRequests: 10, windowMs: 60 * 1000},
  controlEventSuccessLive: {maxRequests: 120, windowMs: 60 * 1000},
  publishEventSuccessRotationRound: {maxRequests: 30, windowMs: 60 * 1000},
  // Places is keystroke-driven, so it needs a higher cap than mutations.
  placesAutocomplete: {maxRequests: 60, windowMs: 60 * 1000},
  placeDetails: {maxRequests: 30, windowMs: 60 * 1000},
  reportUser: {maxRequests: 5, windowMs: 60 * 1000},
  // 10/min
  blockUser: {maxRequests: 10, windowMs: 60 * 1000},
  unblockUser: {maxRequests: 10, windowMs: 60 * 1000},
  sendEventChatMessage: {maxRequests: 30, windowMs: 60 * 1000},
  setEventChatReaction: {maxRequests: 60, windowMs: 60 * 1000},
  setEventChatTyping: {maxRequests: 30, windowMs: 60 * 1000},
  getEventChatProfileSharing: {maxRequests: 60, windowMs: 60 * 1000},
  updateEventChatProfileSharing: {maxRequests: 30, windowMs: 60 * 1000},
  getEventChatProfile: {maxRequests: 60, windowMs: 60 * 1000},
  listEventChats: {maxRequests: 30, windowMs: 60 * 1000},
  actOnEventChatMessage: {maxRequests: 20, windowMs: 60 * 1000},
  listEventChatParticipants: {maxRequests: 60, windowMs: 60 * 1000},
  listEventChatMessages: {maxRequests: 120, windowMs: 60 * 1000},
  getEventChatAccess: {maxRequests: 120, windowMs: 60 * 1000},
  updateEventChatAccess: {maxRequests: 30, windowMs: 60 * 1000},
  manageEventChatMember: {maxRequests: 10, windowMs: 60 * 1000},
  listParticipantMessagingPreferences: {maxRequests: 60, windowMs: 60 * 1000},
  withdrawParticipantMessagingPermission: {
    maxRequests: 30, windowMs: 60 * 1000,
  },
  listParticipantActivity: {maxRequests: 60, windowMs: 60 * 1000},
  getParticipantActivity: {maxRequests: 60, windowMs: 60 * 1000},
  manageEventApprovalNotifications: {maxRequests: 30, windowMs: 60 * 1000},
  getEventViewerState: {maxRequests: 60, windowMs: 60 * 1000},
  listParticipantFormProfiles: {maxRequests: 60, windowMs: 60 * 1000},
  getParticipantFormPhoto: {maxRequests: 30, windowMs: 60 * 1000},
  getParticipantFormProfile: {maxRequests: 60, windowMs: 60 * 1000},
  claimParticipantFormProfile: {maxRequests: 10, windowMs: 60 * 1000},
  // 60/min because profile editing can save one field per sheet interaction.
  updateUserProfile: {maxRequests: 60, windowMs: 60 * 1000},
  setCrossPathsEventConsent: {maxRequests: 30, windowMs: 60 * 1000},
  getCrossPathsSuggestions: {maxRequests: 12, windowMs: 60 * 1000},
  sendCrossPathsInvitation: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  respondCrossPathsInvitation: {maxRequests: 20, windowMs: 60 * 1000},
  cancelCrossPathsInvitationOrPlan: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  // 3/hour
  createClub: {maxRequests: 3, windowMs: 60 * 60 * 1000},
  createOrganizer: {maxRequests: 3, windowMs: 60 * 60 * 1000},
  requestAccountDeletion: {maxRequests: 3, windowMs: 60 * 60 * 1000},
  createPublicClubReview: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  createPublicOrganizerReview: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  requestClubClaim: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  requestOrganizerClaim: {maxRequests: 5, windowMs: 60 * 60 * 1000},
  // Admin/internal callables. Generous limits — these are role-gated and
  // audit-logged, so the cap is defense-in-depth against a compromised admin
  // token or a runaway client, not a primary control.
  adminLinkOrganizerIntakeToSales: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetSalesFunnelReport: {maxRequests: 4, windowMs: 60 * 1000},
  adminGetOverview: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetSafetyTriageDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminDecideSafetyTriageItem: {maxRequests: 30, windowMs: 60 * 1000},
  adminAssignSafetyTriageItem: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetAdminUserRoles: {maxRequests: 30, windowMs: 60 * 1000},
  adminListAdminRoleAssignments: {maxRequests: 30, windowMs: 60 * 1000},
  adminSetAdminUserRoles: {maxRequests: 10, windowMs: 60 * 1000},
  getHostAnalytics: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetHostAnalytics: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetUserAnalytics: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetAccessApplicationDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminListClubClaimRequests: {maxRequests: 60, windowMs: 60 * 1000},
  adminGetClubClaimRequestDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminDecideClubClaim: {maxRequests: 30, windowMs: 60 * 1000},
  adminDecideOrganizerClaim: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetClubDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminListClubDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminSetClubIndexStatus: {maxRequests: 30, windowMs: 60 * 1000},
  adminListCrossPathsShowcaseCandidates: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  adminSetCrossPathsShowcaseEligibility: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminGetEventDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminListEventDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminListExternalEventDetails: {maxRequests: 60, windowMs: 60 * 1000},
  adminUpdateEventDetails: {maxRequests: 30, windowMs: 60 * 1000},
  adminGetEventSupplyReadiness: {maxRequests: 60, windowMs: 60 * 1000},
  adminPublishExternalEvent: {maxRequests: 10, windowMs: 60 * 1000},
  adminTakedownExternalEvent: {maxRequests: 10, windowMs: 60 * 1000},
  adminGetEventIntakeDashboard: {maxRequests: 60, windowMs: 60 * 1000},
  adminListIntakeOperations: {maxRequests: 120, windowMs: 60 * 1000},
  adminListActionExecutions: {maxRequests: 60, windowMs: 60 * 1000},
  adminRecordActionExecution: {maxRequests: 120, windowMs: 60 * 1000},
  adminDecideOrganizerIntake: {maxRequests: 30, windowMs: 60 * 1000},
  adminRecordOrganizerCuration: {maxRequests: 30, windowMs: 60 * 1000},
  adminCreateOrganizerDraftFromCandidate: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  adminRecordEventIntakeReviewDecision: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminDecideOrganizerEventCandidate: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminResolveOrganizerEventLocation: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminDecideOrganizerPolicyGap: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminNominateOrganizer: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  adminCreateMarketingContentDraft: {maxRequests: 30, windowMs: 60 * 1000},
  adminDecideAccessApplication: {maxRequests: 30, windowMs: 60 * 1000},
  adminUpdateClubDetails: {maxRequests: 30, windowMs: 60 * 1000},
  requestSuvbotDemoOperation: {maxRequests: 20, windowMs: 60 * 1000},
  listSuvbotDemoActions: {maxRequests: 60, windowMs: 60 * 1000},
};

/** Default limit: 30/min for actions not explicitly listed above. */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,
};

/** Actions already warned about (once per instance) to avoid log spam. */
const warnedMissingRateLimitActions = new Set<string>();

// ── Implementation ─────────────────────────────────────────────────────────

/**
 * Checks whether [uid] has exceeded the rate limit for [action].
 *
 * Reads and increments a counter inside a Firestore transaction, which
 * guarantees atomicity — two concurrent requests for the same user/action
 * cannot both pass the limit.
 *
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Authenticated user ID.
 * @param {string} action Action name (key in `RATE_LIMITS`).
 * @param {RateLimitConfig=} config Optional rate-limit config.
 * @throws {HttpsError} `resource-exhausted` when limit exceeded.
 */
export async function checkRateLimit(
  db: FirebaseFirestore.Firestore,
  uid: string,
  action: string,
  config?: RateLimitConfig
): Promise<void> {
  // Surface actions that silently fall back to the loose default so a missing
  // RATE_LIMITS registration is visible instead of degrading limits unnoticed.
  let limit = config ?? RATE_LIMITS[action];
  if (limit === undefined) {
    if (!warnedMissingRateLimitActions.has(action)) {
      warnedMissingRateLimitActions.add(action);
      logger.warn(
        "checkRateLimit: action has no explicit RATE_LIMITS entry; " +
          "using DEFAULT_RATE_LIMIT. Register it in RATE_LIMITS.",
        {action, default: DEFAULT_RATE_LIMIT}
      );
    }
    limit = DEFAULT_RATE_LIMIT;
  }
  const windowKey = Math.floor(Date.now() / limit.windowMs);
  const docId = `${uid}_${action}_${windowKey}`;

  const docRef = db.collection("rateLimits").doc(docId);

  const allowed = await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    const currentCount: number = doc.exists ? (doc.data()?.count ?? 0) : 0;

    if (currentCount >= limit.maxRequests) {
      return false;
    }

    tx.set(docRef, {
      count: currentCount + 1,
      uid,
      action,
      windowKey,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + limit.windowMs
      ),
    }, {merge: true});

    return true;
  });

  if (!allowed) {
    const windowSeconds = Math.round(limit.windowMs / 1000);
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded for ${action}. ` +
      `Limit: ${limit.maxRequests} per ${windowSeconds}s. ` +
      "Please wait and try again."
    );
  }
}

// ── In-memory rate limiter for unauthenticated endpoints ────────────────────

/**
 * Simple in-memory rate limiter for the public `joinWaitlist` HTTP endpoint.
 *
 * Tracks request counts per IP address in a `Map`. Entries expire after
 * `windowMs`. This is intentionally simple — it does not survive function
 * cold starts (the map resets on each new instance) and does not coordinate
 * across instances. For a low-volume waitlist endpoint, this is sufficient
 * to stop scripted spam.
 */
const ipCounters = new Map<string, {count: number; resetAt: number}>();

/**
 * Checks whether [ip] has exceeded the in-memory rate limit.
 * @param {string} ip Client IP address.
 * @param {number} maxRequests Max requests per window.
 * @param {number} windowMs Window duration in milliseconds.
 * @return {boolean} `true` if the request is allowed.
 */
export function checkIpRateLimit(
  ip: string,
  maxRequests = 3,
  windowMs: number = 60 * 60 * 1000 // 3 per hour
): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounters.set(ip, {count: 1, resetAt: now + windowMs});
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
