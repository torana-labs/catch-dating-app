| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `previewOrganizerFormAdmission` | Callable | Host response admission | Current form/CRM/offer/payment/seat authority | App Check, current manager, 30/min actor limit; shared commit preparation returns exact revisions or a blocker without writes. |
| `commitOrganizerFormAdmission` | Callable | Host response admission | Current form/CRM provenance or approved native application, issued offer, payment evidence and canonical seat authority; atomic attendee, ownership and request receipt | App Check, authenticated current manager in transaction, 20/min actor limit, strict input/output contracts. Missing or unreconciled seat authority fails closed; no client-supplied payment or capacity facts. |
