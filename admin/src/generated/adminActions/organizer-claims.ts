// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
