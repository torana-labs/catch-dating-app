// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
