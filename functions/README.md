# Cloud Functions

Functions are deployed to `asia-south1` in all Firebase environments:

- `dev` -> `catchdates-dev`
- `staging` -> `catchdates-staging`
- `prod` -> `catch-dating-app-64e51`

Global concurrency ceiling is 50 (`maxInstances` in `src/index.ts`).
Per-function overrides can be added to individual `onCall` / `onDocumentCreated`
options when specific functions need higher or lower limits.

## Catch-owned WhatsApp webhook

`catchWhatsappWebhook` receives Meta's verification challenge and signed
`messages` callbacks for one configured Catch-owned WABA and phone number.
It remains disabled by default and does not activate organizer messaging or
send any message. Signed incoming messages and individual delivery statuses
are persisted idempotently in the server-only `catchWhatsappWebhookEvents`
collection with 30-day TTL. Receipt order does not overwrite delivery state.
Message text is limited to 4,096 characters with an explicit truncation flag;
media is recorded by message type without downloading it. Application logs
omit callback bodies, participant identifiers, verify tokens and app secrets.

Before live setup, provision the exact Catch app's `CATCH_WHATSAPP_APP_SECRET`
and an independently generated, at least 32-character
`CATCH_WHATSAPP_WEBHOOK_VERIFY_TOKEN` in that environment's Secret Manager.
Set `CATCH_WHATSAPP_WABA_ID` and `CATCH_WHATSAPP_PHONE_NUMBER_ID` only for the
reviewed sender. Those ids plus both secrets activate the receiver; any missing
value keeps it inert with a 503 before persistence.
No access token is required by this receiving endpoint. Secrets, public endpoint
deployment and Meta subscriptions require separate operator approval. The
metadata-only deployment readiness gate requires both enabled secrets and an
active `catchWhatsappWebhookEvents.expiresAt` TTL policy for this exact target;
provision those prerequisites before its first deployment.

After deployment, read back the actual HTTPS URL rather than assuming it exists.
Use that URL and the verify token in Meta's Catch app production setup; subscribe
to `messages` and subscribe the same app to the exact WABA. Verify a challenge,
wrong-token/signature rejection, and an approved signed test receipt. Publishing,
real-number registration, outbound credentials/templates/billing, sending,
Catch Inbox processing, consent/suppression and operational workflow activation
remain separate setup steps. A stored callback does not authorize a reply or
an event-operation action. Check the exact live TTL policy before receiving
real messages; a source `expiresAt` field alone is not proof of retention.

Protocol: [Meta webhook overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/)
and [endpoint setup](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint).

## Catch-owned WhatsApp receipt consumers

`onCatchWhatsappWebhookEventCreated` processes exact sender-scoped receipts;
`onCatchWhatsappReplyOperationWritten` reconciles early statuses when a reply
operation first saves its provider message ID. Bounded queries correlate the
Catch WABA, phone number, endpoint and saved message ID. Replay does not send a
message, release a send claim, overwrite raw receipts or extend their TTL.
Delivery-only operation updates do not schedule another reconciliation.

`CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED` defaults to false independently of
the receiving endpoint. The deployment parameter materializer explicitly emits
false and rejects true or malformed overrides in this offline milestone.
These consumers have no provider credentials or sending authority. Signed STOP
receipts and sender/endpoint suppression commit atomically at ingress even when
consumers are disabled; retained STOP processing only repairs suppression and
cannot establish completeness of history lost to TTL. Historical evidence,
authenticated reply callables, outbound activation and deployment remain
separately gated work. The private operation/STOP/readiness contracts are canonical; actual historical
evidence and scoped live approvals remain prerequisites for activation.

## Function inventory

| Function | File | Purpose |
|----------|------|---------|
| `onHostContactSummaryChanged` / `onHostContactTraitsSummaryChanged` / `onHostContactChannelSummaryChanged` / `onHostContactVocabularySummaryChanged` / `onHostAudienceSummaryCoverageChanged` / `onHostFormSummaryChanged` / `onHostEventSummaryChanged` / `onHostGroupSummaryChanged` / `onHostResponseSummaryChanged` / `onHostApplicationSummaryChanged` / `onHostApplicationEvidenceSummaryChanged` / `onHostApplicationGrantSummaryChanged` / `onHostResponseConversionSummaryChanged` / `onHostResponseSourceLabelSummaryChanged` / `onHostResponseContactOriginChanged` | `src/hostReadModels/triggers.ts` | Current-source, organizer-scoped People/Forms/private Events/Groups/Responses read-model reconciliation; views are SDK-readable metadata, never mutation or permission authority. |
| `adminReviewCatchWhatsappInbound` | `src/catchMessaging/whatsappReplyHandlers.ts` | Disabled App-Check/rate-limited exact inbound support review for the configured current staff actor and verified recipient; no organizer/workspace projection. |
| `adminSendCatchWhatsappReply` | `src/catchMessaging/whatsappReplyHandlers.ts` | Disabled single controlled service reply with current readiness/STOP/withdrawal checks, durable idempotency and saved provider status; no campaigns or templates. |
| `catchWhatsappWebhook` | `src/catchMessaging/whatsappWebhook.ts` | Separate Catch-owned signed message/status ingress, disabled by default; private immutable receipts and no outgoing messages. |
| `onCatchWhatsappWebhookEventCreated` | `src/catchMessaging/whatsappReceiptConsumer.ts` | Disabled Catch receipt projection and idempotent STOP repair; scoped to the configured sender, no sends. |
| `onCatchWhatsappReplyOperationWritten` | `src/catchMessaging/whatsappReceiptConsumer.ts` | Disabled bounded reconciliation of early delivery receipts after provider message ID save; ignores delivery-only writes. |

### Sales and related workflow registrations (September 2026)

These are generic software capabilities. Strategy policies, prospect records and source exports remain private configuration.

| Function | File | Purpose |
|----------|------|---------|
| `adminListSalesAccounts` / `adminGetSalesAccount` / `adminListSalesTasks` / `adminListSalesOpportunities` / `adminListSalesCustomFields` / `adminGetSalesReceipt` / `adminListSalesInboundIntents` / `adminPreviewSalesImport` / `adminPreviewSalesImportCompensation` / `adminApplySalesImportCompensation` / `adminListSalesContacts` / `adminListSalesEvidence` / `adminCreateSalesAccount` / `adminUpdateSalesAccount` / `adminUpsertSalesTask` / `adminUpsertSalesOpportunity` / `adminRecordSalesActivity` / `adminCreateSalesCustomField` / `adminSetSalesCustomFieldValue` / `adminLinkSalesInboundIntent` / `adminApplySalesImport` / `adminUpsertSalesContact` / `adminAddSalesEvidence` / `adminSetSalesAccountSuppression` / `adminSetSalesContactability` / `adminProposeSalesEvidence` / `adminReviewSalesEvidenceProposal` / `adminListSalesEvidenceProposals` / `adminGetSalesCommercialDetail` / `adminListSalesCommercialReport` / `adminUpsertSalesPilotPlan` / `adminReviseSalesQuote` / `adminApproveSalesQuote` / `adminAcceptSalesQuote` / `adminAttestSalesHostSettlement` | `src/admin/sales/callables.ts` | Private employee Sales records, reviewed imports/corrections, pilot/quote review and Owner settlement attestation; no outreach sending or provider confirmation. |
| `adminSaveSalesIntelligencePolicy` / `adminSaveSalesFactorAssessment` / `adminSaveSalesIntelligenceClause` / `adminReviewSalesIntelligenceClause` / `adminSaveSalesScoreSnapshot` / `adminReviewSalesOutreachDraft` / `adminCopySalesOutreachDraft` / `adminGetSalesIntelligenceScore` / `adminGetSalesIntelligenceCatalog` / `adminListSalesOutreachDrafts` / `adminBuildSalesOutreachInput` / `adminGenerateSalesOutreachDraft` / `adminGetSalesOutreachDraftJob` / `adminGetSalesOutreachDraft` | `src/admin/salesIntelligence/callables.ts` | Private evidence-backed fit assessments, approved wording and reviewed draft jobs; policy remains Owner-controlled. |
| `registerSalesPartner` / `nominateSalesOrganizer` / `getSalesPartnerWorkspace` / `decideSalesPartnerAssignment` / `updateSalesPartnerAssignment` / `adminAssignSalesPartner` / `adminRevokeSalesPartnerAccess` | `src/partners/callables.ts` | Terms-bound partner membership, self-reported organizer nominations, assignment-scoped workspace and explicit partner or employee assignment decisions; no organizer identity claim or outreach authority. |
| `generateSalesPartnerOutreach` / `getSalesPartnerOutreachJob` / `getSalesPartnerOutreachDraft` / `reviewSalesPartnerOutreachDraft` / `copySalesPartnerOutreachDraft` / `recordSalesPartnerManualSend` / `getSalesPartnerPreparation` | `src/partners/callables.ts` | Current-assignment, evidence-backed preparation and editable outreach drafts with partner factual/tone review, manual copy and human-send attestation; never sends or provider-confirms a message. |
| `getSalesDemoSetup` / `prepareSalesDemoFormDraft` / `getSalesDemoPreview` / `startSalesDemo` / `getSalesDemoSession` / `advanceSalesDemo` / `adminSaveSalesDemoBlueprint` / `adminReviewSalesDemoBlueprint` / `adminWithdrawSalesDemoBlueprint` / `adminIssueSalesDemoInvitation` / `adminRevokeSalesDemoInvitation` / `adminGetSalesDemoBlueprint` / `adminGetSalesDemoInvitation` / `adminGetSalesDemoCapability` / `adminListSalesDemoBlueprints` / `adminListSalesDemoInvitations` / `expireSalesDemos` | `src/salesDemo/callables.ts` | Reviewed private synthetic demos, contact-bound invitations, sessions, expiry and verified-manager handoff to a private Forms draft; no automatic publication or claim approval. |
| `createSalesDemoContinuation` / `getSalesDemoContinuation` / `prepareSalesDemoContinuationForm` | `src/salesDemo/callables.ts` | Auth-bound preservation and resumption of one completed private synthetic demo setup, with current invitation, capability, Sales and Forms authority checks before a private draft handoff; no publication authority. |
| `adminGetSalesDemoPartnerReview` / `adminShareSalesDemoPartnerReview` | `src/salesDemo/callables.ts` | Owner review and time-bounded sharing or withdrawal of one exact synthetic preview for the currently assigned partner; invitations, capabilities and organizer control remain unchanged. |
| `getSalesPartnerDemoReviews` / `proposeSalesPartnerDemoWording` | `src/partners/callables.ts` | Assignment-scoped reading of explicitly shared synthetic previews and partner wording proposals pending Owner review; no demo mutation, capability approval, organizer control or sending. |
| `salesAssistant` | `src/salesAssistant/http.ts` | Scoped HTTPS actions for registered assistants with expiring delegation and retry receipts; no unrestricted database access. |
| `adminLinkOrganizerIntakeToSales` | `src/admin/salesIntakeBridge/callables.ts` | Reviewed canonical organizer Intake to private Sales handoff, retryable after curation. |
| `adminListSalesFitQueue` / `adminRefreshSalesFitQueue` / `adminRefreshSalesFitQueueBatch` | `src/admin/salesFitQueue/callables.ts` | Current evidence-qualified fit projections and bounded company-wide refresh/list operations. |
| `adminPreviewSalesImportHistory` / `adminApplySalesImportHistory` / `adminListSalesImportHistory` / `adminListSalesImportHistoryRows` | `src/admin/sales/callables.ts` | Owner-reviewed historical source promotion and employee history reads; imported notes do not establish contact permission or delivery. |
| `adminGetSalesFunnelReport` | `src/admin/salesReporting/callables.ts` | Employee-only bounded snapshot of company hosts, opportunities, stage entries and follow-up obligations; refuses partial totals. |
| `adminReviewSalesPrivacyPolicy` / `adminRestrictSalesOrganizer` / `adminPreviewSalesPrivacyPlan` / `adminReviewSalesPrivacyPlan` / `adminApplySalesPrivacyBatch` / `adminGetSalesPrivacyCase` | `src/admin/salesPrivacy/callables.ts` | Owner policy review, permanent restriction, exact cleanup inventory/review and bounded deletion batches; retained and external records remain explicit. |


