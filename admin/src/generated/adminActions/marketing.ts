// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
