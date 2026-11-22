| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `onInstantDraftOrganizerPublished` | Firestore trigger | `organizers/{organizerId}` update | `externalEvents`, `externalEventPublicationReceipts` | When the owner publishes a try-it workspace page with an applied import from a link, its imported events publish through the same path as `adminPublishListingEvents`, with the same automated checks; an event that fails one waits for staff. Receipts are keyed per request, so a redelivery replays. |