### Callable (client-invoked)

| Function | File | Purpose |
|----------|------|---------|
| `getOrganizerTrackingSettings` / `setOrganizerTrackingSettings` / `readPublicOrganizerTrackingSettings` | `src/analytics/organizerTrackingSettings.ts` | Manager-scoped, revision-fenced Meta Pixel and GA4 configuration; bounded public policy lookup returns disabled/null-ID projections until reviewed advertising publication is authorized. |
| `createRazorpayOrder` | `src/payments/` | Create Razorpay order for paid events |
| `createRazorpayHostPaymentAccount` / `refreshRazorpayHostPaymentAccount` | `src/payments/razorpayHostAccounts.ts` | Create or continue a Razorpay Route linked account and refresh its activation state |
| `createStripeHostOnboardingLink` / `refreshStripeHostPaymentAccount` | `src/payments/stripeHostAccounts.ts` | Create Stripe Connect hosted onboarding and refresh its account state |
| `createStripeCheckoutSession` | `src/payments/createStripeCheckoutSession.ts` | Create a non-INR Stripe destination checkout for an enabled host account |
| `verifyRazorpayPayment` | `src/payments/` | Verify payment signature + sign up |
| `previewOrganizerFormAdmission` / `commitOrganizerFormAdmission` | `src/organizerFormAdmission/callable.ts` | Read-only preview and atomic manager-reviewed free/manual-payment admission; validates current response, CRM origin or native application approval, issued offer, and ready seat ledger before roster and receipt writes |
| `previewEventOffers` / `commitEventOffers` / `mutateEventOffer` / `getEventOffer` / `listEventOffers` / `prepareEventOfferHandoff` / `getEventOfferConfiguration` / `configureEventOfferPreferences` / `previewEventOfferPreferences` | `src/organizerEventOffers/` | Reviewed event-specific offers and manual bank-reference review; private storage, historical payment snapshots, no admission/provider effects |
| `createPrivateEventSetup` / `updatePrivateEventBasics` / `updatePrivateEventPreferences` / `getPrivateEventSetup` / `listPrivateEventSetups` / `updatePrivateEventDetails` / `listOfferEventTargets` | `src/events/progressiveSetup/` | Manager-only basic event setup, private event-local payment/preferences snapshots and sanitized reopen; mutations remain closed pending privacy migration |
| `queryOrganizerFormResponses` | `src/organizerResponseQuery/` | Manager-only bounded typed filtering/sorting, safe display page and structured stale-result errors |
| `createEvent` / `updateEvent` / `cancelEvent` / `deleteEvent` | `src/events/` | Host-owned event mutation surface |
| `upsertOrganizerEventVenue` | `src/events/organizerEventVenues.ts` | Create, update, archive, or restore one organizer-owned reusable event venue |
| `publishEventLivePosition` | `src/events/eventLivePositions.ts` | Publish or clear a short-lived foreground Host/operator position when the event route policy and exact operator grant allow it |
| `signUpForFreeEvent` | `src/events/` | Book a free event |
| `cancelEventSignUp` | `src/events/` | Cancel booking (refunds paid events) |
| `configureEventRegistration` / `managePublicEventCheckout` | `src/events/publicRegistration/callables.ts` | Explicit manager registration settings and phone-authorized public paid checkout; frozen terms, seat holds, admission, cancellation and recovery |
| `setEventPublication` / `reconcilePrivateEventSeats` | `src/events/progressiveSetup/callables.ts` | Manager-only revision-fenced publish/unpublish and bounded reviewed seat reconciliation with exact-command retry/discard |
| `joinEventWaitlist` / `leaveEventWaitlist` | `src/events/` | Join or leave a full event's waitlist |
| `placeDetails` / `placesAutocomplete` | `src/places/` | Google Places lookup seam for event locations |
| `createClub` | `src/clubs/` | Create a club and follow it as host |
| `createOrganizer` | `src/organizers/` | Create a canonical organizer and follow it as owner |
| `updateClub` / `archiveClub` / `deleteClub` | `src/clubs/` | Host-owned club mutation surface |
| `updateOrganizer` / `archiveOrganizer` / `deleteOrganizer` | `src/organizers/` | Organizer-owned canonical mutation surface |
| `addClubHost` / `removeClubHost` | `src/clubs/` | Host management surface |
| `addOrganizerManager` / `removeOrganizerManager` / `transferOrganizerOwnership` | `src/organizers/` | Organizer team and ownership management surface |
| `joinClub` / `leaveClub` / `setClubNotificationPreference` | `src/clubs/` | Join/leave a club and manage member notifications |
| `followOrganizer` / `unfollowOrganizer` / `setOrganizerNotificationPreference` | `src/organizers/` | Follow/unfollow an organizer and manage follower notifications |
| `createClubPost` | `src/clubs/` | Host-only follower update with weekly quota and activity fan-out |
| `createOrganizerPost` | `src/organizers/` | Moderated, idempotent organizer follower update with quota, durable delivery operation and bounded immediate fan-out |
| `requestClubClaim` / `adminDecideClubClaim` | `src/clubs/clubClaims.ts` | Public organizer claim submission and audited admin decision |
| `requestOrganizerClaim` / `adminDecideOrganizerClaim` | `src/organizers/organizerClaims.ts` | Canonical organizer claim submission and audited admin decision |
| `startOrganizerConversation` | `src/clubs/clubHostConversations.ts` | Start or resume a viewer conversation with an organizer |
| `sendEventBroadcast` | `src/events/` | Host-only, event-scoped Activity and preference-gated push broadcast with an idempotent receipt and organizer Sends projection |
| `importEventAttendees` / `markEventAttendeeAttendance` | `src/events/eventAttendees.ts` | Import or manually add an external roster and manage operational check-in without Consumer booking |
| `manageHostRosterIntake` | `src/events/hostRosterIntakeApply.ts` | Save, review, revise, and idempotently apply a bounded event-scoped Host roster upload through the canonical attendee writer |
| `registerPublicEvent` | `src/events/eventAttendees.ts` | Phone-OTP public registration for profile-optional, free, open-admission events |
| `createEventRosterHandoff` | `src/events/eventRosterHandoffs.ts` | Create a short-lived, capability-bound email or WhatsApp roster-forwarding handoff for a Host event |
| `getEventAssistanceSetting` / `setEventAssistanceSetting` | `src/eventSuccess/operations/policySettingsHandlers.ts` | Manager-owned typed event defaults and group overrides with source/revision checks; saving a preference does not execute it |
| `getEventAssistanceRuntimeConfig` / `setEventAssistanceRuntimeConfig` | `src/eventSuccess/operations/runtimeConfigHandlers.ts` | Manager-owned event automation configuration and pause, with current source/revision checks and immediate queued-send revocation |
| `getEventAssistanceParticipation` / `setEventAssistanceParticipation` | `src/eventSuccess/operations/participationHandlers.ts` | Current participation and explicit break, departure or re-entry for an organizer manager or the server-linked guest; revision/source fenced and independent of attendance. |
| `listEventAssistanceCases` | `src/eventSuccess/operations/hostCasesHandlers.ts` | Manager-only, paginated practical guest-help queue; restricted safety requests stay private and replaced guest sources are redacted. |
| `resolveEventAssistanceCase` | `src/eventSuccess/operations/hostCasesHandlers.ts` | Revision-fenced resolution, decline, or handoff to a current organizer manager, with immutable retry receipts; does not message guests or change attendance. |
| `getEventAssistanceHostGuests` | `src/eventSuccess/operations/hostGuestsHandlers.ts` | Manager-only, read-only assistance state for 1–50 explicitly selected attendees; preserves participation, check-in, guest intention and work status as separate facts without enrolling guests or sending messages. |
| `getEventAssistanceAccountability` / `resolveEventAssistanceAccountability` | `src/eventSuccess/operations/accountabilityHandlers.ts` | Visit-bound sweep or explicit checkpoint-departure disposition using the shared attendee record; scoped authority, original roster/visit evidence and immutable retry receipts. |
| `getEventAssistanceGroupStaff` / `setEventAssistanceGroupStaff` | `src/eventSuccess/operations/groupStaffHandlers.ts` | Manager-owned lead, pacer and sweep duties on the event staff record; independent expiry and scoped progress authority |
| `getEventAssistanceMembership` / `transferEventAssistanceGroup` | `src/eventSuccess/operations/membershipHandlers.ts` | Read one guest's group and apply typed placement/handover decisions with current scoped staff authority. |
| `getEventAssistanceCheckpoint` / `recordEventAssistanceCheckpoint` | `src/eventSuccess/operations/checkpointHandlers.ts` | Scoped checkpoint observations against an immutable departure roster; partial reports, explained corrections, current-visit checks and durable receipts. |
| `reassignEventAssistanceCheckpointReporter` | `src/eventSuccess/operations/checkpointReporterHandlers.ts` | Manager-only transfer of an outstanding reporter to current scoped staff, preserving the original deadline and immutable assignment history. |
| `setEventAssistanceCheckpointCloseout` | `src/eventSuccess/operations/checkpointCloseoutHandlers.ts` | Current responsible reporter or manager reviews a closeout or reopening with full immutable report/disposition proof, without claiming arrival. |
| `getEventAssistanceDepartureRoster` | `src/eventSuccess/operations/departureRosterHandlers.ts` | Read-only review of explicitly selected checked-in guests; current pace-group membership when scoped, source-fenced selection for atomic departure capture. |
| `getEventAssistanceGroupProgress` / `confirmEventAssistanceDeparture` / `changeEventAssistanceRoute` | `src/eventSuccess/operations/groupProgressHandlers.ts` | Scoped staff/manager progress read, lead/pacer revision-fenced departure confirmation, and manager-only route recovery against opaque current alternatives; no message sending, event-setup mutation, or attendance mutation |
| `getEventAssistanceGuestView` / `submitEventAssistanceGuestChoice` | `src/eventSuccess/operations/guestHandlers.ts` | Read current event instructions through a scoped guest grant and atomically record an approved reply with its intention or help-case effect |
| `getEventRuntimeBootstrap` / `claimEventRuntimeAccess` / `submitEventRuntimeProfile` / `checkInEventRuntime` / `approveEventRuntimeClaim` | `src/eventSuccess/eventRuntime.ts` | Run the no-download attendee bootstrap, verified roster claim or Host approval, event-scoped intake, and check-in workflow |
| `onEventRuntimeParticipantWritten` | `src/eventSuccess/operations/runtimeRequiredDataTrigger.ts` | Create a source-fenced typed request for current missing event-runtime fields; bootstrap/profile submission own guest projection and completion |
| `getEventRehearsalSummary` / `createEventRehearsal` / `getEventRehearsalBootstrap` / `updateEventRehearsalSetup` / `controlEventRehearsal` / `controlEventRehearsalSpatial` / `injectEventRehearsalBehavior` / `resetEventRehearsal` / `rotateEventRehearsalGuestLink` / `getEventRehearsalGuestBootstrap` / `submitEventRehearsalGuestAction` / `completeEventRehearsal` / `exportEventRehearsalReproduction` | `src/eventRehearsal/` | Create and operate an isolated, deterministic Host dress rehearsal plus its anonymous synthetic-guest phone view, including source-fenced practice required-data prompts with no stored profile values |
| `createEventVenueSession` | `src/events/venueSessions.ts` | Create a short-lived signed venue session for attendee self-check-in |
| `getEventSuccessPresenceSummary` / `heartbeatEventSuccessPresence` | `src/eventSuccess/presence.ts` | Maintain private attendee liveness and return the Host-safe presence summary |
| `resolveEventSuccessLateArrival` | `src/eventSuccess/lateArrivals.ts` | Record a revision-fenced Host resolution for a late or returning attendee |
| `getEventAssistanceSmsWithdrawal` / `withdrawEventAssistanceSms` | `src/eventSuccess/operations/smsWithdrawalHandlers.ts` | Stop original event texts from the SMS link, independently of instruction expiry and event cancellation |
| `getEventAssistanceParticipantContext` | `src/eventSuccess/operations/participantContext.ts` | Resolve one authenticated guest's canonical attendee identity without inferring it from a booking or exposing candidate records |
| `listEventSmsPreferences` / `listEventWhatsappPreferences` / `listEventRcsPreferences` | `src/eventSuccess/operations/{sms,whatsapp,rcs}PreferenceOptionsHandlers.ts` | Discover the event's saved sender and bounded participant-owned permission history; selection does not grant consent or prove readiness |
| `getEventRcsPreference` / `setEventRcsPreference` | `src/eventSuccess/operations/rcsPreferenceHandlers.ts` | Read and explicitly grant or withdraw verified event RCS permission using the exact reviewed sender and recipient |
| `getEventRcsWithdrawal` / `withdrawEventRcs` | `src/eventSuccess/operations/rcsWithdrawalHandlers.ts` | Read and withdraw RCS permission through its existing scoped guest link, without enrollment authority |
| `listEventAssistanceDeliveries` / `repairEventAssistanceDelivery` | `src/eventSuccess/operations/hostDeliveriesHandlers.ts` | Review delivery attempts and apply typed, revision-fenced repair commands without treating uncertain outcomes as non-delivery |
| `listEventAssistanceDepartureRosters` | `src/eventSuccess/operations/departureHistoryHandlers.ts` | Page immutable departures under current scoped staff authority |
| `getEventAttendanceDisposition` / `recordEventNoShow` | `src/events/attendanceDispositionHandlers.ts` | Review one guest's attendance closeout and explicitly record a source-fenced no-show with an immutable receipt |
| `getEventAttendanceReport` | `src/events/attendanceReportHandlers.ts` | Read the current operational attendance report without inferring attendance from guest intentions |
| `getEventRehearsalMovement` | `src/eventRehearsal/handlers.ts` | Read rehearsal-owned departure, route-decision and checkpoint progress for the shared Event Success runtime |
| `getEventAssistanceSmsPreference` / `setEventAssistanceSmsPreference` | `src/eventSuccess/operations/smsPreferenceHandlers.ts` | Read and update verified participant event-service SMS choices with immutable receipts and withdrawal fences |
| `managePaymentRoutingPolicy` | `src/payments/managePaymentRoutingPolicy.ts` | Finance/Admin Owner reads or revision-fenced replacement of app defaults and organizer overrides, separately for form fees and event admission. Audited configuration only; adapter readiness and frozen payment bindings remain checkout requirements. |
| `adminReviewEventMessagingBudget` / `adminDecideEventMessagingBudget` / `adminApplyEventMessagingBudget` | `src/admin/eventMessagingBudgetReview.ts`, `src/admin/eventMessagingBudget.ts`, `src/admin/eventMessagingBudgetApplication.ts` | Finance/Admin Owner review of exact runtime, sender and budget evidence; revision-fenced approve/hold/reject; and atomic staging of approved event and sender-day ceilings in paused state. These callables grant no spending or dispatch authority and do not contact providers or activate workers. |
| `eventAssistanceRcsWebhook` | `src/eventSuccess/operations/rcsDeliveryWebhook.ts` | Receive verified, bounded RCS callback evidence through the default-disabled HTTP boundary |
| `onEventAssistanceRcsCallbackCreated` | `src/eventSuccess/operations/rcsWebhookProcessing.ts` | Consume private RCS callback evidence using the original dispatch and reply bindings |
| `onAssistanceRcsPermissionChanged` / `onAssistanceRcsSenderChanged` / `onAssistanceRcsBudgetChanged` / `onAssistanceRcsSubscriptionChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Re-evaluate affected work when RCS authority changes; triggers do not establish permission, spending approval or provider activation |
| `eventAssistanceSmsDeliveryWebhook` | `src/eventSuccess/operations/smsDeliveryWebhook.ts` | Dormant, default-disabled GET callback; validates bounded report fields and the per-attempt credential before reconciling delivery. No send, consent or refund authority. |
| `getEventWhatsappWithdrawal` / `withdrawEventWhatsapp` | `src/eventSuccess/operations/whatsappWithdrawalHandlers.ts` | Withdraw the original event-service WhatsApp permission through its bearer message link, independently of current instruction, sender or roster availability |
| `getEventWhatsappPreference` / `setEventWhatsappPreference` | `src/eventSuccess/operations/whatsappPreferenceHandlers.ts` | Read and update verified participant event-service WhatsApp choices for an explicit organizer sender, with immutable receipts and sender/STOP revision fences |
| `getEventSuccessConversationGraph` / `submitEventSuccessConversationGraph` | `src/eventSuccess/conversationGraph.ts` | Read and submit attendee-private, consent-gated conversation outcomes |
| `setEventSuccessAccountabilityResolution` | `src/eventSuccess/accountability.ts` | Acknowledge the configured completion sweep and resolve checked-in attendees |
| `listOrganizerAttentionItems` | `src/organizers/organizerAttention.ts` | Return a manager-authorized, exhaustively reconciled and time-ranked Today attention queue for the organizer workspace |
| `getOrganizerCrmSummary` | `src/organizers/organizerCrm.ts` | Privacy-bounded, deduplicated past-attendee and channel-readiness counts for organizer managers |
| `manageEventApprovalNotifications` | `src/events/approvalNotifications/preferences.ts` | Account-bound optional application-update choices and immutable permission receipts |
| `onEventApplicationApprovalNotification` / `onEventApprovalNotificationPreference` / `onEventApprovalNotificationMessage` / `onEventApprovalWhatsappReceipt` / `retryEventApprovalNotifications` | `src/events/approvalNotifications/triggers.ts` | Durable approval jobs, shared outbox, correlated WhatsApp failure fallback, independent email and bounded recovery |
| `publishOrganizerApplicationForm` / `previewOrganizerApplicationImport` / `importOrganizerApplications` / `listOrganizerApplications` / `getOrganizerApplicationDetail` / `reviewOrganizerApplication` | `src/organizers/organizerApplications.ts` | Provider-neutral Host application publishing, mapping, import, exact-grant-aware review queue and optimistic review actions |
| `getParticipantOrganizerApplicationForm` / `submitParticipantOrganizerApplication` / `revokeParticipantOrganizerDataGrant` | `src/organizers/participantOrganizerApplications.ts` | Phone-authenticated private prefill review, native submission with an exact organizer grant, and participant-owned revocation |
| `decideOrganizerCommunityMembership` | `src/memberships/communityMembership.ts` | Manager-reviewed, revision-bound native community membership grants and prospective revocation with immutable decision receipts |
| `createOrganizerForm` / `updateOrganizerFormDraft` / `getOrganizerFormEditor` / `listOrganizerForms` / `validateOrganizerFormDraft` / `publishOrganizerForm` / `setOrganizerFormLifecycle` / `duplicateOrganizerForm` / `deleteOrganizerFormDraft` / `listOrganizerFormTemplates` | `src/organizers/organizerForms.ts` | Create, edit, validate, publish, paginate, duplicate, pause, archive, and safely delete eligible standalone Host forms and drafts |
| `manageOrganizerFormDomain` / `resolvePublicFormDomain` | `src/organizers/organizerFormDomainCallables.ts`, `organizerFormDomainHttp.ts` | Manager-authorized hostname reservation, DNS verification and revocation; public exact-host lookup exposes only the active form ID after current ownership and DNS checks. Certificate readiness remains a trusted operator action. |
| `promoteFormCommunicationIntent` | `src/organizers/organizerFormConsentPromotion.ts` | Rechecks an explicit respondent communication choice before promoting a purpose-bound organizer contact permission. |
| `listOrganizerFormPayments` | `src/payments/formPayments/formPaymentLedger.ts` | Manager-only bounded form fee ledger, including unfinished checkout and refund status; does not expose unsubmitted answers |
| `manageOrganizerFormPaymentConnection` / `organizerFormPaymentOauthCallback` | `src/payments/formPayments/formPaymentHandlers.ts`, `formPaymentTriggers.ts` | Connect organizer Razorpay accounts with one-use OAuth and verified webhooks; secrets stay in the vault |
| `prepareOrganizerFormPayment` / `getOrganizerFormPayment` / `findOrganizerFormPayment` / `organizerFormPaymentWebhook` / `onOrganizerFormPaymentWebhook` / `reconcileOrganizerFormPayments` | `src/payments/formPayments/` | Freeze verified form fees, discover account-owned payments, recover merchant checkout, verify captured state, submit atomically or refund invalid/expired reservations |
| `prepareEventOfferInvitation` / `manageEventOfferCheckout` | `src/organizerEventOfferRecipients/recipientCallables.ts` | Guarded manager invitation and OTP recipient claim, owned attempt discovery, checkout and status; same source activation boundary as event offers |
| `reconcileOrganizerEventOfferPayments` | `src/payments/offerPayments/offerPaymentRecovery.ts` | Release expired offer checkout holds independently of provider health, recover frozen Route/OAuth orders, atomically admit verified captures or refund failed fulfillment |
| `onCancelledEventOfferPayments` | `src/payments/offerPayments/offerPaymentCancellationTrigger.ts` | Page all paid admissions after host event cancellation, atomically cancel roster attribution and queue full refunds; preserve settlement leases and explicit review failures |
| `reconcilePublicEventPayments` / `onCancelledPublicEventPayments` | `src/events/publicRegistration/recovery.ts` | Recover public checkout, release expired holds, admit verified capture, settle completed events and queue host-cancellation refunds |
| `onCancelledNativeEventRefunds` / `onNativeCancellationRefund` / `recoverNativeCancellationRefunds` | `src/payments/legacyRefunds/recovery.ts` | Stage cancelled-event and late-capture native refunds, recover exact provider attempts and preserve explicit historical/authority review states |
| `getPublicOrganizerForm` / `beginOrganizerFormResponse` / `saveOrganizerFormResponseDraft` / `submitOrganizerFormResponse` / `withdrawOrganizerFormResponse` | `src/organizers/organizerForms.ts` | Resolve bounded public form versions and run app-free, revisioned, idempotent respondent draft, submit, and withdrawal workflows |
| `getEventChatAccess` / `updateEventChatAccess` | `src/chats/eventChatAccess.ts` | Current admission-based room access, explicit join/leave, mute, Host schedule/mode/close/archive; no roster or profile sharing grant |
| `manageEventChatMember` | `src/chats/manageEventChatMember.ts` | Manager-only revisioned remove/ban/reinstate; reinstatement requires current admission and never auto-joins |
| `sendEventChatMessage` / `setEventChatReaction` / `setEventChatTyping` | `src/chats/eventChatMessages.ts` | Current-member message writes, payload-bound retries, revision-fenced reactions and expiring typing |
| `listEventChatMessages` | `src/chats/listEventChatMessages.ts` | Bounded ordered history, current reply resolution and typing hints; server-side block/deletion privacy |
| `actOnEventChatMessage` | `src/chats/eventChatMessageActions.ts` | Account-bound report/block/remove actions; server-derived targets, current authority and idempotent safety receipts |
| `listEventChats` | `src/chats/listEventChats.ts` | Bounded account-scoped event conversation directory with current admission checks |
| `listEventChatParticipants` | `src/chats/listEventChatParticipants.ts` | Current joined/claimed participant names and roles; account-bound cursor and bidirectional block filtering |
| `getEventChatProfile` / `getEventChatProfileSharing` / `updateEventChatProfileSharing` | `src/chats/eventChatProfiles.ts` | Private sharing choices and current admission-protected participant mini profiles; only explicitly selected core and same-organizer applicant fields |
| `listParticipantMessagingPreferences` / `withdrawParticipantMessagingPermission` | `src/messaging/participantMessagingPreferences.ts` | Own-account paginated WhatsApp permission reads and sender-specific idempotent withdrawals; preserves other senders and SMS |
| `getEventViewerState` | `src/events/eventViewerState.ts` | Auth-derived private current eligibility and independent admission/attendance facts; shared canonical readers, bounded source queries, no seat or identity writes |
| `listParticipantActivity` / `getParticipantActivity` | `src/profiles/participantActivity.ts` | Auth-derived own form submission metadata, exact source/version/deletion proof and bounded subject-bound pagination; no profile claim or admission inference |
| `listParticipantFormProfiles` / `getParticipantFormProfile` / `getParticipantFormPhoto` / `claimParticipantFormProfile` | `src/profiles/` | Verified owner-only form profile directory, designated-answer review, metadata-free private photo preview, and explicit revision-fenced claim; no event admission or sharing grant |
| `createOrganizerFormAssetIntent` / `finalizeOrganizerFormAsset` | `src/organizers/organizerFormAssets.ts` | Authorize and finalize form/version/question-scoped respondent uploads without exposing raw Storage authority |
| `createOrganizerFormShareLink` / `getOrganizerFormShareAssets` | `src/organizers/organizerFormDistribution.ts` | Create opaque attributed links and return canonical link, QR, print, and embed assets for a published form |
| `listOrganizerFormResponses` / `getOrganizerFormResponseDetail` / `getOrganizerFormAnalytics` | `src/organizers/organizerFormOperations.ts` | Page, inspect, and aggregate immutable form responses through organizer-authorized projections without screen-time response scans |
| `requestOrganizerFormExport` | `src/organizers/organizerFormExports.ts` | Create an auditable asynchronous CSV or XLSX export request with a bounded, expiring result |
| `createOrganizerFormAutomation` / `setOrganizerFormAutomationState` / `listOrganizerFormAutomationRuns` | `src/organizers/organizerFormAutomations.ts` | Create or edit organizer-wide or form-scoped revisioned rules, delays, signed webhooks and approved message recipes; pause rules and page through sanitized run receipts |
| `previewOrganizerFormConversion` / `convertOrganizerFormResponse` | `src/organizers/organizerFormConversions.ts` | Preview and apply reviewed, idempotent response conversions into authorized application, CRM, or event-roster records |
| `getEventRosterInsights` | `src/organizers/eventRosterInsights.ts` | Manager-only, event-relative customer labels for the live operational roster; incomplete identity/history fails closed and spend is limited to completed Catch payments |
| `listOrganizerContacts` / `getOrganizerContactDetail` / `createOrganizerContact` / `mutateOrganizerContact` / `createOrganizerContactNote` / `mutateOrganizerContactNote` / `recordOrganizerContactOutreach` / `exportOrganizerContacts` | `src/organizers/organizerContacts.ts` | Search, inspect, manually add, safely update, append/edit author-stamped notes, log manager-asserted outreach attempts, and export the organizer-owned audience directory; notes and outreach never enter exports |
| `resolveOrganizerCommunicationPlan` | `src/organizers/organizerCommunicationPlans.ts` | Resolve one manager-authorized communication intent into server-derived route availability, execution ownership, and blockers without mutating delivery state |
| `startOrganizerContactConversation` | `src/clubs/clubHostConversations.ts` | Start or resume a conversation with a verified, unambiguous linked organizer contact |
| `mergeOrganizerContacts` / `unmergeOrganizerContacts` | `src/organizers/organizerContactMerges.ts` | Reversible manager-reviewed contact identity reconciliation |
| `listOrganizerContactMergeCandidates` / `reviewOrganizerContactMergeCandidate` | `src/organizers/organizerContactMergeReview.ts` | Review verified or proposed identity evidence, durably dismiss distinct people, and reopen only the reviewing manager's decision |
| `getOrganizerMessagingSetup` / `completeOrganizerWhatsappConnection` / `syncOrganizerWhatsappTemplates` / `sendOrganizerWhatsappTest` / `disconnectOrganizerWhatsappConnection` | `src/organizers/organizerMessagingSetup.ts` | Connect and verify an organizer-owned Meta WhatsApp sender and synchronize approved templates |
| `resolveOrganizerAudienceMembers` / `upsertOrganizerSavedAudience` / `listOrganizerSavedAudiences` / `previewOrganizerSavedAudience` / `archiveOrganizerSavedAudience` | `src/organizers/organizerSavedAudiences.ts` | Persist and exactly evaluate Customers-owned reusable CRM audiences through the closed typed predicate vocabulary |
| `prepareOrganizerManualSendTask` / `listOrganizerManualSendTasks` / `validateOrganizerManualSendTaskLaunch` / `openOrganizerManualSendTask` / `markOrganizerManualSendTask` / `replanOrganizerManualSendTasks` | `src/organizers/organizerManualSendTasks.ts` | Persist and page host-performed WhatsApp handoffs, revalidate current authority before every external launch, record only device-open and explicit host assertions, and recheck routes without auto-dispatching or clearing work |
| `upsertOrganizerCampaign` / `previewOrganizerCampaign` / `approveOrganizerCampaign` / `cancelOrganizerCampaign` / `getOrganizerCampaignReport` | `src/organizers/organizerCampaigns.ts` | Draft, exactly preview, freeze, approve, cancel, and report consent-gated organizer campaigns that reference one saved audience id |
| `listOrganizerCampaigns` | `src/organizers/organizerSends.ts` | Page through the organizer's reverse-chronological Campaign, Announcement and Follower update Sends history |
| `listOrganizerWhatsappThreads` / `getOrganizerWhatsappThread` / `sendOrganizerWhatsappReply` | `src/organizers/organizerWhatsappThreads.ts` | Read retained inbound WhatsApp conversations and reply only inside the current customer-service window |
| `dispatchOrganizerCampaign` | `src/organizers/organizerCampaignDispatcher.ts` | Dispatch one approved organizer campaign snapshot |
| `createAttendeeInviteLink` / `getEventInviteLinkToken` / `recordEventShareIntent` / `resolveEventInviteLanding` | `src/events/inviteLinks.ts` | Issue opaque attributable attendee links, record Catch share intent, and resolve verified invite landings |
| `getOrganizerProviderSetup` / `connectOrganizerLumaProvider` / `listOrganizerLumaEvents` / `syncOrganizerProviderEvent` / `disconnectOrganizerProvider` | `src/organizers/organizerProviderSetup.ts` | Configure, inspect, synchronize, and disconnect supported external booking providers |
| `getEventOperatorAccess` / `listEventStaff` / `grantEventStaff` / `revokeEventStaff` | `src/events/eventStaff.ts` | Grant and inspect time-bounded event staff access |
| `createOrganizerProgram` / `updateOrganizerProgram` / `listOrganizerPrograms` / `getOrganizerProgram` | `src/programs/programs.ts` | Manager-owned private program (wedding/offsite) lifecycle and setup overview |
| `getProgramWorkAccess` / `listProgramStaff` / `grantProgramStaff` / `revokeProgramStaff` | `src/programs/programStaff.ts` | Duty- and station-scoped program staff grants and work-shell bootstrap |
| `listMyHostAssignments` | `src/hostWork/listMyHostAssignments.ts` | Actor-scoped program staff duty list for the host-work shell |
| `inviteProgramStaff` / `claimProgramStaffInvite` / `revokeProgramStaffInvite` | `src/programs/programStaffInvites.ts` | Single-use phone-bound staff invites that redeem into station-scoped grants on verified-phone claim |
| `upsertProgramGuest` / `listProgramGuests` / `upsertProgramHousehold` / `listProgramHouseholds` | `src/programs/programGuests.ts` | Person-level program guests and household groupings (no phone-based merging) |
| `upsertProgramGuestGroup` / `listProgramGuestGroups` / `deleteProgramGuestGroup` | `src/programs/programGuestGroups.ts` | Organizer-defined guest group dimensions with denormalized member counts |
| `applyProgramFunctionInvitations` / `recordProgramFunctionRsvp` | `src/programRsvp/programRsvpCallables.ts` | Function-scoped RSVP invitation application and organizer/host RSVP recording |
| `issueProgramHouseholdRsvpLink` / `getProgramHouseholdRsvpView` / `submitProgramHouseholdRsvp` / `programHouseholdItineraryIcs` | `src/programRsvp/householdRsvp.ts` | Token-scoped household RSVP: signed link issuance, bounded view, household submission, and ICS itinerary export |
| `upsertOrganizerMoment` / `armOrganizerMoment` / `pauseOrganizerMoment` / `resumeOrganizerMoment` / `runOrganizerMoment` / `listOrganizerMoments` | `src/moments/momentCallables.ts` | Unified moment lifecycle: draft/arm/pause/resume/list plus requestKey-idempotent manual fire, with approve-the-rule-once semantics |
| `organizerMomentSweep` / `programTravelLegMoments` | `src/moments/momentSchedule.ts` | Scheduled sweep that provisions system defaults and fires due planned runs, and a travel-leg trigger that emits moment facts on leg diffs |
| `upsertProgramFunction` / `upsertProgramPickupPoint` / `upsertProgramHotel` / `upsertTransportVendor` / `listTransportVendors` | `src/programs/programResources.ts` | Program functions, pickup stations, hotels, and organizer transport vendors |
| `upsertProgramTravelLeg` / `upsertProgramTravelParty` | `src/transport/programTravel.ts` | Planner-owned travel legs and ride-together parties |
| `importProgramManifest` | `src/programs/programManifestImport.ts` | Preview/commit guest manifest import with externalReference dedup, household/party label matching, and receipt-backed idempotent convergence |
| `importWeddingPhoneContacts` | `src/programs/programManifestImport.ts` | Wedding-only phone contact preview/commit through the canonical manifest importer; fresh server readiness and current program authority are required |
| `recordProgramDoorJournal` / `getProgramFunctionDoorView` / `createProgramWalkIn` | `src/doorJournal/` | Durable offline-safe door check-in journal, the function-scoped door roster/counts/journal-tail projection, and least-privilege walk-in creation for program function entry points |
| `getProgramAttendanceReport` | `src/programs/attendanceReportView.ts` | Program-wide attendance report for reconciliationViewer staff, coordinators, and managers: per-function RSVP/door separation plus sorted exception guest ids; fails closed past the read cap |
| `archiveProgram` / `unarchiveProgram` / `anonymizeDueProgramsSweep` | `src/programs/programRetention.ts` | Manager-owned archive lifecycle with a grace window: unarchive restores the pre-archive status only while no sweep lease is in flight; the scheduled sweep anonymizes due programs with journaled chunked resume |
| `getProgramStakeholderCounts` | `src/programs/stakeholderCountsView.ts` | Counts-only program overview for stakeholderViewer staff and managers: guest/household headcounts, per-function RSVP/attendance histograms, and hotel-scoped occupancy; no PII crosses |
| `getProgramArrivalsRoster` / `getProgramTransportPlan` / `setProgramTravelReadiness` | `src/transport/programArrivals.ts` | Station-scoped redacted arrivals roster, deterministic grouping suggestions, and claim/ready/disruption writes |
| `dispatchProgramTrip` / `markProgramTripArrived` / `voidProgramTrip` / `getProgramHotelInbound` / `listProgramTrips` | `src/transport/programDispatch.ts` | Idempotent dispatch with plate/vendor capture and assignment exclusivity, trip lifecycle, hotel-scoped inbound projection, and the reconciliation trip ledger |
| `getProgramHotelRooms` / `upsertProgramStay` / `upsertProgramRoomBlock` | `src/programs/programRooms.ts` | Hotel-scoped room board (blocks with live capacity, stays, unplaced routed guests with block suggestions), revision-fenced stay assignment that re-counts block rollups in-transaction, and coordinator-only block inventory writes |
| `manageProgramLodging` | `src/programs/programLodgingApi.ts` | Coordinator-scoped lodging setup, membership review and immutable proposals; scoped hotel confirmation and receipt-backed publication to canonical stays |
| `refreshProgramTravelLeg` / `refreshProgramFlightStatuses` | `src/transport/programFlightRefresh.ts` | Manual leg refresh plus a scheduled proximity-tiered sweep that enriches flight legs from AeroDataBox without overwriting observed arrivals |
| `flightAlertWebhook` | `src/transport/flightAlerts.ts` | Receive AeroDataBox flight-alert pushes against a URL-secret-gated endpoint; applies updates through the same write-back guards as polling and never un-lands a leg |
| `listProgramStaffAttention` | `src/programs/programStaffAttention.ts` | Function-lead attention feed: program-scoped staffAttention moment sends filtered to the caller's active duties, deduplicated per run and duty |
| `setEventAttendeeAttendance` | `src/events/eventAttendees.ts` | Perform revision-safe, replay-safe operational attendance changes |
| `markEventAttendance` | `src/events/` | Host marks attendance |
| `selfCheckInAttendance` | `src/events/` | Participant self-check-in with GPS |
| `generateEventSuccessPods` | `src/eventSuccess/` | Generate event-success pod suggestions |
| `configureEventAssignmentFeatures` / `previewEventAssignmentFeatures` / `setEventAssignmentFeatureConsent` | `src/eventSuccess/assignmentFeatureActions.ts` | Map exact published custom questions to bounded soft matching rules, preview aggregate roster coverage and trusted source labels, and independently grant or withdraw verified respondent answer use. Preview reveals no answers or participant identities; sequence topology is unsupported. |
| `listEventAssignmentFeatureChoices` | `src/eventSuccess/assignmentFeatureActions.ts` | Show a verified respondent their own eligible answer labels and retained historical matching grants for withdrawal, including grants whose Host mapping was removed. |
| `generateEventSuccessRotations` / `overrideEventSuccessRotations` | `src/eventSuccess/` | Generate or override revision-fenced Host-only rotation drafts |
| `controlEventSuccessLive` / `publishEventSuccessRotationRound` | `src/eventSuccess/liveControl.ts` | Revision-fenced live state and confirmed, idempotent prepared-round publication |
| `upsertEventSuccessLayout` / `getEventSuccessSpatialLayout` / `controlEventSuccessSpatial` | `src/eventSuccess/layoutAssets.ts` | Persist reusable room layouts, resolve event spatial state, and control revision-fenced live reveal placement |
| `recordEventSuccessUnitOutcomes` | `src/eventSuccess/unitOutcomes.ts` | Record revision-safe unit outcomes used by standings-backed event formats |
| `fetchEventSuccessWingmanCandidates` / `submitEventSuccessWingmanRequest` / `withdrawEventSuccessWingmanRequest` | `src/eventSuccess/` | Wingman candidate and request workflow |
| `fetchSwipeCandidates` | `src/matching/` | Resolve privacy-filtered post-event matching candidates without exposing event rosters |
| `setCrossPathsEventConsent` | `src/crossPaths/` | Store or revoke private event-level Cross Paths consent after confirmed booking |
| `getCrossPathsSuggestions` | `src/crossPaths/` | Resolve bounded, consent-safe pre-event Explore suggestions without exposing rosters or private preferences |
| `sendCrossPathsInvitation` / `respondCrossPathsInvitation` / `cancelCrossPathsInvitationOrPlan` | `src/crossPaths/` | Send, answer, or cancel event-scoped invitations, companion holds, and accepted plans |
| `createEventReview` / `updateEventReview` / `deleteEventReview` | `src/reviews/` | Review mutation surface |
| `createPublicOrganizerReview` / `listPublicOrganizerReviews` | `src/reviews/` | Create or list reviews against canonical organizers |
| `manageWebsiteAccount` | `src/profiles/websiteAccount.ts` | Read or complete the authenticated minimal account with verified phone, optional birth date, revision fencing, own follow state and event age eligibility |
| `updateUserProfile` | `src/profiles/` | Profile patch callable with generated contract validation |
| `blockUser` / `unblockUser` | `src/safety/` | Block/unblock another user |
| `requestAccountDeletion` | `src/safety/` | Anonymize + delete user data |
| `reportUser` | `src/safety/` | File a safety report |
| `listSuvbotDemoActions` / `requestSuvbotDemoOperation` | `src/demoOps/` | Demo-data operation catalogue and request surface |
| `adminListCrossPathsShowcaseCandidates` / `adminSetCrossPathsShowcaseEligibility` | `src/admin/crossPathsShowcaseEligibility.ts` | Admin bounded Cross Paths showcase review queue and audited score-free eligibility decision |
| `adminListActionExecutions` | `src/admin/adminActionExecutions.ts` | Admin bounded execution-receipt register for catalog-driven action monitoring |
| `adminRecordActionExecution` | `src/admin/adminActionExecutions.ts` | Admin append-only bounded execution receipt for catalog-driven actions |
| `adminGrantOrganizerEntitlement` | `src/admin/organizerEntitlements.ts` | Admin Owner or Finance grants one organizer entitlement with an idempotent operation receipt and audit log; grants no dispatch authority |
| `adminRevokeOrganizerEntitlementGrant` | `src/admin/organizerEntitlements.ts` | Admin Owner or Finance revokes one existing organizer entitlement grant with an idempotent operation receipt and audit log |
| `getOrganizerEntitlement` | `src/entitlements/organizerEntitlementRead.ts` | Organizer manager reads a bounded entitlement, usage-meter, and SKU catalog projection without admin-only grant details |
| `adminGetAdminUserRoles` | `src/admin/adminUserRoles.ts` | Admin-owner exact Firebase Auth uid role lookup |
| `adminListAdminRoleAssignments` | `src/admin/adminUserRoles.ts` | Admin-owner bounded role assignment register |
| `adminSetAdminUserRoles` | `src/admin/adminUserRoles.ts` | Admin-owner audited Firebase Auth custom-claim assignment |
| `adminGetSafetyTriageDetails` | `src/admin/safetyTriage.ts` | Admin read-only normalized safety queue detail |
| `adminAssignSafetyTriageItem` | `src/admin/safetyTriage.ts` | Admin audited safety queue assignment |
| `adminDecideSafetyTriageItem` | `src/admin/safetyTriage.ts` | Admin audited safety queue reviewed/dismissed status decision |
| `adminGetAccessApplicationDetails` | `src/admin/accessApplications.ts` | Admin read-only launch access application detail and overlap signals |
| `adminListOrganizerClaimRequests` / `adminGetOrganizerClaimRequestDetails` | `src/admin/clubClaimReview.ts` | Admin pending organizer claim queue and review-safe evidence detail |
| `adminListClubDetails` | `src/admin/clubDetails.ts` | Admin canonical `clubs/{id}` organizer directory |
| `adminGetClubDetails` | `src/admin/clubDetails.ts` | Admin-safe canonical organizer detail snapshot |
| `adminUpdateClubDetails` | `src/admin/clubDetails.ts` | Admin audited owner-safe organizer field patch |
| `adminSetOrganizerIndexStatus` | `src/admin/clubIndexing.ts` | Admin audited organizer index/noindex publishing decision |
| `adminListEventDetails` | `src/admin/eventDetails.ts` | Admin canonical `events/{id}` directory for event publishing ops |
| `adminGetEventDetails` | `src/admin/eventDetails.ts` | Admin-safe canonical event detail snapshot |
| `adminUpdateEventDetails` | `src/admin/eventDetails.ts` | Admin audited safe app-facing event field patch |
| `adminListExternalEventDetails` | `src/admin/externalEventDetails.ts` | Admin read-only external event supply list for `externalEvents/{id}` |
| `adminListIntakeOperations` | `src/admin/intakeOperations.ts` | Role-gated read-only Supply Intake projection with authoritative aggregates, server-filtered human exceptions, and lazy ordinary pages |
| `adminCreateOrganizerDraftFromCandidate` | `src/admin/organizerDraftFromCandidate.ts` | Admin audited, retry-safe creation of a fail-closed organizer draft from reviewed Supply Intake evidence |
| `adminApproveOrganizerListing` | `src/admin/organizerListingApproval.ts` | Admin or owner approve a Supply Intake listing: one audited, idempotent transaction publishes the organizer page unclaimed and noindex (hidden in the app), records the review decision and receipt, links the enquiry it came from, and opens its Sales account, opportunity, tasks and activity |
| `adminNominateOrganizer` | `src/operations/supplyIntake/nominations.ts` | Admin, owner or sales staff nominate an organizer; audited, rate-limited and idempotent per nominator request id. Creates a queued Supply Intake request; nothing is published until staff review the listing |
| `adminGetEventSupplyReadiness` | `src/admin/eventSupplyReadiness.ts` | Admin read-only external event import plan and preflight snapshot |
| `adminPublishExternalEvent` | `src/admin/externalEventPublishing.ts` | Admin audited publish of one preflight-approved read-only `externalEvents/{id}` document |
| `adminTakedownExternalEvent` | `src/admin/externalEventTakedown.ts` | Admin audited dry-run/apply takedown of one published external event without deleting its source or publication receipts |
| `adminGetMarketingOpsDashboard` | `src/admin/marketingOps.ts` | Admin read-only marketing ops dashboard bridge |
| `adminRecordMarketingReviewDecision` | `src/admin/marketingOps.ts` | Admin audited marketing review decision, no publish |
| `adminCreateMarketingContentDraft` | `src/admin/marketingOps.ts` | Admin editable marketing draft creation, no post publish |
| `adminListOrganizerDetails` / `adminGetOrganizerDetails` / `adminUpdateOrganizerDetails` | `src/admin/clubDetails.ts` | Admin canonical organizer directory, detail, and audited safe patch surface |

Event chat notification candidates are checked after a new message commits, but
dispatch is disabled by default. The seam uses current admission, membership,
room, block, mute, account, push preference, and installation checks with the
shared notification helpers. It atomically creates a deterministic hidden
`message` Activity receipt before sending a generic `eventChatMessage` payload
to an injected synthetic sink. The client derives the room route from a
validated event ID. There is no live provider or durable delivery queue, and
sink failure after receipt creation is at-most-once and may lose that push.
Fan-out fails closed above 100 candidate members. Private member answers never
enter previews.

### Firestore-triggered

| Function | File | Trigger |
|----------|------|---------|
| `syncPublicProfile` | `src/profiles/` | `users/{userId}` onWrite — mirrors public fields + age gate |
| `syncClubMemberStats` | `src/clubs/` | `clubMemberships/{membershipId}` onWrite — recomputes `memberCount` |
| `syncOrganizerFollowerStats` | `src/clubs/` | `organizerFollowers/{followerId}` onWrite — recomputes canonical follower totals |
| `onSalesInboundIntentForIntake` | `src/operations/supplyIntake/nominations.ts` | `salesInboundIntents/{intentId}` onCreate — a website host application or partner nomination that names an organizer or a link also becomes a Supply Intake request (deterministic id, idempotent) |
| `onSupplyIntakeRequestCreated` | `src/operations/supplyIntake/triggers.ts` | `supplyIntakeRequests/{requestId}` onCreate — leases the request, gathers its pages, runs Supply Intake and imports the reviewable listing; retries until the third failure |
| `syncOrganizerNextEvent` | `src/clubs/` | `events/{eventId}` onWrite — recomputes organizer next-event projection |
| `syncAlgoliaOrganizerIndex` | `src/search/` | `organizers/{organizerId}` onWrite — synchronizes organizer discovery search records |
| `onSwipeCreated` | `src/matching/` | `profileDecisions/{id}/outgoing/{id}` onCreate — mutual-like → match |
| `onMatchCreated` | `src/matching/` | `matches/{id}` onCreate — FCM push to both users |
| `onMessageCreated` | `src/matching/` | `matches/{id}/messages/{id}` onCreate — unread conversation flag + FCM |
| `onEventSuccessFeedbackWritten` | `src/marketplace/` | Event-success feedback write — recomputes scorecard inputs |
| `onEventSuccessConversationGraphWritten` | `src/eventSuccess/conversationGraph.ts` | Aggregates attendee-private conversation outcomes into anonymous Host scorecard counts |
| `onEventSuccessPlanLiveControlUpdated` | `src/eventSuccess/rotationDraftTrigger.ts` | Prepares guided-rotation round N+1 asynchronously after live start or round-N publication |
| `syncOrganizerReviewStats` | `src/reviews/` | `reviews/{id}` onWrite — recalculates organizer rating |
| `onBlockCreated` | `src/safety/` | `blocks/{id}` onCreate — closes existing matches |
| `onCrossPathsConsentWritten` | `src/crossPaths/` | Cross Paths consent onWrite — invalidates pending invitations after revocation while preserving accepted intent |
| `onCrossPathsEventWritten` | `src/crossPaths/` | `events/{eventId}` onWrite — invalidates invitations/holds when an event becomes unavailable |
| `onCrossPathsParticipationWritten` | `src/crossPaths/` | `eventParticipations/{id}` onWrite — invalidates invitations/holds when participation ends |
| `onCrossPathsBlockCreated` | `src/crossPaths/` | `blocks/{id}` onCreate — invalidates invitations/holds and closes accepted event plans |
| `onEventParticipationRosterProjected` | `src/events/eventAttendeeProjection.ts` | `eventParticipations/{id}` onWrite — projects public display identity and booking status into the operational Host roster without disclosing private-profile contact fields |
| `onEventAttendeeAudienceProjected` | `src/organizers/organizerAudienceProjection.ts` | Event attendee writes project organizer-scoped contact and attendance history |
| `onOrganizerCommunicationPreferenceAudienceProjected` | `src/organizers/organizerAudienceProjection.ts` | Organizer communication preferences update consent-safe audience reachability |
| `onOrganizerContactEventEdgeInviteAttributed` | `src/events/eventInviteAttributionProjection.ts` | Verified invite outcomes update contact advocacy evidence |
| `onOrganizerFormResponseAggregated` | `src/organizers/organizerFormOperations.ts` | Projects submitted and withdrawn response transitions into precomputed form, source, and question aggregates |
| `onOrganizerApplicationAutomated` / `onOrganizerAttendanceAutomated` | `src/organizers/organizerFormAutomations.ts` | Queues future acceptance and attendance actions from current authorized sources; attendance follow-ups wait for the event end |
| `onOrganizerFormResponseAutomated` | `src/organizers/organizerFormAutomations.ts` | Evaluates enabled versioned form rules once for each submitted or withdrawn response transition and records sanitized action results |
| `onOrganizerFormExportRequested` | `src/organizers/organizerFormExports.ts` | Materializes an authorized asynchronous form export and stores a time-bounded download receipt |
| `onEventAssistanceWhatsappEventCreated` | `src/eventSuccess/operations/whatsappWebhookProcessing.ts` | Retry-enabled consumer of authenticated delivery and native reply evidence, with independent durable checkpoints and idempotent guest effects |
| `onAssistanceEventChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Relevant event configuration and lifecycle changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistancePlanChangeChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Immutable event plan changes enqueue policy-bound, bounded operational-notice fanout; dormant pending activation |
| `onAssistanceRosterChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Canonical roster and check-in changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceRuntimeChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Live plan status changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceGuestChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Participation episode and guest reply changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceSettingChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Late-join policy changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceRuntimeConfigChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Runtime configuration or pause wakes existing live work; dormant pending activation |
| `onAssistanceProgressChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Explicitly confirmed group movement enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceMembershipChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Accepted group and handover changes enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceMessageChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Late-join delivery and response evidence enqueue bounded, resumable source work for enrolled live episodes; dormant pending activation |
| `onAssistanceSmsPermissionChanged` / `onAssistanceWhatsappPermissionChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Event-specific consent changes wake scoped guest and delivery work with replay-safe receipts; dormant pending activation |
| `onAssistanceSmsSenderChanged` / `onAssistanceSmsBudgetChanged` / `onAssistanceWhatsappSenderChanged` / `onAssistanceWhatsappPolicyChanged` / `onAssistanceWhatsappTemplateChanged` / `onAssistanceWhatsappBudgetChanged` / `onAssistanceWhatsappStopChanged` / `onAssistanceWhatsappSuppressionChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Sender, template, budget and endpoint suppression changes discover bounded event/guest scopes and wake existing assistance work; dormant pending activation |
| `onAssistanceStaffChanged` / `onAssistanceCheckpointChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Current staff changes wake bounded event work; checkpoint report changes wake their original request, including corrections; dormant pending activation |
| `onAssistanceWorkChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Advances due roster, source, operational-notice, guest, delivery or checkpoint work under Operations leases; dormant pending activation |
| `onOrganizerMessagingWebhookEventCreated` | `src/organizers/organizerWhatsappWebhook.ts` | Authenticated provider receipts update campaign delivery projections without retaining message bodies |
| `moderateChatMessage` | `src/moderation/` | `matches/{id}/messages/{id}` onCreate — banned-word filter |

