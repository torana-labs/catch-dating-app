---
doc_id: host_listing_discovery_architecture
version: 0.6.1
updated: 2026-10-29
owner: operations_platform
status: superseded
---

# Organizer Listing Discovery Architecture

> Superseded by `docs/operations_platform.md` and the Supply Intake workflow.
> The former `tool/host_discovery` corpus and generated search ledger have been
> retired. This document is retained only as historical product and identity
> research; its commands and path references are not operational instructions.

## Goal

Build a deterministic acquisition pipeline for finding high-fit event organizers and
publishing claimable public profiles without repeatedly searching the same
terms, duplicating businesses, or creating thin SEO pages.

The first target batch is 25-50 high-fit singles or social organizers. A listing can
start as an internal candidate, then become a noindex public QA page, and only
become indexable after it has enough verified public value.

## Initial Target Categories

Prioritize organizers where Catch's booking, attendance, live facilitation,
post-event matching, and aggregate reporting are natural upgrades:

| Category | Good-fit signal | Early query examples |
|---|---|---|
| Social run clubs | Recurring adult runs with post-run hangouts, creator-led community, or mixed-gender turnout | `run club {city}`, `social run {city}`, `community run {city}` |
| Racket sport socials | Pickleball, padel, tennis, badminton socials with rotations or mixed groups | `pickleball social {city}`, `padel club {city}`, `badminton mixer {city}` |
| Singles event operators | Dating mixers, speed dating, curated singles dinners, social mixers | `singles events {city}`, `speed dating {city}`, `singles mixer {city}` |
| Supper clubs and dinner hosts | Repeated tables where guests meet each other, not just restaurant reservations | `supper club {city}`, `dinner club {city}`, `community dinner {city}` |
| Quiz, bar crawl, and nightlife hosts | Team-based or social events where stranger interaction matters | `pub quiz {city}`, `bar crawl {city}`, `social mixer {city}` |
| Creator/community hosts | Instagram-native operators with recurring city events and manual DMs/forms | `things to do {city} community`, `new in {city} social club` |
| Venue-led socials | Cafes, bars, courts, gyms, coworking spaces hosting repeated social events | `{format} event venue {city}`, `{venue type} social night {city}` |

Deprioritize one-off concerts, conferences, family/kids programming, pure
fitness training with no social layer, and large festivals where Catch would not
own the guest journey.

## Deterministic Search Ledger

Every search run should create an immutable run record:

- `runId`: date plus category, city, and source.
- `queryTemplateId`: stable ID such as `run_club_city_v1`.
- `renderedQuery`: exact query string.
- `city`, `category`, `source`.
- `engine`: Google Places Text Search, Programmable Search, platform API, or
  manual source.
- `requestedFields`: exact fields requested from an API.
- `resultFingerprint`: hash of normalized result URLs, names, and place IDs.
- `rawSnapshotPath`: stored raw JSON or HTML snapshot when terms permit.
- `candidateIds`: normalized candidates created or touched by the run.
- `searchedAt`, `operator`, `notes`.

The search scheduler should only run query templates that do not already have a
fresh run for the same city, category, source, and template version.

The active implementation now stores that scheduling evidence as run-scoped
`supply_freshness_coverage` records owned by the Operations platform. It does
not use committed `tool/host_discovery/runs/*.json` files as its freshness
ledger. The host-discovery planner continues to own stable `runKey` composition
and plan-bound capture, while Supply Intake applies the schema-validated
per-kind windows and cites the exact completed run that covers a skipped query.
Known organizer source surfaces use a second cadence key made from organizer
entity plus surface, preventing an early refetch independently of the query
ledger.

The Operations-owned acquisition port consumes those planned keys without
letting the workflow or React admin construct a fetcher. Manual reviewed JSON
capture remains the default and produces the same normalized batches as the
compatibility CLI. A provider client may be injected only after checked config
cites an accepted recurring-crawl policy decision and supplies positive
per-run and monthly request ceilings. Both ceilings are reserved before a
provider call. The checked default is disabled, and raw responses remain
external-artifact data rather than Firestore or Admin projection content.

## Candidate Identity And Deduplication

Each discovered organizer becomes or updates one candidate record. Candidate IDs
should be deterministic:

1. Use a canonical platform ID when available:
   - Google Places `places.id`
   - Event platform organizer ID
   - Instagram handle, only after verified
