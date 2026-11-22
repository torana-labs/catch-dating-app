// Firestore rules: collections that only Functions and tools touch. Shared fixtures and
// the emulator lifecycle live in rulesHarness.cjs.
const {
  assertFails,
  authedDb,
  describe,
  doc,
  getDoc,
  it,
  setDoc,
  useRulesEnvironment,
} = require("./rulesHarness.cjs");

let testEnv;

// Every Firestore contract whose collection no client reads or writes. The
// contract checker requires each to have a rules match; this proves the match
// denies everyone.
const SERVER_ONLY = [
  "accountSafetyActions",
  "adAudienceRuns",
  "adConversionContexts",
  "adConversionDeliveries",
  "adMatchingOptOuts",
  "adminAuditLogs",
  "adminRoleAssignments",
  "bannedIdentities",
  "billingNoticeSettings",
  "blockedSignupAttempts",
  "catchWhatsappAppAuthorities",
  "catchWhatsappAutoReplies",
  "catchWhatsappClarifications",
  "catchWhatsappEndpointStops",
  "catchWhatsappIngressEvidence",
  "catchWhatsappReadinessPublications",
  "catchWhatsappReplyOperations",
  "catchWhatsappReplyReadiness",
  "deliveryMessages",
  "demoOpsConfirmations",
  "demoOpsEvents",
  "demoOpsRequests",
  "discoverySettings",
  "eventApprovalNotificationBudgets",
  "eventApprovalNotificationPreferences",
  "eventApprovalNotificationReceipts",
  "eventApprovalNotificationSettings",
  "eventIntakeReviewDecisions",
  "eventPlanChanges",
  "eventRosterHandoffs",
  "eventSeatIdentityAliases",
  "eventSeatLedgers",
  "eventSeatMigrationFences",
  "eventSeatMigrationPlans",
  "eventSeatMigrationRuns",
  "eventSeatMigrationStages",
  "eventSeatRequestReceipts",
  "eventSeatReservations",
  "eventSeatVerifiedPhones",
  "externalEventPublicationReceipts",
  "formCommunicationConsentIntents",
  "guestImportHeaderShapes",
  "hostOperatorAlerts/scopeId-1/windows",
  "hostOrganizerActivations",
  "hostPilotEventReviews",
  "launchWaitlist",
  "listingProgramSettings",
  "marketingOpsDashboards",
  "metaLeadgenEvents",
  "moneyInvoiceCounters",
  "moneyIssueResolutions",
  "moneySettings",
  "nativeRefundRecoveryCursors",
  "nominatorCredits",
  "organizerBillingCycles",
  "organizerBillingPlans",
  "organizerBillNotices",
  "organizerBills",
  "organizerCampaignRecipients",
  "organizerCampaignWebhookReceipts",
  "organizerContactChannelStates",
  "organizerFormAggregateEvents",
  "organizerFormAggregates",
  "organizerFormAssets",
  "organizerFormConversionReceipts",
  "organizerFormExports",
  "organizerFormResponseDrafts",
  "organizerFormResponses",
  "organizerFormShareLinks",
  "organizerGrowthFacts",
  "organizerGuestBlocks",
  "organizerIntakeCurationDecisions",
  "organizerIntakeFieldCorrections",
  "organizerIntakeReviewDecisions",
  "organizerMessageTemplates",
  "organizerMessagingWebhookEvents",
  "organizerMomentRuns",
  "organizerMoments",
  "organizerMomentSends",
  "organizerMomentSweepState",
  "organizerPolicyGapReviewDecisions",
  "organizerReferrals",
  "organizerSenderConnections",
  "platformCosts",
  "programDoorJournal",
  "programGuestGroups",
  "programRetentionRuns",
  "programRoomBlocks",
  "programStays",
  "publicRouteReservations",
  "safetySettings",
  "supplyNominators",
  "supportConversations",
  "supportSavedReplies",
  "tryItWorkspaces",
  "walkthroughAvailability",
  "walkthroughBookings",
  "walkthroughSlotHolds",
  "whatsappDispatches",
];

describe("firestore.rules", () => {
  useRulesEnvironment((env) => {
    testEnv = env;
  });

  describe("server-only collections", () => {
    for (const name of SERVER_ONLY) {
      it(`denies every client read and write on ${name}`, async () => {
        const signedIn = authedDb("runner-1");
        const signedOut = testEnv.unauthenticatedContext().firestore();
        for (const db of [signedIn, signedOut]) {
          await assertFails(getDoc(doc(db, name, "doc-1")));
          await assertFails(setDoc(doc(db, name, "doc-1"), {uid: "runner-1"}));
        }
      });
    }
  });
});
