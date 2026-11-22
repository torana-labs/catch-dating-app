| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `moderateChatMessage` | Firestore trigger on match-scoped message create | Backend | `matches/{matchId}/messages/{messageId}`, `moderationFlags/{id}` | Deterministic moderation flag for blocked/flagged text. |
| `moderatePhotoOnUpload` | Storage trigger | Backend | `moderationFlags/{id}`, `users/{uid}.profilePhotos`, Storage delete | Deletes unsafe uploaded profile photos and removes the matching grouped photo from the private profile. |
