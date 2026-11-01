// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "events.directory",
    "callable": "adminListEventDirectory",
    "workflowIds": [
      "events"
    ],
    "guiPath": "/events",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ],
    "summary": "List Catch and imported events as one table with a source, exact view totals and chip counts.",
    "controlPlane": false
  },
  {
    "actionId": "events.get",
    "callable": "adminGetEventDetails",
    "workflowIds": [
      "events"
    ],
    "guiPath": "/events",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Load one canonical event profile and publication state.",
    "controlPlane": false
  },
  {
    "actionId": "events.list",
    "callable": "adminListEventDetails",
    "workflowIds": [
      "events"
    ],
    "guiPath": "/events",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "List bounded canonical events.",
    "controlPlane": false
  },
  {
    "actionId": "events.update",
    "callable": "adminUpdateEventDetails",
    "workflowIds": [
      "events"
    ],
    "guiPath": "/events",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Patch owner-safe fields on one canonical event.",
    "controlPlane": false
  }
] as const;
