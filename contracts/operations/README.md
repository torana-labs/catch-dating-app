# Operations contracts

These draft-07 JSON Schemas define the portable boundary shared by operations
workers, trusted backend services, CLIs, and admin read models. A persistence
adapter must project these JSON values to its native timestamp and transaction
types without changing their semantics.

The Firestore adapter (`functions/src/operations/firestoreRepository.ts`)
stores runs, work items, action receipts and leases exactly in these shapes, in
`operationRuns`, `operationWorkItems`, `operationActionReceipts` and
`operationLeases`. Their entries in `tool/contracts/firestore_contract/collections/`
name `run`, `work_item`, `action_receipt` and `lease` as their
`schemaContract`, so these files are the Firestore contract for those
collections. Decisions, publication plans and rule proposals and evaluations
are not persisted.

The contracts deliberately separate:

- a run, which owns budgets and a frozen policy/ruleset;
- a work item, which has one exclusive primary stage plus orthogonal task flags;
- append-only action receipts and decisions;
- fenced leases for retry-safe workers;
- hash-bound publication plans; and
- rule proposals/evaluations, which require independent approval before
  activation.

`event_messaging_setup_review.schema.json` is the portable, read-only operator
review for one event messaging runtime, sender and its event and sender-day
ceilings. Its literal `grantsDispatchAuthority: false` prevents the artifact
from being mistaken for sender activation, spend approval or send permission.
`adminReviewEventMessagingBudget` exposes that bounded review plus the current
decision summary to the Finance workspace without exposing credentials, private
RCS agent ids, guest rosters, spending authority or dispatch authority. The
separate callable and Firestore contracts for
`adminDecideEventMessagingBudget` bind a finance decision to that review's
current runtime, sender and budget-source hashes. The resulting receipt has a
literal `decision_only_no_spending_authority` effect; it cannot create a budget
or authorize dispatch. A separate immutable request receipt preserves exact
replay after a later revision replaces the current decision view.
`adminApplyEventMessagingBudget` is the typed mutation boundary for one exact
approved revision. It rechecks that same evidence, preserves recorded charges,
and stages the event and sender-day ceilings atomically in paused state. Its
immutable application receipt fixes `stagesSpendingCeilings: true` while
spending authority, dispatch authority, provider contact and worker activation
remain false. A separate live boundary must revalidate and activate both
ceilings; all runtime, consent, content and dispatch gates still apply
independently.

For the Supply Intake reference workflow, `primaryStage` is always exactly one
of `incoming`, `verify`, `resolve`, or `ready`. Publication, rejection, expiry,
cancellation, and takedown are lifecycle outcomes and never create extra review
columns. Display title, source profile, city, and other workflow-specific fields
belong in `normalizedPayload`; evidence and per-field derivation belong in
`evidenceRefs` and `fieldProvenance`.

Valid and deliberately invalid examples live under `fixtures/`. Invalid
fixtures include an `expectedIssueCode` alongside the invalid `document`; the
wrapper is test metadata and is not itself an operations document.

Operational code must not treat model confidence as authority, silently mutate
an applied publication plan, or let the same actor both propose and independently
approve a learned rule.

Workflow-manifest capabilities are the maximum supported by the registered
runtime, not an automatic grant to every run. Each immutable plan freezes its
actual capability set and matching budget. Supply Intake supports a guarded
network acquisition seam, while the checked default policy grants zero network
requests and keeps the provider disabled. It likewise supports exactly one
guarded, extraction-only model seam; the checked model policy has a null
provider and zero per-run and monthly ceilings. Model-derived fields are
proposal evidence, never publication or identity authority, and require
human-verified fixtures before rule evaluation.
