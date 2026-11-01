// GENERATED FILE. Run: node tool/admin/generate_admin_action_catalog.mjs
export default [
  {
    "actionId": "support.conversations.get",
    "callable": "adminGetSupportConversation",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Open one support conversation with its messages and links.",
    "controlPlane": false
  },
  {
    "actionId": "support.conversations.list",
    "callable": "adminListSupportConversations",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "read",
    "risk": "sensitive-read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "List support conversations by view, longest waiting first.",
    "controlPlane": false
  },
  {
    "actionId": "support.conversations.update",
    "callable": "adminUpdateSupportConversation",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Set a conversation's owner, status and links.",
    "controlPlane": false
  },
  {
    "actionId": "support.messages.record",
    "callable": "adminRecordSupportMessage",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Record a reply, a logged email or an internal note in a conversation.",
    "controlPlane": false
  },
  {
    "actionId": "support.replies.list",
    "callable": "adminListSupportSavedReplies",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "read",
    "risk": "read",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "List saved replies.",
    "controlPlane": false
  },
  {
    "actionId": "support.replies.upsert",
    "callable": "adminUpsertSupportSavedReply",
    "workflowIds": [
      "support"
    ],
    "guiPath": "/support",
    "kind": "mutation",
    "risk": "medium",
    "roles": [
      "admin",
      "adminOwner",
      "safetyReviewer",
      "support"
    ],
    "summary": "Add or edit a saved reply.",
    "controlPlane": false
  }
] as const;
