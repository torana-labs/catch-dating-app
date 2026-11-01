// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "growth.get",
    "callable": "adminGetGrowth",
    "workflowIds": [
      "growth"
    ],
    "guiPath": "/growth",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Read Growth for a range: organizer cohorts, channels and ad spend, nominators and their credit, and the best organizers.",
    "controlPlane": true
  },
  {
    "actionId": "marketplace.get",
    "callable": "adminGetMarketplace",
    "workflowIds": [
      "growth"
    ],
    "guiPath": "/marketplace",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner"
    ],
    "summary": "Read the Marketplace from the analytics warehouse: cities, guests coming back, bookings each week and organizers going quiet.",
    "controlPlane": true
  }
] as const;
