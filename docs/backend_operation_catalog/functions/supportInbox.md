| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `adminListSupportConversations` / `adminGetSupportConversation` | Callable | Admin Support | Read `supportConversations` and `.../messages` | Ops/support inbox: open (longest waiting first), mine, waiting on them, closed; guests and organizers told apart. Opening a conversation shows the full contact address and is audited. |
| `adminUpdateSupportConversation` | Callable | Admin Support | `supportConversations/{id}` | Owner, status and links to a booking, payment or safety case (each must exist). Audited. |
| `adminRecordSupportMessage` | Callable | Admin Support | `supportConversations/{id}`, `.../messages/{id}` | Records a reply sent another way (the conversation then waits on them), a logged email (starts a conversation) or an internal note. Email and Instagram replies are always recorded; WhatsApp replies are recorded only while sending from Catch's number is switched off. |
| `adminListSupportSavedReplies` / `adminUpsertSupportSavedReply` | Callable | Admin Support | `supportSavedReplies/{id}` | Saved replies. |
