---
doc_id: schema_contracts
version: 0.3.0
updated: 2026-08-17
owner: data_contracts
status: active
---

# Schema Contracts

This directory is the new contract-first source for Firestore document shapes,
embedded profile objects, prompt catalogs, callable patch payloads, fixtures,
and staged storage/data migrations.

The contract runbook lives in `docs/data_contracts.md`. Start there before
changing contract scope, generator behavior, rules metadata, or migration
policy.

## Rules

- JSON Schema files use draft-07.
- Contract files describe intended persisted shape, not every legacy tolerated
  field.
- Legacy read tolerance belongs in migration notes and adapter code.
- Full Firestore documents and callable patch payloads are separate schemas.
- Firestore-specific values use `x-firestore-type` metadata. Fixture files use
  serialized timestamp objects with `_seconds` and `_nanoseconds`.
- Generated outputs must live outside `contracts/`.
- Do not hand-edit generated outputs once generator scaffolding exists.

## Contract Extensions

This repo uses a small set of `x-*` metadata fields on top of draft-07 JSON
Schema:

- `x-firestore-collection`, `x-firestore-path`, and `x-document-id-field`
  identify the live collection/path and the Dart domain field injected from a
  document id when a class stores the id outside the persisted JSON body.
- `x-firestore-type` marks persisted Firestore special values such as
  timestamps. Fixtures use serialized timestamp objects; the schema generator
  also emits an Admin SDK projection with live `FirebaseFirestore.Timestamp`
  values for Functions runtime reads.
- `x-catch-ownership` marks Firestore field ownership:
  `client-writable`, `client-runtime-writable`, `callable-owned`,
  `trigger-owned`, or `server-only`. `docs/data_contracts.md` owns the full
  lifecycle policy for these tags.
- `x-owner` is the human-readable owner summary for a document, operation, or
  migration-oriented contract. It explains who is allowed to create or mutate
  the shape at runtime.
- `x-internal-demo-fields` lists internal seed/demo metadata fields tolerated
  by a schema so production-facing contract rules can keep those fields
  visibly separated from product data.
- `x-legacy-tolerated-fields` records legacy fields accepted temporarily during
  migrations without treating them as canonical contract shape.
- `x-denormalized-to` documents projection fan-out targets that must stay in
  sync when the source document changes.
- `x-callable-aliases` records callable names that intentionally reuse a shared
  payload schema. For example, simple event-id callables can share
  `event_id_payload.schema.json` without inventing duplicate schemas.
- `x-callable-shape` records special callable payload shapes. The current
  supported value is `patch`, meaning the top-level payload wraps a required
  `fields` object whose nullable values must distinguish "omit" from
  "explicitly clear".
- `x-firestore-operation` records the direct client-write operation kind
  (`create`, `update`, or `delete`) for schemas under `contracts/client_writes/`.
- `x-logical-name` gives a direct-write schema a stable logical name when the
  current storage path is mid-migration or intentionally not the product name.
- `x-migration-phase` marks the current migration phase for a direct-write
  contract that is moving between storage paths.
- `x-storage-rules-match`, `x-storage-read`, `x-storage-write`, and
  `x-storage-rules-test-file` connect storage-path schemas to `storage.rules`
  and rules tests.
- `x-storage-content-type-pattern`, `x-storage-file-name-pattern`, and
  `x-storage-max-bytes` describe the intended client/server upload policy for a
  storage path. Rules and client helpers should reject violations before a bad
  upload completes.
- `x-storage-related-collection` and `x-storage-known-consumers` document the
  Firestore collection and app/backend surfaces that read or write a storage
  path.
- `x-storage-metadata`, `x-future-field`, and `x-migration-contract` mark
  embedded objects that describe storage assets and link them to their rollout
  plan.
- `x-catch-catalog` and `x-catch-maximumFrom` link embedded prompt values to
  catalog/business-rule sources so schema limits do not drift from product
  constants.
- `x-normalization` records callable/patch normalization rules that are enforced
  in code but still belong with the schema contract.
- `x-intentionally-excluded-fields` lists document fields intentionally omitted
  from a patch/callable contract because clients must not write them through
  that boundary.
- `x-wire-shape-extends` and `x-wire-shape-injects` record response objects
  that intentionally carry a stored document shape plus injected wire-only
  fields, such as a `publicProfiles/{uid}` body plus the document id.

## Directory Map

- `firestore/`: persisted Firestore document schemas, including document path,
  ownership, document id, demo metadata, and migration tolerance metadata.
- `shared/`: reusable schema definitions for common event, club, profile,
  timestamp, enum, id, money, and location shapes.
- `embedded/`: reusable embedded object schemas such as prompt answers and
  `ProfilePhoto` storage metadata.
- `catalogs/`: product catalogs referenced by schemas, including the canonical
  person-field registry plus profile, photo-prompt, presentation, Event
  Assistance workflow, and command-binding catalogs.
- `callables/`: callable Function request payload schemas.
- `callable_responses/`: callable Function response payload schemas decoded by
  typed Flutter response objects.
- `http/`: versioned request and response schemas for non-callable public HTTP
  endpoints shared by browser clients and Functions.
- `operations/`: portable run, work-item, receipt, decision, lease,
  publication-plan, learning, and enforced workflow-manifest schemas for
  durable business workflows. Run/work-item validators are generated into the
  trusted Functions runtime; conditional lifecycle and human-review rules are
  not maintained as a weaker hand-written subset. The reusable work-item
  vocabulary is workflow-owned; consumer response schemas, such as Supply
  Intake, narrow it to their declared stage contract. Workflow manifests bind
  ordered stages to explicit active, published, and expired lifecycle semantic
  groups so generic runtime behavior does not depend on Supply Intake tokens.
