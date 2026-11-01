// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "organizers.directory",
    "callable": "adminListOrganizerDirectory",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ],
    "summary": "List the Organizers directory with real totals per view and chip counts for city, kind, claim state and the caller's own organizers.",
    "controlPlane": false
  },
  {
    "actionId": "organizers.get",
    "callable": "adminGetOrganizerDetails",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Load one canonical organizer profile and publication state.",
    "controlPlane": false
  },
  {
    "actionId": "organizers.list",
    "callable": "adminListOrganizerDetails",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "List bounded canonical organizer profiles.",
    "controlPlane": false
  },
  {
    "actionId": "organizers.overview",
    "callable": "adminGetOrganizerOverview",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers/:organizerId",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ],
    "summary": "Read one organizer's overview: facts, Sales owner, terms, payments, journey from nomination to claim and upcoming events.",
    "controlPlane": false
  },
  {
    "actionId": "organizers.set-index-status",
    "callable": "adminSetOrganizerIndexStatus",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Set one organizer compatibility profile's index-readiness state.",
    "controlPlane": false
  },
  {
    "actionId": "organizers.update",
    "callable": "adminUpdateOrganizerDetails",
    "workflowIds": [
      "organizers"
    ],
    "guiPath": "/organizers",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Patch owner-safe fields on one canonical organizer profile.",
    "controlPlane": false
  }
] as const;