### Scheduled

| Function | File | Schedule |
|----------|------|----------|
| `sendEventReminders` | `src/events/` | Every 15 minutes — writes reminder activity and push notifications |
| `expireCrossPathsInvitations` | `src/crossPaths/` | Every 15 minutes — expires stale pending Cross Paths invitations |
| `expireCrossPathsPairHolds` | `src/crossPaths/` | Every 5 minutes — releases expired companion reservations and invalidates their invitation receipt |
| `retryOrganizerAutomations` | `src/organizers/organizerFormAutomations.ts` | Every minute — resumes due automation runs and expired leases with bounded retries and per-action deduplication |
| `dispatchScheduledOrganizerCampaigns` | `src/organizers/organizerCampaignDispatcher.ts` | Dispatches due, approved organizer campaign snapshots |
| `dispatchPendingOrganizerFollowerUpdates` | `src/organizers/organizerPostDelivery.ts` | Every 5 minutes — resumes pending or expired-lease follower Activity delivery without duplicate push attempts |
| `expireEventRehearsals` | `src/eventRehearsal/` | Hourly deletion of expired rehearsal sessions and isolated child projections |
| `evaluateDueEventAssistanceWork` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Every minute: bounded recovery of saved roster, source, operational-notice, guest, delivery and checkpoint work; dormant pending operating-budget approval |
| `recoverSupplyIntakeRequests` | `src/operations/supplyIntake/triggers.ts` | Hourly: picks up queued intake requests whose event was lost and requests whose worker stopped mid-lease |

