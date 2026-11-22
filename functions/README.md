# Cloud Functions

Functions are deployed to `asia-south1` in all Firebase environments:

- `dev` -> `catchdates-dev`
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

These rows name current `src/index.ts` exports, including exports that remain
dormant pending activation. Historical Function names belong in prose outside
the inventory. `node tool/audit/check_fn_readme_inventory.mjs --write` keeps the
rows between the markers in step with `src/index.ts`: it drops removed exports
and lists new ones under "Not yet described" for you to move and describe.

<!-- fn-inventory:start (generated rows: node tool/audit/check_fn_readme_inventory.mjs --write) -->
| Function | File | Purpose |
|----------|------|---------|
| `onHostContactSummaryChanged` / `onHostContactTraitsSummaryChanged` / `onHostContactChannelSummaryChanged` / `onHostContactVocabularySummaryChanged` / `onHostAudienceSummaryCoverageChanged` / `onHostFormSummaryChanged` / `onHostEventSummaryChanged` / `onHostGroupSummaryChanged` / `onHostResponseSummaryChanged` / `onHostApplicationSummaryChanged` / `onHostApplicationEvidenceSummaryChanged` / `onHostResponseConversionSummaryChanged` / `onHostResponseSourceLabelSummaryChanged` / `onHostResponseContactOriginChanged` | `src/hostReadModels/triggers.ts` | Current-source, organizer-scoped People/Forms/private Events/Groups/Responses read-model reconciliation; views are SDK-readable metadata, never mutation or permission authority. |
| `onHostResponseSummaryOfferChanged` | `src/hostReadModels/responseOfferTriggers.ts` | An `organizerEventOffers` write recomputes the derived `offer` (and `reviewStatus` copy) on the response summaries of the application it came from, before and after. |
| `onOrganizerAttentionOrganizerChanged` / `onOrganizerAttentionEventChanged` / `onOrganizerAttentionParticipationChanged` / `onOrganizerAttentionAssistanceCaseChanged` / `onOrganizerAttentionDeliveryReviewChanged` / `onOrganizerAttentionApplicationChanged` / `onOrganizerAttentionProviderSyncChanged` / `onOrganizerAttentionAutomationRuleChanged` / `onOrganizerAttentionAutomationRunChanged` / `onOrganizerAttentionMomentSendChanged` / `onOrganizerAttentionEventOfferChanged` / `onOrganizerAttentionPaymentAccountChanged` / `sweepOrganizerAttention` | `src/hostReadModels/attentionTriggers.ts` | Write the Host Today attention queue (`organizerAttentionItems`) and its schedule (`organizerAttentionSchedules`) ahead of time: one current-source transaction per affected organizer on each source write, plus a five-minute sweep for items that become due or expire with no write. Over-cap sources and invalid source rows record only the schedule. |
| `onHostEventSetupViewEventChanged` / `onHostEventSetupViewPreferencesChanged` / `onHostEventSetupViewOrganizerChanged` / `onHostEventSetupViewAttendeeChanged` / `onHostEventSetupViewAttendeeImportChanged` / `onHostEventSetupViewParticipationChanged` / `onHostEventSetupViewWaitlistOfferChanged` / `onHostEventSetupViewEventOfferChanged` / `onHostEventSetupViewGuestPaymentChanged` / `onHostEventSetupViewMomentChanged` | `src/hostReadModels/eventSetupViewTriggers.ts` | Write each event's manager setup view (`hostEventSetupViews`) ahead of time from the event, its preferences, its organizer, the commitment collections and its start reminder moment (the facts: tickets sold, takings, arrival message); publication readiness leaves time to the phone, so there is no sweep. Invalid sources are recorded on the view. |
| `onHostEventSetupDefaultViewDefaultsChanged` / `onHostEventSetupDefaultViewOrganizerChanged` | `src/hostReadModels/eventSetupDefaultViewTriggers.ts` | Write each organizer's setup defaults view (`hostEventSetupDefaultViews`), hashes included, from the organizer and its defaults document. |
| `onHostEventCaseViewCaseChanged` / `onHostEventCaseViewAttendeeChanged` / `onHostEventCaseViewEventChanged` / `onHostEventCaseViewOrganizerChanged` | `src/hostReadModels/eventCaseViewTriggers.ts` | Write one `hostEventCaseViews` row per live practical guest-help request ahead of time; restricted safety requests never get a view and replaced guest sources are redacted. |
| `onHostEventDeliveryViewMessageChanged` / `onHostEventDeliveryViewGuestChanged` / `onHostEventDeliveryViewAttendeeChanged` / `onHostEventDeliveryViewEventChanged` / `onHostEventDeliveryViewWorkItemChanged` / `onHostEventDeliveryViewRunChanged` / `onHostEventDeliveryViewOrganizerChanged` | `src/hostReadModels/eventDeliveryViewTriggers.ts` | Write one `hostEventDeliveryViews` row per live message ahead of time, with the instant its manual handoff lapses for the phone's clock. |
| `adminReviewCatchWhatsappInbound` | `src/catchMessaging/whatsappReplyHandlers.ts` | Disabled App-Check/rate-limited exact inbound support review for the configured current staff actor and verified recipient; no organizer/workspace projection. |
| `adminSendCatchWhatsappReply` | `src/catchMessaging/whatsappReplyHandlers.ts` | Disabled single controlled service reply with current readiness/STOP/withdrawal checks, durable idempotency and saved provider status; no campaigns or templates. |
| `catchWhatsappWebhook` | `src/catchMessaging/whatsappWebhook.ts` | Separate Catch-owned signed message/status ingress, disabled by default; private immutable receipts and no outgoing messages. |
| `onCatchWhatsappWebhookEventCreated` | `src/catchMessaging/whatsappReceiptConsumer.ts` | Disabled Catch receipt projection and idempotent STOP repair; scoped to the configured sender. With `SUPPLY_MESSAGE_NOMINATIONS_ENABLED`, routes each inbound non-STOP text through `inboundRouter.ts` (nomination, 1-or-2 question, or support) and sends at most one automatic reply per message and purpose, never to a STOPped number. |
| `onMessageNominationListingReady` | `src/catchMessaging/listingReadyReply.ts` | When a message-nominated Supply Intake request completes, publishes it first when a registered associate sent a complete listing (`supplyIntake/autoPublish.ts`), then tells a WhatsApp nominator in the same thread, once per organizer, inside the 24-hour window. Instagram nominators get no later message. Off unless `SUPPLY_MESSAGE_NOMINATIONS_ENABLED` and the receipt consumers are on. |
| `onCatchWhatsappReplyOperationWritten` | `src/catchMessaging/whatsappReceiptConsumer.ts` | Disabled bounded reconciliation of early delivery receipts after provider message ID save; ignores delivery-only writes. |

### Sales and related workflow registrations (September 2026)

These are generic software capabilities. Strategy policies, prospect records and source exports remain private configuration.

| Function | File | Purpose |
|----------|------|---------|
| `adminListSalesAccounts` / `adminGetSalesAccount` / `adminListSalesTasks` / `adminListSalesOpportunities` / `adminListSalesCustomFields` / `adminGetSalesReceipt` / `adminListSalesInboundIntents` / `adminListSalesImports` / `adminListSalesImportHosts` / `adminPreviewSalesImport` / `adminPreviewSalesImportCompensation` / `adminApplySalesImportCompensation` / `adminListSalesContacts` / `adminListSalesEvidence` / `adminCreateSalesAccount` / `adminUpdateSalesAccount` / `adminUpsertSalesTask` / `adminUpsertSalesOpportunity` / `adminRecordSalesActivity` / `adminCreateSalesCustomField` / `adminSetSalesCustomFieldValue` / `adminLinkSalesInboundIntent` / `adminApplySalesImport` / `adminUpsertSalesContact` / `adminAddSalesEvidence` / `adminSetSalesAccountSuppression` / `adminSetSalesContactability` / `adminProposeSalesEvidence` / `adminReviewSalesEvidenceProposal` / `adminListSalesEvidenceProposals` / `adminGetSalesCommercialDetail` / `adminListSalesCommercialReport` / `adminUpsertSalesPilotPlan` / `adminReviseSalesQuote` / `adminApproveSalesQuote` / `adminAcceptSalesQuote` / `adminAttestSalesHostSettlement` | `src/admin/sales/callables.ts` | Private employee Sales records, reviewed imports/corrections, pilot/quote review and Owner settlement attestation; no outreach sending or provider confirmation. |
| `adminSaveSalesIntelligencePolicy` / `adminSaveSalesFactorAssessment` / `adminSaveSalesIntelligenceClause` / `adminReviewSalesIntelligenceClause` / `adminSaveSalesScoreSnapshot` / `adminReviewSalesOutreachDraft` / `adminCopySalesOutreachDraft` / `adminGetSalesIntelligenceScore` / `adminGetSalesIntelligenceCatalog` / `adminListSalesOutreachDrafts` / `adminBuildSalesOutreachInput` / `adminGenerateSalesOutreachDraft` / `adminGetSalesOutreachDraftJob` / `adminGetSalesOutreachDraft` | `src/admin/salesIntelligence/callables.ts` | Private evidence-backed fit assessments, approved wording and reviewed draft jobs; policy remains Owner-controlled. |
| `registerSalesPartner` / `nominateSalesOrganizer` / `getSalesPartnerWorkspace` / `decideSalesPartnerAssignment` / `updateSalesPartnerAssignment` / `adminAssignSalesPartner` / `adminRevokeSalesPartnerAccess` / `adminGetSalesPartnerAccess` | `src/partners/callables.ts` | Terms-bound partner membership, self-reported organizer nominations, assignment-scoped workspace and explicit partner or employee assignment decisions, and an admin read of one host's reservation and that partner's membership for revoke and re-offer; no organizer identity claim or outreach authority. |
| `generateSalesPartnerOutreach` / `getSalesPartnerOutreachJob` / `getSalesPartnerOutreachDraft` / `reviewSalesPartnerOutreachDraft` / `copySalesPartnerOutreachDraft` / `recordSalesPartnerManualSend` / `getSalesPartnerPreparation` | `src/partners/callables.ts` | Current-assignment, evidence-backed preparation and editable outreach drafts with partner factual/tone review, manual copy and human-send attestation; never sends or provider-confirms a message. |
| `getSalesDemoSetup` / `prepareSalesDemoFormDraft` / `getSalesDemoPreview` / `startSalesDemo` / `getSalesDemoSession` / `advanceSalesDemo` / `adminSaveSalesDemoBlueprint` / `adminReviewSalesDemoBlueprint` / `adminWithdrawSalesDemoBlueprint` / `adminIssueSalesDemoInvitation` / `adminRevokeSalesDemoInvitation` / `adminGetSalesDemoBlueprint` / `adminGetSalesDemoInvitation` / `adminGetSalesDemoCapability` / `adminListSalesDemoBlueprints` / `adminListSalesDemoInvitations` / `expireSalesDemos` | `src/salesDemo/callables.ts` | Reviewed private synthetic demos, contact-bound invitations, sessions, expiry and verified-manager handoff to a private Forms draft; no automatic publication or claim approval. |
| `createSalesDemoContinuation` / `getSalesDemoContinuation` / `prepareSalesDemoContinuationForm` | `src/salesDemo/callables.ts` | Auth-bound preservation and resumption of one completed private synthetic demo setup, with current invitation, capability, Sales and Forms authority checks before a private draft handoff; no publication authority. |
| `adminGetSalesDemoPartnerReview` / `adminShareSalesDemoPartnerReview` | `src/salesDemo/callables.ts` | Owner review and time-bounded sharing or withdrawal of one exact synthetic preview for the currently assigned partner; invitations, capabilities and organizer control remain unchanged. |
| `getSalesPartnerDemoReviews` / `proposeSalesPartnerDemoWording` | `src/partners/callables.ts` | Assignment-scoped reading of explicitly shared synthetic previews and partner wording proposals pending Owner review; no demo mutation, capability approval, organizer control or sending. |
| `salesAssistant` | `src/salesAssistant/http.ts` | Scoped HTTPS actions for registered assistants with expiring delegation and retry receipts; no unrestricted database access. |
| `adminListSalesFitQueue` / `adminRefreshSalesFitQueue` / `adminRefreshSalesFitQueueBatch` | `src/admin/salesFitQueue/callables.ts` | Current evidence-qualified fit projections and bounded company-wide refresh/list operations. |
| `adminPreviewSalesImportHistory` / `adminApplySalesImportHistory` / `adminListSalesImportHistory` / `adminListSalesImportHistoryRows` | `src/admin/sales/callables.ts` | Owner-reviewed historical source promotion and employee history reads; imported notes do not establish contact permission or delivery. |
| `adminGetSalesFunnelReport` | `src/admin/salesReporting/callables.ts` | Employee-only bounded snapshot of company hosts, opportunities, stage entries and follow-up obligations; refuses partial totals. |
| `adminReviewSalesPrivacyPolicy` / `adminRestrictSalesOrganizer` / `adminPreviewSalesPrivacyPlan` / `adminReviewSalesPrivacyPlan` / `adminApplySalesPrivacyBatch` / `adminGetSalesPrivacyCase` | `src/admin/salesPrivacy/callables.ts` | Owner policy review, permanent restriction, exact cleanup inventory/review and bounded deletion batches; retained and external records remain explicit. |


### Callable (client-invoked)

