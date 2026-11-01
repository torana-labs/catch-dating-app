// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
