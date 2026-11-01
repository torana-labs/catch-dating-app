// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
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
  }
] as const;
