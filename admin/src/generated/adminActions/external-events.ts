// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "external-events.list",
    "callable": "adminListExternalEventDetails",
    "workflowIds": [
      "external-events"
    ],
    "guiPath": "/events/external",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "List bounded read-only external event supply.",
    "controlPlane": false
  },
  {
    "actionId": "external-events.takedown",
    "callable": "adminTakedownExternalEvent",
    "workflowIds": [
      "external-events"
    ],
    "guiPath": "/events/external",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Dry-run or remove one published external event without deleting its audit history.",
    "controlPlane": false
  }
] as const;
