// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "people.search",
    "callable": "adminSearchPeople",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/people",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Search people by name, phone or user id; every search is logged.",
    "controlPlane": false
  },
  {
    "actionId": "safety.actions.lift",
    "callable": "adminLiftAccountSafetyAction",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Lift one account safety action early. Lifting a suspension or ban is owner-only.",
    "controlPlane": false
  },
  {
    "actionId": "safety.actions.list",
    "callable": "adminListAccountSafetyActions",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "List account safety actions in force, with an appeal waiting, or most recent.",
    "controlPlane": false
  },
  {
    "actionId": "safety.actions.take",
    "callable": "adminTakeAccountSafetyAction",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Warn, restrict, suspend or ban one account. Ops may warn and restrict; suspend and ban are owner-only.",
    "controlPlane": false
  },
  {
    "actionId": "safety.appeals.decide",
    "callable": "adminDecideSafetyAppeal",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Decide the one appeal on an account safety action; the reviewer must not be its decider.",
    "controlPlane": false
  },
  {
    "actionId": "safety.assign",
    "callable": "adminAssignSafetyTriageItem",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ],
    "summary": "Assign or clear the owner of one safety-triage item.",
    "controlPlane": false
  },
  {
    "actionId": "safety.decide",
    "callable": "adminDecideSafetyTriageItem",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ],
    "summary": "Record the reviewed or dismissed outcome for one safety item.",
    "controlPlane": false
  },
  {
    "actionId": "safety.get",
    "callable": "adminGetSafetyTriageDetails",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/safety",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Load one normalized safety-triage item and its bounded evidence.",
    "controlPlane": false
  },
  {
    "actionId": "safety.settings.get",
    "callable": "adminGetSafetySettings",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/settings/safety",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Read the report reasons, safety rules, deadlines and who may take each step.",
    "controlPlane": false
  },
  {
    "actionId": "safety.settings.update",
    "callable": "adminUpdateSafetySettings",
    "workflowIds": [
      "safety"
    ],
    "guiPath": "/settings/safety",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "adminOwner"
    ],
    "summary": "Owner-only: replace the report reasons and the safety rules.",
    "controlPlane": false
  }
] as const;
