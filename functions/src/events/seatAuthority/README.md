# Event seat authority core

This module is unregistered server-only logic. It is not a migration, callable,
Firestore schema, or deployed seat policy. The calling operation must prepare
the seat plan inside the **same Firestore transaction** as its organizer, event,
admission and payment reads, then apply
the frozen plan only after all other authority reads and before its confirmed
booking, attendee and receipt writes. A plan can apply only to its preparing
transaction. The adapter must map each event ledger, canonical identity
reservation and request receipt to deterministic, client-denied documents; optimistic transaction retries serialize
the ledger revision and capacity check. Its `createReceipt` must be create-only.

`deriveEventSeatPolicy` is the shared migration/read projection. The adapter
reads positive configured event capacity and raw admission policy
inside the caller transaction. It compares their canonical hash and policy
version with the migrated ledger; a changed admission policy closes the ledger
until reconciliation, while an unrelated `bookedCount` update does not. The
ledger also has an explicit migration-owned capacity revision, which the caller
must supply as an expected revision. No capacity or revision is inferred.
The ledger must be marked `ready` with a positive migration revision only after
all historical Catch participations and Host/imported attendees have been
reconciled into one occupied count and one reservation per unique person.
Unknown, missing, revoked or unreconciled ledgers fail closed. The core cannot
make a basic event free or assign capacity one from missing setup fields.

`resolveIdentity` is an adapter-required in-transaction authority. It must
resolve all known verified phone, linked UID, imported reference and CRM merge
aliases to one opaque stable key, and return a revision that changes on an
identity merge. The current attendee ID algorithm can converge a phone import
with a later Catch booking, while UID-only records may use another key. Never
pass a raw row ID or assume those identities are disjoint. Identity merges,
legacy count repairs, and capacity policy changes need a separately authorized
reconciliation operation that updates reservations, occupied count, revisions,
and readiness together before further reservations. This core cannot certify
that reconciliation happened; the migration owner establishes the ready marker.

A reserve increments occupied once. A release decrements once and retains its
reservation and immutable receipt. Exact request replay returns the historical
receipt plus *current* active state; it never reinstates a released seat.
Fresh retries after a release require the latest ledger and reservation
revisions. A reservation is a seat, not proof of payment, approval, consent,
message delivery, or check-in. The integration must bind its own admission
receipt to the source offer generation and explicit payment terms snapshot.

`prepareFirestoreSeat` is the read-only Firestore entry point. Its required
`identityAuthority` must verify complete aliases against authoritative current
links in the same transaction. No default resolver exists: current attendee
phone/external keys and asynchronous Catch participation projection cannot
prove that a pending UID, import and CRM contact are one person. Omitted or
ambiguous authority fails closed. `applyFirestoreSeat` stages deterministic
ledger/reservation/receipt writes only after the caller completes its other
reads. The core does not authorize actor, payment, offer, event timing or
cohort policy; those remain the integrating callable's responsibility.


Checkout holds use `checkoutHeld` separately from confirmed `occupied` seats.
Missing `checkoutHeld` on older ledgers means zero. `prepareCheckoutHold`
creates one 15-minute hold for a canonical identity and immutable payment
attempt. Issuing an offer does not call this operation. Retrying the original
request never renews the deadline. Ordinary reserve/release, batch imports,
contact merges and capacity edits cannot overwrite an outstanding hold.

Confirmation converts the owning, unexpired hold into one confirmed seat;
release only returns its held capacity. Even an expired hold consumes capacity
until its release transaction completes. The payment integration must reconcile
expiry and late capture, and atomically apply confirmation with the admission,
roster and payment receipt. Neither this core nor a browser success callback
proves payment. The payment worker must keep capture, admission, refund and
Route settlement as separate states; admission does not release a Route hold.
The checkout primitive alone does not enable a public checkout endpoint.

Cross Paths uses the same hold engine with a distinct `temporaryHold` owner
(`crossPathsPair`, immutable hold ID) and a server-computed policy expiry of at
most 30 minutes. `temporaryHeld` is separate from `checkoutHeld`; missing counts
mean zero, and `heldSeatCount` validates their combined inventory. General
capacity checks include both. Hold-owner operations preserve the existing
checkout receipt hash, and neither kind can replace or consume the other.

Invitation acceptance prepares canonical UID identity and a temporary hold
under the migration fence, applying both with its invitation/counter writes.
Free and verified-paid signup convert that exact unexpired hold to occupied;
ready-mode totals do not add the pair projection a second time. Legacy events
retain their counter path until reconciliation. Active release returns held
capacity; cancelling a confirmed pair only changes the pair projection and
leaves the participant's seat to the normal cancellation owner. Expiry and its
invitation invalidation commit together. Account deletion releases pair holds
before retiring identity proof, and transactional deletion guards prevent new
holds or bookings during cleanup. These source changes do not activate a
production migration or release gate.

Multi-place public checkout keeps one reservation per canonical identity and
records the booking's place count on it as `places` (missing means 1). A
checkout hold takes `places` seats from the shared inventory, confirmation
moves all of them into `occupied`, and every release (expiry, refund,
cancellation, host status change or batch transfer) returns the count the
reservation recorded. Ordinary reserve, batch import and walk-ins always book
one place, and single-place requests keep their original receipt hashes so
existing receipts replay. Cross Paths temporary holds are always one place.
