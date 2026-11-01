// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export const adminActionCatalog = {
  "schemaVersion": 1,
  "catalogVersion": "1.9.0",
  "actions": [
    {
      "actionId": "access.decide",
      "callable": "adminDecideAccessApplication",
      "workflowIds": [
        "access"
      ],
      "guiPath": "/access",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Approve or deny one launch-access application.",
      "controlPlane": false
    },
    {
      "actionId": "access.get",
      "callable": "adminGetAccessApplicationDetails",
      "workflowIds": [
        "access"
      ],
      "guiPath": "/access",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load one launch-access application and duplicate signals.",
      "controlPlane": false
    },
    {
      "actionId": "admin-roles.get",
      "callable": "adminGetAdminUserRoles",
      "workflowIds": [
        "admin-roles"
      ],
      "guiPath": "/admin-roles",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Load the Catch admin roles assigned to one exact Firebase uid.",
      "controlPlane": false
    },
    {
      "actionId": "admin-roles.list",
      "callable": "adminListAdminRoleAssignments",
      "workflowIds": [
        "admin-roles"
      ],
      "guiPath": "/admin-roles",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "List the bounded admin-role assignment register.",
      "controlPlane": false
    },
    {
      "actionId": "admin-roles.set",
      "callable": "adminSetAdminUserRoles",
      "workflowIds": [
        "admin-roles"
      ],
      "guiPath": "/admin-roles",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "adminOwner"
      ],
      "summary": "Replace the complete Catch admin-role set for one Firebase uid.",
      "controlPlane": false
    },
    {
      "actionId": "analytics.host",
      "callable": "adminGetHostAnalytics",
      "workflowIds": [
        "overview",
        "growth",
        "finance",
        "data-quality"
      ],
      "guiPath": "/growth",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Load aggregate host, organizer, or event analytics for a bounded range.",
      "controlPlane": false
    },
    {
      "actionId": "analytics.user",
      "callable": "adminGetUserAnalytics",
      "workflowIds": [
        "users"
      ],
      "guiPath": "/users",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Load the bounded analytics report for one exact user id.",
      "controlPlane": false
    },
    {
      "actionId": "catch.whatsapp.inbound.review",
      "callable": "adminReviewCatchWhatsappInbound",
      "workflowIds": [
        "overview"
      ],
      "guiPath": "/overview",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "support",
        "adminOwner"
      ],
      "summary": "Review one exact inbound support request in the default-disabled DEV-only panel.",
      "controlPlane": true
    },
    {
      "actionId": "catch.whatsapp.inbound.send",
      "callable": "adminSendCatchWhatsappReply",
      "workflowIds": [
        "overview"
      ],
      "guiPath": "/overview",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "support",
        "adminOwner"
      ],
      "summary": "Send one explicitly confirmed support reply within the separately authorized controlled scope; uncertain attempts remain consumed.",
      "controlPlane": true
    },
    {
      "actionId": "cross-paths-showcase.list",
      "callable": "adminListCrossPathsShowcaseCandidates",
      "workflowIds": [
        "cross-paths-showcase"
      ],
      "guiPath": "/cross-paths",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "List a bounded, score-free Cross Paths showcase review queue from public profile projections.",
      "controlPlane": false
    },
    {
      "actionId": "cross-paths-showcase.set-eligibility",
      "callable": "adminSetCrossPathsShowcaseEligibility",
      "workflowIds": [
        "cross-paths-showcase"
      ],
      "guiPath": "/cross-paths",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer"
      ],
      "summary": "Record an audited, fingerprint-bound Cross Paths showcase eligibility decision without storing an attractiveness score.",
      "controlPlane": false
    },
    {
      "actionId": "event-intake.get",
      "callable": "adminGetEventIntakeDashboard",
      "workflowIds": [
        "event-intake",
        "data-quality"
      ],
      "guiPath": "/intake/events",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load the current Supply Intake event review queue.",
      "controlPlane": false
    },
    {
      "actionId": "event-intake.record-decision",
      "callable": "adminRecordEventIntakeReviewDecision",
      "workflowIds": [
        "event-intake"
      ],
      "guiPath": "/intake/events",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Record one Event Intake review decision without publishing an event.",
      "controlPlane": false
    },
    {
      "actionId": "events.directory",
      "callable": "adminListEventDirectory",
      "workflowIds": [
        "events"
      ],
      "guiPath": "/events",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "List Catch and imported events as one table with a source, exact view totals and chip counts.",
      "controlPlane": false
    },
    {
      "actionId": "events.get",
      "callable": "adminGetEventDetails",
      "workflowIds": [
        "events"
      ],
      "guiPath": "/events",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load one canonical event profile and publication state.",
      "controlPlane": false
    },
    {
      "actionId": "events.list",
      "callable": "adminListEventDetails",
      "workflowIds": [
        "events"
      ],
      "guiPath": "/events",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List bounded canonical events.",
      "controlPlane": false
    },
    {
      "actionId": "events.update",
      "callable": "adminUpdateEventDetails",
      "workflowIds": [
        "events"
      ],
      "guiPath": "/events",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Patch owner-safe fields on one canonical event.",
      "controlPlane": false
    },
    {
      "actionId": "external-events.list",
      "callable": "adminListExternalEventDetails",
      "workflowIds": [
        "external-events"
      ],
      "guiPath": "/events/external",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List bounded read-only external event supply.",
      "controlPlane": false
    },
    {
      "actionId": "external-events.takedown",
      "callable": "adminTakedownExternalEvent",
      "workflowIds": [
        "external-events"
      ],
      "guiPath": "/events/external",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Dry-run or remove one published external event without deleting its audit history.",
      "controlPlane": false
    },
    {
      "actionId": "finance.decide-event-messaging-budget",
      "callable": "adminDecideEventMessagingBudget",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "adminOwner"
      ],
      "summary": "Record a source-fenced event-messaging ceiling decision without creating or activating a spending budget.",
      "controlPlane": false
    },
    {
      "actionId": "finance.export-money-ledger",
      "callable": "adminExportMoneyLedger",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Download one month's ledger (invoices, bill payments, nominator credit paid, costs) as CSV for Zoho Books.",
      "controlPlane": true
    },
    {
      "actionId": "finance.get-month",
      "callable": "adminGetFinanceMonth",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read one month of Finance line by line: ticket sales, what Catch earned, costs and what is not Catch's money.",
      "controlPlane": true
    },
    {
      "actionId": "finance.grant-organizer-entitlement",
      "callable": "adminGrantOrganizerEntitlement",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Grant one entitlement SKU to an organizer after manual invoice reconciliation; idempotent on operationId and grants no dispatch authority.",
      "controlPlane": false
    },
    {
      "actionId": "finance.list-commercial-terms",
      "callable": "adminListCommercialTerms",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance/commercial-terms",
      "kind": "read",
      "risk": "read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review Catch's platform commercial terms, one scope's recent revisions, every organizer override, and find an organizer to add an override for.",
      "controlPlane": false
    },
    {
      "actionId": "finance.manage-commercial-terms",
      "callable": "manageCommercialTerms",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance/commercial-terms",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Read or replace the platform commercial terms or one organizer's sparse override against the reviewed revision, with a reason; only new payments freeze the change.",
      "controlPlane": false
    },
    {
      "actionId": "finance.manage-money-settings",
      "callable": "adminManageMoneySettings",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read or replace Catch's money settings: GST registered, bill due day and the nominator credit rule.",
      "controlPlane": true
    },
    {
      "actionId": "finance.manage-nominator-credits",
      "callable": "adminManageNominatorCredits",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read the nominator credit ledger, approve one nominator's owed credit at or above the minimum payout, or record it paid.",
      "controlPlane": true
    },
    {
      "actionId": "finance.manage-organizer-bills",
      "callable": "adminManageOrganizerBills",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/money/bills",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read a month's organizer bills, make them from its bookings, or send, remind, mark paid or write off one bill against the reviewed revision.",
      "controlPlane": true
    },
    {
      "actionId": "finance.manage-payment-issues",
      "callable": "adminManagePaymentIssues",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/money",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read Money's open or resolved issues, re-check a captured website or offer payment with no booking with Razorpay, or close an issue handled elsewhere.",
      "controlPlane": true
    },
    {
      "actionId": "finance.manage-payment-routing",
      "callable": "managePaymentRoutingPolicy",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance/payment-routing",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Read or replace the app payment routing defaults or one organizer override for event tickets, form fees and host memberships against the reviewed revision; selection never proves provider readiness.",
      "controlPlane": false
    },
    {
      "actionId": "finance.manage-platform-costs",
      "callable": "adminManagePlatformCosts",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read one month's costs, enter one kind of cost by hand (AI, Cloud, SMS, a WhatsApp invoice total) or clear it.",
      "controlPlane": true
    },
    {
      "actionId": "finance.review-event-messaging-budget",
      "callable": "adminReviewEventMessagingBudget",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review one exact messaging runtime, sender, budget scope, and current decision without loading credentials or granting authority.",
      "controlPlane": false
    },
    {
      "actionId": "finance.revoke-organizer-entitlement-grant",
      "callable": "adminRevokeOrganizerEntitlementGrant",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Revoke one existing entitlement grant for an organizer; idempotent on operationId and fails closed on unknown or already-revoked grants.",
      "controlPlane": false
    },
    {
      "actionId": "finance.stage-event-messaging-budget",
      "callable": "adminApplyEventMessagingBudget",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "adminOwner"
      ],
      "summary": "Stage one still-current approved messaging decision as two paused channel ceilings without granting spend, dispatch, or worker activation.",
      "controlPlane": false
    },
    {
      "actionId": "growth.get",
      "callable": "adminGetGrowth",
      "workflowIds": [
        "growth"
      ],
      "guiPath": "/growth",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read Growth for a range: organizer cohorts, channels and ad spend, nominators and their credit, and the best organizers.",
      "controlPlane": true
    },
    {
      "actionId": "inbox.get",
      "callable": "adminGetInboxItem",
      "workflowIds": [
        "inbox"
      ],
      "guiPath": "/inbox",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "Read one inbox item and every step it took; a sales associate may read only what they nominated.",
      "controlPlane": false
    },
    {
      "actionId": "inbox.list",
      "callable": "adminListInboxItems",
      "workflowIds": [
        "inbox"
      ],
      "guiPath": "/inbox",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List one page of the Admin inbox (listings, events, claims, enquiries, launch access and stuck intake), oldest first, with real totals per scope and type.",
      "controlPlane": false
    },
    {
      "actionId": "inbox.update",
      "callable": "adminUpdateInboxItem",
      "workflowIds": [
        "inbox"
      ],
      "guiPath": "/inbox",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Assign, unassign, snooze or wake one inbox item; audited and recorded in its journey.",
      "controlPlane": false
    },
    {
      "actionId": "intake-operations.list",
      "callable": "adminListIntakeOperations",
      "workflowIds": [
        "intake-operations"
      ],
      "guiPath": "/intake/operations",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List the persisted Supply Intake runs and one bounded item page.",
      "controlPlane": false
    },
    {
      "actionId": "marketing.create-draft",
      "callable": "adminCreateMarketingContentDraft",
      "workflowIds": [
        "marketing"
      ],
      "guiPath": "/marketing/new",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Create one reviewable marketing content draft; this does not post it.",
      "controlPlane": false
    },
    {
      "actionId": "marketing.get",
      "callable": "adminGetMarketingOpsDashboard",
      "workflowIds": [
        "marketing",
        "data-quality"
      ],
      "guiPath": "/marketing",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load the current reviewable marketing operations dashboard.",
      "controlPlane": false
    },
    {
      "actionId": "marketing.record-decision",
      "callable": "adminRecordMarketingReviewDecision",
      "workflowIds": [
        "marketing"
      ],
      "guiPath": "/marketing/posts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Record a bounded review decision for one marketing object; this does not post it.",
      "controlPlane": false
    },
    {
      "actionId": "marketplace.get",
      "callable": "adminGetMarketplace",
      "workflowIds": [
        "growth"
      ],
      "guiPath": "/marketplace",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read the Marketplace from the analytics warehouse: cities, guests coming back, bookings each week and organizers going quiet.",
      "controlPlane": true
    },
    {
      "actionId": "nominations.list",
      "callable": "adminListMyNominations",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/nominations",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "List the organizers the caller nominated, newest first, published, waiting or stuck, with real totals per filter.",
      "controlPlane": false
    },
    {
      "actionId": "operations.list-executions",
      "callable": "adminListActionExecutions",
      "workflowIds": [
        "agent-activity"
      ],
      "guiPath": "/operations",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List bounded agent/CLI action executions for GUI monitoring.",
      "controlPlane": false
    },
    {
      "actionId": "operations.record-execution",
      "callable": "adminRecordActionExecution",
      "workflowIds": [],
      "guiPath": "/operations",
      "kind": "control",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Create or advance the remotely visible receipt for one CLI action execution.",
      "controlPlane": true
    },
    {
      "actionId": "organizer-claims.decide",
      "callable": "adminDecideOrganizerClaim",
      "workflowIds": [
        "organizer-claims"
      ],
      "guiPath": "/organizers/claims",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Approve or reject one organizer claim request.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-claims.get",
      "callable": "adminGetOrganizerClaimRequestDetails",
      "workflowIds": [
        "organizer-claims"
      ],
      "guiPath": "/organizers/claims",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load one organizer-claim request and its proof references.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-claims.list",
      "callable": "adminListOrganizerClaimRequests",
      "workflowIds": [
        "organizer-claims"
      ],
      "guiPath": "/organizers/claims",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List the bounded organizer-claim review queue.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-claims.recommend",
      "callable": "adminRecommendOrganizerClaim",
      "workflowIds": [
        "organizer-claims",
        "inbox"
      ],
      "guiPath": "/inbox",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Recommend approving or rejecting a pending organizer claim; the claim stays pending until the owner decides it.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.approve-listing",
      "callable": "adminApproveOrganizerListing",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Approve one Supply Intake listing: publish its organizer page unclaimed and noindex, hidden in the app, record the review, and open its Sales account, opportunity, tasks and activity.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.create-organizer-draft",
      "callable": "adminCreateOrganizerDraftFromCandidate",
      "workflowIds": [
        "organizer-intake",
        "organizers"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Create one unclaimed, source-backed organizer draft from a reviewed Supply Intake candidate; publication, indexing, app visibility, crawling, and ownership remain disabled.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.decide-policy-gap",
      "callable": "adminDecideOrganizerPolicyGap",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Record a policy-gap decision while the underlying behavior remains disabled.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.decide-publication",
      "callable": "adminDecideOrganizerIntake",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Approve or hold one organizer record while setting public-page publication, search indexing, and app discovery independently.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.list-listing-event-imports",
      "callable": "adminListListingEventImports",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List one page of approved Supply Intake listings with the events each imported and where each stands: published, withdrawn, ready, needing a check, or blocked.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.list-listing-reviews",
      "callable": "adminListOrganizerListingReviews",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List one page of Supply Intake listings awaiting approval, newest first, with what a reviewer needs to approve each.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.list-supply-intake-policies",
      "callable": "adminListSupplyIntakePolicies",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List the Supply Intake capabilities that stay off until the owner decides, each with its decision and whether its policy file switches it on.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.publish-listing-events",
      "callable": "adminPublishListingEvents",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Dry-run or publish chosen imported events of one approved listing as read-only, outbound-only external events, with a receipt per event.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.record-curation",
      "callable": "adminRecordOrganizerCuration",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Record one atomic organizer curation operation.",
      "controlPlane": false
    },
    {
      "actionId": "organizer-intake.refresh-organizer-events",
      "callable": "adminRefreshOrganizerEvents",
      "workflowIds": [
        "organizer-intake"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "Read new events for an unclaimed organizer Catch already lists, from given links or its page's event-calendar links; they go through the event publication policy.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.directory",
      "callable": "adminListOrganizerDirectory",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "List the Organizers directory with real totals per view and chip counts for city, kind, claim state and the caller's own organizers.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.get",
      "callable": "adminGetOrganizerDetails",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load one canonical organizer profile and publication state.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.list",
      "callable": "adminListOrganizerDetails",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "List bounded canonical organizer profiles.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.overview",
      "callable": "adminGetOrganizerOverview",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers/:organizerId",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support",
        "salesStaff"
      ],
      "summary": "Read one organizer's overview: facts, Sales owner, terms, payments, journey from nomination to claim and upcoming events.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.set-index-status",
      "callable": "adminSetOrganizerIndexStatus",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Set one organizer compatibility profile's index-readiness state.",
      "controlPlane": false
    },
    {
      "actionId": "organizers.update",
      "callable": "adminUpdateOrganizerDetails",
      "workflowIds": [
        "organizers"
      ],
      "guiPath": "/organizers",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Patch owner-safe fields on one canonical organizer profile.",
      "controlPlane": false
    },
    {
      "actionId": "overview.get",
      "callable": "adminGetOverview",
      "workflowIds": [
        "overview",
        "safety",
        "access",
        "growth",
        "finance",
        "data-quality"
      ],
      "guiPath": "/overview",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Load the bounded admin overview, queue, and data-quality snapshot.",
      "controlPlane": false
    },
    {
      "actionId": "people.search",
      "callable": "adminSearchPeople",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/people",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Search people by name, phone or user id; every search is logged.",
      "controlPlane": false
    },
    {
      "actionId": "safety.actions.lift",
      "callable": "adminLiftAccountSafetyAction",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Lift one account safety action early. Lifting a suspension or ban is owner-only.",
      "controlPlane": false
    },
    {
      "actionId": "safety.actions.list",
      "callable": "adminListAccountSafetyActions",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "List account safety actions in force, with an appeal waiting, or most recent.",
      "controlPlane": false
    },
    {
      "actionId": "safety.actions.take",
      "callable": "adminTakeAccountSafetyAction",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Warn, restrict, suspend or ban one account. Ops may warn and restrict; suspend and ban are owner-only.",
      "controlPlane": false
    },
    {
      "actionId": "safety.appeals.decide",
      "callable": "adminDecideSafetyAppeal",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Decide the one appeal on an account safety action; the reviewer must not be its decider.",
      "controlPlane": false
    },
    {
      "actionId": "safety.assign",
      "callable": "adminAssignSafetyTriageItem",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer"
      ],
      "summary": "Assign or clear the owner of one safety-triage item.",
      "controlPlane": false
    },
    {
      "actionId": "safety.decide",
      "callable": "adminDecideSafetyTriageItem",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer"
      ],
      "summary": "Record the reviewed or dismissed outcome for one safety item.",
      "controlPlane": false
    },
    {
      "actionId": "safety.get",
      "callable": "adminGetSafetyTriageDetails",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/safety",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Load one normalized safety-triage item and its bounded evidence.",
      "controlPlane": false
    },
    {
      "actionId": "safety.settings.get",
      "callable": "adminGetSafetySettings",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/settings/safety",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Read the report reasons, safety rules, deadlines and who may take each step.",
      "controlPlane": false
    },
    {
      "actionId": "safety.settings.update",
      "callable": "adminUpdateSafetySettings",
      "workflowIds": [
        "safety"
      ],
      "guiPath": "/settings/safety",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-only: replace the report reasons and the safety rules.",
      "controlPlane": false
    },
    {
      "actionId": "sales.accounts.setSuppression",
      "callable": "adminSetSalesAccountSuppression",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales accounts.setSuppression operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.activities.log",
      "callable": "adminRecordSalesActivity",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales activities.log operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.detail",
      "callable": "adminGetSalesCommercialDetail",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.finance.attest",
      "callable": "adminAttestSalesHostSettlement",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Attest a reviewed host subscription collection against accepted terms.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.pilots.upsert",
      "callable": "adminUpsertSalesPilotPlan",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.quotes.accept",
      "callable": "adminAcceptSalesQuote",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.quotes.approve",
      "callable": "adminApproveSalesQuote",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.quotes.revise",
      "callable": "adminReviseSalesQuote",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.commercial.report",
      "callable": "adminListSalesCommercialReport",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private host pilot or quote records with current evidence.",
      "controlPlane": false
    },
    {
      "actionId": "sales.contacts.list",
      "callable": "adminListSalesContacts",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales contacts.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.contacts.setContactability",
      "callable": "adminSetSalesContactability",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales contacts.setContactability operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.contacts.upsert",
      "callable": "adminUpsertSalesContact",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales contacts.upsert operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.GetSalesDemoBlueprint",
      "callable": "adminGetSalesDemoBlueprint",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.GetSalesDemoCapability",
      "callable": "adminGetSalesDemoCapability",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.GetSalesDemoInvitation",
      "callable": "adminGetSalesDemoInvitation",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.GetSalesDemoPartnerReview",
      "callable": "adminGetSalesDemoPartnerReview",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review an exact current partner recipient and separately share or withdraw a synthetic composition preview.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.IssueSalesDemoInvitation",
      "callable": "adminIssueSalesDemoInvitation",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.ListSalesDemoBlueprints",
      "callable": "adminListSalesDemoBlueprints",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.ListSalesDemoInvitations",
      "callable": "adminListSalesDemoInvitations",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.ReviewSalesDemoBlueprint",
      "callable": "adminReviewSalesDemoBlueprint",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.RevokeSalesDemoInvitation",
      "callable": "adminRevokeSalesDemoInvitation",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.SaveSalesDemoBlueprint",
      "callable": "adminSaveSalesDemoBlueprint",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.ShareSalesDemoPartnerReview",
      "callable": "adminShareSalesDemoPartnerReview",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review an exact current partner recipient and separately share or withdraw a synthetic composition preview.",
      "controlPlane": false
    },
    {
      "actionId": "sales.demo.WithdrawSalesDemoBlueprint",
      "callable": "adminWithdrawSalesDemoBlueprint",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Manage a private synthetic workflow invitation through owner-only Sales operations.",
      "controlPlane": false
    },
    {
      "actionId": "sales.evidence.add",
      "callable": "adminAddSalesEvidence",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales evidence.add operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.evidence.list",
      "callable": "adminListSalesEvidence",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales evidence.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.evidence.propose",
      "callable": "adminProposeSalesEvidence",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Suggest an unreviewed private fact; never grants qualification.",
      "controlPlane": true
    },
    {
      "actionId": "sales.evidence.reviewProposal",
      "callable": "adminReviewSalesEvidenceProposal",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Employee accepts or rejects the exact version of a suggested fact.",
      "controlPlane": false
    },
    {
      "actionId": "sales.evidenceProposals.list",
      "callable": "adminListSalesEvidenceProposals",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read private evidence suggestions awaiting employee review.",
      "controlPlane": false
    },
    {
      "actionId": "sales.fields.create",
      "callable": "adminCreateSalesCustomField",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales fields.create operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.fields.list",
      "callable": "adminListSalesCustomFields",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales fields.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.fields.setValue",
      "callable": "adminSetSalesCustomFieldValue",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales fields.setValue operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.fitQueue.list",
      "callable": "adminListSalesFitQueue",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review or refresh current private fit ranking without outreach authority.",
      "controlPlane": false
    },
    {
      "actionId": "sales.fitQueue.refresh",
      "callable": "adminRefreshSalesFitQueue",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review or refresh current private fit ranking without outreach authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.fitQueue.refresh_batch",
      "callable": "adminRefreshSalesFitQueueBatch",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review or refresh current private fit ranking without outreach authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.hosts.create",
      "callable": "adminCreateSalesAccount",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales hosts.create operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.hosts.get",
      "callable": "adminGetSalesAccount",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales hosts.get operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.hosts.search",
      "callable": "adminListSalesAccounts",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales hosts.search operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.hosts.update",
      "callable": "adminUpdateSalesAccount",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales hosts.update operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.imports.apply",
      "callable": "adminApplySalesImport",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales imports.apply operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.imports.compensation.apply",
      "callable": "adminApplySalesImportCompensation",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/imports",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Inspect or compensate one proven import effect without deleting the organizer.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.compensation.preview",
      "callable": "adminPreviewSalesImportCompensation",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/imports",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Inspect or compensate one proven import effect without deleting the organizer.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.history.apply",
      "callable": "adminApplySalesImportHistory",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review preserved source history without granting current contact, score, or sending authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.history.list",
      "callable": "adminListSalesImportHistory",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review preserved source history without granting current contact, score, or sending authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.history.preview",
      "callable": "adminPreviewSalesImportHistory",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review preserved source history without granting current contact, score, or sending authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.history.rows.list",
      "callable": "adminListSalesImportHistoryRows",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review preserved source history without granting current contact, score, or sending authority.",
      "controlPlane": true
    },
    {
      "actionId": "sales.imports.preview",
      "callable": "adminPreviewSalesImport",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales imports.preview operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intake.link",
      "callable": "adminLinkOrganizerIntakeToSales",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/organizer-intake",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Join an explicitly reviewed Intake identity to its private Sales account.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intake.list-message-nominators",
      "callable": "adminListSupplyNominators",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/intake/organizers",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "salesStaff"
      ],
      "summary": "List who may nominate organizers by messaging Catch, with numbers shown only as their last four digits.",
      "controlPlane": true
    },
    {
      "actionId": "sales.intake.nominate-organizer",
      "callable": "adminNominateOrganizer",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "salesStaff"
      ],
      "summary": "Nominate an organizer for Supply Intake; the listing is built from its links and waits for staff review before anything is published.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intake.set-message-nominator",
      "callable": "adminSetSupplyNominator",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/intake/organizers",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Let a sales associate or partner nominate organizers by sending links to Catch's WhatsApp number, or stop their messages counting.",
      "controlPlane": true
    },
    {
      "actionId": "sales.intelligence.BuildSalesOutreachInput",
      "callable": "adminBuildSalesOutreachInput",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": true
    },
    {
      "actionId": "sales.intelligence.CopySalesOutreachDraft",
      "callable": "adminCopySalesOutreachDraft",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.GenerateSalesOutreachDraft",
      "callable": "adminGenerateSalesOutreachDraft",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.GetSalesIntelligenceCatalog",
      "callable": "adminGetSalesIntelligenceCatalog",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.GetSalesIntelligenceScore",
      "callable": "adminGetSalesIntelligenceScore",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.GetSalesOutreachDraft",
      "callable": "adminGetSalesOutreachDraft",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.GetSalesOutreachDraftJob",
      "callable": "adminGetSalesOutreachDraftJob",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.ListSalesOutreachDrafts",
      "callable": "adminListSalesOutreachDrafts",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.ReviewSalesIntelligenceClause",
      "callable": "adminReviewSalesIntelligenceClause",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.ReviewSalesOutreachDraft",
      "callable": "adminReviewSalesOutreachDraft",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.SaveSalesFactorAssessment",
      "callable": "adminSaveSalesFactorAssessment",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.SaveSalesIntelligenceClause",
      "callable": "adminSaveSalesIntelligenceClause",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.SaveSalesIntelligencePolicy",
      "callable": "adminSaveSalesIntelligencePolicy",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intelligence.SaveSalesScoreSnapshot",
      "callable": "adminSaveSalesScoreSnapshot",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review private fit evidence and prepare an approved manual outreach draft.",
      "controlPlane": true
    },
    {
      "actionId": "sales.intents.link",
      "callable": "adminLinkSalesInboundIntent",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales intents.link operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.intents.list",
      "callable": "adminListSalesInboundIntents",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/research",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales intents.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.opportunities.list",
      "callable": "adminListSalesOpportunities",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/pipeline",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales opportunities.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.opportunities.upsert",
      "callable": "adminUpsertSalesOpportunity",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/pipeline",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales opportunities.upsert operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.partners.offer",
      "callable": "adminAssignSalesPartner",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/hosts",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Offer a reviewed organizer lead to an exact active referral partner with a bounded next action, review time and expiry.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.batch.apply",
      "callable": "adminApplySalesPrivacyBatch",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.case.get",
      "callable": "adminGetSalesPrivacyCase",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.organizer.restrict",
      "callable": "adminRestrictSalesOrganizer",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.plan.preview",
      "callable": "adminPreviewSalesPrivacyPlan",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.plan.review",
      "callable": "adminReviewSalesPrivacyPlan",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.privacy.policy.review",
      "callable": "adminReviewSalesPrivacyPolicy",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner"
      ],
      "summary": "Owner-reviewed private Sales restriction and bounded cleanup with explicit retained and unresolved records.",
      "controlPlane": true
    },
    {
      "actionId": "sales.receipts.get",
      "callable": "adminGetSalesReceipt",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/settings",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales receipts.get operation.",
      "controlPlane": true
    },
    {
      "actionId": "sales.reporting.funnel",
      "callable": "adminGetSalesFunnelReport",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/pipeline",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Read bounded current funnel totals, stage entries, and follow-up obligations.",
      "controlPlane": true
    },
    {
      "actionId": "sales.tasks.list",
      "callable": "adminListSalesTasks",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/today",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales tasks.list operation.",
      "controlPlane": false
    },
    {
      "actionId": "sales.tasks.upsert",
      "callable": "adminUpsertSalesTask",
      "workflowIds": [
        "sales"
      ],
      "guiPath": "/sales/today",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "admin",
        "adminOwner"
      ],
      "summary": "Review and execute the bounded private Sales tasks.upsert operation.",
      "controlPlane": false
    },
    {
      "actionId": "support.conversations.get",
      "callable": "adminGetSupportConversation",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Open one support conversation with its messages and links.",
      "controlPlane": false
    },
    {
      "actionId": "support.conversations.list",
      "callable": "adminListSupportConversations",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "read",
      "risk": "sensitive-read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "List support conversations by view, longest waiting first.",
      "controlPlane": false
    },
    {
      "actionId": "support.conversations.update",
      "callable": "adminUpdateSupportConversation",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Set a conversation's owner, status and links.",
      "controlPlane": false
    },
    {
      "actionId": "support.messages.record",
      "callable": "adminRecordSupportMessage",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Record a reply, a logged email or an internal note in a conversation.",
      "controlPlane": false
    },
    {
      "actionId": "support.replies.list",
      "callable": "adminListSupportSavedReplies",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "List saved replies.",
      "controlPlane": false
    },
    {
      "actionId": "support.replies.upsert",
      "callable": "adminUpsertSupportSavedReply",
      "workflowIds": [
        "support"
      ],
      "guiPath": "/support",
      "kind": "mutation",
      "risk": "medium",
      "roles": [
        "admin",
        "adminOwner",
        "safetyReviewer",
        "support"
      ],
      "summary": "Add or edit a saved reply.",
      "controlPlane": false
    }
  ],
  "workflows": [
    {
      "workflowId": "access",
      "label": "Access review",
      "guiPath": "/access",
      "actions": [
        "access.decide",
        "access.get",
        "overview.get"
      ]
    },
    {
      "workflowId": "admin-roles",
      "label": "Admin roles",
      "guiPath": "/admin-roles",
      "actions": [
        "admin-roles.get",
        "admin-roles.list",
        "admin-roles.set"
      ]
    },
    {
      "workflowId": "agent-activity",
      "label": "Agent activity",
      "guiPath": "/operations",
      "actions": [
        "operations.list-executions"
      ]
    },
    {
      "workflowId": "cross-paths-showcase",
      "label": "Cross Paths showcase",
      "guiPath": "/cross-paths",
      "actions": [
        "cross-paths-showcase.list",
        "cross-paths-showcase.set-eligibility"
      ]
    },
    {
      "workflowId": "data-quality",
      "label": "Data quality",
      "guiPath": "/quality",
      "actions": [
        "analytics.host",
        "event-intake.get",
        "marketing.get",
        "overview.get"
      ]
    },
    {
      "workflowId": "event-intake",
      "label": "Event Intake",
      "guiPath": "/intake/events",
      "actions": [
        "event-intake.get",
        "event-intake.record-decision"
      ]
    },
    {
      "workflowId": "events",
      "label": "Events",
      "guiPath": "/events",
      "actions": [
        "events.directory",
        "events.get",
        "events.list",
        "events.update"
      ]
    },
    {
      "workflowId": "external-events",
      "label": "External events",
      "guiPath": "/events/external",
      "actions": [
        "external-events.list",
        "external-events.takedown"
      ]
    },
    {
      "workflowId": "finance",
      "label": "Finance",
      "guiPath": "/finance",
      "blockedCapabilities": [
        "retry_payment",
        "refund",
        "payout_mutation",
        "settlement_mutation",
        "messaging_budget_activation"
      ],
      "actions": [
        "analytics.host",
        "finance.decide-event-messaging-budget",
        "finance.export-money-ledger",
        "finance.get-month",
        "finance.grant-organizer-entitlement",
        "finance.list-commercial-terms",
        "finance.manage-commercial-terms",
        "finance.manage-money-settings",
        "finance.manage-nominator-credits",
        "finance.manage-organizer-bills",
        "finance.manage-payment-issues",
        "finance.manage-payment-routing",
        "finance.manage-platform-costs",
        "finance.review-event-messaging-budget",
        "finance.revoke-organizer-entitlement-grant",
        "finance.stage-event-messaging-budget",
        "overview.get"
      ]
    },
    {
      "workflowId": "growth",
      "label": "Growth",
      "guiPath": "/growth",
      "actions": [
        "analytics.host",
        "growth.get",
        "marketplace.get",
        "overview.get"
      ]
    },
    {
      "workflowId": "inbox",
      "label": "Inbox",
      "guiPath": "/inbox",
      "actions": [
        "inbox.get",
        "inbox.list",
        "inbox.update",
        "organizer-claims.recommend"
      ]
    },
    {
      "workflowId": "intake-operations",
      "label": "Intake Operations",
      "guiPath": "/intake/operations",
      "actions": [
        "intake-operations.list"
      ]
    },
    {
      "workflowId": "marketing",
      "label": "Marketing",
      "guiPath": "/marketing",
      "actions": [
        "marketing.create-draft",
        "marketing.get",
        "marketing.record-decision"
      ]
    },
    {
      "workflowId": "organizer-claims",
      "label": "Organizer claims",
      "guiPath": "/organizers/claims",
      "actions": [
        "organizer-claims.decide",
        "organizer-claims.get",
        "organizer-claims.list",
        "organizer-claims.recommend"
      ]
    },
    {
      "workflowId": "organizer-intake",
      "label": "Organizer Intake",
      "guiPath": "/intake/organizers",
      "actions": [
        "organizer-intake.approve-listing",
        "organizer-intake.create-organizer-draft",
        "organizer-intake.decide-policy-gap",
        "organizer-intake.decide-publication",
        "organizer-intake.list-listing-event-imports",
        "organizer-intake.list-listing-reviews",
        "organizer-intake.list-supply-intake-policies",
        "organizer-intake.publish-listing-events",
        "organizer-intake.record-curation",
        "organizer-intake.refresh-organizer-events"
      ]
    },
    {
      "workflowId": "organizers",
      "label": "Organizers",
      "guiPath": "/organizers",
      "actions": [
        "organizer-intake.create-organizer-draft",
        "organizers.directory",
        "organizers.get",
        "organizers.list",
        "organizers.overview",
        "organizers.set-index-status",
        "organizers.update"
      ]
    },
    {
      "workflowId": "overview",
      "label": "Overview",
      "guiPath": "/overview",
      "actions": [
        "analytics.host",
        "catch.whatsapp.inbound.review",
        "catch.whatsapp.inbound.send",
        "overview.get"
      ]
    },
    {
      "workflowId": "safety",
      "label": "Safety triage",
      "guiPath": "/safety",
      "actions": [
        "overview.get",
        "people.search",
        "safety.actions.lift",
        "safety.actions.list",
        "safety.actions.take",
        "safety.appeals.decide",
        "safety.assign",
        "safety.decide",
        "safety.get",
        "safety.settings.get",
        "safety.settings.update"
      ]
    },
    {
      "workflowId": "sales",
      "label": "Sales",
      "guiPath": "/sales/today",
      "actions": [
        "nominations.list",
        "sales.accounts.setSuppression",
        "sales.activities.log",
        "sales.commercial.detail",
        "sales.commercial.finance.attest",
        "sales.commercial.pilots.upsert",
        "sales.commercial.quotes.accept",
        "sales.commercial.quotes.approve",
        "sales.commercial.quotes.revise",
        "sales.commercial.report",
        "sales.contacts.list",
        "sales.contacts.setContactability",
        "sales.contacts.upsert",
        "sales.demo.GetSalesDemoBlueprint",
        "sales.demo.GetSalesDemoCapability",
        "sales.demo.GetSalesDemoInvitation",
        "sales.demo.GetSalesDemoPartnerReview",
        "sales.demo.IssueSalesDemoInvitation",
        "sales.demo.ListSalesDemoBlueprints",
        "sales.demo.ListSalesDemoInvitations",
        "sales.demo.ReviewSalesDemoBlueprint",
        "sales.demo.RevokeSalesDemoInvitation",
        "sales.demo.SaveSalesDemoBlueprint",
        "sales.demo.ShareSalesDemoPartnerReview",
        "sales.demo.WithdrawSalesDemoBlueprint",
        "sales.evidence.add",
        "sales.evidence.list",
        "sales.evidence.propose",
        "sales.evidence.reviewProposal",
        "sales.evidenceProposals.list",
        "sales.fields.create",
        "sales.fields.list",
        "sales.fields.setValue",
        "sales.fitQueue.list",
        "sales.fitQueue.refresh",
        "sales.fitQueue.refresh_batch",
        "sales.hosts.create",
        "sales.hosts.get",
        "sales.hosts.search",
        "sales.hosts.update",
        "sales.imports.apply",
        "sales.imports.compensation.apply",
        "sales.imports.compensation.preview",
        "sales.imports.history.apply",
        "sales.imports.history.list",
        "sales.imports.history.preview",
        "sales.imports.history.rows.list",
        "sales.imports.preview",
        "sales.intake.link",
        "sales.intake.list-message-nominators",
        "sales.intake.nominate-organizer",
        "sales.intake.set-message-nominator",
        "sales.intelligence.BuildSalesOutreachInput",
        "sales.intelligence.CopySalesOutreachDraft",
        "sales.intelligence.GenerateSalesOutreachDraft",
        "sales.intelligence.GetSalesIntelligenceCatalog",
        "sales.intelligence.GetSalesIntelligenceScore",
        "sales.intelligence.GetSalesOutreachDraft",
        "sales.intelligence.GetSalesOutreachDraftJob",
        "sales.intelligence.ListSalesOutreachDrafts",
        "sales.intelligence.ReviewSalesIntelligenceClause",
        "sales.intelligence.ReviewSalesOutreachDraft",
        "sales.intelligence.SaveSalesFactorAssessment",
        "sales.intelligence.SaveSalesIntelligenceClause",
        "sales.intelligence.SaveSalesIntelligencePolicy",
        "sales.intelligence.SaveSalesScoreSnapshot",
        "sales.intents.link",
        "sales.intents.list",
        "sales.opportunities.list",
        "sales.opportunities.upsert",
        "sales.partners.offer",
        "sales.privacy.batch.apply",
        "sales.privacy.case.get",
        "sales.privacy.organizer.restrict",
        "sales.privacy.plan.preview",
        "sales.privacy.plan.review",
        "sales.privacy.policy.review",
        "sales.receipts.get",
        "sales.reporting.funnel",
        "sales.tasks.list",
        "sales.tasks.upsert"
      ]
    },
    {
      "workflowId": "support",
      "label": "Support inbox",
      "guiPath": "/support",
      "actions": [
        "support.conversations.get",
        "support.conversations.list",
        "support.conversations.update",
        "support.messages.record",
        "support.replies.list",
        "support.replies.upsert"
      ]
    },
    {
      "workflowId": "users",
      "label": "Users",
      "guiPath": "/users",
      "actions": [
        "analytics.user"
      ]
    }
  ]
} as const;

export type AdminActionId = typeof adminActionCatalog.actions[number]["actionId"];
