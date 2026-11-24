| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `adminGetCityInterest` | Admin callable (owner) | Admin Interest by city | Read only | Reads every `cityInterest` counter (one per city, at most 500) and sums each city's UTC daily counts into the last 7 and 30 days and the 7 and 30 before; catalog cities read by label and lifecycle, the rest as their country's Other. |
