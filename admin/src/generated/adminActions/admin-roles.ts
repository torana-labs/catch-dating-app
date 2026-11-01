// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "admin-roles.get",
    "callable": "adminGetAdminUserRoles",
    "workflowIds": [
      "admin-roles"
    ],
    "guiPath": "/admin-roles",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "Load the Catch admin roles assigned to one exact Firebase uid.",
    "controlPlane": false
  },
  {
    "actionId": "admin-roles.list",
    "callable": "adminListAdminRoleAssignments",
    "workflowIds": [
      "admin-roles"
    ],
    "guiPath": "/admin-roles",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "adminOwner"
    ],
    "summary": "List the bounded admin-role assignment register.",
    "controlPlane": false
  },
  {
    "actionId": "admin-roles.set",
    "callable": "adminSetAdminUserRoles",
    "workflowIds": [
      "admin-roles"
    ],
    "guiPath": "/admin-roles",
    "kind": "mutation",
    "risk": "critical",
    "roles": [
      "adminOwner"
    ],
    "summary": "Replace the complete Catch admin-role set for one Firebase uid.",
    "controlPlane": false
  }
] as const;
