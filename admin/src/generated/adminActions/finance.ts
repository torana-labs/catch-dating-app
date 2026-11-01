// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
