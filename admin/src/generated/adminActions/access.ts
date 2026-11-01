// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