- `bigquery/`: BigQuery table schemas that generate typed Functions runtime
  shapes for analytics tables.
- `patches/`: patch-only payload schemas, currently profile updates.
- `client_writes/`: direct client-write operation payload schemas that pair
  Firestore rule behavior with schema validation.
- `storage/`: Firebase Storage path contracts for upload paths, read/write
  policy, content type, byte limits, and known consumers.
- `migrations/`: staged data/storage migration contracts and phase state.
- `fixtures/valid` and `fixtures/invalid`: schema validation fixtures consumed
  by the contract validators and parity tests.

## Current Slice

The current contract layer covers:

- shared reusable definitions under `contracts/shared/`;
- private profile documents at `users/{uid}`;
- public profile projection documents at `publicProfiles/{uid}`;
- professional host identity documents at `hostProfiles/{uid}`;
- embedded profile prompt answers;
- embedded photo prompt answers;
- embedded `ProfilePhoto` storage metadata objects;
- embedded activity preference objects, currently `activityPreferences.running`;
- person-field, profile, and photo prompt catalogs;
- event, event-success, club, relationship, social, payment, safety,
  operational, and demo Firestore document contracts;
- durable operations contracts with valid/invalid lifecycle fixtures;
- callable request payloads for profile, event, club, review, safety, payment,
  and Places operations;
- public Marketing waitlist and Host-application HTTP request/response
  contracts, including generated website and Functions types;
- profile patch payloads backed by typed Dart patch classes;
- selected callable response payloads that the Flutter app decodes into typed
  client response objects, including the server-owned post-event candidate
  projection returned by `fetchSwipeCandidates` and the roster-private
  pre-event person/event suggestions returned by `getCrossPathsSuggestions`;
- BigQuery table schemas for host analytics events and user profile exposure
  events consumed by analytics Functions and marts;
- direct client-write operation payloads for contextual profile decisions,
  chat messages, saved-event edges, notification read updates, and match unread
  resets;
- Firebase Storage path contracts for profile, club, event, and chat image
  uploads;
- migration contracts for the `profileDecisions` path, grouped `ProfilePhoto`
  storage object model, and nested profile activity preferences;
- valid and invalid fixtures for generated schema validators.

## Known Drift Captured By This Slice

- `functions/src/profiles/updateUserProfile.ts` and `firestore.rules` now use
  the contract height range of 120 to 220 cm.
- `functions/src/profiles/updateUserProfile.ts` no longer accepts legacy
  `sexualOrientation`. The profile contract does not include it.
- `firestore.rules` no longer allows new user-profile writes with legacy
  `sexualOrientation`.
- `functions/src/shared/generated/firestoreAdminTypes.ts` is the Admin SDK
  Timestamp projection, generated from JSON Schema by
  `tool/contracts/generate_schema_contracts.mjs`. Functions runtime code uses
  it when Admin SDK reads return live `FirebaseFirestore.Timestamp` values.
  See `docs/data_contracts.md` "TypeScript Timestamp Projections" for when to
  use each generated TS shape.

## Validation

For the full local contract gate, run:

```bash
./tool/check_data_contract.sh
```

For the fast contract-source check, run:

```bash
node tool/contracts/validate_schema_contracts.mjs
```

This checks JSON syntax, schema metadata, local `$ref` targets, prompt catalog
uniqueness, catalog/schema limit alignment, and fixture placement. Generated
TypeScript/Ajv/Dart output is checked by `node tool/contracts/generate_schema_contracts.mjs
--check` and by the full data-contract script.

Storage contract metadata is checked by:

```bash
node tool/contracts/check_storage_contract.mjs
```

## Dart Patch Classes

`UpdateUserProfilePatch` and `UpdateClubPatch` are generated patch helper
classes emitted into
`lib/platform/schema_contracts/generated/callable_request_dtos.g.dart`.
The old domain paths remain compatibility exports so existing repository and
controller imports do not need to move in the same pass. Their `toJson()` output
is validated against
`contracts/patches/update_user_profile.schema.json` and
`contracts/callables/update_club_payload.schema.json` by
`test/core/update_user_profile_patch_test.dart` and
`test/core/update_club_patch_test.dart`.

Use the typed constructors for known fields. The `raw(...)` constructors remain
as temporary escape hatches for tests and genuinely dynamic migration/tooling
callers; app presentation code should route through typed patch constructors.
Remove the escape hatches once the remaining dynamic callers are migrated.

## Dart Callable Requests

Callable request classes that are safe to generate live in
`lib/platform/schema_contracts/generated/callable_request_dtos.g.dart` and are
re-exported from feature-local `*_callable_dtos.dart` files. The generator
emits typed nested/domain fields for create payloads that already have stable
Dart domain objects, including `EventMeetingLocation`, `EventPolicyBundle`,
`EventFormatSnapshot`, `EventSuccessDefaults`, `EventConstraints`, and
`ClubHostDefaults`; `toJson()` on the generated request owns the final wire
shape. Feature-local adapters are responsible only for translating domain
models into those generated request constructors.

Hand-written request DTOs are still allowed when the callable boundary owns
behavior the schema alone cannot express, such as invite-code trimming,
location-bias flattening, or wrapping a generated patch helper.