### Storage-triggered

| Function | File | Trigger |
|----------|------|---------|
| `generateProfilePhotoThumbnail` | `src/profiles/` | Profile photo finalize — creates avatar thumbnails |
| `generateOrganizerLogoThumbnail` | `src/organizers/` | Organizer logo finalize — creates canonical organizer thumbnails |
| `generateOrganizerMediaThumbnails`, `generateEventMediaThumbnails` | `src/media/` | Attached organizer and event media writes — creates and safely attaches responsive thumbnails |
| `moderatePhotoOnUpload` | `src/moderation/` | `onObjectFinalized` — SafeSearch analysis |

### HTTP

| Function | File | Purpose |
|----------|------|---------|
| `joinWaitlist` | `src/waitlist/` | Public marketing waitlist endpoint |
| `onHostPilotCheckIn` | `src/acquisition/` | Canonical roster check-in creates one private organiser activation after staff real-event review; no vendor export |
| `hostAcquisitionConsent` | `src/acquisition/` | Default-disabled versioned Host measurement grant and capability withdrawal |
| `expireHostAcquisitionConsent` | `src/acquisition/` | Bounded transactional expiry of private grants and withdrawal tombstones |
| `ingestEventRosterWebhook` | `src/events/eventRosterHandoffs.ts` | Receive one HMAC-verified, provider-authenticated roster attachment through a capability-bound email or WhatsApp handoff |
| `organizerWhatsappWebhook` | `src/organizers/organizerWhatsappWebhook.ts` | Verify Meta webhook signatures and project delivery or STOP events without retaining message content |

