| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `queryOrganizerFormResponses` | Callable | Host response-query gateway | Current organizer, published form/version and bounded response snapshot | App Check; actor 12/min and organizer 60/min; max 5,000 response rows plus sentinel, 8 MiB and 25 seconds per scan. Global sort and cursor/selection hash are bound to current safe data. Each page rescans; no page-size-only cost guarantee. Stale errors carry `details.reason=response-query-stale`. |
