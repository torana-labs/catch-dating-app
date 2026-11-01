// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "inbox.get",
    "callable": "adminGetInboxItem",
    "workflowIds": [
      "inbox"
    ],
    "guiPath": "/inbox",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "support",
      "salesStaff"
    ],
    "summary": "Read one inbox item and every step it took; a sales associate may read only what they nominated.",
    "controlPlane": false
  },
  {
    "actionId": "inbox.list",
    "callable": "adminListInboxItems",
    "workflowIds": [
      "inbox"
    ],
    "guiPath": "/inbox",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "List one page of the Admin inbox (listings, events, claims, enquiries, launch access and stuck intake), oldest first, with real totals per scope and type.",
    "controlPlane": false
  },
  {
    "actionId": "inbox.update",
    "callable": "adminUpdateInboxItem",
    "workflowIds": [
      "inbox"
    ],
    "guiPath": "/inbox",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner",
      "support"
    ],
    "summary": "Assign, unassign, snooze or wake one inbox item; audited and recorded in its journey.",
    "controlPlane": false
  }
] as const;