2. Otherwise derive a fallback ID from:
   - normalized name
   - city
   - primary URL domain or social handle

Deduplication should compare:

- exact platform IDs;
- exact canonical URLs;
- normalized Instagram handles;
- normalized name plus city;
- phone/email if the source lawfully exposes business contact details;
- fuzzy name similarity only as a review queue, not an automatic merge.

Merged candidates should retain all source aliases and all raw evidence.

## Scaled Source-Mention Resolution

The scaled ingestion model must keep crawler/editorial output separate from the
canonical Firestore documents consumed by the website and app. Search results,
editorial articles, platform pages, and crawler payloads should create private
source mentions first. Only reviewed resolution clusters can later project into
canonical organizer or event documents.

The durable pipeline is:

1. `discoveryRun`: the exact query, city, category, provider, run key, and
   freshness state.
2. `sourceArtifact`: the fetched result page or provider payload, with raw
   storage policy and attribution URL.
3. `extractedMention`: one possible organizer or event mention extracted from a
   source artifact. CN Traveler and Vogue articles should create separate
   mentions, not separate events.
4. `resolutionCandidate`: a normalized, source-backed object with deterministic
   keys and scoring signals.
5. `resolutionCluster`: a group of mentions that may describe the same organizer
   or event.
6. `reviewPacket`: the human-editable packet showing the cluster, deterministic
   scores, LLM opinion when used, conflicts, and publish blockers.
7. `canonicalProjection`: a preflight-only projection into `clubs`, read-only
   external event documents, or future `events`, validated against the relevant
   contracts.

This keeps generated/crawler candidates out of canonical Firestore until the
human review and schema-validation gates pass.

Current repo implementation:

The durable orchestration owner is now `operations/`, with Supply Intake as the
reference workflow. New run state, leases, checkpoints, decisions, and learning
lifecycles must not be added under `tool/`. This separation lets future admin
workflows reuse one operations platform without turning `tool/` into a
collection of unrelated business applications.

2026-10-29: `tool/organizer_intake` and the event guide were retired; Supply
Intake in `operations/` replaces them. The source-mention resolution prototype
(`source_mention_resolution_core.mjs`, `llm_source_resolution.mjs`) last existed
at `bb58cad05`.

## Event Mention Deduplication

Editorial and free-text sources cannot be deduped by URL alone. The correct
unit is an event mention with attribution. Multiple mentions may attach to one
canonical event cluster.

Use hard deterministic keys first:

- provider event ID, such as Luma slug or BookMyShow/District event ID;
- canonical official event URL after stripping tracking parameters;
- organizer-owned page URL plus event date;
- exact venue place ID plus event start time;
- exact source outbound link to the same official event page;
- image URL hash when the image is provider-owned and stable.

Then use weighted deterministic signals:

| Signal | Example | Role |
|---|---|---|
| Time bucket | same date, overlapping start/end time, same weekend | Strong when paired with title or venue |
| Venue/location | same place ID, same venue name, same neighborhood/city | Strong for local events |
| Organizer | same canonicalHostId, profile URL, or normalized organizer name | Strong when paired with time |
| Title similarity | normalized title, token Jaccard, trigram similarity | Medium; never enough alone |
| Category/activity | singles dinner, run club, art walk, supper club | Weak-to-medium disambiguator |
| Price | same price text or price range | Weak supporting signal |
| Editorial co-mentions | two articles link to the same event page or venue | Supporting attribution |

Suggested deterministic outcomes:

- `auto_attach`: same hard event key, or same official URL.
- `probable_duplicate`: strong score, such as same venue plus same date plus
  high title similarity.
- `needs_review`: partial score, missing date/time, editorial-only source, or
  conflicting venue/date fields.
- `separate`: same title but conflicting date or venue, unless a recurring
  series policy explicitly links them as separate instances.

The current `normalizedEventKey = entityId + startAt + normalized title` should
remain a simple baseline, but it is not enough for editorial sources. It should
be replaced by a resolution scorecard plus explicit cluster state.

## Avoiding O(N Squared) Matching

Do not compare every mention to every other mention. Generate blocking keys and
compare only inside blocks:

- `hard:eventUrl:{canonicalUrl}`
- `hard:providerEvent:{platform}:{eventId}`
- `date-city:{yyyy-mm-dd}:{citySlug}`
- `date-venue:{yyyy-mm-dd}:{normalizedVenue}`
- `date-organizer:{yyyy-mm-dd}:{canonicalHostIdOrName}`
- `title-city:{titleTokenPrefix}:{citySlug}`
- `week-category-city:{isoWeek}:{categoryId}:{citySlug}`

Each mention can emit multiple blocking keys. The resolver builds candidate
pairs only from shared blocks, dedupes the pair list, scores those pairs, and
then builds connected clusters. Oversized blocks must be split or downgraded;
for example, `things to do Mumbai this weekend` should not create one huge LLM
request. A cluster should be capped before LLM review, with overflow pushed to
manual review or split by stronger keys.

## LLM Role

The LLM should be a bounded assistant, not the source of truth.

Use it in two places:

1. **Editorial extraction.** Given one source artifact or reviewed text excerpt,
   extract event or organizer mentions into a strict JSON schema with source
   attribution. The output is an `extractedMention`, not a canonical record.
2. **Ambiguous cluster adjudication.** Given a small cluster and deterministic
   scorecard, ask whether mentions appear to describe the same organizer/event,
   what fields conflict, and what human decision is needed.

Do not call an LLM from the React admin app. Run LLM work from a backend/tool
job with:

- an environment-configured provider and model, such as
  `LLM_EXTRACTION_MODEL` and `LLM_DEDUPE_MODEL`;
- a prompt version and schema version recorded on every output;
- input hashes so identical artifacts are never billed twice;
- low token caps, source excerpts instead of whole pages, and batch limits;
- JSON schema validation and deterministic post-processing;
- an allowlist of fields the model may infer;
- a rule that LLM output can never publish, index, or write canonical Firestore
  directly.

The default implementation should choose the cheapest reliable structured-output
model available at execution time. The architecture should not hard-code model
names in admin UI logic; model choice belongs in config and run metadata.

### Extraction Prompt Skeleton

System:

```text
You extract event and organizer mentions for Catch intake. Return only JSON
matching the provided schema. Do not invent facts. Every extracted field must
cite sourceTextSpanIds or sourceUrls. If a fact is absent, return null. The
output is a private candidate mention and must not be written to production.
```

User payload:

```json
{
  "task": "extract_event_and_organizer_mentions",
  "source": {
    "sourceArtifactId": "article-cntraveler-mumbai-weekend-2026-06-24",
    "url": "https://example.com/article",
    "publisher": "CN Traveler",
    "capturedAt": "2026-06-24"
  },
  "cityHints": ["mumbai", "indore"],
  "categoryHints": ["singles_event_operator", "supper_club", "walks_experiences"],
  "allowedFields": [
    "title",
    "organizerName",
    "venueName",
    "citySlug",
    "startDate",
    "startTime",
    "officialUrl",
    "priceText",
    "categoryId",
    "description"
  ],
  "textSpans": [
    {"spanId": "p1", "text": "Short reviewed excerpt..."}
  ]
}
```

Expected output shape:

```json
{
  "schemaVersion": 1,
  "promptVersion": "event-mention-extract-v1",
  "mentions": [
    {
      "mentionType": "event",
      "title": "string or null",
      "organizerName": "string or null",
      "venueName": "string or null",
      "citySlug": "string or null",
      "startDate": "YYYY-MM-DD or null",
      "startTime": "HH:mm or null",
      "officialUrl": "string or null",
      "priceText": "string or null",
      "categoryId": "string or null",
      "description": "string or null",
      "confidence": "high | medium | low",
      "citations": [
        {"field": "title", "spanId": "p1", "sourceUrl": "https://example.com/article"}
      ],
      "warnings": []
    }
  ]
}
```

### Dedupe Adjudication Prompt Skeleton

System:

```text
You review already-extracted source mentions. Deterministic rules are primary.
Use the provided scorecard and evidence only. Return whether the cluster appears
to describe one event, multiple events, or needs human review. Do not create new
facts. Cite conflicts.
```

Input:

```json
{
  "task": "adjudicate_event_cluster",
  "promptVersion": "event-cluster-adjudicate-v1",
  "clusterId": "cluster-mumbai-2026-07-04-titlehash",
  "deterministicScore": {
    "score": 0.74,
    "matchingSignals": ["same_city", "same_date", "similar_title"],
    "conflictingSignals": ["different_venue_text"],
    "hardKeys": []
  },
  "mentions": [
    {
      "mentionId": "cntraveler:result-4",
      "title": "Rooftop Singles Mixer",
      "date": "2026-07-04",
      "venueName": "AER",
      "citySlug": "mumbai",
      "sourceUrl": "https://..."
    },
    {
      "mentionId": "vogue:result-2",
      "title": "Singles mixer at Four Seasons",
      "date": "2026-07-04",
      "venueName": "Four Seasons Mumbai",
      "citySlug": "mumbai",
      "sourceUrl": "https://..."
    }
  ]
}
```

Output:

```json
{
  "schemaVersion": 1,
  "clusterId": "cluster-mumbai-2026-07-04-titlehash",
  "decision": "same_event | separate_events | needs_human_review",
  "confidence": "high | medium | low",
  "recommendedCanonicalMentionId": "string or null",
  "reasons": ["same date and city", "venue names may refer to the same property"],
  "conflicts": [
    {"field": "venueName", "values": ["AER", "Four Seasons Mumbai"]}
  ],
  "humanReviewChecklist": ["confirm venue identity", "find official event URL"]
}
```

## Admin-Editable Resolution Policy

The assumptions and fears in this workflow should be visible in admin, not
buried in code. Add a versioned resolution policy artifact that the admin bridge
can render:

- blocking key definitions;
- deterministic signal weights;
- auto-attach thresholds;
- LLM-call thresholds and per-run caps;
- maximum cluster size;
- publisher/source trust tiers;
- fields the LLM may extract;
- fields that always require human review;
- current policy blockers, such as event import writes disabled;
- examples of false positives and false negatives.

The admin UI should show:

- each source mention with attribution and raw/source artifact link;
- every deterministic key emitted for that mention;
- candidate clusters and their scores;
- why a cluster was auto-attached, queued for review, or sent to LLM;
- LLM prompt version, model, input hash, output hash, cost estimate, and JSON
  validation status;
- human override controls: same event, separate event, attach source, split
  cluster, suppress mention, edit canonical draft fields.

Admin edits should write reviewed resolution decisions, not mutate canonical
Firestore directly. The generator should then rebuild clusters and projection
plans from those decisions.

## Implementation Phases

1. **Resolution artifact layer.** Add local/generated artifacts for
   `sourceArtifacts`, `extractedMentions`, `resolutionCandidates`,
   `resolutionClusters`, and `resolutionPolicy`.
2. **Deterministic resolver.** Build blocking keys, pair scorecards, cluster
   assembly, and review packet generation. Extend current event duplicate logic
   beyond `normalizedEventKey`.
3. **Admin visibility.** Add panels for source mentions, cluster scorecards,
   policy config, LLM run audit, and human resolution decisions.
4. **LLM extraction.** Add a backend/tool runner for editorial extraction with
   cached input hashes and strict JSON validation. Keep it disabled by default
   until sample fixtures pass.
5. **LLM adjudication.** Add optional review for ambiguous small clusters only.
   Never call it for hard-key matches or low-signal oversized blocks.
6. **Projection preflight.** Convert reviewed clusters into canonical organizer
   publication packets and external event import plans. Validate against
   `contracts/firestore/clubs.schema.json`,
   `contracts/callables/create_club_payload.schema.json`,
   `contracts/firestore/events.schema.json`, and
   `contracts/callables/create_event_payload.schema.json`.
7. **Guarded writes.** Keep production writes behind explicit admin/export
   steps. Programmatic organizers stay unclaimed/programmatic; external events
   stay read-only/outbound unless the event import policy is separately
   approved.

## Candidate Lifecycle

| State | Meaning | Page behavior |
|---|---|---|
| `candidate` | Found by search, not reviewed | No public page |
| `qualified` | Matches ICP and has at least one stable public source | No public page or internal preview |
| `page_seeded` | Public QA page exists but evidence is thin | `noindex, follow` |
| `index_ready` | Has verified identity, category, city, source links, useful description, and owner-safe copy | Indexable |
| `claimed` | Owner account or host account has claimed it | Indexable, owner controls profile fields |
| `onboarded` | Host has created a Catch host account or event | Listing links to Catch host product |
| `suppressed` | Duplicate, removal request, bad fit, unsafe, or uncertain identity | No public page |

## Minimum Page Quality Gate

Do not index a page until it has:

- verified name, city, and category;
- at least one official or high-confidence public source URL;
- one business-safe way for the owner to claim or correct the page;
- original Catch-written summary and fit context;
- no copied social captions or review text;
- no private personal contact details unless the business publishes them for
  contact;
- clear status if the profile is unclaimed.

This avoids thin programmatic SEO and makes the page useful to searchers even
before the host claims it.

## Source Policy

Use APIs and public pages in this priority order:

1. Google Places Text Search and Place Details for place identity and location.
2. Event platforms with public organizer or event pages.
3. Host-owned websites.
4. Instagram, Facebook, Threads, LinkedIn, and other social profiles only when
   access method and terms allow it.
5. Manual owner/user-supplied seeds.

Store source confidence separately from the final listing. A listing may exist
with low confidence, but it should remain `noindex` until verification is high.

## Data Surfaces

The canonical source of truth is still `clubs/{clubId}` in Firestore, with the
club document now extended to support broader organizer profiles:

- `hostUserId`, `ownerUserId`, `hostUserIds`, and `hostProfiles` can represent
  claimed Catch ownership, while unclaimed programmatic organizers keep those
  ownership fields null or empty.
- `entityKind`, `entitySubtypes`, `displayCategory`, and location display fields
  prevent every organizer from being forced into club wording.
- `ownership`, `claim`, `publicPage`, `provenance`, `publicProfile`, and
  `publicSources` model claim state, noindex/index-ready status, verified public
  evidence, and owner-safe page content directly on the canonical document.

For local seed work before live Firestore import, use backend-shaped fixtures:

- `tool/host_discovery/seed_clubs/*.json`

Each seed file wraps a target Firestore path plus a `data` object whose shape is
the actual `clubs/{clubId}` document. Website-specific listing JSON must be a
generated projection from those club documents, not a hand-authored source of
truth:

- `website/scripts/generateOrganizerListings.mjs`
- `website/src/generated/hostListings.json`

For legacy scraper fixtures, keep private source evidence separate from
canonical organizer documents:

- `tool/host_discovery/query_templates.json`
- `tool/host_discovery/target_categories.json`
- `tool/host_discovery/search_matrix.json`
- `tool/host_discovery/candidate_batches/*.json`
- `tool/host_discovery/runs/*.json` (historical compatibility evidence only;
  not an active scheduler ledger)
- `tool/host_discovery/generated/candidate_dedupe_index.json`
- `tool/host_discovery/generated/search_plan.json`
- `tool/host_discovery/generated/source_evidence.json`
- `tool/host_discovery/generated/index_readiness_report.json`
- `tool/host_discovery/generated/firestore_seed_import_plan.json`
- `operationRuns/{runId}` plus immutable
  `operationWorkItems/{workItemId}` freshness coverage
- future `clubs/{clubId}/sourceEvidence/{sourceId}` or
  `clubSourceEvidence/{sourceId}`

The website should render only page-ready club documents. The scraper ledger and
evidence collections may contain low-quality, duplicate, rejected, raw, private,
and suppressed candidates.

## Organizer Claim Workflow

Programmatic organizer pages become owner-controlled only through the server
claim workflow. The completed implementation plan is folded here so the claim
contract stays with organizer discovery and indexability policy.

Rules:

- `clubs/{clubId}` remains the canonical organizer document.
- Do not overload `clubHostClaims/{uid}` for public claim review. That
  collection remains the one-hosted-club owner lock.
- Claim requests live in `clubClaimRequests/{requestId}` and are callable-owned.
  Clients cannot directly read or write claim requests.
- `requestClubClaim` creates a claim request for a signed-in user and updates
  `clubs/{clubId}.claim.state` to `claimPending` while preserving
  `ownership.state = programmatic` and `appVisibility = hidden`.
- `adminDecideClubClaim` approves or rejects requests. Approval sets
  `ownerUserId`, `hostUserId`, `hostUserIds`, `hostProfiles`, `ownership.state =
  claimed`, and claim audit fields on the club.
- Claim approval writes a deterministic owner-facing `clubUpdate`
  notification/activity item.
- Claimed club hosts can write owner review responses through
  `setReviewResponse`; responses render in app and public website review
  surfaces from the canonical review snapshot.
- `adminSetClubIndexStatus` is the promotion/hold seam for public indexing. It
  records `publicPage.indexReview` evidence for source quality, media rights,
  cadence, and owner/contact verification.