## Shared modules

| Module | Purpose |
|--------|---------|
| `src/shared/callableOptions.ts` | App Check enforcement policy |
| `src/shared/generated/` | Contract-generated JSON Schema types, Admin SDK Firestore types, and Ajv validators |
| `src/shared/rateLimit.ts` | Per-user Firestore-transaction rate limiter + IP limiter |
| `src/shared/auth.ts` | `requireAuth()` helper (extracts uid from callable request) |
| `src/shared/validation.ts` | `validateCallableWithAjv()` — generated Ajv request body validation |
| `src/shared/dates.ts` | `computeAge()` — shared DOB → age helper |
| `src/operations/` | Portable operation models, validation, reducers, repositories, and server-only persistence ports |
| `scripts/operations/import-shadow-projection.cjs` | Dry-run-first, alias-bound and production-guarded import/repair of a canonical Supply Intake shadow export into server-only run/work-item collections |
| `src/moderation/textFilter.ts` | `moderateText()` — block/flag word list checker |

## Rate limiting

All callable functions that accept user input are rate-limited via
`checkRateLimit()` from `src/shared/rateLimit.ts`. Limits are defined in
`RATE_LIMITS` (per-action config) and enforced via Firestore transactions.
Counter documents are written to `rateLimits/{uid}_{action}_{windowKey}`.
A TTL policy on `expiresAt` auto-deletes counters after their window expires.

