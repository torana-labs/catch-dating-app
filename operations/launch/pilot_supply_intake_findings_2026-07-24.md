# Pilot supply intake findings — 2026-07-24

## Outcome and boundary

The private organizer intake queue now contains exactly 50 review candidates:
25 Mumbai and 25 Indore. The canonical shortlist preserves the ten candidates
from the first pilot and adds forty new candidates.

This work does **not** publish listings or write Firestore. Search evidence is
only the first gate. Human curation, schema-complete `OrganizerEntity` records,
claim state, publication packets, and event-level decisions remain required.

Current review distribution:

| Status | Count | Meaning |
|---|---:|---|
| `review_now` | 22 | Identity, city, and recent activity are strong enough for entity review |
| `organizer_only_event_blocked` | 18 | Organizer may proceed, but event freshness or conflicts block event publication |
| `identity_review_required` | 9 | Ownership, first-party identity, or venue/platform ambiguity must be resolved |
| `existing_inventory_attach` | 1 | AFTER FLY evidence must attach to the existing entity |

The shortlist represents 49 net-new organizer candidates plus the existing
AFTER FLY organizer, so all 50 launch slots remain represented without creating
a duplicate.

## Tooling proof

The governed path used for this pass was:

```sh
node tool/organizer_intake/ingest_search_results.mjs
node tool/organizer_intake/ingest_search_results.mjs --check
```

2026-10-29: those scripts were retired with `tool/organizer_intake`; rerun a
saved capture with `node operations/src/cli/search-capture-input.mjs` instead.

The generated queue reports:

- 2 evidence batches;
- 50 results and 50 candidates;
- 25 candidates in each requested market by source-batch contract;
- 1 strong match to the existing AFTER FLY entity;
- 2 false duplicate-key groups requiring an adapter fix.

## Intake defects and improvements

### P1 — platform profiles collide (`LAUNCH-SUPPLY-007`)

Meetup and Linktree are treated as ordinary websites. The normalized key is
therefore only `domain:meetup.com` or `domain:linktr.ee`, which collapses five
unrelated Meetup groups and three unrelated Linktree profiles into two false
duplicate groups.

Recommended fix:

1. Add first-class Meetup and Linktree profile adapters keyed by profile slug.
2. Add fixtures covering profile URLs, event URLs, redirects, and reserved
   paths.
3. Regenerate this queue before scaffolding entities.

### P1 — freshness and identity checks are prose-only (`LAUNCH-SUPPLY-008`)

`observedAt` records when a search result was reviewed, not when the organizer
last ran an event. Event dates, closure state, city confidence, and ownership
confidence live only in free-text snippets. A generator cannot reject a closed
business or stale event from those fields.

This mattered during the loop:

- Floh's official site says the service shut down years ago.
- The Bohri Kitchen's official site says it closed on 31 January 2026.
- `thehabitat.co.in` is an unrelated Hyderabad property; the correct Mumbai
  performance venue is `indiehabitat.com`.

Recommended fix:

1. Add structured `activityDates`, `freshnessStatus`, `closureStatus`,
   `cityConfidence`, `ownershipConfidence`, and `reviewedAt` fields.
2. Fail closed on confirmed closures, wrong-city identities, expired evidence,
   and event-only evidence without a first-party organizer surface.
3. Add a stale-evidence report to the review queue and readiness gate.

### P1 — candidate-to-entity conversion is still manual (`LAUNCH-SUPPLY-004`)

The search queue cannot become schema-complete organizer records through a
governed command. Reviewers must currently re-key name, market, entity kind,
surfaces, provenance, claim state, and publication defaults.

Recommended fix:

1. Scaffold draft batch records from selected queue candidates.
2. Require an explicit disposition for every candidate: create, attach, merge,
   reject, or evidence-only.
3. Preserve source IDs and review notes automatically.
4. Keep output in draft state until schema validation and human approval pass.

### P1 — category metadata is batch-wide

The search schema stores `activityKind` on the batch, not the individual
result. A multi-category city pass therefore loses the organizer's specific
category in the generated queue.

Recommended fix: either require single-category batches or allow a validated
per-result category override that is copied into draft entities.

### P2 — the legacy discovery corpus cannot absorb this launch batch (`LAUNCH-SUPPLY-009`)

The separate host-discovery validator applies its 50-candidate maximum across
all stored batches. Its current corpus already contains 35 candidates, so
adding the 50 launch candidates there would fail at 85 even though this is a new
market-scoped run.

Recommended fix: scope target ranges per active run or market, archive
superseded batches, and converge the legacy discovery and organizer-intake
paths instead of maintaining two review queues.

### P1 — curation work is not assigned a workflow follow-up (`LAUNCH-SUPPLY-010`)

Generating the 50-candidate queue correctly changes `search_intake` to
`curation_needed`, but `pending_input_request_core.mjs` does not include that
status when it creates workflow follow-ups. The required pending-work coverage
check therefore reports one untriaged workstream: five of six unresolved
workstreams are covered.

Recommended fix: include `curation_needed` in governed workflow follow-ups, add
a regression fixture for a non-empty search queue, regenerate the admin bridge,
and require the coverage gate to pass before handoff from future discovery
runs.

### P1 — generated candidates were counted but not rendered (`LAUNCH-SUPPLY-011`)

The organizer intake workbench added the generated search-candidate total to
the Incoming stage count, but built the review queue only from canonical
`OrganizerIntakeItem` records. A generated discovery run could therefore
report candidates in the bridge without giving operators a card to select,
filter, inspect, or attach.

The local fix presents generated candidates as first-class Incoming entries,
keeps them visibly separate from canonical organizer records, and preserves
the existing publication boundary. Mumbai and Indore filters each return 25
candidates; source evidence and search context are reviewable; the existing
AFTER FLY entity exposes the governed attach action.

The production issue remains `in_progress` until the branch is merged, the
admin workflow deploys the regenerated bridge and UI, and the authenticated
console is verified live. Net-new candidates also remain deliberately
non-writable until a governed candidate-to-entity draft scaffolder exists.

## Publication blockers that remain

Even after human approval, public listing and event publication remain blocked
by existing launch issues:

- current market-scoped Mumbai and Indore event bridges are missing or stale;
- the reviewed external-event path has no production writer or publication
  authority;
- the event-intake admin projection is not market-scoped;
- claim, correction, and takedown behavior must be present for every unclaimed
  listing.

## Recommended human review order

1. Review the 22 `review_now` candidates first.
2. Resolve the 9 identity cases, especially shared-platform profiles and
   venue-versus-organizer boundaries.
3. Attach AFTER FLY to the existing entity.
4. Review the 18 organizer-only candidates while separately refreshing event
   evidence.
5. Replace any rejected candidate before entity scaffolding so the approved
   queue remains exactly 25 Mumbai and 25 Indore.