- Operationally, seeded pages stay `noindex` until source evidence, media
  rights, cadence, and owner/contact verification are complete.

Open product decisions:

- whether one organizer account can own multiple city profiles under a national
  brand;
- whether venues can claim multiple venue-specific profiles with one account;
- whether claim approval can be automated from official-domain email;
- whether owner-submitted corrections should directly mutate `publicProfile` or
  create admin-review patches;
- whether public review responses should be available before the organizer hosts
  a Catch event.

## Candidate Backlog

The first target backlog is now machine-readable:

- `tool/host_discovery/candidate_batches/2026-06-10-initial-organizer-targets.json`

It contains 35 organizer candidates across the first target categories. The
backlog is intentionally broader than the seeded public pages: `candidate` and
`qualified` records are not public pages, while `page_seeded` records must point
to a backend-shaped `clubs/{clubId}` seed document.

Current batch distribution:

| Dimension | Count |
|---|---:|
| Total candidates | 35 |
| Page seeded | 2 |
| Qualified | 15 |
| Candidate review backlog | 18 |

The validator generates a deterministic dedupe index from names, city slugs,
official domains, source URLs, Instagram handles, event URLs, seed document
paths, and canonical page paths:

```sh
node tool/host_discovery/validate_discovery_data.mjs
node tool/host_discovery/validate_discovery_data.mjs --check
```

The search planner expands category/city queries and candidate-specific
verification queries. It deliberately emits intents without reading committed
run logs; Supply Intake applies the durable freshness policy when it freezes an
Operations plan:

```sh
node tool/host_discovery/plan_search_runs.mjs
node tool/host_discovery/plan_search_runs.mjs --check
```

As of 2026-07-26, the compatibility artifact contains 243 query intents. A
Supply Intake plan may schedule fewer when immutable completed Operations runs
contain fresh coverage for the same query keys.

## Source Evidence And Import Plan

Run logs are normalized into source evidence records before anything graduates to
Firestore:

```sh
node tool/host_discovery/generate_source_evidence.mjs
node tool/host_discovery/generate_source_evidence.mjs --check
```

The generated evidence file separates public-display-safe facts from internal
facts that should not be rendered directly, such as raw image URLs, exact private
addresses, registration counts, commerce internals, or personal contact details.

Seed import is represented as a dry-run write plan:

```sh
node tool/host_discovery/export_seed_import_plan.mjs
node tool/host_discovery/export_seed_import_plan.mjs --check
```

The import plan intentionally does not perform remote writes. Applying it to
Firestore requires explicit Firebase project selection, remote-write approval,
and a preflight proving the target `clubs/{clubId}` paths are absent or safe to
overwrite.

## Index Readiness

No seeded organizer page becomes indexable until it passes the generated
readiness gate:

```sh
node tool/host_discovery/check_index_readiness.mjs
node tool/host_discovery/check_index_readiness.mjs --check
```

The gate checks that a page is still QA/noindex, has a claim/correction path, is
hidden from native app discovery, has high-confidence public sources, has
owner-safe original page copy, and has no unresolved city, cadence, owner/contact,
or media-permission blockers.

When the operational review is complete, admins promote or hold the canonical
`clubs/{clubId}.publicPage` state through `adminSetClubIndexStatus`. The callable
persists `publicPage.indexReview` with the source-evidence, media-rights,
cadence, and owner/contact checklist so indexability is auditable from the same
club document used by the app and website.

As of 2026-06-10, both seeded pages are intentionally blocked from indexing:

| Candidate | Index blockers |
|---|---|
| Afterfly Indore | Current cadence, owner/contact verification, media permission |
| Bhag Delhi | Delhi city evidence, current cadence, owner/contact verification, media permission |

## First Seed

`Afterfly Run Club` in Indore and `Bhag Run Club` in Delhi are the first test
profiles. The 2026-06-10 Afterfly pass found a stable Luma event page for AFTER
FLY after the direct web and Instagram-oriented queries were sparse. The
2026-06-10 Bhag pass found an official Bhag site and a Bhag Club Luma event in
Gurugram, but not a stable Delhi-specific public source. Both profiles therefore
ship as unclaimed, hidden-from-app, `noindex` organizer seed documents with
public event evidence and the remaining missing evidence shown explicitly.
