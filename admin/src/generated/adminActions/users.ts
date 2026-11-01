// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
