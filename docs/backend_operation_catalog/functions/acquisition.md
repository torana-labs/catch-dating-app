| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `onHostPilotCheckIn` | Firestore trigger | Canonical Host roster check-in | Private `hostOrganizerActivations/{organizerId}` | Requires a current staff-confirmed `hostPilotEventReviews` record, a published event and matching current checked-in roster. One private receipt per organiser; no attendee identity or provider export. |
