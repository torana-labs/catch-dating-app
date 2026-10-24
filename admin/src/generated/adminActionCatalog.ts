// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export const adminActionCatalog = {
  "schemaVersion": 1,
  "catalogVersion": "1.7.0",
  "actions": [
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
        "support",
        "finance",
        "analyticsViewer"
      ],
      "summary": "Load the bounded admin overview, queue, and data-quality snapshot.",
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
        "adminOwner",
        "analyticsViewer"
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
        "adminOwner",
        "analyticsViewer"
      ],
      "summary": "Load the bounded analytics report for one exact user id.",
      "controlPlane": false
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
        "adminOwner",
        "finance"
      ],
      "summary": "Review one exact messaging runtime, sender, budget scope, and current decision without loading credentials or granting authority.",
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
        "adminOwner",
        "finance"
      ],
      "summary": "Record a source-fenced event-messaging ceiling decision without creating or activating a spending budget.",
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
        "adminOwner",
        "finance"
      ],
      "summary": "Stage one still-current approved messaging decision as two paused channel ceilings without granting spend, dispatch, or worker activation.",
      "controlPlane": false
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
      "actionId": "organizer-intake.decide-event-candidate",
      "callable": "adminDecideOrganizerEventCandidate",
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
      "summary": "Record a review decision for one organizer-sourced event candidate without importing it.",
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
      "actionId": "organizer-intake.resolve-location",
      "callable": "adminResolveOrganizerEventLocation",
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
      "summary": "Record reviewed coordinates for one private external event candidate.",
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
        "adminOwner",
        "support"
      ],
      "summary": "Approve or reject one organizer claim request.",
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
      "actionId": "external-events.readiness",
      "callable": "adminGetEventSupplyReadiness",
      "workflowIds": [
        "external-events",
        "data-quality"
      ],
      "guiPath": "/events/readiness",
      "kind": "read",
      "risk": "read",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Load the reviewed external-event import preflight and execution plan.",
      "controlPlane": false
    },
    {
      "actionId": "external-events.publish",
      "callable": "adminPublishExternalEvent",
      "workflowIds": [
        "external-events"
      ],
      "guiPath": "/events/readiness",
      "kind": "mutation",
      "risk": "critical",
      "roles": [
        "admin",
        "adminOwner",
        "support"
      ],
      "summary": "Dry-run or publish one preflight-approved read-only external event with an idempotency receipt.",
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
        "support",
        "finance",
        "analyticsViewer"
      ],
      "summary": "Create or advance the remotely visible receipt for one CLI action execution.",
      "controlPlane": true
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
      "actionId": "finance.grant-organizer-entitlement",
      "callable": "adminGrantOrganizerEntitlement",
      "workflowIds": [
        "finance"
      ],
      "guiPath": "/finance",
      "kind": "mutation",
      "risk": "high",
      "roles": [
        "adminOwner",
        "finance"
      ],
      "summary": "Grant one entitlement SKU to an organizer after manual invoice reconciliation; idempotent on operationId and grants no dispatch authority.",
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
        "adminOwner",
        "finance"
      ],
      "summary": "Revoke one existing entitlement grant for an organizer; idempotent on operationId and fails closed on unknown or already-revoked grants.",
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
    }
  ],
  "workflows": [
    {
      "workflowId": "overview",
      "label": "Overview",
      "guiPath": "/overview",
      "actions": [
        "overview.get",
        "analytics.host",
        "catch.whatsapp.inbound.review",
        "catch.whatsapp.inbound.send"
      ]
    },
    {
      "workflowId": "safety",
      "label": "Safety triage",
      "guiPath": "/safety",
      "actions": [
        "overview.get",
        "safety.get",
        "safety.assign",
        "safety.decide"
      ]
    },
    {
      "workflowId": "access",
      "label": "Access review",
      "guiPath": "/access",
      "actions": [
        "overview.get",
        "access.get",
        "access.decide"
      ]
    },
    {
      "workflowId": "growth",
      "label": "Growth",
      "guiPath": "/growth",
      "actions": [
        "overview.get",
        "analytics.host"
      ]
    },
    {
      "workflowId": "marketing",
      "label": "Marketing",
      "guiPath": "/marketing",
      "actions": [
        "marketing.get",
        "marketing.create-draft",
        "marketing.record-decision"
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
      "workflowId": "organizer-intake",
      "label": "Organizer Intake",
      "guiPath": "/intake/organizers",
      "actions": [
        "organizer-intake.create-organizer-draft",
        "organizer-intake.record-curation",
        "organizer-intake.resolve-location",
        "organizer-intake.decide-event-candidate",
        "organizer-intake.decide-policy-gap",
        "organizer-intake.decide-publication"
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
      "workflowId": "organizer-claims",
      "label": "Organizer claims",
      "guiPath": "/organizers/claims",
      "actions": [
        "organizer-claims.list",
        "organizer-claims.get",
        "organizer-claims.decide"
      ]
    },
    {
      "workflowId": "organizers",
      "label": "Organizers",
      "guiPath": "/organizers",
      "actions": [
        "organizer-intake.create-organizer-draft",
        "organizers.list",
        "organizers.get",
        "organizers.update",
        "organizers.set-index-status"
      ]
    },
    {
      "workflowId": "events",
      "label": "Events",
      "guiPath": "/events",
      "actions": [
        "events.list",
        "events.get",
        "events.update"
      ]
    },
    {
      "workflowId": "external-events",
      "label": "External events",
      "guiPath": "/events/external",
      "actions": [
        "external-events.list",
        "external-events.readiness",
        "external-events.publish",
        "external-events.takedown"
      ]
    },
    {
      "workflowId": "users",
      "label": "Users",
      "guiPath": "/users",
      "actions": [
        "analytics.user"
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
      "workflowId": "finance",
      "label": "Finance",
      "guiPath": "/finance",
      "actions": [
        "overview.get",
        "analytics.host",
        "finance.review-event-messaging-budget",
        "finance.decide-event-messaging-budget",
        "finance.stage-event-messaging-budget",
        "finance.grant-organizer-entitlement",
        "finance.revoke-organizer-entitlement-grant"
      ],
      "blockedCapabilities": [
        "retry_payment",
        "refund",
        "payout_mutation",
        "settlement_mutation",
        "messaging_budget_activation"
      ]
    },
    {
      "workflowId": "data-quality",
      "label": "Data quality",
      "guiPath": "/quality",
      "actions": [
        "overview.get",
        "analytics.host",
        "marketing.get",
        "event-intake.get",
        "external-events.readiness"
      ]
    },
    {
      "workflowId": "admin-roles",
      "label": "Admin roles",
      "guiPath": "/admin-roles",
      "actions": [
        "admin-roles.list",
        "admin-roles.get",
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
      "workflowId": "sales",
      "label": "Sales",
      "guiPath": "/sales/today",
      "actions": [
        "sales.hosts.search",
        "sales.hosts.get",
        "sales.tasks.list",
        "sales.opportunities.list",
        "sales.fields.list",
        "sales.receipts.get",
        "sales.intents.list",
        "sales.imports.preview",
        "sales.contacts.list",
        "sales.evidence.list",
        "sales.hosts.create",
        "sales.intake.nominate-organizer",
        "sales.hosts.update",
        "sales.tasks.upsert",
        "sales.opportunities.upsert",
        "sales.activities.log",
        "sales.fields.create",
        "sales.fields.setValue",
        "sales.intents.link",
        "sales.imports.apply",
        "sales.contacts.upsert",
        "sales.evidence.add",
        "sales.accounts.setSuppression",
        "sales.contacts.setContactability",
        "sales.evidence.propose",
        "sales.evidence.reviewProposal",
        "sales.evidenceProposals.list",
        "sales.demo.SaveSalesDemoBlueprint",
        "sales.demo.ReviewSalesDemoBlueprint",
        "sales.demo.WithdrawSalesDemoBlueprint",
        "sales.demo.IssueSalesDemoInvitation",
        "sales.demo.RevokeSalesDemoInvitation",
        "sales.demo.GetSalesDemoBlueprint",
        "sales.demo.GetSalesDemoInvitation",
        "sales.demo.GetSalesDemoCapability",
        "sales.demo.ListSalesDemoBlueprints",
        "sales.demo.ListSalesDemoInvitations",
        "sales.commercial.detail",
        "sales.commercial.report",
        "sales.commercial.pilots.upsert",
        "sales.commercial.quotes.revise",
        "sales.commercial.quotes.approve",
        "sales.commercial.quotes.accept",
        "sales.intelligence.GetSalesIntelligenceCatalog",
        "sales.intelligence.GetSalesIntelligenceScore",
        "sales.intelligence.SaveSalesIntelligencePolicy",
        "sales.intelligence.SaveSalesFactorAssessment",
        "sales.intelligence.SaveSalesIntelligenceClause",
        "sales.intelligence.ReviewSalesIntelligenceClause",
        "sales.intelligence.SaveSalesScoreSnapshot",
        "sales.intelligence.BuildSalesOutreachInput",
        "sales.intelligence.GenerateSalesOutreachDraft",
        "sales.intelligence.GetSalesOutreachDraftJob",
        "sales.intelligence.ListSalesOutreachDrafts",
        "sales.intelligence.GetSalesOutreachDraft",
        "sales.intelligence.ReviewSalesOutreachDraft",
        "sales.intelligence.CopySalesOutreachDraft",
        "sales.commercial.finance.attest",
        "sales.intake.link",
        "sales.fitQueue.list",
        "sales.fitQueue.refresh",
        "sales.fitQueue.refresh_batch",
        "sales.imports.compensation.preview",
        "sales.imports.compensation.apply",
        "sales.imports.history.preview",
        "sales.imports.history.apply",
        "sales.imports.history.list",
        "sales.imports.history.rows.list",
        "sales.reporting.funnel",
        "sales.privacy.policy.review",
        "sales.privacy.organizer.restrict",
        "sales.privacy.plan.preview",
        "sales.privacy.plan.review",
        "sales.privacy.batch.apply",
        "sales.privacy.case.get",
        "sales.demo.GetSalesDemoPartnerReview",
        "sales.demo.ShareSalesDemoPartnerReview",
        "sales.partners.offer"
      ]
    }
  ]
} as const;

export type AdminActionId = typeof adminActionCatalog.actions[number]["actionId"];
