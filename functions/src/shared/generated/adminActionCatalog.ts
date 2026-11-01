// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export const ADMIN_ACTION_CATALOG = {
  "access.decide": {
    "callable": "adminDecideAccessApplication",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "access.get": {
    "callable": "adminGetAccessApplicationDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "admin-roles.get": {
    "callable": "adminGetAdminUserRoles",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "admin-roles.list": {
    "callable": "adminListAdminRoleAssignments",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "admin-roles.set": {
    "callable": "adminSetAdminUserRoles",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "analytics.host": {
    "callable": "adminGetHostAnalytics",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "analytics.user": {
    "callable": "adminGetUserAnalytics",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "catch.whatsapp.inbound.review": {
    "callable": "adminReviewCatchWhatsappInbound",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "support",
      "adminOwner"
    ]
  },
  "catch.whatsapp.inbound.send": {
    "callable": "adminSendCatchWhatsappReply",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "support",
      "adminOwner"
    ]
  },
  "cross-paths-showcase.list": {
    "callable": "adminListCrossPathsShowcaseCandidates",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "cross-paths-showcase.set-eligibility": {
    "callable": "adminSetCrossPathsShowcaseEligibility",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ]
  },
  "event-intake.get": {
    "callable": "adminGetEventIntakeDashboard",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "event-intake.record-decision": {
    "callable": "adminRecordEventIntakeReviewDecision",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "events.directory": {
    "callable": "adminListEventDirectory",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "events.get": {
    "callable": "adminGetEventDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "events.list": {
    "callable": "adminListEventDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "events.update": {
    "callable": "adminUpdateEventDetails",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "external-events.list": {
    "callable": "adminListExternalEventDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "external-events.takedown": {
    "callable": "adminTakedownExternalEvent",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "finance.decide-event-messaging-budget": {
    "callable": "adminDecideEventMessagingBudget",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.export-money-ledger": {
    "callable": "adminExportMoneyLedger",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.get-month": {
    "callable": "adminGetFinanceMonth",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.grant-organizer-entitlement": {
    "callable": "adminGrantOrganizerEntitlement",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.list-commercial-terms": {
    "callable": "adminListCommercialTerms",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.manage-commercial-terms": {
    "callable": "manageCommercialTerms",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.manage-money-settings": {
    "callable": "adminManageMoneySettings",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.manage-nominator-credits": {
    "callable": "adminManageNominatorCredits",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.manage-organizer-bills": {
    "callable": "adminManageOrganizerBills",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.manage-payment-issues": {
    "callable": "adminManagePaymentIssues",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.manage-payment-routing": {
    "callable": "managePaymentRoutingPolicy",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.manage-platform-costs": {
    "callable": "adminManagePlatformCosts",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "finance.review-event-messaging-budget": {
    "callable": "adminReviewEventMessagingBudget",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.revoke-organizer-entitlement-grant": {
    "callable": "adminRevokeOrganizerEntitlementGrant",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "finance.stage-event-messaging-budget": {
    "callable": "adminApplyEventMessagingBudget",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "growth.get": {
    "callable": "adminGetGrowth",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "inbox.get": {
    "callable": "adminGetInboxItem",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "inbox.list": {
    "callable": "adminListInboxItems",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "inbox.update": {
    "callable": "adminUpdateInboxItem",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "intake-operations.list": {
    "callable": "adminListIntakeOperations",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "marketing.create-draft": {
    "callable": "adminCreateMarketingContentDraft",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "marketing.get": {
    "callable": "adminGetMarketingOpsDashboard",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "marketing.record-decision": {
    "callable": "adminRecordMarketingReviewDecision",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "marketplace.get": {
    "callable": "adminGetMarketplace",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "nominations.list": {
    "callable": "adminListMyNominations",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "operations.list-executions": {
    "callable": "adminListActionExecutions",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "operations.record-execution": {
    "callable": "adminRecordActionExecution",
    "controlPlane": true,
    "kind": "control",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "organizer-claims.decide": {
    "callable": "adminDecideOrganizerClaim",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "organizer-claims.get": {
    "callable": "adminGetOrganizerClaimRequestDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-claims.list": {
    "callable": "adminListOrganizerClaimRequests",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-claims.recommend": {
    "callable": "adminRecommendOrganizerClaim",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.approve-listing": {
    "callable": "adminApproveOrganizerListing",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.create-organizer-draft": {
    "callable": "adminCreateOrganizerDraftFromCandidate",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.decide-policy-gap": {
    "callable": "adminDecideOrganizerPolicyGap",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.decide-publication": {
    "callable": "adminDecideOrganizerIntake",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.list-listing-event-imports": {
    "callable": "adminListListingEventImports",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.list-listing-reviews": {
    "callable": "adminListOrganizerListingReviews",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.list-supply-intake-policies": {
    "callable": "adminListSupplyIntakePolicies",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.publish-listing-events": {
    "callable": "adminPublishListingEvents",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.record-curation": {
    "callable": "adminRecordOrganizerCuration",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizer-intake.refresh-organizer-events": {
    "callable": "adminRefreshOrganizerEvents",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "organizers.directory": {
    "callable": "adminListOrganizerDirectory",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "organizers.get": {
    "callable": "adminGetOrganizerDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizers.list": {
    "callable": "adminListOrganizerDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizers.overview": {
    "callable": "adminGetOrganizerOverview",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ]
  },
  "organizers.set-index-status": {
    "callable": "adminSetOrganizerIndexStatus",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "organizers.update": {
    "callable": "adminUpdateOrganizerDetails",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ]
  },
  "overview.get": {
    "callable": "adminGetOverview",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "people.search": {
    "callable": "adminSearchPeople",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.actions.lift": {
    "callable": "adminLiftAccountSafetyAction",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.actions.list": {
    "callable": "adminListAccountSafetyActions",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.actions.take": {
    "callable": "adminTakeAccountSafetyAction",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.appeals.decide": {
    "callable": "adminDecideSafetyAppeal",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.assign": {
    "callable": "adminAssignSafetyTriageItem",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ]
  },
  "safety.decide": {
    "callable": "adminDecideSafetyTriageItem",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ]
  },
  "safety.get": {
    "callable": "adminGetSafetyTriageDetails",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.settings.get": {
    "callable": "adminGetSafetySettings",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "safety.settings.update": {
    "callable": "adminUpdateSafetySettings",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.accounts.setSuppression": {
    "callable": "adminSetSalesAccountSuppression",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.activities.log": {
    "callable": "adminRecordSalesActivity",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.detail": {
    "callable": "adminGetSalesCommercialDetail",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.finance.attest": {
    "callable": "adminAttestSalesHostSettlement",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.commercial.pilots.upsert": {
    "callable": "adminUpsertSalesPilotPlan",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.quotes.accept": {
    "callable": "adminAcceptSalesQuote",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.quotes.approve": {
    "callable": "adminApproveSalesQuote",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.quotes.revise": {
    "callable": "adminReviseSalesQuote",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.commercial.report": {
    "callable": "adminListSalesCommercialReport",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.contacts.list": {
    "callable": "adminListSalesContacts",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.contacts.setContactability": {
    "callable": "adminSetSalesContactability",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.contacts.upsert": {
    "callable": "adminUpsertSalesContact",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.demo.GetSalesDemoBlueprint": {
    "callable": "adminGetSalesDemoBlueprint",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.GetSalesDemoCapability": {
    "callable": "adminGetSalesDemoCapability",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.GetSalesDemoInvitation": {
    "callable": "adminGetSalesDemoInvitation",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.GetSalesDemoPartnerReview": {
    "callable": "adminGetSalesDemoPartnerReview",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.IssueSalesDemoInvitation": {
    "callable": "adminIssueSalesDemoInvitation",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.ListSalesDemoBlueprints": {
    "callable": "adminListSalesDemoBlueprints",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.ListSalesDemoInvitations": {
    "callable": "adminListSalesDemoInvitations",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.ReviewSalesDemoBlueprint": {
    "callable": "adminReviewSalesDemoBlueprint",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.RevokeSalesDemoInvitation": {
    "callable": "adminRevokeSalesDemoInvitation",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.SaveSalesDemoBlueprint": {
    "callable": "adminSaveSalesDemoBlueprint",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.ShareSalesDemoPartnerReview": {
    "callable": "adminShareSalesDemoPartnerReview",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.demo.WithdrawSalesDemoBlueprint": {
    "callable": "adminWithdrawSalesDemoBlueprint",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.evidence.add": {
    "callable": "adminAddSalesEvidence",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.evidence.list": {
    "callable": "adminListSalesEvidence",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.evidence.propose": {
    "callable": "adminProposeSalesEvidence",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.evidence.reviewProposal": {
    "callable": "adminReviewSalesEvidenceProposal",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.evidenceProposals.list": {
    "callable": "adminListSalesEvidenceProposals",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fields.create": {
    "callable": "adminCreateSalesCustomField",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fields.list": {
    "callable": "adminListSalesCustomFields",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fields.setValue": {
    "callable": "adminSetSalesCustomFieldValue",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fitQueue.list": {
    "callable": "adminListSalesFitQueue",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fitQueue.refresh": {
    "callable": "adminRefreshSalesFitQueue",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.fitQueue.refresh_batch": {
    "callable": "adminRefreshSalesFitQueueBatch",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.hosts.create": {
    "callable": "adminCreateSalesAccount",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.hosts.get": {
    "callable": "adminGetSalesAccount",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.hosts.search": {
    "callable": "adminListSalesAccounts",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.hosts.update": {
    "callable": "adminUpdateSalesAccount",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.imports.apply": {
    "callable": "adminApplySalesImport",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.imports.compensation.apply": {
    "callable": "adminApplySalesImportCompensation",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.imports.compensation.preview": {
    "callable": "adminPreviewSalesImportCompensation",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.imports.history.apply": {
    "callable": "adminApplySalesImportHistory",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.imports.history.list": {
    "callable": "adminListSalesImportHistory",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.imports.history.preview": {
    "callable": "adminPreviewSalesImportHistory",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.imports.history.rows.list": {
    "callable": "adminListSalesImportHistoryRows",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.imports.preview": {
    "callable": "adminPreviewSalesImport",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intake.link": {
    "callable": "adminLinkOrganizerIntakeToSales",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intake.list-message-nominators": {
    "callable": "adminListSupplyNominators",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "salesStaff"
    ]
  },
  "sales.intake.nominate-organizer": {
    "callable": "adminNominateOrganizer",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "salesStaff"
    ]
  },
  "sales.intake.set-message-nominator": {
    "callable": "adminSetSupplyNominator",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.BuildSalesOutreachInput": {
    "callable": "adminBuildSalesOutreachInput",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.CopySalesOutreachDraft": {
    "callable": "adminCopySalesOutreachDraft",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.GenerateSalesOutreachDraft": {
    "callable": "adminGenerateSalesOutreachDraft",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.GetSalesIntelligenceCatalog": {
    "callable": "adminGetSalesIntelligenceCatalog",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.GetSalesIntelligenceScore": {
    "callable": "adminGetSalesIntelligenceScore",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.GetSalesOutreachDraft": {
    "callable": "adminGetSalesOutreachDraft",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.GetSalesOutreachDraftJob": {
    "callable": "adminGetSalesOutreachDraftJob",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.ListSalesOutreachDrafts": {
    "callable": "adminListSalesOutreachDrafts",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.ReviewSalesIntelligenceClause": {
    "callable": "adminReviewSalesIntelligenceClause",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.intelligence.ReviewSalesOutreachDraft": {
    "callable": "adminReviewSalesOutreachDraft",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.SaveSalesFactorAssessment": {
    "callable": "adminSaveSalesFactorAssessment",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.SaveSalesIntelligenceClause": {
    "callable": "adminSaveSalesIntelligenceClause",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intelligence.SaveSalesIntelligencePolicy": {
    "callable": "adminSaveSalesIntelligencePolicy",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.intelligence.SaveSalesScoreSnapshot": {
    "callable": "adminSaveSalesScoreSnapshot",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intents.link": {
    "callable": "adminLinkSalesInboundIntent",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.intents.list": {
    "callable": "adminListSalesInboundIntents",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.opportunities.list": {
    "callable": "adminListSalesOpportunities",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.opportunities.upsert": {
    "callable": "adminUpsertSalesOpportunity",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.partners.offer": {
    "callable": "adminAssignSalesPartner",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.privacy.batch.apply": {
    "callable": "adminApplySalesPrivacyBatch",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.privacy.case.get": {
    "callable": "adminGetSalesPrivacyCase",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.privacy.organizer.restrict": {
    "callable": "adminRestrictSalesOrganizer",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.privacy.plan.preview": {
    "callable": "adminPreviewSalesPrivacyPlan",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.privacy.plan.review": {
    "callable": "adminReviewSalesPrivacyPlan",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.privacy.policy.review": {
    "callable": "adminReviewSalesPrivacyPolicy",
    "controlPlane": true,
    "kind": "mutation",
    "roles": [
      "adminOwner"
    ]
  },
  "sales.receipts.get": {
    "callable": "adminGetSalesReceipt",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.reporting.funnel": {
    "callable": "adminGetSalesFunnelReport",
    "controlPlane": true,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.tasks.list": {
    "callable": "adminListSalesTasks",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "sales.tasks.upsert": {
    "callable": "adminUpsertSalesTask",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner"
    ]
  },
  "support.conversations.get": {
    "callable": "adminGetSupportConversation",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "support.conversations.list": {
    "callable": "adminListSupportConversations",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "support.conversations.update": {
    "callable": "adminUpdateSupportConversation",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "support.messages.record": {
    "callable": "adminRecordSupportMessage",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "support.replies.list": {
    "callable": "adminListSupportSavedReplies",
    "controlPlane": false,
    "kind": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  },
  "support.replies.upsert": {
    "callable": "adminUpsertSupportSavedReply",
    "controlPlane": false,
    "kind": "mutation",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ]
  }
} as const;

export type AdminActionId = keyof typeof ADMIN_ACTION_CATALOG;
