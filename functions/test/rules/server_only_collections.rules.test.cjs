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
  "adAudienceRuns",
  "adConversionContexts",
  "adConversionDeliveries",
  "adMatchingOptOuts",
  "adminAuditLogs",
  "adminRoleAssignments",
  "catchWhatsappAppAuthorities",
  "catchWhatsappAutoReplies",
  "catchWhatsappClarifications",
  "catchWhatsappIngressEvidence",
  "catchWhatsappReadinessPublications",
  "eventIntakeReviewDecisions",
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
  "hostAcquisitionConsents",
  "hostAcquisitionDeliveries",
  "hostOrganizerActivations",
  "hostPilotEventReviews",
  "launchWaitlist",
  "listingProgramSettings",
  "marketingOpsDashboards",
  "metaLeadgenEvents",
  "nativeRefundRecoveryCursors",
  "organizerIntakeCurationDecisions",
  "organizerIntakeFieldCorrections",
  "organizerIntakeReviewDecisions",
  "organizerPolicyGapReviewDecisions",
  "organizerReferrals",
  "programRoomBlocks",
  "programStays",
  "tryItWorkspaces",
  "walkthroughAvailability",
  "walkthroughBookings",
  "walkthroughSlotHolds",
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