The `joinWaitlist` HTTP endpoint uses `checkIpRateLimit()` — an in-memory
per-IP counter (3 POSTs per hour). This does not survive cold starts.

## Content moderation

**Photos:** `moderatePhotoOnUpload` events Google Cloud Vision SafeSearch on
every Storage upload. Images with `VERY_LIKELY` adult/violent content are
deleted and removed from the user's grouped `profilePhotos`. `LIKELY`
content is flagged for human review. Requires Cloud Vision API enabled on the
GCP project.

**Text:** `moderateChatMessage` checks every chat message against a block-list
(hate speech, slurs, explicit content, self-harm) and a flag-list (profanity,
solicitation, drug references). Blocked messages are replaced with
`[message removed for review]`. Flagged messages are left intact and written
to `moderationFlags/{id}`.

Both moderation systems write to the `moderationFlags` collection (server-only,
no client read/write). See `firestore.rules` for the collection rules.

## Security Defaults

Callable app endpoints must use the shared App Check options from
`src/shared/callableOptions.ts`.

Use:

```ts
onCall(appCheckCallableOptions, handler)
onCall(appCheckCallableOptionsWithSecrets([...]), handler)
```

Do not inline `{enforceAppCheck: true, invoker: "public"}` in individual
function files. Firebase callable Gen 2 functions must be publicly invokable at
the Cloud Event/IAM layer so client SDK calls can reach the callable adapter; App
Check and Firebase Auth are then enforced by the shared callable options and
each handler. The shared options declare this intent, and the default `npm test`
suite includes a guard test that fails when an exported callable does not use
the shared App Check options.

