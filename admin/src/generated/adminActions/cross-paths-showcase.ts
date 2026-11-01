// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "cross-paths-showcase.list",
    "callable": "adminListCrossPathsShowcaseCandidates",
    "workflowIds": [
      "cross-paths-showcase"
    ],
    "guiPath": "/cross-paths",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "List a bounded, score-free Cross Paths showcase review queue from public profile projections.",
    "controlPlane": false
  },
  {
    "actionId": "cross-paths-showcase.set-eligibility",
    "callable": "adminSetCrossPathsShowcaseEligibility",
    "workflowIds": [
      "cross-paths-showcase"
    ],
    "guiPath": "/cross-paths",
    "kind": "mutation",
    "risk": "high",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer"
    ],
    "summary": "Record an audited, fingerprint-bound Cross Paths showcase eligibility decision without storing an attractiveness score.",
    "controlPlane": false
  }
] as const;
