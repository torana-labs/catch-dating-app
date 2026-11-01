---
doc_id: design_sync_pipeline
version: 1.6.0
updated: 2026-11-02
owner: design_system
status: active
---

# Code, Figma, and Claude Design sync

`catch.components.json` is the identity and behavior contract. Flutter owns
behavior, DTCG tokens own values, Figma owns editable design instances, and
Claude Design reads the contract, the tokens and `docs/design_language.md`
directly. No tool may silently become a second component registry.

Run `node tool/design/build_design_sync_manifest.mjs` after changing component
identity, APIs, states, or mapping metadata. CI runs the same command with
`--check`. Use `--require-live` only in a release environment that has a Figma
file and a Code Connect-capable plan; it is intentionally red while either
Badge or Field lacks current published evidence.

The normal check proves only that repository-owned structural evidence is
current. The generated manifest separately records `operationalStatus.live`
as `ready` or `incomplete-external`, including machine-readable owner-tagged
blockers. A structural pass must never be reported as a completed live sync.

The manifest records a digest per contract, generated mapping metadata, Figma
property drift, concept metrics, Claude eligibility, and the Badge + Field
spike. A Figma mapping is current only when the registry component name resolves
to exactly one captured component node and its property definitions match the
generated contract projection. Badge and Field use explicit projections:
optional icon slots become visibility plus instance-swap controls, and governed
review states remain gallery evidence rather than public variant axes. A Code
Connect mapping is valid only when the registry points to a template.

`figma_library_snapshot.json` is generated evidence. It supports two explicit
capture paths with different claims:

- A read-only Figma MCP discovery receipt records live component properties,
  variable identifiers/counts, review frames, and the exact publication status.
  This can prove a current mapping on Professional, but `UNPUBLISHED` remains a
  separate live blocker.
- A `LIBRARY_PUBLISH` webhook records published-library evidence. Its changed
  item keys/names must be hydrated with `GET /v1/files/:key` or
  `GET /v1/files/:key/nodes`.

Run the MCP path with an untracked capture input:

```sh
node tool/design/import_figma_library_snapshot.mjs \
  --mcp-capture path/to/figma-mcp-capture.json \
  --review-snapshots path/to/snapshot-index.json
```

Run the published-library path with:

```sh
node tool/design/import_figma_library_snapshot.mjs \
  --webhook path/to/webhook.json \
  --file-response path/to/figma-file.json \
  --review-snapshots path/to/snapshot-index.json
```

The optional snapshot index is an object keyed by Figma node id. Each value is
either a repo-relative image path (the importer computes its SHA-256 digest) or
an object with `path` and a previously computed lowercase SHA-256 digest.

The importer canonicalizes Figma property names (including generated `#...`
suffixes), records optional review-node ids plus image paths/digests, preserves
publication status, captures variable evidence, and stamps a content digest.
The sync manifest joins those nodes to contract ids by
`design.figma.componentName` and generates node URLs. Neither artifact is
hand-edited. The live Badge + Field gate additionally requires publication
status `CURRENT`, at least one captured variable binding, one review snapshot,
a current Claude Design receipt, and a published Code Connect template for each
component; a current mapping alone cannot satisfy the live gate.

Current live discovery is stored in `live_capabilities.json`. It is operational
evidence, not a credential file. The current Professional Full seat and approved
Foundations file permit library work but do not satisfy the Organization or
Enterprise prerequisite for published Code Connect, so the repository keeps
that seam blocked without claiming it is live.

## Deterministic loop

1. Change Flutter, tokens, or the component contract.
2. Print the Badge + Field Claude Design request with
   `node tool/design/build_design_sync_manifest.mjs --claude-handoff`. It is
   built from the component contract and is the only accepted prompt contract.
3. Run that request through Claude Design and store its exact, referenced
   response in `design/sync/claude_design_receipt.json`. The sync gate rejects
   stale source, concept, or supported-state digests.
4. Update the matching Figma component and use the MCP capture path for an
   honest pre-publication mapping receipt when useful.
5. Publish the Figma library, then let the publish receiver hydrate the webhook
   and replace the snapshot with published evidence on a review branch.
6. Regenerate this sync manifest; it reports mappings as `current`, `stale`, or
   `missing` and verifies the receipt digests.
7. Publish Code Connect only where the plan supports it.
8. Run component, snapshot, sync-manifest, Widgetbook, and drift gates.

The first live vertical slice is `catch.badge` plus `catch.field`. Scale to the
remaining concepts only after both components pass the full loop.