The isolated `demo-catch` emulator suite omits App Check only when the
Functions emulator flag and all three dependent loopback emulator addresses
match. Deployed dev, staging, and production callables still enforce App Check.

`tool/deploy_firebase_targets.sh` synchronizes callable invokers immediately
after each successful Functions phase. The sync command discovers live Cloud
Functions v2 endpoints labeled `deployment-callable=true`, follows pagination,
and uses each exact `serviceConfig.service`; this preserves intentionally live
legacy callables without maintaining a second source list. It grants `allUsers`
only `roles/run.invoker` on those Cloud Run services and preserves existing IAM
bindings. Firebase Auth and App Check remain enforced by the callable adapter
and handler. For controlled recovery, run
`npm run sync:callable-invokers -- <project-id> [...]` directly.

The public `joinWaitlist` endpoint is an HTTPS endpoint for the marketing site,
not a Firebase callable function. It uses an explicit CORS origin allowlist for
Catch domains, Firebase Hosting domains, and local previews. Keep any future
public web-abuse controls for that endpoint separate from callable App Check
enforcement.

## Request validation

Callable functions that accept structured user input should use a generated
Ajv validator from `src/shared/generated/schemaValidators.ts` with
`validateCallableWithAjv(request, validator)` from `src/shared/validation.ts`:

