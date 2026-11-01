// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
