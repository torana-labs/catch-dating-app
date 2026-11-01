// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