| Function | File | Purpose |
|----------|------|---------|
| `getOrganizerTrackingSettings` / `setOrganizerTrackingSettings` | `src/analytics/organizerTrackingSettings.ts` | Manager-scoped, revision-fenced Meta Pixel and GA4 configuration. The public, disabled/null-ID projection lives on the page read models (`src/publicPages`). |
| `createRazorpayHostPaymentAccount` / `refreshRazorpayHostPaymentAccount` | `src/payments/razorpayHostAccounts.ts` | Create or continue a Razorpay Route linked account and refresh its activation state |
| `createStripeHostOnboardingLink` / `refreshStripeHostPaymentAccount` | `src/payments/stripeHostAccounts.ts` | Create Stripe Connect hosted onboarding and refresh its account state |
| `createStripeCheckoutSession` | `src/payments/createStripeCheckoutSession.ts` | Create a non-INR Stripe destination checkout for an enabled host account |
| `previewOrganizerFormAdmission` / `commitOrganizerFormAdmission` | `src/organizerFormAdmission/callable.ts` | Read-only preview and atomic manager-reviewed free/manual-payment admission; validates current response, CRM origin or native application approval, issued offer, and ready seat ledger before roster and receipt writes |
| `previewEventOffers` / `commitEventOffers` / `mutateEventOffer` / `prepareEventOfferHandoff` / `configureEventOfferPreferences` / `previewEventOfferPreferences` | `src/organizerEventOffers/` | Reviewed event-specific offers and manual bank-reference review; private storage, historical payment snapshots, no admission/provider effects |
| `createPrivateEventSetup` / `createPrivateEventSeries` / `updatePrivateEventBasics` / `updatePrivateEventPreferences` / `updatePrivateEventDetails` | `src/events/progressiveSetup/` | Manager-only basic event setup, private event-local payment/preferences snapshots and sanitized reopen; mutations remain closed pending privacy migration |
| `queryOrganizerFormResponses` | `src/organizerResponseQuery/` | Manager-only bounded typed filtering/sorting, safe display page and structured stale-result errors |
| `updateOrganizerEventSetupDefaults` | `src/organizers/eventSetupDefaults/callables.ts` | Revision-fenced save of event setup defaults; managers read them through `hostEventSetupDefaultViews`; no provider activation |
| `createEvent` / `updateEvent` / `cancelEvent` / `deleteEvent` | `src/events/` | Host-owned event mutation surface; creates published events at `setupRevision` 1 and edits, cancels or deletes published events only |
| `upsertOrganizerEventVenue` | `src/events/organizerEventVenues.ts` | Create, update, archive, or restore one organizer-owned reusable event venue |
| `publishEventLivePosition` | `src/events/eventLivePositions.ts` | Publish or clear a short-lived foreground Host/operator position when the event route policy and exact operator grant allow it |
| `signUpForFreeEvent` | `src/events/` | Book a free event |
| `cancelEventSignUp` | `src/events/` | Cancel booking (refunds paid events) |
| `configureEventRegistration` / `managePublicEventCheckout` | `src/events/publicRegistration/callables.ts` | Explicit manager registration settings and phone-authorized public paid checkout, the only INR paid-seat sale path (organizer's own Razorpay via `razorpayOAuth`; Catch's account only when routing explicitly selects `razorpayRoute`); frozen terms, seat holds, admission, cancellation and recovery |
| `setEventPublication` / `reconcilePrivateEventSeats` | `src/events/progressiveSetup/callables.ts` | Manager-only revision-fenced publish/unpublish and bounded reviewed seat reconciliation with exact-command retry/discard |
| `joinEventWaitlist` / `leaveEventWaitlist` | `src/events/` | Join or leave a full event's waitlist |
| `placeDetails` / `placesAutocomplete` | `src/places/` | Google Places lookup seam for event locations |
| `createOrganizer` | `src/organizers/` | Create a canonical organizer and follow it as owner |
| `updateOrganizer` | `src/organizers/` | Organizer-owned canonical mutation surface |
| `addOrganizerManager` / `removeOrganizerManager` / `transferOrganizerOwnership` | `src/organizers/` | Organizer team and ownership management surface |
| `followOrganizer` / `unfollowOrganizer` / `setOrganizerNotificationPreference` | `src/organizers/` | Follow/unfollow an organizer and manage follower notifications |
| `createOrganizerPost` | `src/organizers/` | Moderated, idempotent organizer follower update with quota, durable delivery operation and bounded immediate fan-out |
| `requestOrganizerClaim` / `adminDecideOrganizerClaim` | `src/organizers/organizerClaims.ts` | Canonical organizer claim submission and audited admin decision; approval itself is `prepareOrganizerClaimApproval` in `src/organizers/organizerClaimApproval.ts` |
| `getOrganizerClaimVerificationOptions` / `startOrganizerClaimVerification` | `src/organizers/organizerClaimVerification.ts` | Which proofs a listing offers, and a 30-minute claim code bound to one listing and account; Instagram stays off until `CATCH_INSTAGRAM_CLAIMS_ENABLED` |
| `confirmOrganizerClaimVerification` | `src/organizers/organizerClaimVerification.ts` | Checks the listing's public Luma calendar for the attempt's `catch-<code>` marker through the guarded page fetcher; a match approves the claim. Hidden while page fetching is off |
| `instagramClaimWebhook` | `src/organizers/instagramClaimWebhook.ts` | Meta webhook for direct messages to Catch's Instagram account: signed, once per message, rate-limited per sender; a code from the listing's own account approves the claim |
| `startOrganizerConversation` | `src/clubs/organizerHostConversations.ts` | Start or resume a viewer conversation with an organizer |
| `sendEventBroadcast` | `src/events/` | Host-only, event-scoped Activity and preference-gated push broadcast with an idempotent receipt and organizer Sends projection |
| `importEventAttendees` / `markEventAttendeeAttendance` | `src/events/eventAttendees.ts` | Import or manually add an external roster and manage operational check-in without Consumer booking |
| `manageHostRosterIntake` | `src/events/hostRosterIntakeApply.ts` | Save, review, revise, and idempotently apply a bounded event-scoped Host roster upload through the canonical attendee writer |
| `registerPublicEvent` | `src/events/eventAttendees.ts` | Phone-OTP public registration for profile-optional, free, open-admission events |
| `createEventRosterHandoff` | `src/events/eventRosterHandoffs.ts` | Create a short-lived, capability-bound email or WhatsApp roster-forwarding handoff for a Host event |
| `setEventAssistanceSetting` | `src/eventSuccess/operations/policySettingsHandlers.ts` | Manager-owned typed event defaults and group overrides with source/revision checks; saving a preference does not execute it |
| `getEventAssistanceRuntimeConfig` / `setEventAssistanceRuntimeConfig` | `src/eventSuccess/operations/runtimeConfigHandlers.ts` | Manager-owned event automation configuration and pause, with current source/revision checks and immediate queued-send revocation; the read serves the sender picker's pages (the console listens to `hostEventRuntimeViews` for the configuration) |
| `getEventAssistanceParticipation` / `setEventAssistanceParticipation` | `src/eventSuccess/operations/participationHandlers.ts` | Current participation and explicit break, departure or re-entry for an organizer manager or the server-linked guest; revision/source fenced and independent of attendance. |
| `resolveEventAssistanceCase` | `src/eventSuccess/operations/hostCasesHandlers.ts` | Revision-fenced resolution, decline, or handoff to a current organizer manager, with replay receipts in `commandReceipts`; does not message guests or change attendance. |
| `getEventAssistanceHostGuests` | `src/eventSuccess/operations/hostGuestsHandlers.ts` | Manager-only, read-only assistance state for 1–50 explicitly selected attendees; preserves participation, check-in, guest intention and work status as separate facts without enrolling guests or sending messages. |
| `resolveEventAssistanceAccountability` | `src/eventSuccess/operations/accountabilityHandlers.ts` | Visit-bound sweep or explicit checkpoint-departure disposition using the shared attendee record; scoped authority, original roster/visit evidence and replay receipts in `commandReceipts`. |
| `getEventAssistanceGroupStaff` / `setEventAssistanceGroupStaff` | `src/eventSuccess/operations/groupStaffHandlers.ts` | Manager-owned lead, pacer and sweep duties on the event staff record; independent expiry and scoped progress authority |
| `transferEventAssistanceGroup` | `src/eventSuccess/operations/membershipHandlers.ts` | Apply typed placement/handover decisions to one guest's group with current scoped staff authority. |
| `onHostGuestViewEventChanged` / `onHostGuestViewPlanChanged` / `onHostGuestViewAttendeeChanged` / `onHostGuestViewGuestChanged` / `onHostGuestViewMembershipChanged` / `onHostGuestViewOrganizerChanged` / `onHostGuestViewStaffGrantChanged` / `onHostGuestViewSettingChanged` / `onHostGuestViewRuntimeChanged` | `src/hostReadModels/guestViewTriggers.ts` | Write the live console's accountability, membership, assistance setting and automation views ahead of time; managers listen to them under rules |
| `recordEventAssistanceCheckpoint` | `src/eventSuccess/operations/checkpointHandlers.ts` | Scoped checkpoint observations against an immutable departure roster; partial reports, explained corrections, current-visit checks and durable receipts. |
| `reassignEventAssistanceCheckpointReporter` | `src/eventSuccess/operations/checkpointReporterHandlers.ts` | Manager-only transfer of an outstanding reporter to current scoped staff, preserving the original deadline and immutable assignment history. |
| `setEventAssistanceCheckpointCloseout` | `src/eventSuccess/operations/checkpointCloseoutHandlers.ts` | Current responsible reporter or manager reviews a closeout or reopening with full immutable report/disposition proof, without claiming arrival. |
| `getEventAssistanceDepartureRoster` | `src/eventSuccess/operations/departureRosterHandlers.ts` | Read-only review of explicitly selected checked-in guests; current pace-group membership when scoped, source-fenced selection for atomic departure capture. |
| `confirmEventAssistanceDeparture` / `changeEventAssistanceRoute` | `src/eventSuccess/operations/groupProgressHandlers.ts` | Lead/pacer revision-fenced departure confirmation, and manager-only route recovery against opaque current alternatives; no message sending, event-setup mutation, or attendance mutation |
| `getEventAssistanceGuestView` / `submitEventAssistanceGuestChoice` | `src/eventSuccess/operations/guestHandlers.ts` | Read current event instructions through a scoped guest grant and atomically record an approved reply with its intention or help-case effect |
| `getEventRuntimeBootstrap` / `claimEventRuntimeAccess` / `submitEventRuntimeProfile` / `checkInEventRuntime` / `approveEventRuntimeClaim` | `src/eventSuccess/eventRuntime.ts` | Run the no-download attendee bootstrap, verified roster claim or Host approval, event-scoped intake, and check-in workflow |
| `requestEventRuntimeHostHelp` | `src/eventSuccess/eventRuntimeHostHelp.ts` | Let a ready no-download participant open an event-lead help case the live console reads |
| `onEventRuntimeParticipantWritten` | `src/eventSuccess/operations/runtimeRequiredDataTrigger.ts` | Create a source-fenced typed request for current missing event-runtime fields; bootstrap/profile submission own guest projection and completion |
| `createEventRehearsal` / `getEventRehearsalBootstrap` / `updateEventRehearsalSetup` / `controlEventRehearsal` / `controlEventRehearsalSpatial` / `injectEventRehearsalBehavior` / `resetEventRehearsal` / `rotateEventRehearsalGuestLink` / `getEventRehearsalGuestBootstrap` / `submitEventRehearsalGuestAction` / `completeEventRehearsal` / `exportEventRehearsalReproduction` | `src/eventRehearsal/` | Create and operate an isolated, deterministic Host dress rehearsal plus its anonymous synthetic-guest phone view, including source-fenced practice required-data prompts with no stored profile values |
| `createEventVenueSession` | `src/events/venueSessions.ts` | Create a short-lived signed venue session for attendee self-check-in |
| `heartbeatEventSuccessPresence` | `src/eventSuccess/presence.ts` | Record attendee liveness; managers list heartbeats under rules and derive presence on the phone |
| `resolveEventSuccessLateArrival` | `src/eventSuccess/lateArrivals.ts` | Record a revision-fenced Host resolution for a late or returning attendee |
| `getEventAssistanceSmsWithdrawal` / `withdrawEventAssistanceSms` | `src/eventSuccess/operations/smsWithdrawalHandlers.ts` | Stop original event texts from the SMS link, independently of instruction expiry and event cancellation |
| `getEventAssistanceParticipantContext` | `src/eventSuccess/operations/participantContext.ts` | Resolve one authenticated guest's canonical attendee identity without inferring it from a booking or exposing candidate records |
| `listEventSmsPreferences` / `listEventWhatsappPreferences` / `listEventRcsPreferences` | `src/eventSuccess/operations/{sms,whatsapp,rcs}PreferenceOptionsHandlers.ts` | Discover the event's saved sender and bounded participant-owned permission history; selection does not grant consent or prove readiness |
| `getEventRcsPreference` / `setEventRcsPreference` | `src/eventSuccess/operations/rcsPreferenceHandlers.ts` | Read and explicitly grant or withdraw verified event RCS permission using the exact reviewed sender and recipient |
| `getEventRcsWithdrawal` / `withdrawEventRcs` | `src/eventSuccess/operations/rcsWithdrawalHandlers.ts` | Read and withdraw RCS permission through its existing scoped guest link, without enrollment authority |
| `repairEventAssistanceDelivery` | `src/eventSuccess/operations/hostDeliveriesHandlers.ts` | Apply typed, revision-fenced repair commands without treating uncertain outcomes as non-delivery |
| `onHostMovementViewEventChanged` / `onHostMovementViewPlanChanged` / `onHostMovementViewProgressChanged` / `onHostMovementViewRosterChanged` / `onHostMovementViewCheckpointChanged` / `onHostMovementViewAttendeeChanged` / `onHostMovementViewGuestChanged` / `onHostMovementViewMembershipChanged` / `onHostMovementViewWorkItemChanged` / `onHostMovementViewStaffGrantChanged` / `onHostMovementViewOrganizerChanged` | `src/hostReadModels/movementViewTriggers.ts` | Write the live console's group progress, departure and checkpoint views ahead of time; managers listen to them under rules |
| `getEventAttendanceDisposition` / `recordEventNoShow` | `src/events/attendanceDispositionHandlers.ts` | Review one guest's attendance closeout and explicitly record a source-fenced no-show with an immutable receipt |
| `getEventAttendanceReport` | `src/events/attendanceReportHandlers.ts` | Read the current operational attendance report without inferring attendance from guest intentions |
| `getEventRehearsalMovement` | `src/eventRehearsal/handlers.ts` | Read rehearsal-owned departure, route-decision and checkpoint progress for the shared Event Success runtime |
| `getEventAssistanceSmsPreference` / `setEventAssistanceSmsPreference` | `src/eventSuccess/operations/smsPreferenceHandlers.ts` | Read and update verified participant event-service SMS choices with immutable receipts and withdrawal fences |
| `managePaymentRoutingPolicy` | `src/payments/managePaymentRoutingPolicy.ts` | Finance/Admin Owner reads or revision-fenced replacement of app defaults and organizer overrides, separately for form fees, event admission and host memberships (the money flow). Audited configuration only; adapter readiness and frozen payment bindings remain checkout requirements. |
| `manageCommercialTerms` | `src/commercialTerms/manageCommercialTerms.ts` | Finance/Admin Owner reads or revision-fenced replacement of the platform commercial terms or an organizer's sparse override, with a reason, immutable revision history and audit log. New payments freeze the resolved terms. |
| `adminListCommercialTerms` | `src/commercialTerms/adminListCommercialTerms.ts` | Finance/Admin Owner read-only Admin listing of the platform terms, one scope's recent revisions, organizer overrides and an organizer name search. |
| `adminReviewEventMessagingBudget` / `adminDecideEventMessagingBudget` / `adminApplyEventMessagingBudget` | `src/admin/eventMessagingBudgetReview.ts`, `src/admin/eventMessagingBudget.ts`, `src/admin/eventMessagingBudgetApplication.ts` | Finance/Admin Owner review of exact runtime, sender and budget evidence; revision-fenced approve/hold/reject; and atomic staging of approved event and sender-day ceilings in paused state. These callables grant no spending or dispatch authority and do not contact providers or activate workers. |
| `eventAssistanceRcsWebhook` | `src/eventSuccess/operations/rcsDeliveryWebhook.ts` | Receive verified, bounded RCS callback evidence through the default-disabled HTTP boundary |
| `onEventAssistanceRcsCallbackCreated` | `src/eventSuccess/operations/rcsWebhookProcessing.ts` | Consume private RCS callback evidence using the original dispatch and reply bindings |
| `onAssistanceRcsSenderChanged` / `onAssistanceRcsSubscriptionChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Re-evaluate affected work when RCS authority changes; triggers do not establish permission, spending approval or provider activation |
| `eventAssistanceSmsDeliveryWebhook` | `src/eventSuccess/operations/smsDeliveryWebhook.ts` | Dormant, default-disabled GET callback; validates bounded report fields and the per-attempt credential before reconciling delivery. No send, consent or refund authority. |
| `getEventWhatsappWithdrawal` / `withdrawEventWhatsapp` | `src/eventSuccess/operations/whatsappWithdrawalHandlers.ts` | Withdraw the original event-service WhatsApp permission through its bearer message link, independently of current instruction, sender or roster availability |
| `getEventWhatsappPreference` / `setEventWhatsappPreference` | `src/eventSuccess/operations/whatsappPreferenceHandlers.ts` | Read and update verified participant event-service WhatsApp choices for an explicit organizer sender, with immutable receipts and sender/STOP revision fences |
| `getEventSuccessConversationGraph` / `submitEventSuccessConversationGraph` | `src/eventSuccess/conversationGraph.ts` | Read and submit attendee-private, consent-gated conversation outcomes |
| `setEventSuccessAccountabilityResolution` | `src/eventSuccess/accountability.ts` | Acknowledge the configured completion sweep and resolve checked-in attendees |
| `manageEventApprovalNotifications` | `src/events/approvalNotifications/preferences.ts` | Account-bound optional application-update choices and immutable permission receipts |
| `onEventApplicationApprovalNotification` / `onEventApprovalNotificationPreference` / `onEventApprovalNotificationMessage` / `onEventApprovalWhatsappReceipt` / `retryEventApprovalNotifications` | `src/events/approvalNotifications/triggers.ts` | Durable approval jobs, shared outbox, correlated WhatsApp failure fallback, independent email and bounded recovery |
| `publishOrganizerApplicationForm` / `previewOrganizerApplicationImport` / `importOrganizerApplications` / `listOrganizerApplications` / `getOrganizerApplicationDetail` / `reviewOrganizerApplication` | `src/organizers/organizerApplications.ts` | Provider-neutral Host application publishing, mapping, import, exact-grant-aware review queue and optimistic review actions |
| `decideOrganizerCommunityMembership` | `src/memberships/communityMembership.ts` | Manager-reviewed, revision-bound native community membership grants and prospective revocation with immutable decision receipts |
| `listMyOrganizerJourneys` | `src/organizers/organizerJourney.ts` | How a page got here: one organizer's journey for its hosts, or each page the caller is waiting to claim, without staff-only facts |
| `listOrganizerBills` | `src/money/organizerOwnBills.ts` | Organizer owner reads Catch's bills to that organizer: sent or closed bills and free months, without staff-only fields. Older Host builds only; current clients read `hostOrganizerBillViews` |
| `getOrganizerBillingStatus` | `src/money/organizerBillingStatus.ts` | Organizer owner reads billing status: the free trial (start, end, days left) computed from commercial terms and growth facts, and the plan (ticketing or tools-only). Status only, no prices |
| `manageOrganizerBillingPlan` | `src/money/organizerBillingPlan.ts` | Organizer owner reads, buys or cancels the tools-only plan on the host billing website (never the native app): a Razorpay payment link on Catch's account for one tools-only fee that prepays the first tools-only cycle; `payment_link.paid` on `razorpayWebhook` activates it; applies from the next billing cycle; cancelling ends it when the cycle under way closes |
| `deliverOrganizerBillNotice`, `retryOrganizerBillNoticesHourly` | `src/money/billNotices.ts` | When staff send or remind a bill, one `organizerBillNotices` row is queued and delivered: email to the owner's verified Auth address (operational notice; Resend credential from a pinned Secret Manager version named in `billingNoticeSettings/platform`, else `notConfigured`) and a host push that says only that a bill was issued. Deferred emails retry hourly; unknown outcomes never resend. Catch→host WhatsApp is not active and not sent |
| `alertOperatorOnSupportMessage`, `alertOperatorOnSalesLead`, `summariseOperatorAlertOverflow` | `src/hostAlerts/runtime.ts` | Staff emails within a minute of a new support conversation, a support message after four quiet hours, or a new Meta or website lead, with what it is, who, the channel, a 140-character preview, the time and an Admin link (no contact details in the subject). Off until `billingNoticeSettings/platform` carries `operatorAlerts` with `enabled: true`; reuses that document's pinned email credential. One `hostOperatorAlerts` receipt per source, so retries never resend; past `hourlyCap` in a clock hour alerts are held and listed in one summary at minute 2 of the next hour |
| `manageHostMembershipProgram` | `src/hostMemberships/program.ts` | Organizer-manager paid membership program: effective money flow, readiness and unavailable reason; enable binds the organizer's own Razorpay account (hostCollected: Subscriptions probe plus merchant webhook) or the Route account (platformSplit); disable, host-wide billing pause/resume |
| `manageHostMembershipPlans` | `src/hostMemberships/plans.ts` | Organizer-manager membership plan list/save/publish/archive; publish creates immutable Razorpay plans per interval |
| `manageHostMembershipCheckout` | `src/hostMemberships/checkout.ts` | Member subscription checkout: cap-reserving prepare returns the Razorpay hosted mandate link; refresh pulls and applies provider state |
| `manageMyHostMembership` | `src/hostMemberships/selfServe.ts` | Member self-serve pause, resume and cancel-at-period-end through the provider, then the membership state machine |
| `manageEventMembershipRules` | `src/hostMemberships/eventRules.ts` | Organizer-manager event membership rules: member price overrides, anchored early-access window, paid-members-only flag |
| `hostMembershipRazorpayWebhook` | `src/hostMemberships/webhook.ts` | HMAC-verified Razorpay subscription webhook for organizer merchant accounts (`?connectionId=`) and the platform account: dedupe receipt, membership state machine, charge ledger with frozen commercial terms, and the platformSplit Route transfer |
| `reconcileHostMembershipCharges` | `src/hostMemberships/charges.ts` | 15-minute retry of pending, failed or unknown-outcome platformSplit membership Route transfers with read-before-resend recovery |
| `processHostMembershipBillingPause` | `src/hostMemberships/billingPause.ts` | 10-minute paged host-wide billing pause/resume fan-out through the provider |
| `refreshHostMembershipSegments` | `src/hostMemberships/crmRefresh.ts` | Daily bounded CRM trait rebuild so membership and 30/60-day attendance segments stay current |
| `onHostMembershipBenefitUseWritten` | `src/hostMemberships/savingsSummary.ts` | Keeps `savedInPaise` and `memberPricedBookings` on each host membership as member-priced bookings are recorded, released or moved; the dedupe receipt and the totals commit in one transaction |
| `onHostMembershipAudienceProjected` | `src/organizers/organizerAudienceProjection.ts` | Projects a member's membership onto linked organizer contacts and rebuilds their CRM traits |
| `createOrganizerForm` / `updateOrganizerFormDraft` / `getOrganizerFormEditor` / `validateOrganizerFormDraft` / `publishOrganizerForm` / `setOrganizerFormLifecycle` / `duplicateOrganizerForm` / `deleteOrganizerFormDraft` / `listOrganizerFormTemplates` | `src/organizers/organizerForms.ts` | Create, edit, validate, publish, duplicate, pause, archive, and safely delete eligible standalone Host forms and drafts |
| `resolvePublicFormDomain` | `src/customDomains/formDomainHttp.ts` | Public exact-host lookup for custom form domains in the `customDomains` registry (form-target records). Only the trusted operator CLI reserves, verifies, provisions and removes form domains; the lookup exposes only the active form ID after current ownership and DNS checks. Certificate readiness remains a trusted operator action. |
| `promoteFormCommunicationIntent` | `src/organizers/organizerFormConsentPromotion.ts` | Rechecks an explicit respondent communication choice before promoting a purpose-bound organizer contact permission. |
| `listOrganizerFormPayments` | `src/payments/formPayments/formPaymentLedger.ts` | Manager-only bounded form fee ledger, including unfinished checkout and refund status; does not expose unsubmitted answers. Older Host builds; current builds read `hostFormPaymentViews` (retire-later) |
| `manageOrganizerFormPaymentConnection` / `organizerFormPaymentOauthCallback` | `src/payments/formPayments/formPaymentHandlers.ts`, `formPaymentTriggers.ts` | Connect organizer Razorpay accounts with one-use OAuth and verified webhooks; secrets stay in the vault |
| `prepareOrganizerFormPayment` / `getOrganizerFormPayment` / `findOrganizerFormPayment` / `organizerFormPaymentWebhook` / `onOrganizerFormPaymentWebhook` / `reconcileOrganizerFormPayments` | `src/payments/formPayments/` | Freeze verified form fees, discover account-owned payments, recover merchant checkout, verify captured state, submit atomically or refund invalid/expired reservations |
| `refreshOrganizerFormPaymentTokens` | `src/payments/formPayments/formPaymentTokenRefresh.ts` | Hourly: refreshes ready organizer Razorpay OAuth connections whose access token expires within seven days, or already has, through the credential refresh lease; never resends an uncertain or rejected refresh |
| `organizerRazorpayPartnerWebhook` | `src/payments/formPayments/razorpayAuthorizationRevocation.ts` | Razorpay partner app webhook (#1255): verifies the partner `webhookSecret` (v2 partner config; 503 while unset) and on `account.app.authorization_revoked` marks the account's live connections `needsAttention`/`authorizationRevoked` and pushes the owner. A 401 from an organizer token in checkout does the same |
| `manageEventOfferCheckout` | `src/organizerEventOfferRecipients/recipientCallables.ts` | Guarded manager invitation and OTP recipient claim, owned attempt discovery, checkout and status; same source activation boundary as event offers |
| `reconcileOrganizerEventOfferPayments` | `src/payments/offerPayments/offerPaymentRecovery.ts` | Release expired offer checkout holds independently of provider health, recover frozen Route/OAuth orders, atomically admit verified captures or refund failed fulfillment |
| `onCancelledEventOfferPayments` | `src/payments/offerPayments/offerPaymentCancellationTrigger.ts` | Page all paid admissions after host event cancellation, atomically cancel roster attribution and queue full refunds; preserve settlement leases and explicit review failures |
| `reconcilePublicEventPayments` / `onCancelledPublicEventPayments` | `src/events/publicRegistration/recovery.ts` | Recover public checkout, release expired holds, admit verified capture, settle completed events and queue host-cancellation refunds |
| `onCancelledNativeEventRefunds` / `onBookingCancellationRefund` / `recoverNativeCancellationRefunds` | `src/payments/legacyRefunds/recovery.ts` | Stage cancelled-event and late-capture native refunds, recover exact provider attempts and preserve explicit historical/authority review states |
| `getPublicOrganizerForm` / `beginOrganizerFormResponse` / `saveOrganizerFormResponseDraft` / `submitOrganizerFormResponse` / `withdrawOrganizerFormResponse` | `src/organizers/organizerForms.ts` | Resolve bounded public form versions and run app-free, revisioned, idempotent respondent draft, submit, and withdrawal workflows |
| `getEventChatAccess` / `updateEventChatAccess` | `src/chats/eventChatAccess.ts` | Current admission-based room access, explicit join/leave, mute, Host schedule/mode/close/archive; no roster or profile sharing grant |
| `manageEventChatMember` | `src/chats/manageEventChatMember.ts` | Manager-only revisioned remove/ban/reinstate; reinstatement requires current admission and never auto-joins |
| `sendEventChatMessage` / `setEventChatReaction` / `setEventChatTyping` | `src/chats/eventChatMessages.ts` | Current-member message writes, payload-bound retries, revision-fenced reactions and expiring typing |
| `listEventChatMessages` | `src/chats/listEventChatMessages.ts` | Bounded ordered history, current reply resolution and typing hints; server-side block/deletion privacy |
| `actOnEventChatMessage` | `src/chats/eventChatMessageActions.ts` | Account-bound report/block/remove actions; server-derived targets, current authority and idempotent safety receipts |
| `listEventChatParticipants` | `src/chats/listEventChatParticipants.ts` | Current joined/claimed participant names and roles; account-bound cursor and bidirectional block filtering |
| `getEventChatProfile` / `getEventChatProfileSharing` / `updateEventChatProfileSharing` | `src/chats/eventChatProfiles.ts` | Private sharing choices and current admission-protected participant mini profiles; only explicitly selected core and same-organizer applicant fields |
| `withdrawParticipantMessagingPermission` | `src/messaging/participantMessagingPreferences.ts` | Sender-specific idempotent WhatsApp permission withdrawals; preserves other senders and SMS |
| `onGuestMessagingPermissionCatchPreferenceChanged` / `onGuestMessagingPermissionOrganizerPreferenceChanged` / `onGuestMessagingPermissionCatchReceiptChanged` / `onGuestMessagingPermissionOrganizerReceiptChanged` | `src/messaging/guestMessagingPermissionTriggers.ts` | Write each guest's own messaging permission rows (`guestMessagingPermissions`) from preferences and receipts |
| `listParticipantActivity` | `src/profiles/participantActivity.ts` | Auth-derived own form submission metadata, exact source/version/deletion proof and bounded subject-bound pagination; no profile claim or admission inference |
| `getParticipantFormPhoto` / `claimParticipantFormProfile` | `src/profiles/` | Verified owner-only metadata-free private photo preview and explicit revision-fenced claim; no event admission or sharing grant |
| `onParticipantFormProfileViewProposalChanged` / `onParticipantFormProfileViewResponseChanged` / `onParticipantFormProfileViewCardChanged` / `onParticipantIntakeProfileViewChanged` | `src/profiles/participantFormProfileViewTriggers.ts` | Write each guest's own form profile review rows (`participantFormProfileViews`) and intake revision view (`participantIntakeProfileViews`) from proposals, responses, organizer cards and intake profiles |
| `createOrganizerFormAssetIntent` / `finalizeOrganizerFormAsset` | `src/organizers/organizerFormAssets.ts` | Authorize and finalize form/version/question-scoped respondent uploads without exposing raw Storage authority |
| `createOrganizerFormShareLink` / `getOrganizerFormShareAssets` | `src/organizers/organizerFormDistribution.ts` | Create opaque attributed links and return canonical link, QR, print, and embed assets for a published form |
| `listOrganizerFormResponses` / `getOrganizerFormResponseDetail` / `getOrganizerFormAnalytics` | `src/organizers/organizerFormOperations.ts` | Page, inspect, and aggregate immutable form responses through organizer-authorized projections without screen-time response scans |
| `requestOrganizerFormExport` | `src/organizers/organizerFormExports.ts` | Create an auditable asynchronous CSV or XLSX export request with a bounded, expiring result |
| `createOrganizerFormAutomation` / `setOrganizerFormAutomationState` / `listOrganizerFormAutomationRuns` | `src/organizers/organizerFormAutomations.ts` | Create or edit organizer-wide or form-scoped revisioned rules, delays, signed webhooks and approved message recipes; pause rules and page through sanitized run receipts (the list for older Host builds; current builds read the automation views, retire-later) |
| `previewOrganizerFormConversion` / `convertOrganizerFormResponse` | `src/organizers/organizerFormConversions.ts` | Preview and apply reviewed, idempotent response conversions into authorized application, CRM, or event-roster records |
| `onHostRosterInsightEventChanged` / `onHostRosterInsightAttendeeChanged` / `onHostRosterInsightEdgeChanged` / `onHostRosterInsightContactChanged` / `onHostRosterInsightTraitsChanged` / `onHostRosterInsightBookingPaymentChanged` | `src/hostReadModels/rosterInsightViewTriggers.ts` | Write manager-only, event-relative customer labels (`hostEventRosterInsightViews`) ahead of time, with per-organizer Catch spend totals (server-only `organizerSpendTotals`) and top-quartile thresholds (`hostOrganizerSpendProjections`); incomplete identity/history fails closed and spend is limited to completed Catch payments |
| `listOrganizerContacts` / `getOrganizerContactDetail` / `createOrganizerContact` / `mutateOrganizerContact` / `createOrganizerContactNote` / `mutateOrganizerContactNote` / `recordOrganizerContactOutreach` / `exportOrganizerContacts` | `src/organizers/organizerContacts.ts` | Search, inspect, manually add, safely update, append/edit author-stamped notes, log manager-asserted outreach attempts, and export the organizer-owned audience directory; notes and outreach never enter exports |
| `resolveOrganizerCommunicationPlan` | `src/organizers/organizerCommunicationPlans.ts` | Resolve one manager-authorized communication intent into server-derived route availability, execution ownership, and blockers without mutating delivery state |
| `startOrganizerContactConversation` | `src/clubs/organizerHostConversations.ts` | Start or resume a conversation with a verified, unambiguous linked organizer contact |
| `mergeOrganizerContacts` / `unmergeOrganizerContacts` | `src/organizers/organizerContactMerges.ts` | Reversible manager-reviewed contact identity reconciliation |
| `listOrganizerContactMergeCandidates` / `reviewOrganizerContactMergeCandidate` | `src/organizers/organizerContactMergeReview.ts` | Review verified or proposed identity evidence, durably dismiss distinct people, and reopen only the reviewing manager's decision |
| `getOrganizerMessagingSetup` / `completeOrganizerWhatsappConnection` / `syncOrganizerWhatsappTemplates` / `sendOrganizerWhatsappTest` / `disconnectOrganizerWhatsappConnection` | `src/organizers/organizerMessagingSetup.ts` | Connect and verify an organizer-owned Meta WhatsApp sender and synchronize approved templates |
| `resolveOrganizerAudienceMembers` / `upsertOrganizerSavedAudience` / `listOrganizerSavedAudiences` / `previewOrganizerSavedAudience` / `archiveOrganizerSavedAudience` | `src/organizers/organizerSavedAudiences.ts` | Persist and exactly evaluate Customers-owned reusable CRM audiences through the closed typed predicate vocabulary |
| `prepareOrganizerManualSendTask` / `listOrganizerManualSendTasks` / `validateOrganizerManualSendTaskLaunch` / `openOrganizerManualSendTask` / `markOrganizerManualSendTask` / `replanOrganizerManualSendTasks` | `src/organizers/organizerManualSendTasks.ts` | Persist and page host-performed WhatsApp handoffs, revalidate current authority before every external launch, record only device-open and explicit host assertions, and recheck routes without auto-dispatching or clearing work. The list serves older Host builds; current builds read `organizerManualSendTasks` directly under rules (retire-later) |
| `upsertOrganizerCampaign` / `previewOrganizerCampaign` / `approveOrganizerCampaign` / `cancelOrganizerCampaign` / `getOrganizerCampaignReport` | `src/organizers/organizerCampaigns.ts` | Draft, exactly preview, freeze, approve, cancel, and report consent-gated organizer campaigns that reference one saved audience id |
| `sendOrganizerWhatsappReply` | `src/organizers/organizerWhatsappThreads.ts` | Reply to a retained inbound WhatsApp conversation only inside the current customer-service window |
| `dispatchOrganizerCampaign` | `src/organizers/organizerCampaignDispatcher.ts` | Dispatch one approved organizer campaign snapshot |
| `createAttendeeInviteLink` / `getEventInviteLinkToken` / `recordEventShareIntent` / `resolveEventInviteLanding` | `src/events/inviteLinks.ts` | Issue opaque attributable attendee links, record Catch share intent, and resolve verified invite landings |
| `connectOrganizerLumaProvider` / `listOrganizerLumaEvents` / `syncOrganizerProviderEvent` / `disconnectOrganizerProvider` | `src/organizers/organizerProviderSetup.ts` | Configure, synchronize, and disconnect supported external booking providers |
| `onHostRequestViewParticipationWritten` / `onHostRequestViewEventWritten` / `onHostRequestViewProfileWritten` / `onHostRequestViewContactSummaryWritten` / `onHostRequestViewContactWritten` | `src/hostReadModels/requestViewTriggers.ts` | Write each coming event's join requests and waitlist (`hostEventRequestViews`) for Host Requests |
| `onHostContactDetailViewContactWritten` / `onHostContactDetailViewTraitsWritten` / `onHostContactDetailViewEdgeWritten` / `onHostContactDetailViewPaymentWritten` / `onHostContactDetailViewEventWritten` / `onHostContactDetailViewMergeReceiptWritten` | `src/hostReadModels/contactDetailViewTriggers.ts` | Write each shown contact's traits, revenue, newest event rows and active merges (`hostContactDetailViews`) for the Host person page and its undo merge |
| `onHostApplicationDetailViewApplicationWritten` / `onHostApplicationDetailViewFormResponseWritten` / `onHostApplicationDetailViewImportedResponseWritten` / `onHostApplicationDetailViewOriginWritten` / `onHostApplicationDetailViewMembershipWritten` | `src/hostReadModels/applicationDetailViewTriggers.ts` | Write each application's manager review detail (`hostApplicationDetailViews`), exactly as `getOrganizerApplicationDetail` returns it |
| `onHostFormVersionFilterSourceChanged` | `src/hostReadModels/formVersionFilterTriggers.ts` | Write each published form version's answer filter options (`hostFormVersionFilters`) for form-scoped response inboxes |
| `onHostWhatsappThreadViewThreadChanged` / `onHostWhatsappThreadViewContactChanged` | `src/hostReadModels/whatsappThreadViewTriggers.ts` | Write each retained WhatsApp thread's manager inbox summary (`hostWhatsappThreadViews`) from the thread and its contact |
| `onHostSendCampaignChanged` / `onHostSendAnnouncementChanged` / `onHostSendFollowerPostChanged` / `onHostSendFollowerDeliveryChanged` / `onHostSendTemplateChanged` / `onHostSendSavedAudienceChanged` | `src/hostReadModels/sendSummaryTriggers.ts` | Write one manager Sends row per campaign, announcement and follower update (`hostSendSummaries`), and follow template and saved audience renames |
| `onHostOrganizerBillViewBillChanged` | `src/hostReadModels/organizerBillViewTriggers.ts` | Write the owner's view of each sent or closed Catch bill (`hostOrganizerBillViews`), exactly the `listOrganizerBills` row |
| `onHostOrganizerJourneyViewOrganizerChanged` / `onHostOrganizerJourneyViewClaimChanged` / `onHostOrganizerJourneyViewIntakeChanged` / `onHostOrganizerJourneyViewEventChanged` / `onHostOrganizerJourneyViewGrowthChanged` | `src/hostReadModels/organizerJourneyViewTriggers.ts` | Write each manager's and waiting claimant's own journey of an organizer (`hostOrganizerJourneyViews`), exactly what `listMyOrganizerJourneys` returns them |
| `onHostFormAutomationRuleChanged` / `onHostFormAutomationRunChanged` | `src/hostReadModels/formAutomationViewTriggers.ts` | Write each automation rule's manager row without its webhook secret (`hostFormAutomationRuleViews`) and each run's row with its rule's name (`hostFormAutomationRunViews`), and follow rule renames |
| `onHostFormPaymentViewPaymentChanged` | `src/hostReadModels/formPaymentViewTriggers.ts` | Write each form fee payment's ledger row (`hostFormPaymentViews`) for the Host form payments section |
| `onHostProviderConnectionViewConnectionChanged` / `onHostProviderConnectionViewOrganizerChanged` | `src/hostReadModels/providerConnectionViewTriggers.ts` | Write each organizer's manager-safe provider connection rows (`hostProviderConnectionViews`) ahead of time |
| `grantEventStaff` / `revokeEventStaff` | `src/events/eventStaff.ts` | Grant and revoke time-bounded event staff access |
| `heartbeatEventStaffPresence` | `src/events/eventStaffPresence.ts` | Record that a manager or viewRoster staff member is on the door; rows lapse at `expiresAt` (TTL) and door phones list them |
| `getEventTicketCode` / `resolveEventTicketCode` | `src/events/eventTicketCodes.ts` | Sign a guest's stateless ticket code with the event-assistance key ring, and resolve a scanned code to its attendee for the door |
| `createOrganizerProgram` / `updateOrganizerProgram` / `listOrganizerPrograms` / `getOrganizerProgram` | `src/programs/programs.ts` | Manager-owned private program (wedding/offsite) lifecycle and setup overview |
| `getProgramWorkAccess` / `grantProgramStaff` / `revokeProgramStaff` | `src/programs/programStaff.ts` | Duty- and station-scoped program staff grants and work-shell bootstrap |
| `listMyHostAssignments` | `src/hostWork/listMyHostAssignments.ts` | Actor-scoped program staff duty list for the host-work shell (retire-later: current Host builds read `hostAssignmentViews`) |
| `onHostAssignmentProgramGrantChanged` / `onHostAssignmentProgramChanged` / `onHostAssignmentEventGrantChanged` / `onHostAssignmentEventChanged` / `onHostAssignmentMembershipChanged` / `onHostAssignmentOrganizerChanged` | `src/hostWork/hostAssignmentViewTriggers.ts` | Write each account's own staff work-list rows (`hostAssignmentViews`) from its programme and event staff grants and team memberships, and follow programme, event and organiser renames |
| `inviteProgramStaff` / `claimProgramStaffInvite` / `revokeProgramStaffInvite` | `src/programs/programStaffInvites.ts` | Single-use phone-bound staff invites that redeem into station-scoped grants on verified-phone claim |
| `upsertProgramGuest` / `listProgramGuests` / `upsertProgramHousehold` / `listProgramHouseholds` | `src/programs/programGuests.ts` | Person-level program guests and household groupings (no phone-based merging) |
| `upsertProgramGuestGroup` / `listProgramGuestGroups` / `deleteProgramGuestGroup` | `src/programs/programGuestGroups.ts` | Organizer-defined guest group dimensions with denormalized member counts |
| `applyProgramFunctionInvitations` / `recordProgramFunctionRsvp` | `src/programRsvp/programRsvpCallables.ts` | Function-scoped RSVP invitation application and organizer/host RSVP recording |
| `issueProgramHouseholdRsvpLink` / `getProgramHouseholdRsvpView` / `submitProgramHouseholdRsvp` / `programHouseholdItineraryIcs` | `src/programRsvp/householdRsvp.ts` | Token-scoped household RSVP: signed link issuance, bounded view, household submission, and ICS itinerary export |
| `upsertOrganizerMoment` / `armOrganizerMoment` / `pauseOrganizerMoment` / `resumeOrganizerMoment` / `runOrganizerMoment` / `listOrganizerMoments` | `src/moments/momentCallables.ts` | Unified moment lifecycle: draft/arm/pause/resume/list plus requestKey-idempotent manual fire, with approve-the-rule-once semantics |
| `onOrganizerMomentViewChanged` / `onOrganizerMomentRunViewChanged` | `src/moments/organizerMomentViewTriggers.ts` | Write each event and programme moment's Moments board row (`organizerMomentViews`): the moment, its sent count and next planned run |
| `upsertProgramFunction` / `upsertProgramPickupPoint` / `upsertProgramHotel` / `upsertTransportVendor` | `src/programs/programResources.ts` | Program functions, pickup stations, hotels, and organizer transport vendors |
| `upsertProgramTravelLeg` / `upsertProgramTravelParty` | `src/transport/programTravel.ts` | Planner-owned travel legs and ride-together parties |
| `detachProgramTravelLeg` | `src/transport/programTravelPartyDetach.ts` | Coordinator-only removal of one journey from its ride-together party, fenced by the journey's revision; the party keeps its label and vehicle setting, and a departed sibling does not block it |
| `importProgramManifest` | `src/programs/programManifestImport.ts` | Preview/commit guest manifest import with externalReference dedup, household/party label matching, and receipt-backed idempotent convergence |
| `importWeddingPhoneContacts` | `src/programs/programManifestImport.ts` | Wedding-only phone contact preview/commit through the canonical manifest importer; fresh server readiness and current program authority are required |
| `recordProgramDoorJournal` / `getProgramFunctionDoorView` / `createProgramWalkIn` | `src/doorJournal/` | Durable offline-safe door check-in journal, the function-scoped door roster/counts/journal-tail projection, and least-privilege walk-in creation for program function entry points |
| `getProgramAttendanceReport` | `src/programs/attendanceReportView.ts` | Program-wide attendance report for reconciliationViewer staff, coordinators, and managers: per-function RSVP/door separation plus sorted exception guest ids; fails closed past the read cap |
| `archiveProgram` / `unarchiveProgram` / `anonymizeDueProgramsSweep` | `src/programs/programRetention.ts` | Manager-owned archive lifecycle with a grace window: unarchive restores the pre-archive status only while no sweep lease is in flight; the scheduled sweep anonymizes due programs with journaled chunked resume |
| `reconcileOrganizerProgramCountsSweep` | `src/programs/organizerProgramCountTriggers.ts` | Nightly (03:45 IST) recount of every programme view's guest, replied and flying-in counts from `programGuests` and `programTravelLegs`, the backstop for the delta triggers; `tool/data/recompute_organizer_program_counts.mjs` runs the same recount as a backfill |
| `getProgramStakeholderCounts` | `src/programs/stakeholderCountsView.ts` | Counts-only program overview for stakeholderViewer staff and managers: guest/household headcounts, per-function RSVP/attendance histograms, and hotel-scoped occupancy; no PII crosses |
| `getProgramTransportPlan` / `setProgramTravelReadiness` | `src/transport/programArrivals.ts` | Station-scoped deterministic grouping suggestions and claim/ready/disruption writes |
| `dispatchProgramTrip` / `markProgramTripArrived` / `voidProgramTrip` | `src/transport/programDispatch.ts` | Idempotent dispatch with plate/vendor capture and assignment exclusivity, and the trip lifecycle |
| `getProgramHotelRooms` / `upsertProgramStay` / `upsertProgramRoomBlock` | `src/programs/programRooms.ts` | Hotel-scoped room board (blocks with live capacity, stays, unplaced routed guests with block suggestions), revision-fenced stay assignment that re-counts block rollups in-transaction, and coordinator-only block inventory writes |
| `manageProgramLodging` | `src/programs/programLodgingApi.ts` | Coordinator-scoped lodging setup, membership review and immutable proposals; scoped hotel confirmation and receipt-backed publication to canonical stays |
| `refreshProgramFlightStatuses` | `src/transport/programFlightRefresh.ts` | A scheduled proximity-tiered sweep that enriches flight legs from AeroDataBox without overwriting observed arrivals |
| `flightAlertWebhook` | `src/transport/flightAlerts.ts` | Receive AeroDataBox flight-alert pushes against a URL-secret-gated endpoint; applies updates through the same write-back guards as polling and never un-lands a leg |
| `setEventAttendeeAttendance` | `src/events/eventAttendees.ts` | Perform revision-safe, replay-safe operational attendance changes |
| `markEventAttendance` | `src/events/` | Host marks attendance |
| `selfCheckInAttendance` | `src/events/` | Participant self-check-in with GPS |
| `generateEventSuccessPods` | `src/eventSuccess/` | Generate event-success pod suggestions |
| `configureEventAssignmentFeatures` / `previewEventAssignmentFeatures` / `setEventAssignmentFeatureConsent` | `src/eventSuccess/assignmentFeatureActions.ts` | Map exact published custom questions to bounded soft matching rules, preview aggregate roster coverage and trusted source labels, and independently grant or withdraw verified respondent answer use. Preview reveals no answers or participant identities; sequence topology is unsupported. |
| `listEventAssignmentFeatureChoices` | `src/eventSuccess/assignmentFeatureActions.ts` | Show a verified respondent their own eligible answer labels and retained historical matching grants for withdrawal, including grants whose Host mapping was removed. |
| `generateEventSuccessRotations` / `overrideEventSuccessRotations` | `src/eventSuccess/` | Generate or override revision-fenced Host-only rotation drafts |
| `controlEventSuccessLive` / `publishEventSuccessRotationRound` | `src/eventSuccess/liveControl.ts` | Revision-fenced live state (incl. pause/resume of the active step) and confirmed, idempotent prepared-round publication |
| `saveEventPlanStep` | `src/eventSuccess/planSteps.ts` | Revision-fenced, replay-safe run-of-show step edit (add, edit, remove, reorder) into the plan's `stepOverrides` |
| `saveEventSuccessPlanSetup` | `src/eventSuccess/saveEventSuccessPlanSetup.ts` | Catch Host's plan setup save: the setup fields, fenced on `updatedAt`, through the shared plan-setup write in `src/eventSuccess/planSetup.ts` |
| `setEventCloseOut` | `src/eventSuccess/closeOut.ts` | Saves the night's close-out on `eventCloseOuts`; arms or pauses the event-scope thank-you moment |
| `changeEventCrawlStop` | `src/eventSuccess/crawlStop.ts` | Changes one crawl stop on the plan and sends one event broadcast under one requestId |
| `onEventSuccessStandingsWritten` | `src/eventSuccess/guestHistory.ts` | Projects each guest's game history from the standings into `eventSuccessGuestHistory` |
| `upsertEventSuccessLayout` / `getEventSuccessSpatialLayout` / `controlEventSuccessSpatial` | `src/eventSuccess/layoutAssets.ts` | Persist reusable room layouts, resolve event spatial state, and control revision-fenced live reveal placement |
| `recordEventSuccessUnitOutcomes` | `src/eventSuccess/unitOutcomes.ts` | Record revision-safe unit outcomes used by standings-backed event formats |
| `fetchEventSuccessWingmanCandidates` / `submitEventSuccessWingmanRequest` / `withdrawEventSuccessWingmanRequest` | `src/eventSuccess/` | Wingman candidate and request workflow |
| `fetchSwipeCandidates` | `src/matching/` | Resolve privacy-filtered post-event matching candidates without exposing event rosters |
| `setCrossPathsEventConsent` | `src/crossPaths/` | Store or revoke private event-level Cross Paths consent after confirmed booking |
| `getCrossPathsSuggestions` | `src/crossPaths/` | Resolve bounded, consent-safe pre-event Explore suggestions without exposing rosters or private preferences |
| `sendCrossPathsInvitation` / `respondCrossPathsInvitation` / `cancelCrossPathsInvitationOrPlan` | `src/crossPaths/` | Send, answer, or cancel event-scoped invitations, companion holds, and accepted plans |
| `createEventReview` / `updateEventReview` / `deleteEventReview` | `src/reviews/` | Review mutation surface |
| `createPublicOrganizerReview` | `src/reviews/` | Create a review against a canonical organizer; pages show published reviews from their read models |
| `manageWebsiteAccount` | `src/profiles/websiteAccount.ts` | Read or complete the authenticated minimal account with verified phone, optional birth date, revision fencing, own follow state and event age eligibility; an optional read `sections: ["messages"]` returns the website account page's per-organiser message permissions (the page listens to its own plans, follows and reviews) |
| `updateUserProfile` | `src/profiles/` | Profile patch callable with generated contract validation |
| `blockUser` / `unblockUser` | `src/safety/` | Block/unblock another user |
| `requestAccountDeletion` | `src/safety/` | Anonymize + delete user data |
| `adminListSupportConversations` / `adminGetSupportConversation` / `adminUpdateSupportConversation` / `adminRecordSupportMessage` / `adminListSupportSavedReplies` / `adminUpsertSupportSavedReply` | `src/supportInbox/adminSupport.ts` | Support inbox for ops: WhatsApp and Instagram messages that are not nominations, and logged emails, as one conversation per person per channel with owner, waiting time, links and saved replies |
| `reportUser` / `reportGuest` | `src/safety/reporting.ts` | File a safety report (guest, or organizer and team); acknowledged at once, deadlines attached, severe reasons restrict at once |
| `adminTakeAccountSafetyAction` / `adminLiftAccountSafetyAction` / `adminListAccountSafetyActions` / `expireAccountSafetyActions` | `src/safety/accountActions.ts` | Warn and restrict (ops), suspend and ban (owner), enforced at sign-in, messaging and booking; suspensions and bans cancel future bookings; expiry every 15 minutes |
| `submitSafetyAppeal` / `adminDecideSafetyAppeal` | `src/safety/safetyAppeals.ts` | One appeal per action, reviewed by someone who did not decide |
| `adminGetSafetySettings` / `adminUpdateSafetySettings` | `src/safety/safetySettings.ts` | Settings → Safety: configurable reasons and rules (owner edits) |
| `adminGetDiscoverySettings` / `adminUpdateDiscoverySettings` | `src/discovery/discoverySettings.ts` | Settings → Discovery: where organisers on Catch and not on Catch yet appear to guests (owner edits, audited) |
| `manageOrganizerGuestBlock` / `listOrganizerGuestBlocks` | `src/safety/organizerGuestBlocks.ts` | An organizer's own block list, enforced by every booking path |
| `onUserCreatedSafetyScreen` / `onPushInstallationSafetyScreen` / `reconcileBannedIdentityScreens` | `src/safety/bannedIdentities.ts` | Stop new accounts on a banned phone or device and record the attempt; the triggers do not retry, so a nightly pass re-screens the last two days |
| `purgeRetainedSafetyRecords` | `src/safety/safetyRetention.ts` | Delete case records 180 days after account deletion |
| `listSuvbotDemoActions` / `requestSuvbotDemoOperation` | `src/demoOps/` | Demo-data operation catalogue and request surface |
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
| `adminDecideSafetyTriageItem` | `src/admin/safetyTriage.ts` | Admin audited safety queue reviewed/dismissed decision; tells the reporter it was handled |
| `adminGetAccessApplicationDetails` | `src/admin/accessApplications.ts` | Admin read-only launch access application detail and overlap signals |
| `adminGetOrganizerClaimRequestDetails` | `src/admin/organizerClaimReview.ts` | Admin pending organizer claim queue and review-safe evidence detail |
| `adminSetOrganizerIndexStatus` | `src/admin/organizerIndexing.ts` | Admin audited organizer index/noindex publishing decision |
| `adminListEventDetails` | `src/admin/eventDetails.ts` | Admin canonical `events/{id}` directory for event publishing ops |
| `adminGetEventDetails` | `src/admin/eventDetails.ts` | Admin-safe canonical event detail snapshot |
| `adminUpdateEventDetails` | `src/admin/eventDetails.ts` | Admin audited safe app-facing event field patch |
| `adminListExternalEventDetails` | `src/admin/externalEventDetails.ts` | Admin read-only external event supply list for `externalEvents/{id}` |
| `adminListOrganizerDirectory` | `src/admin/organizerDirectory.ts` | Admin Organizers directory: real totals, views, city/kind/claim/mine chips and paging |
| `adminListEventDirectory` | `src/admin/eventDirectory.ts` | Admin Events directory: Catch and imported events in one table, with source, view totals and chips |
| `adminGetOrganizerOverview` | `src/admin/organizerOverview.ts` | Admin organizer page Overview: facts, Sales owner, terms, payments, journey and upcoming events |
| `adminApproveOrganizerListing` | `src/admin/organizerListingApproval.ts` | Admin or owner approve a Supply Intake listing: one audited, idempotent transaction publishes the organizer page unclaimed and noindex (hidden in the app), records the review decision and receipt, links the enquiry it came from, and opens its Sales account, opportunity, tasks and activity. A listing Catch sourced needs the reviewer's formats (written to `publicProfile.formats` and `publicCategoryLabel`) and the programmatic checklist items, may name a cohort (`organizers.listingProgram`, no Sales records unless asked), and is refused while `listingProgramSettings/platform` is paused |
| `adminManageListingProgram` | `src/admin/listingProgram/settings.ts` | Ops pause, the owner resumes, programmatic listings (`listingProgramSettings/platform`, audited, revision-checked); also reads the switch and counts live organizers without a format (counts only) |
| `adminGetOrganizerListingReview` | `src/admin/organizerListingReviewQueue.ts` | Admin, owner or support read one Supply Intake listing awaiting approval, by its request, for the inbox's approval sheet |
| `adminListInboxItems` | `src/admin/inbox/callables.ts` | Admin, owner or support read one page of the Admin inbox (listings, imported events, claims, enquiries, launch access, stuck intake) by scope, type and city, oldest first, with real totals per scope and type |
| `adminGetInboxItem` | `src/admin/inbox/callables.ts` | Admin, owner or support (or the sales associate who nominated it) read one inbox item and its journey, every step it took |
| `adminUpdateInboxItem` | `src/admin/inbox/callables.ts` | Admin, owner or support assign, unassign, snooze or wake one inbox item; audited and recorded in its journey |
| `adminListMyNominations` | `src/admin/inbox/myNominations.ts` | A sales associate (or ops and the owner) read the organizers they nominated, newest first, published, waiting or stuck, with `count()` totals per filter |
| `adminRecommendOrganizerClaim` | `src/admin/organizerClaimRecommendation.ts` | Admin, owner or support recommend approving or rejecting a pending organizer claim; audited; only the owner decides it |
| `adminSearchPeople` | `src/admin/peopleSearch.ts` | Admin, owner, support or safety reviewers search people by name, phone or uid in `adminPeopleIndex`; every search and its query is written to `adminAuditLogs` |
| `adminGetListingEventReview` | `src/admin/listingEventImports.ts` | Admin, owner or support read one imported event of an approved listing, for the inbox's publish sheet |
| `adminPublishListingEvents` | `src/admin/listingEventImports.ts` | Admin, owner or support dry-run or publish chosen imported events of one approved listing as read-only, outbound-only external events; full checklist, per-event resolutions, one transaction and receipt per event |
| `adminListSupplyIntakePolicies` | `src/admin/supplyIntakePolicies.ts` | Admin, owner or support read the Supply Intake capabilities that wait for the owner's decision, with the decision and whether the policy file switches each on |
| `adminAiFallbackTestCall` | `src/admin/aiFallbackTestCall.ts` | Admin or owner makes one live test call through the try-it AI fallback's federated sign-in (a fixed, fictional guest-mapping request; headers and shapes only), or with `dryRun` only exchanges a token; ignores whether the fallback is on, charges the monthly cap, 5 paid tests per admin per day, audit row marked `test` |
| `adminRefreshOrganizerEvents` | `src/operations/supplyIntake/organizerEventRefresh.ts` | Admin, owner, support or sales staff queue an event refresh for an unclaimed listed organizer, created with its approval; audited, rate-limited and idempotent per caller key |
| `adminSetSupplyNominator` / `adminListSupplyNominators` | `src/operations/supplyIntake/nominators.ts` | Admin or owner registers a sales associate or partner whose WhatsApp or Instagram messages to Catch become organizer nominations, or switches them off; for WhatsApp stores only a hash of the number and its last four digits, for Instagram the public username, audited and rate-limited. Sales staff can list the registry. Messages count only while `SUPPLY_MESSAGE_NOMINATIONS_ENABLED` and the receipt consumers are on, and only while the account keeps its sales role or partner membership |
| `adminNominateOrganizer` | `src/operations/supplyIntake/nominations.ts` | Admin, owner or sales staff nominate an organizer; audited, rate-limited and idempotent per nominator request id. Creates a queued Supply Intake request; nothing is published until staff review the listing. Requires at least one format (never nightlife), carried as Supply Intake categories; refused while programmatic listings are paused |
| `adminTakedownExternalEvent` | `src/admin/externalEventTakedown.ts` | Admin audited dry-run/apply takedown of one published external event without deleting its source or publication receipts |
| `adminGetMarketingOpsDashboard` | `src/admin/marketingOps.ts` | Admin read-only marketing ops dashboard bridge |
| `adminRecordMarketingReviewDecision` | `src/admin/marketingOps.ts` | Admin audited marketing review decision, no publish |
| `adminCreateMarketingContentDraft` | `src/admin/marketingOps.ts` | Admin editable marketing draft creation, no post publish |
| `adminListOrganizerDetails` / `adminGetOrganizerDetails` / `adminUpdateOrganizerDetails` | `src/admin/organizerDetails.ts` | Admin canonical organizer directory, detail, and audited safe patch surface |

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
| `syncOrganizerFollowerStats` | `src/clubs/` | `organizerFollowers/{followerId}` onWrite — recomputes canonical follower totals |
| `programTravelLegMoments` | `src/moments/momentSchedule.ts` | Travel-leg writes emit Moment facts on leg changes |
| `onSalesInboundIntentForIntake` | `src/operations/supplyIntake/nominations.ts` | `salesInboundIntents/{intentId}` onCreate — a website host application, website referral lead or partner nomination that names an organizer or a link also becomes a Supply Intake request (deterministic id, idempotent) |
| `onSupplyIntakeRequestCreated` | `src/operations/supplyIntake/triggers.ts` | `supplyIntakeRequests/{requestId}` onCreate — leases the request, gathers its pages, runs Supply Intake and imports the reviewable listing; searches an unreadable nomination's handle once through SerpApi when `SERPAPI_KEY_VERSION` and the web search decision allow it (`linkSearch.ts`); retries until the third failure |
| `onInstantDraftOrganizerPublished` | `src/instantDrafts/publishOnClaim.ts` | `organizers/{organizerId}` onUpdate: when the owner publishes a try-it workspace page with an applied import from a link, publishes its imported events as the owner through the staff publishing path and its checks. Named for the retired instant-draft tool. |
| `onSupplyIntakeListingApproved` | `src/operations/supplyIntake/eventPublicationTrigger.ts` | `supplyIntakeRequests/{requestId}` onUpdate — when a request is first both completed and approved, publishes the imported events the event publication policy allows; receipts keyed on the request make redelivery replay |
| `syncOrganizerNextEvent` | `src/organizers/` | `events/{eventId}` onWrite — recomputes the organizer's next-event projection, and writes the event's `organizerSummary` (from `publicOrganizers`) on create, an organizer change or a missing summary, only on change |
| `syncPublicOrganizer` | `src/organizers/` | `organizers/{organizerId}` onWrite (retry) — mirrors the public allowlist into `publicOrganizers/{organizerId}` (#1221) and, when a summary field changes, rewrites `organizerSummary` on the organizer's events that have not ended |
| `syncAlgoliaOrganizerIndex` | `src/search/` | `organizers/{organizerId}` onWrite — synchronizes organizer discovery search records |
| `syncExternalEventVisibility` | `src/organizers/externalEventVisibility.ts` | `organizers/{organizerId}` onWrite — when the organizer's app visibility changes (or it is deleted), sets `discovery.appVisibility` on its `externalEvents` to match, so app discovery never shows an event whose organizer is hidden |
| `onPublicPageOrganizerWritten` / `onPublicPageEventWritten` / `onPublicPageExternalEventWritten` / `onPublicPageReviewWritten` | `src/publicPages/triggers.ts` | `organizers`, `events`, `externalEvents` and `reviews` onWrite — when the changed document's public projection differs, rebuilds its organizer's `organizerPublicPage` and `eventPublicPage` read models (CAT-250); follower-only changes wait for the batched refresh |
| `onCityPlansOrganizerPageWritten` | `src/cityPlans/triggers.ts` | `organizerPublicPage` onWrite — rebuilds the `cityPlans` read model of the city the page left and the city it is in (CAT-260) |
| `onDiscoverySettingsWritten` | `src/cityPlans/triggers.ts` | `discoverySettings` onWrite — rebuilds every city's `cityPlans` read model under the new Settings → Discovery rules |
| `onSupplyIntakeRequestWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `supplyIntakeRequests` onWrite — projects the request's listing or stuck item and journey steps into `adminInboxItems` and `adminInboxJourney` |
| `onOrganizerClaimRequestWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `organizerClaimRequests` onWrite — projects the claim's inbox item and journey steps |
| `onSalesInboundIntentWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `salesInboundIntents` onWrite — projects the enquiry's inbox item and journey steps |
| `onAccessApplicationWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `accessApplications` onWrite — projects the launch access item and journey steps |
| `onExternalEventWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `externalEvents` onWrite — projects the imported event's inbox item and journey steps |
| `onWalkthroughBookingWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `walkthroughBookings` onWrite — projects the booking's confirm-on-WhatsApp task (`src/walkthroughs/inbox.ts`) and journey steps |
| `onTakedownRequestWrittenSyncInbox` | `src/admin/inbox/triggers.ts` | `takedownRequests` onWrite — projects the listing request's `takedown` task (`src/takedownRequests/inbox.ts`): acknowledge, verify and decide, or decide the appeal, with the next deadline |
| `onUserWrittenIndexPeople` | `src/admin/peopleSearch.ts` | `users` onWrite — keeps `adminPeopleIndex/{uid}` (name prefixes, phone digits) for logged people search |
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
| `onCrossPathsParticipationWritten` | `src/crossPaths/` | `eventBookings/{id}` onWrite — invalidates invitations/holds when participation ends |
| `onEventBookingMirroredToLegacy` | `src/events/eventBookingLegacyMirror.ts` | TRANSITIONAL: `eventBookings/{id}` onWrite — copies the booking (or its deletion) to the legacy `eventParticipations/{id}` mirror that released app builds read; removed in phase 2 of the rename |
| `onCrossPathsBlockCreated` | `src/crossPaths/` | `blocks/{id}` onCreate — invalidates invitations/holds and closes accepted event plans |
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
| `onAssistancePermissionChanged` / `onAssistanceBudgetChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | One trigger each for every channel's event-day permissions and budgets (`eventAssistancePermissions`, `eventAssistanceBudgets`; `channel` on each document). Consent changes wake scoped guest and delivery work with replay-safe receipts; budget changes wake the sender route the document's channel names. Dormant pending activation |
| `onAssistanceSmsSenderChanged` / `onAssistanceWhatsappSenderChanged` / `onAssistanceWhatsappPolicyChanged` / `onAssistanceWhatsappTemplateChanged` / `onAssistanceWhatsappStopChanged` / `onAssistanceWhatsappSuppressionChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Sender, template and endpoint suppression changes discover bounded event/guest scopes and wake existing assistance work; dormant pending activation |
| `onAssistanceStaffChanged` / `onAssistanceCheckpointChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Current staff changes wake bounded event work; checkpoint report changes wake their original request, including corrections; dormant pending activation |
| `onAssistanceWorkChanged` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Advances due roster, source, operational-notice, guest, delivery or checkpoint work under Operations leases; dormant pending activation |
| `onOrganizerMessagingWebhookEventCreated` | `src/organizers/organizerWhatsappWebhook.ts` | Authenticated provider receipts update campaign delivery projections without retaining message bodies |
| `moderateChatMessage` | `src/moderation/` | `matches/{id}/messages/{id}` onCreate — banned-word filter |