```ts
import {CreateEventCallablePayload} from "../shared/generated/createEventCallablePayload";
import {validateCreateEventCallablePayload} from "../shared/generated/schemaValidators";
import {validateCallableWithAjv} from "../shared/validation";

const data = validateCallableWithAjv<CreateEventCallablePayload>(
  request,
  validateCreateEventCallablePayload,
  normalizeCreateEventPayload,
);
```

Contract sources live under `contracts/`. Regenerate TypeScript validators,
serialized document types, and Admin SDK Timestamp document types with
`node tool/contracts/generate_schema_contracts.mjs`; `./tool/check_data_contract.sh`
fails if generated output is stale. Normalization stays explicit at the callable
boundary so JSON Schema validation remains side-effect free.

Use `src/shared/generated/firestoreAdminTypes.ts` for Admin SDK reads/writes
that return live `FirebaseFirestore.Timestamp` instances. Do not add validation
logic or canonical field definitions there; add or edit the relevant schema in
`contracts/` first.

## Runtime configuration

`EVENT_SUCCESS_DRAFT_PREPARATION_ATTEMPTS` controls the bounded attempts used by
the asynchronous next-rotation draft trigger. It accepts an integer from 1 to
10 and defaults to 3 when absent or invalid. This configuration affects retry
resilience only; rotation publication never performs synchronous generation.

## Secrets

Razorpay secret definitions live in `src/payments/razorpay.ts`.

Current state: `dev`, `staging`, and `prod` use the same Razorpay test-mode
secrets because live Razorpay credentials have not been introduced yet.

Before real payments launch:

1. Create environment-owned Razorpay test/live credentials.
2. Set the plain `RAZORPAY_PUBLIC_KEY_ID` parameter and the server-only
   `RAZORPAY_KEY_SECRET` secret in each Firebase project, following
   `docs/release_operations.md`.
3. Deploy Functions for each environment.
4. Smoke test order creation, payment verification, cancellation, and refunds.

## External API dependencies

| API | Purpose | How to enable |
|-----|---------|---------------|
| Google Cloud Vision | SafeSearch photo moderation | `gcloud services enable vision.googleapis.com --project=<id>` |
| Razorpay | Payment processing | API keys in Firebase Secret Manager |

Without Cloud Vision enabled, `moderatePhotoOnUpload` fails silently on cold
start — photos are allowed but never scanned.

## Deploy runbook

For multi-surface deploys (functions + rules + storage), follow
[`docs/release_operations.md`](../docs/release_operations.md). The runbook
covers ordering dependencies (`config/cities` before rules), smoke tests, and
release evidence.

## Firestore rules

`firebase.json` includes a predeploy hook that runs Functions tests and the
Firestore rules emulator suite before every
`firebase deploy --only firestore:rules`. Broken rules fail the deploy before
reaching Firebase. The same rules tests run in CI on every PR that touches
`firestore.rules` or the schema/contract files
(`.github/workflows/firestore-rules-ci.yml`).

Rules tests live at `test/firestore.rules.test.cjs` and
`test/storage.rules.test.cjs` and use the `@firebase/rules-unit-testing`
emulators. Add test cases for any new rule conditions, especially `diff()`
checks, `hasOnly`/`hasAll` shape validation, and Storage paths that depend on
Firestore relationship documents.

Run the rules suite through the Firestore + Storage emulator wrapper unless you
already have Firestore on `127.0.0.1:8080` and Storage on `127.0.0.1:9199`.
A direct `npm run test:rules` from this directory only works when those
emulators are already running; `connect ECONNREFUSED` means the emulator
workflow is missing, not necessarily that the rules changed incorrectly.

## Commands

Start local development without deploying Functions or using live Firebase:

```bash
npm --prefix functions ci
npm --prefix functions run serve
# In another terminal, from the repository root:
./tool/flutter_with_env.sh local --role host run -d chrome
./tool/flutter_with_env.sh local run -d chrome
```

`serve` builds Functions and starts Auth, Functions, Firestore, and Storage
on the explicit `demo-catch` project. `start` is the same command. The wrapper
uses temporary built code, the checked-in rules, and placeholder secrets from
the existing environment-readiness inventory. It does not copy local secret
files or reuse Google Application Default Credentials. External payments,
messaging, search, and Google API integrations therefore need mocks or explicit
live-dev testing. This is Firebase isolation, not a network sandbox.

The Emulator UI is at `http://127.0.0.1:4000`. Local state is discarded when
the suite stops; no cloud resources are created. Restart `serve` after changing
Functions source. For a bounded local check, use
`npm --prefix functions run serve -- --exec '<local test command>'`.
The Flutter local target supports web and tests; native device and external
integration checks continue to use the explicit `dev` target. See
[`firebase/README.md`](../firebase/README.md) for environment selection.

`npm --prefix functions test` builds TypeScript, then recursively discovers
compiled `lib/**/*.test.js` and non-rules harness specs under
`test/**/*.test.cjs` and `scripts/**/*.test.cjs`. New domain folders do not require a hand-maintained test
script. Firestore and Storage rules stay in the emulator-owned lane below.

```bash
npm --prefix functions run lint
npm --prefix functions test
firebase emulators:exec --project demo-catch-rules --only firestore,storage "npm --prefix functions run test:rules"
./tool/firebase_with_env.sh dev deploy --only functions
./tool/firebase_with_env.sh staging deploy --only functions
./tool/firebase_with_env.sh prod deploy --only functions
./tool/firebase_with_env.sh dev deploy --only firestore:rules
./tool/firebase_with_env.sh staging deploy --only firestore:rules
./tool/firebase_with_env.sh prod deploy --only firestore:rules
npm run sync:callable-invokers -- catchdates-dev catchdates-staging catch-dating-app-64e51
```

| `getOrganizerEventSetupDefaults` | Current-manager read of public basics and private event preferences. |
| `updateOrganizerEventSetupDefaults` | Revision-fenced manager save of private suggestions; no provider activation. |
