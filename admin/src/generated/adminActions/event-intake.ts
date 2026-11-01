// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "event-intake.get",
    "callable": "adminGetEventIntakeDashboard",
    "workflowIds": [
      "event-intake",
      "data-quality"
    ],
    "guiPath": "/intake/events",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Load the current Supply Intake event review queue.",
    "controlPlane": false
  },
  {
    "actionId": "event-intake.record-decision",
    "callable": "adminRecordEventIntakeReviewDecision",
    "workflowIds": [
      "event-intake"
    ],
    "guiPath": "/intake/events",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Record one Event Intake review decision without publishing an event.",
    "controlPlane": false
  }
] as const;