### Scheduled

| Function | File | Schedule |
|----------|------|----------|
| `organizerMomentSweep` | `src/moments/momentSchedule.ts` | Every 5 minutes — provisions default event-start reminder Moments and fires due runs |
| `expireCrossPathsInvitations` | `src/crossPaths/` | Every 15 minutes — expires stale pending Cross Paths invitations |
| `expireCrossPathsPairHolds` | `src/crossPaths/` | Every 5 minutes — releases expired companion reservations and invalidates their invitation receipt |
| `retryOrganizerAutomations` | `src/organizers/organizerFormAutomations.ts` | Every minute — resumes due automation runs and expired leases with bounded retries and per-action deduplication |
| `dispatchScheduledOrganizerCampaigns` | `src/organizers/organizerCampaignDispatcher.ts` | Dispatches due, approved organizer campaign snapshots |
| `rebuildCityPlansHourly` | `src/cityPlans/triggers.ts` | Hourly, rebuilds every city's `cityPlans` read model so plans move into and out of the 14-day window and the 30-day and format page counts stay current (CAT-260) |
| `wakeSnoozedInboxItemsEvery30Minutes` | `src/admin/inbox/triggers.ts` | Every 30 minutes, puts snoozed inbox items whose snooze ended back in the inbox |
| `reconcileAdminInboxNightly` | `src/admin/inbox/triggers.ts` | Nightly (03:10 India time), re-projects every inbox source and the people index from their documents; idempotent, so it changes only what a failed trigger missed (the inbox and people triggers are not retried) |
| `refreshPublicPageFollowers` | `src/publicPages/triggers.ts` | Every 30 minutes, rebuilds the public pages of organizers whose follower count changed |
| `reconcilePublicPages` | `src/publicPages/triggers.ts` | Daily, rebuilds every organizer's public page read models, so ended events move to past moments and missed changes heal |
| `dispatchPendingOrganizerFollowerUpdates` | `src/organizers/organizerPostDelivery.ts` | Every 5 minutes — resumes pending or expired-lease follower Activity delivery without duplicate push attempts |
| `expireEventRehearsals` | `src/eventRehearsal/` | Hourly deletion of expired rehearsal sessions and isolated child projections |
| `evaluateDueEventAssistanceWork` | `src/eventSuccess/operations/liveWorkTriggers.ts` | Every minute: bounded recovery of saved roster, source, operational-notice, guest, delivery and checkpoint work; dormant pending operating-budget approval |
| `recoverSupplyIntakeRequests` | `src/operations/supplyIntake/triggers.ts` | Hourly: picks up queued intake requests whose event was lost and requests whose worker stopped mid-lease |
| `refreshInstagramAccessToken` | `src/organizers/instagramAccessTokenRefresh.ts` | Daily at 05:30 IST: with 30 days or less left, renews the Instagram Login token `instagramClaimWebhook` uses and records the new `CATCH_INSTAGRAM_ACCESS_TOKEN` version in `instagramAccessTokens`; does nothing where no Instagram account is set |

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
| `onOrganizerGrowthOrganizerWritten`, `onOrganizerGrowthClaimRequestCreated`, `onOrganizerGrowthParticipationWritten`, `onOrganizerGrowthGuestPaymentWritten`, `onOrganizerGrowthBookingPaymentWritten` | `src/growth/` | Record each organizer's dated steps (listed, claim asked, claimed, first event, first paid booking) in `organizerGrowthFacts`, keeping the earliest time, and stream them with paid bookings and refunds to BigQuery `organizer_growth_events` |
| `reconcileOrganizerGrowthDaily` | `src/growth/` | Nightly (03:40 India time): recomputes every organizer's growth steps from organizers, claim requests, booked events and captured checkouts and records any the triggers missed (the triggers are not retried); creates BigQuery `organizer_growth_events` if it is missing and sends only the rows it lacks, including form payments |
| `onAdConversionGrowthFactsWritten`, `sendAdConversions` | `src/acquisition/adConversions/` | Host-programme ad conversions (docs/ads_conversion_spec.md): new owned organizers and first booked events from `organizerGrowthFacts` are queued in `adConversionDeliveries` (hashed matching keys only) and sent every five minutes to Meta Conversions API and Google Data Manager. `AD_CONVERSIONS_MODE` defaults to off; `validate` sends test and validate-only requests |
| `metaLeadgenWebhook`, `onMetaLeadgenEventCreated` | `src/acquisition/metaLeadgen/` | Meta host lead forms: verified Facebook/Instagram `leadgen` webhooks are filed in `metaLeadgenEvents` (one per lead ID), then each lead is fetched with the CatchAds token and filed as a `meta_lead_ad` sales intent for review. Closed (503) until `META_LEADGEN_CREDENTIAL_VERSION` pins its webhook secret; only listed page IDs are taken |
| `adminManageAdMatchingOptOut` | `src/acquisition/adMatching/` | Support, safety, ops and the owner check, record or remove an ad-matching opt-out for a phone number and/or email (Admin Support). Each identifier is stored in `adMatchingOptOuts` only as a domain-separated hash of the digest the ad platforms receive; the response names kinds, never values. Recording cancels matching pending ad conversions at once; removal keeps who removed it. Audited |
| `syncMetaHostAudience` | `src/acquisition/adAudiences/` | Daily (04:20 India time) host customer list: the owners of real organizers with a first booked event, minus opted-out, deleted, staff, test, restricted and under-18 accounts, uploaded to the Meta custom audience "Catch \| Active hosts" as hashed email and phone with Meta's replace flow, so removals leave Meta within a day. Keeps a counts-only receipt in `adAudienceRuns`. `AD_AUDIENCES_MODE` defaults to off; Google Customer Match is not built |
| `adminManageOrganizerBills`, `generateOrganizerCycleBillsDaily` | `src/money/` | Bills per organizer from bookings paid into their own account, per rolling cycle (#1126): `commission.cycleDays` days anchored at trial end, billed in arrears once a day after each cycle closes (`organizerBillingCycles` pointer, at most once per cycle), cap per cycle, tools-only OR ticketing per cycle, commission on each payment's frozen terms, GST only when registered. Calendar-month bills made before the move stay readable and actionable; cycles never count a payment before the organizer's last month bill or 1 Nov 2026 IST. Send (per-financial-year invoice number, due date, Razorpay payment link), remind, mark paid (credits the nominator), write off. A host's first two sent cycle bills are staff-reviewed; later cycle bills are sent automatically by the daily run a day after they are made unless held (`hold`/`releaseHold` per bill, `holdOrganizer`/`releaseOrganizerHold` per organizer). Refunds recorded after a cycle bill was sent or paid are credited on the next cycle bill (`refundCredit`, `billRefundCredits.ts`) |
| `adminManageMoneySettings` | `src/money/` | Owner reads or replaces Catch's money settings (GST registered, bill due day, nominator credit rule) |
| `adminManageNominatorCredits` | `src/money/` | Nominator credit ledger: list, approve a nominator's owed credit at or above the minimum payout, record it paid |
| `adminManagePlatformCosts` | `src/money/` | A month's costs: hand-entered AI, Cloud, SMS and invoice totals, with a WhatsApp estimate from reserved dispatch costs until an invoice total is entered; Meta and Google Ads spend arrive as read-only `ads_meta` and `ads_google` rows from `importAdSpendDaily` |
| `importAdSpendDaily` | `src/money/` | Daily (05:30 India time) ad spend import: the month so far of Meta ad account insights (Graph v26.0, the pinned CatchAds token in `AD_CONVERSIONS_META_TOKEN_VERSION`) and Google Ads campaign `cost_micros` by date (`googleAds:search` v24, acting as the keyless ads service account in `AD_CONVERSIONS_GOOGLE_SERVICE_ACCOUNT`), summed per campaign in paise and written as the month's `platformCosts` `ads_meta` (`meta_api`) and `ads_google` (`google_ads_api`) rows, replacing a hand-entered total. Each platform month imports at most once per India-time day; the month before is read again through the 3rd and once if never imported; an account not billing in INR is refused. A failing platform is logged by a short code (never a token or response body) and the other still imports. `AD_SPEND_IMPORT_MODE` defaults to off |
| `adminExportMoneyLedger` | `src/money/` | A month's ledger as CSV for Zoho Books: invoices issued, bill payments received, nominator credit paid, costs |
| `adminGetFinanceMonth` | `src/money/` | One month of Finance from bills, costs and nominator credit paid: ticket sales, what Catch earned (caps, free months, own terms), costs, Razorpay fees and GST that are not Catch's money, six-month series |
| `adminManagePaymentIssues` | `src/money/` | Money issues: captured website/offer payments not admitted after 15 minutes, refunds pending a day, payments needing review, failed native bookings and refunds, overdue bills; confirm booking re-checks the checkout with Razorpay now; close records it was handled |
| `adminGetGrowth` | `src/growth/` | Growth for a range from growth facts, bills, nominator credit and ad spend: cohorts by listing month, channels, nominators, best organizers |
| `getWalkthroughSlots` | `src/walkthroughs/publicCallables.ts` | Public (App Check): open walkthrough slots of the next days from the one staff calendar, India time, times only |
| `bookWalkthrough` | `src/walkthroughs/publicCallables.ts` | A prospective host books one slot with their code-verified WhatsApp number: transactional on the slot hold, idempotent per request id, rate limited; opens an Admin Inbox task, staff confirm on WhatsApp |
| `manageWalkthroughBooking` | `src/walkthroughs/publicCallables.ts` | Read, cancel or move a walkthrough booking with its manage token or its verified phone |
| `adminSetWalkthroughAvailability`, `adminListWalkthroughBookings`, `adminUpdateWalkthroughBooking` | `src/walkthroughs/adminCallables.ts` | Admin and owner set the walkthrough staff calendar (weekly India-time windows, slot length, lead time, closed dates), list bookings with each verified number, and confirm or cancel one |
| `submitListingRequest` | `src/takedownRequests/intake.ts` | Public HTTP (App Check, hashed network and email limits): one structured listing request from `/listings/request/`, idempotent per requester email and client request id; records deadlines, sends nothing |
| `adminGetTakedownRequest`, `adminUpdateTakedownRequest` | `src/takedownRequests/admin.ts` | Admin, owner and support open a listing request and take its fixed steps; admins and the owner decide and can suspend the named organiser's page in one step (`suspendOrganizer`); one appeal decided by someone else |
| `adminGetCityInterest` | `src/cityInterest/` | Interest by city from the `cityInterest` counters: people per city in all and over the last 7 and 30 days against the days before |
| `adminGetMarketplace` | `src/marketplace/` | Marketplace from the warehouse's raw Firestore export views: events a week, places filled, no-shows and waitlists by city; guests by first-booking month and whether they came back; bookings each week; organizers going quiet with their sales owner |
| `ingestEventRosterWebhook` | `src/events/eventRosterHandoffs.ts` | Receive one HMAC-verified, provider-authenticated roster attachment through a capability-bound email or WhatsApp handoff |
| `organizerWhatsappWebhook` | `src/organizers/organizerWhatsappWebhook.ts` | Verify Meta webhook signatures and project delivery or STOP events without retaining message content |

### Not yet described

`--write` adds each export missing from this inventory here; move its row to its section and describe it.

| Function | File | Purpose |
|----------|------|---------|
| `addEventHostPhoto` | `src/events/eventHostPhotos.ts` | Shares a staged host photo with checked-in guests, re-encoded without EXIF or location. |
| `adminManageFoundingHostOffers` | `src/foundingHosts/adminManageFoundingHostOffers.ts` | Admin Owner reads every city's founding-host offer, or opens one city and sets its cap (50 decided) and optional deadline; rewrites the public counter. |
| `cleanUpStagedHostPhotosDaily` | `src/events/eventHostPhotoStagingCleanup.ts` | Daily: deletes staged host photo originals (still carrying EXIF) older than 24 hours. |
| `createProgramAssetUpload` | `src/programs/programAssets.ts` | Signs one private programme file upload (guest ID, hamper photo, function photo, cover). |
| `createPromotionKit` | `src/commands/createPromotionKit.ts` | Command `promotion.create-kit`: one tracked invite link per channel or promoter for an event the caller manages. |
| `decideProgramGuestId` | `src/programs/guestIds.ts` | Guest relations accept a guest's ID or ask again. |
| `deleteEventHostPhoto` | `src/events/eventHostPhotos.ts` | Removes a shared host photo and its files. |
| `ensureTryItWorkspace` | `src/commands/ensureTryItWorkspace.ts` | Command `workspace.ensure`: gives a phone-verified caller their one private try-it organizer workspace. |
| `expireTryItWorkspaces` | `src/commands/workspaceExpiry.ts` | Daily: removes try-it workspaces unused for 30 days, unless kept. |
| `findClaimableOrganizers` | `src/organizers/phoneLeads/find.ts` | Shadow profiles (off): the "Is this you?" read for Catch Host setup; unclaimed organizers matched to the caller's verified phone, with prefill and missing fields. |
| `followOrganizerByPhone` | `src/organizers/followOrganizerByPhone.ts` | Not yet described. |
| `getOrganizerOwnerView` | `src/organizerInsights/ownerView.ts` | The website owner view for an organiser's team: role, capabilities, 30 days of organizerInsights, links, about, photos and follower-message usage. |
| `getProgramAssistantSettings` | `src/programs/programWhatsapp/callables.ts` | Programme assistant settings (defaults when unsaved), the wedding's WhatsApp number and the staff for escalations; managers and coordinators. |
| `getProgramDriverTrip` | `src/programs/programWebLinks.ts` | Not yet described. |
| `getProgramFamilyView` | `src/programs/familyView.ts` | The family's counts-only programme view (no names) by a family link. |
| `getProgramGuestIdStatus` | `src/programs/guestIds.ts` | A household's members with their ID status (names and status only) by its RSVP link. |
| `getProgramHamperWebView` | `src/programs/hampers.ts` | Porters' hamper list for one hotel by hamperPorter link. |
| `getProgramHotelHandover` | `src/programs/guestIds.ts` | Hotel front desk rooming list with accepted IDs by hotelHandover link. |
| `getProgramLiveBoard` | `src/programs/programLiveBoard.ts` | Not yet described. |
| `getProgramVendorRunSheet` | `src/programs/programWebLinks.ts` | Not yet described. |
| `importEventFromLink` | `src/commands/importEventFromLink.ts` | Command `event.import-from-link`: creates a private draft event in a try-it workspace from one public event page. |
| `importFormFromLink` | `src/commands/importFormFromLink.ts` | Command `form.import-from-link`: creates a private draft form in a try-it workspace from one public Google Form. |
| `importGuestList` | `src/commands/importGuestList.ts` | Command `guests.import-list`: reads one guest-list file (CSV, XLSX or vCard) on the server with the converter for its format, reviews it through the host roster intake session and saves exactly the reviewed preview. |
| `importOrganizerFromLink` | `src/commands/importOrganizerFromLink.ts` | Command `organizer.import-from-link`: fills a try-it workspace from one public link, or routes to an existing listing's claim. |
| `importPastSales` | `src/commands/importPastSales.ts` | Command `sales.import-past`: reads one past night's guest or sales export into a sales, attendance and fee comparison report, and saves the night as a private past draft event in the try-it workspace. |
| `issueProgramWebLink` | `src/programs/programWebLinks.ts` | Not yet described. |
| `listEventHostPhotos` | `src/events/eventHostPhotos.ts` | Host photos as signed URLs for checked-in guests and the host team. |
| `listProgramIdTracker` | `src/programs/guestIds.ts` | ID tracker: staying guests with ID status and signed images. |
| `listProgramWhatsappThreads` | `src/programs/programWhatsapp/callables.ts` | The programme guest inbox: threads by Needs you, Handled or All with counts and the wedding's number. |
| `manageOrganizerOwnerPage` | `src/organizerInsights/ownerPage.ts` | Owner view writes: owner links (add, reorder, pin, schedule), the photo order, and Message followers at most twice a calendar month. |
| `markProgramWhatsappThreadRead` | `src/programs/programWhatsapp/callables.ts` | Marks one programme WhatsApp thread read (the write half of opening it); managers and communications staff; answers the thread's handling and new revision. |
| `onEventChatDirectoryAttendeeWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds the linked person's chat directory row when a roster row's link or status changes |
| `onEventChatDirectoryEventWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds every chat directory row of an event when its name, status, organizer or start changes |
| `onEventChatDirectoryMembershipWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds the person's `eventChatDirectoryEntries` row when their chat membership changes |
| `onEventChatDirectoryParticipationWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds the guest's chat directory row when their booking status changes |
| `onEventChatDirectoryRoomWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds every chat directory row of an event when its room revision moves |
| `onEventChatDirectoryUserWritten` | `src/chats/eventChatDirectory.ts` | Rebuilds a person's chat directory rows when their profile claim or deletion changes |
| `onEventChatSignalMembershipWritten` | `src/chatSignals/eventChatSignals.ts` | Not yet described. |
| `onEventChatSignalRoomWritten` | `src/chatSignals/eventChatSignals.ts` | Not yet described. |
| `onEventGuestEntryEventWritten` | `src/guestEvents/triggers.ts` | Rebuilds the event's `eventGuestEntries` document, its guests' `guestEventStatuses` rows and its `savedEvents` cards when anything besides booking counters changes |
| `onEventGuestEntryFormWritten` | `src/guestEvents/triggers.ts` | Rebuilds the guest entry of the event an application form targets when the form is published, paused or retargeted |
| `onEventGuestEntryOrganizerWritten` | `src/guestEvents/triggers.ts` | Rebuilds the guest entries of an organizer's published events when its visibility or public page changes |
| `onFoundingHostOrganizerWritten` | `src/foundingHosts/foundingHostTriggers.ts` | When an organizer gains an owner, takes the next founding place in its city (capped in one transaction, one per owner per city) and writes the 90-day trial into its commercial terms override. |
| `onGuestEventStatusApplicationWritten` | `src/guestEvents/triggers.ts` | Rebuilds the applicant's `guestEventStatuses` row when an event application changes |
| `onGuestEventStatusAttendeeWritten` | `src/guestEvents/triggers.ts` | Rebuilds the linked guest's `guestEventStatuses` row when a roster row's link, source or status changes |
| `onGuestEventStatusOfferRecipientWritten` | `src/guestEvents/triggers.ts` | Rebuilds the recipient's `guestEventStatuses` row when an offer invitation changes |
| `onGuestEventStatusParticipationWritten` | `src/guestEvents/triggers.ts` | Rebuilds the guest's `guestEventStatuses` row when their Catch booking status changes |
| `onGuestEventStatusPaymentWritten` | `src/guestEvents/triggers.ts` | Rebuilds the guest's `guestEventStatuses` row when a website or offer payment changes |
| `onHostDirectoryOrganizerCreated` | `src/hostReadModels/directoryActivation.ts` | Activates every Host directory read model (contacts, responses, forms, groups, events) for a new organizer |
| `onHostEventAttendanceReportAttendeeWritten` | `src/hostReadModels/attendanceReportViewTriggers.ts` | Rebuilds the close-out attendance report view when a guest's check-in or booking changes. |
| `onHostEventAttendanceReportDispositionWritten` | `src/hostReadModels/attendanceReportViewTriggers.ts` | Rebuilds the close-out attendance report view when a no-show is recorded or cleared. |
| `onHostEventAttendanceReportEventWritten` | `src/hostReadModels/attendanceReportViewTriggers.ts` | Rebuilds the close-out attendance report view when the event's timing or closure changes. |
| `onOrganizerProgramFunctionChanged` | `src/programs/organizerProgramViewTriggers.ts` | Rewrites the setup view of a function's programme when the function changes |
| `onOrganizerProgramGuestCountChanged` | `src/programs/organizerProgramCountTriggers.ts` | Moves a programme view's guest and replied counts by a guest write's delta, once per event and only after the last recount |
| `onOrganizerProgramHotelChanged` | `src/programs/organizerProgramViewTriggers.ts` | Rewrites the setup view of a hotel's programme when the hotel changes |
| `onOrganizerProgramPickupPointChanged` | `src/programs/organizerProgramViewTriggers.ts` | Rewrites the setup view of a pickup point's programme when the point changes |
| `onOrganizerProgramTravelLegCountChanged` | `src/programs/organizerProgramCountTriggers.ts` | Moves a programme view's flying-in count when an inbound journey is added, removed or enters or leaves no-show |
| `onOrganizerProgramViewChanged` | `src/programs/organizerProgramViewTriggers.ts` | Rewrites a programme's setup view when its settings, dates, status, branding or retention dates change |
| `onProgramAccessViewGrantChanged` | `src/programs/programAccessViewTriggers.ts` | Rewrites that account's programme access view when a staff grant changes |
| `onProgramAccessViewOrganizerChanged` | `src/programs/programAccessViewTriggers.ts` | Rewrites an account's view of every programme of the organizer when it becomes or stops being an organizer manager |
| `onProgramAccessViewProgramChanged` | `src/programs/programAccessViewTriggers.ts` | Rewrites the owner's view, and every staff and organizer manager view when the creator or organizer changes, when a programme changes |
| `onProgramAlertLegChanged` | `src/programs/programLiveBoardViewTriggers.ts` | Rewrites a journey's live board alerts and the programme's travel counts when its status changes |
| `onProgramAlertResolutionChanged` | `src/programs/programLiveBoardViewTriggers.ts` | Merges a taken, finished or deleted alert resolution into its live board alert |
| `onProgramAlertSendChanged` | `src/programs/programLiveBoardViewTriggers.ts` | Rewrites a live board alert when a staff attention send fires |
| `onProgramArrivalGuestChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites the rows of a guest's journeys when their name changes |
| `onProgramArrivalHotelChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites the arrivals rows heading to a hotel when its name changes |
| `onProgramArrivalLegChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites a journey's arrivals and departures rows, and its party's rows when membership moves |
| `onProgramArrivalPartyChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites the rows of a travel party's journeys when its label or members change |
| `onProgramArrivalSettingsChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites every arrivals row's curb time when the programme's transport settings change |
| `onProgramArrivalStaffLabelChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites the arrivals rows a staff member claimed when their display name changes |
| `onProgramDepartureStayChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites a guest's departures row at a hotel when their stay's room or status changes |
| `onProgramDoorFunctionChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites a function's door header, and its whole roster when the invitation list moves |
| `onProgramDoorGuestChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites a guest's door rows and journal views when their name or household changes |
| `onProgramDoorHouseholdChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites the door rows of a household's members when its label or members change |
| `onProgramDoorJoinChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites a guest's door row when their attendance or RSVP at a function changes |
| `onProgramDoorJournalChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites a door journal entry's view when it appears or is anonymized |
| `onProgramDoorStaffLabelChanged` | `src/programs/programDoorViewTriggers.ts` | Rewrites a staff member's door journal views when their display name changes |
| `onProgramFunctionViewChanged` | `src/programs/programWorkViewTriggers.ts` | Rewrites a function's work shell label and counts when it changes |
| `onProgramGuestWhatsappEndpointWritten` | `src/programs/programWhatsapp/endpointIndex.ts` | Keeps programWhatsappEndpointIndex current when a guest's phone or household changes. |
| `onProgramHotelInboundLegChanged` | `src/programs/programTripViewTriggers.ts` | Rewrites a journey's hotel desk inbound row when its readiness, hotel or timing changes |
| `onProgramHotelInboundPartyChanged` | `src/programs/programTripViewTriggers.ts` | Rewrites the hotel inbound rows of a travel party's journeys when its label or members change |
| `onProgramHotelInboundSettingsChanged` | `src/programs/programTripViewTriggers.ts` | Rewrites every hotel inbound row's curb time when the programme's transport settings change |
| `onProgramHotelRoomBlockChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites a hotel's room board when one of its room blocks changes |
| `onProgramHotelRoomGuestChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites the room boards of the hotels a guest stays or lands at when their name or groups change |
| `onProgramHotelRoomHotelChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites a hotel's room board when its name changes or it appears or vanishes |
| `onProgramHotelRoomLegChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites the room boards of an inbound journey's hotels when it routes a guest or becomes a no-show |
| `onProgramHotelRoomProgramChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites every hotel's room board when the programme's time zone or organizer changes |
| `onProgramHotelRoomStayChanged` | `src/programs/programHotelRoomViewTriggers.ts` | Rewrites a hotel's room board when a stay there changes |
| `onProgramHotelViewChanged` | `src/programs/programWorkViewTriggers.ts` | Rewrites a hotel's work shell label when it changes |
| `onProgramHouseholdWhatsappEndpointWritten` | `src/programs/programWhatsapp/endpointIndex.ts` | Keeps programWhatsappEndpointIndex current when a household's primary phone changes. |
| `onProgramPickupPointViewChanged` | `src/programs/programWorkViewTriggers.ts` | Rewrites a pickup point's work shell label when it changes |
| `onProgramStaffViewGrantChanged` | `src/programs/programStaffViewTriggers.ts` | Rewrites a staff member's row of the administrators' staff list when their grant changes |
| `onProgramStaffViewProgramChanged` | `src/programs/programStaffViewTriggers.ts` | Rewrites every staff row when a programme's creator or organizer changes |
| `onProgramTripGuestChanged` | `src/programs/programTripViewTriggers.ts` | Rewrites a guest's hotel inbound rows and legacy trip manifests when their name changes |
| `onProgramTripViewChanged` | `src/programs/programTripViewTriggers.ts` | Rewrites a transport trip's view when it is created, arrives, is cancelled or voided |
| `onProgramVendorViewChanged` | `src/programs/programArrivalViewTriggers.ts` | Rewrites a vendor's per-programme views when its name, active flag or bound programmes change |
| `onProgramWhatsappInboundMessageCreated` | `src/programs/programWhatsapp/inboundTrigger.ts` | Runs the wedding assistant (handleProgramWhatsappInbound) for each stored inbound guest message; replies through sendProgramServiceReply or passes the thread to the planner. |
| `onProgramWhatsappThreadViewHouseholdChanged` | `src/programs/programWhatsapp/threadViewTriggers.ts` | Rewrites a household's thread view when its label, contact name, members or side change |
| `onProgramWhatsappThreadViewProgramChanged` | `src/programs/programWhatsapp/threadViewTriggers.ts` | Rewrites every thread view of a programme when its side labels change |
| `onProgramWhatsappThreadViewThreadChanged` | `src/programs/programWhatsapp/threadViewTriggers.ts` | Rewrites a thread's inbox view when its message, handling, language or read state changes |
| `onProgramWorkSummaryChanged` | `src/programs/programWorkViewTriggers.ts` | Rewrites a programme's work shell header when the programme changes |
| `onSalesRelationshipPhoneLeads` | `src/organizers/phoneLeads/sync.ts` | Shadow profiles (off): records sales CRM phone endpoints against their organizer, hashed. |
| `onSavedEventCardCreated` | `src/guestEvents/triggers.ts` | Writes a new saved-event edge's list card from its event |
| `planNight` | `src/commands/planNight.ts` | Command `night.plan`: plans a night (groups, mixing moment, missions, rehearsal setup) and saves it on a try-it draft event. |
| `previewProgramAssistantReply` | `src/programs/assistant/preview.ts` | The wedding assistant's Try it: the same policy, fact pack, model and budget as a guest message, nothing sent. |
| `reconcileFoundingHostPlacesDaily` | `src/foundingHosts/foundingHostTriggers.ts` | Daily 04:25 India time: takes the founding places the trigger missed for organizers that gained an owner in the last three days, still one per owner per city. |
| `reconcileProgramVendorBill` | `src/programs/vendorBills.ts` | Reviews, checks, questions or approves a vendor bill against recorded trips. |
| `resolveProgramAlert` | `src/programs/programLiveBoard.ts` | Not yet described. |
| `rollupOrganizerInsightsDaily` | `src/organizerInsights/insightsRollup.ts` | Nightly organizerInsights roll-up per organiser-day from the host analytics marts and organizerFollows. |
| `sendProgramWhatsappReply` | `src/programs/programWhatsapp/callables.ts` | Free-text planner reply inside the 24-hour window, reserved before the Meta call and failing closed; takes the thread over. |
| `setProgramWhatsappThreadHandling` | `src/programs/programWhatsapp/callables.ts` | Takes a guest thread over from the assistant or hands it back, optionally marking it handled. |
| `signProgramPhotoUrls` | `src/programs/photos.ts` | Short-lived signed URLs for programme photos listed from programPhotos, and the cover; signs only this programme's own files. Managers and communications staff. |
| `submitProgramGuestId` | `src/programs/guestIds.ts` | A household saves a member's ID through its RSVP link. |
| `updateProgramAssistantSettings` | `src/programs/programWhatsapp/callables.ts` | Changes the programme assistant settings under a revision fence; escalation staff must be active programme staff. |
| `upsertProgramHamper` | `src/programs/hampers.ts` | Marks a room's welcome hamper placed (porter link or hotel desk). |
| `upsertProgramPhoto` | `src/programs/photos.ts` | Adds or changes a programme photo. |
| `upsertProgramWhatsappCannedReply` | `src/programs/programWhatsapp/callables.ts` | Adds or changes a saved WhatsApp reply with one text per language. |
<!-- fn-inventory:end -->

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
`checkRateLimit()` from `src/shared/rateLimit.ts`. Each callable passes its
own `{maxRequests, windowMs}` limit where it calls `checkRateLimit()`; the
limit is required. Never add per-action limits to `rateLimit.ts`: nearly
every Function imports it, so editing it redeploys them all. Its frozen
`LEGACY_RATE_LIMITS` table may only shrink. Limits are enforced via
Firestore transactions.
Counter documents are written to `rateLimits/{uid}_{action}_{windowKey}`.
A TTL policy on `expiresAt` auto-deletes counters after their window expires.

A small read uses `checkInstanceRateLimit()` from
`src/shared/instanceRateLimit.ts` instead. It counts in the instance's memory,
so it adds no database call, but each running instance counts on its own.
Use it for a read of a few known documents that shows only the caller's own
state or one organizer's settings, such as `listMyHostAssignments` or
`getOrganizerTrackingSettings`. Keep `checkRateLimit()` for writes and for any
read that returns other people's data, scans a list, or does work that costs
money, because its count holds across instances. It also runs before the read,
so an over-limit caller stops before any billed work; do not start it alongside
the read.

The `joinWaitlist` HTTP endpoint uses `checkIpRateLimit()` — an in-memory
per-IP counter (3 POSTs per hour). This does not survive cold starts. Its
website leads (`requestKind`) also use `checkRateLimit()`, with
`joinWaitlistLeadNetwork` (per hashed network address) and
`joinWaitlistLeadNumber` (per hashed number).

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
match. Deployed dev and production callables still enforce App Check.

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
enforcement. Its website leads verify the `X-Firebase-AppCheck` header in the
handler, exempt only where `enforceAppCheckForRuntime` exempts callables.

## Backend rules

No tool checks these. Hold new Functions code to them in review.

- **Idempotent triggers:** every `onDocument*` or `onObject*` trigger and payment
  webhook guards non-idempotent side effects (push, auto-id flag writes, counter
  increments) with a deterministic `functionEventReceipts` receipt from
  `src/shared/eventReceipts.ts`. Writes whose id is already deterministic need no
  guard.
- **Payments:** each provider has a signature-verified webhook and a scheduled
  reconciliation sweep, and a pending payment document is written at order creation,
  keyed by order id. A failed refund ends in a distinct status (`reviewRequired`)
  with a structured alert, never silently as complete.
- **Client ids and paths:** identifiers and storage paths from a client are
  validated for ownership and format before use as document ids, canonical URLs or
  slugs, or admin-SDK action targets. A profile photo `storagePath`, for example,
  must sit under `users/{uid}/`. A client id is never trusted as a deletion target
  or public path.
- **Moderation boundary:** moderation runs at the write boundary, so the stored
  document, the denormalized `lastMessagePreview` and every delivery channel never
  carry blocked content. Publicly rendered free text (reviews, reviewer names, host
  responses) is moderated too.
- **Aggregation triggers:** return early when the relevant fields did not change,
  and bound queries with `count()`, limits or incremental deltas rather than scanning
  a whole collection or lifetime history on every write.
- **Free text and leaks:** user free text (reviews, occupation, company, names) is
  length-bounded on the server. Logs and client errors never carry PII or a raw
  upstream error body such as a Google Places `error.message`.
- **One source of logic:** authorization, eligibility, attendance and state-machine
  logic lives in one shared module, not copies in sibling features.

See [Write Path Discipline](../docs/data_contracts.md#write-path-discipline) for
partial writes and denormalized fields.

## Request validation

Callable functions that accept structured user input should use the generated
Ajv validator module for their payload with
`validateCallableWithAjv(request, validator)` from `src/shared/validation.ts`.
A contract gets runtime modules only when its spec name is listed in
`contracts/functions/runtime_modules.json`; add it there and regenerate.

```ts
import {CreateEventCallablePayload} from "../shared/generated/createEventCallablePayload";
import {validateCreateEventCallablePayload} from "../shared/generated/validators/createEventInput";
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

The compiled entry point loads each Function's module the first time its
export is read. Every Function runs as its own Cloud Run service that reads
only its own export, so a cold start loads that Function's code instead of
the whole backend. `scripts/lazy-entry.cjs` rewrites `lib/index.js` after
`tsc` (the `postbuild` step) and fails the build on any re-export shape it
cannot defer. `src/index.ts` stays an ordinary list of re-exports, and global
options still run before any Function is defined. Deploy discovery and the
emulator read every export, so they load everything as before.

## Secrets

Razorpay secret definitions live in `src/payments/razorpay.ts`.

Current state (since 2026-11-20): `prod` uses Catch's live Razorpay key and
`dev` uses Catch's test-mode key, both from Catch's own Razorpay account. Each
project holds its own plain `RAZORPAY_PUBLIC_KEY_ID` parameter and server-only
`RAZORPAY_KEY_SECRET` secret, and `razorpayWebhook` verifies deliveries with
that project's `RAZORPAY_WEBHOOK_SECRET`. Rotating a key means storing the new
secret version, updating the parameter, and redeploying the Functions that
mount the secret (`docs/release_operations.md`).

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

Firestore rules tests live in `test/rules/`, one `<collection>.rules.test.cjs`
file per collection area with shared fixtures and the emulator lifecycle in
`test/rules/rulesHarness.cjs`; Storage rules tests live at
`test/storage.rules.test.cjs`. They use the `@firebase/rules-unit-testing`
emulators. The `.rules.test.cjs` suffix puts a new rules file in the strict list.
Each collection in `tool/contracts/firestore_contract.json` names its rules
test as `rulesTestFile`, or is listed in `collectionsWithoutRulesTests` with a
reason; `tool/contracts/check_firestore_contract.mjs` enforces one or the other. Add test cases for any new rule conditions, especially `diff()`
checks, `hasOnly`/`hasAll` shape validation, and Storage paths that depend on
Firestore relationship documents.

Run the rules suite through the Firestore + Storage emulator wrapper unless you
already have Firestore on `127.0.0.1:8080` and Storage on `127.0.0.1:9199`.
A direct `npm run test:rules` from this directory only works when those
emulators are already running; `connect ECONNREFUSED` means the emulator
workflow is missing, not necessarily that the rules changed incorrectly.

`test:rules` runs the strict list that `scripts/run-tests.cjs` derives from
file names: `src/**/*.emulator.test.ts`, `test/**/*.emulator.test.cjs` and
`test/**/*.rules.test.cjs`. Name a new emulator-dependent test that way; there
is no list to edit, and `scripts/run-tests.test.cjs` fails when an
emulator-guarded test is named otherwise.

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
./tool/firebase_with_env.sh prod deploy --only functions
./tool/firebase_with_env.sh dev deploy --only firestore:rules
./tool/firebase_with_env.sh prod deploy --only firestore:rules
npm run sync:callable-invokers -- catchdates-dev catch-dating-app-64e51
```

| `updateOrganizerEventSetupDefaults` | Revision-fenced manager save of private suggestions; no provider activation. |
