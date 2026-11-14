const fs = require("node:fs");
const path = require("node:path");
const {before, after, describe, it} = require("node:test");
const {initializeTestEnvironment, assertFails} =
  require("@firebase/rules-unit-testing");
const {doc, collection, getDoc, getDocs, setDoc} = require("firebase/firestore");

const privatePaths = [
  "hostOperatorAlerts/synthetic-private",
  "hostAcquisitionConsents/synthetic-private",
  "hostAcquisitionDeliveries/synthetic-private",
  "hostPilotEventReviews/synthetic-private",
  "hostOrganizerActivations/synthetic-private",
  "salesPartnerMemberships/partner-one", "salesPartnerAssignments/host-one",
  "salesPrivacyRestrictions/host-one", "salesPrivacyPolicies/current",
  "salesPrivacyPlans/plan-one", "salesPrivacyBatchReceipts/receipt-one",
  "salesImportHistoryRows/row-one", "salesImportHistoryRecords/record-one",
  "salesIntakeLinks/synthetic-private",
  "salesHostSettlementAttestations/synthetic-private",
  "salesHostSettlementEvidenceUses/synthetic-private",
  "salesHostSettlementIdentities/synthetic-private",

  "salesOutreachJobs/synthetic-private",
  "salesProviderAttempts/synthetic-private",
  "salesProviderBudgets/synthetic-private",
  "salesEvidenceProposals/synthetic-private",
  "salesPilotPlans/synthetic-private",
  "salesQuotes/synthetic-private",
  "salesQuoteVersions/synthetic-private",
  "salesCommercialDecisions/synthetic-private",
  "salesOpportunityStageHistory/synthetic-private",
  "salesIntelligencePolicies/synthetic-private",
  "salesIntelligenceAssessments/synthetic-private",
  "salesIntelligenceClauses/synthetic-private",
  "salesIntelligenceReceipts/synthetic-private",
  "salesIntelligenceScoreSnapshots/synthetic-private",
  "salesOutreachDrafts/synthetic-private",

  "organizerSalesAccounts/host-one",
  "organizerSalesAccounts/host-one/customValues/sales.language",
  "salesTasks/task-one", "salesOpportunities/opportunity-one",
  "salesActivities/activity-one", "salesCustomFields/sales.language",
  "salesSettings/customFields", "salesActionReceipts/receipt-one",
  "salesInboundIntents/intent-one", "salesContacts/contact-one",
  "salesContactRelationships/relationship-one", "salesEvidence/evidence-one",
  "salesImportJobs/import-one", "salesImportRows/row-one",
  "salesImportJobs/import-one/rows/row-one",
  "salesSuppressionDecisions/decision-one",
  "assistantClients/client-one", "assistantDelegations/delegation-one",
  "assistantGatewayBudgets/budget-one",
  "assistantManagementReceipts/receipt-one",
  "salesDemoBlueprints/blueprint-one", "salesDemoCapabilities/capability-one",
  "salesDemoInvitations/invitation-one", "salesDemoSessions/session-one",
  "salesDemoReceipts/receipt-one", "salesDemoContinuations/continuation-one", "salesDemoSetups/setup-one", "salesImportCompensations/effect-one",
  "salesFitQueueEntries/entry-one", "salesFitQueueMeta/current",
  "salesFitQueueReceipts/receipt-one",
];
let env;

// Run through the standard rules lane. Every identity must use server APIs;
// even a privileged browser cannot bypass scoped service checks and receipts.
describe("sales records stay private behind server operations", () => {
  before(async () => {
    const address = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080")
      .split(":");
    env = await initializeTestEnvironment({
      projectId: "demo-catch-sales-privacy",
      firestore: {host: address[0], port: Number(address[1]),
        rules: fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"),
          "utf8")},
    });
    await env.withSecurityRulesDisabled(async (context) => {
      for (const recordPath of privatePaths) {
        await setDoc(doc(context.firestore(), recordPath), {
          classification: "sales_private", organizerId: "host-one",
          privateNote: "Synthetic internal note", revision: 1,
        });
      }
      await setDoc(doc(context.firestore(), "organizers/host-one"), {
        name: "Synthetic Host", appVisibility: "hidden",
        ownership: {state: "unclaimed"},
      });
    });
  });
  after(async () => { await env?.cleanup(); });

  for (const identity of ["anonymous", "host", "assistant", "adminOwner"]) {
    it(`denies direct private reads, lists and writes for ${identity}`, async () => {
      const db = identity === "anonymous" ? env.unauthenticatedContext().firestore() :
        env.authenticatedContext(identity, identity === "adminOwner" ?
          {adminOwner: true, admin: true} : {}).firestore();
      for (const recordPath of privatePaths) {
        await assertFails(getDoc(doc(db, recordPath)));
        await assertFails(getDocs(collection(db,
          recordPath.split("/").slice(0, -1).join("/"))));
        await assertFails(setDoc(doc(db, recordPath), {revision: 999}));
      }
    });
  }

  it("keeps hidden organizer documents private (#1221)", async () => {
    // organizers/{id} is readable only by the organizer's own team; guests
    // read the public copy in publicOrganizers instead.
    await assertFails(getDoc(doc(
      env.unauthenticatedContext().firestore(), "organizers/host-one")));
    await assertFails(getDoc(doc(
      env.authenticatedContext("someone-else").firestore(), "organizers/host-one")));
  });
});
