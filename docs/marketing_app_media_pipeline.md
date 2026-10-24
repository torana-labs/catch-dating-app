---
doc_id: marketing_app_media_pipeline
version: 1.10.0
updated: 2026-10-24
owner: marketing_website
status: active
---

# Marketing App Media Pipeline

The website should not hand-author app screenshots. Marketing pages consume
records generated from `tool/marketing/capture_manifest.json`, and the sync
tool verifies canonical image provenance and website copies. CI derives current
outputs from its exact source before consuming them; tracked copies are not
CI freshness authority.

## Capture Lifecycle

Each capture has one of three statuses:

| Status | Meaning |
|---|---|
| `pending-fixture` | The website uses a checked-in placeholder until the synthetic demo fixture and screenshot harness are ready. |
| `active` | `sourcePath` must exist, is copied to `website/public/assets/app-screenshots/`, and CI compares source and website image bytes. |
| `paused` | The capture is excluded from the generated website manifest. |

When the synthetic host/member fixture is ready, flip the relevant capture from
`pending-fixture` to `active`, generate the app screenshot into its `sourcePath`,
then run:

```sh
node tool/marketing/sync_website_media.mjs --update
node tool/marketing/sync_website_media.mjs --check
```

## Website Contract

Website pages render React `CaptureCard` components keyed by
`data-capture-slot="<capture-id>"`. `website/src/App.tsx` loads
`/assets/app-screenshots/manifest.json` and swaps in the active asset path,
caption, alt text, walkthrough step, and status label.

The capture cards on `/explore/` consume these slots through
`useMarketingCaptures()`. Capture selection and copy belong to the manifest.
The homepage hero and `/host/` currently use authored React illustrations;
regenerating app captures does not update those illustrations. Replacing them
requires a separate content decision.

Marketing styling imports the shared React web token layer from
`packages/web-config/styles/catch-web.css`; the generated token CSS itself is
owned by `dart run tool/design_tokens.dart`.

## CI Behavior

`tool/tools_manifest.json` registers `marketing:app-media-sync`, so
`node tool/run.mjs check` runs the marketing media check with the rest of tool
CI. Pending captures pass only if their placeholders exist and the generated
website manifest is current. Active captures fail if the source image is missing, is not a framed
1020×1964 iPhone 17 Pro PNG, lacks canonical render provenance, has changed
image bytes or capture inputs, or differs from its website copy. The generated
website manifest must also be current. Both sync commands run the exporter
check before copying or accepting any active image.

The exporter embeds one `caPt` ancillary chunk in each framed PNG. It records
the catalog id, fixture key, native iOS recipe/font hash, source revision, PNG
byte hash, and capture input hash. Inputs include the capture runner/catalog,
local transitive Dart imports/exports/parts (including production widgets and
fixtures), canonical scenario/persona JSON, declared assets/fonts, package
manifests/lock, framing/export tools,
and pinned toolchain configuration. Of the capture's manifest entry, only its
render fields enter the hash: `id`, `status`, `device`, `fixtureKey` and
`sourcePath`. Every other field, known or new (website copy, destinations,
pages, scenario pointers, facts, disclosure), is presentation and never
invalidates a render; scenario data enters through its JSON files.
The catalog is shared, so an input change
can conservatively invalidate multiple slots. Adding an asset to a declared
directory also invalidates captures. No machine-specific font path or font
bytes are distributed.

The canonical macOS producer renders invalidated inputs and verifies reusable
images for the exact CI source. Required Marketing validation imports its
immutable artifact before dependency setup, checks and builds. Tools derives
capture need from selected executable checks, shares the caller's bundle when
provided, and otherwise starts one producer. Only the affected consumer or the
full marketing/design bucket imports images; other buckets retain their
ordinary checks. After importing, Tools verifies all 26 current output bytes
against the bound archive before and after its check run and reuses only the
three exact freshness commands already owned by the producer. Syntax, unit,
framing and authored semantic checks still run. Missing or invalid bindings fail before a build; old tracked
images cannot substitute for a missing artifact.

The importer checks the artifact ID, digest, repository, canonical workflow,
source/controller commits, run and current attempt, then the bounded ZIP,
authored manifest, receipt and every image/input/copy hash before replacing any
output. It retains the verified ZIP in ignored build output. Postbuild checks
compare every website PNG and their manifest with the exact imported bytes.
The two independently generated organizer-listing projections are allowed only
at this postbuild stage; authored changes still fail. Routine source changes
need no generated screenshot commit. Automatic export does not update or accept
regression goldens, approve visual changes, or establish live feature availability.

Marketing Website triggers include app/test/local-package source and font assets,
dependency manifests and capture helpers. On main it reuses the same-source CI
producer, including native-only changes whose React lane was skipped, then runs
any missing React validation. Production packaging retains its separate
read-only listing snapshot, environment checks and promotion authority. Recovery
uses the already-built package and never rerenders. Manual Marketing Website validation also runs the existing Hosting packager on
its actual built site and retains a separately named validation artifact with
all 13 capture/manifest byte comparisons. It uses real run identity but has no
production promotion authority and makes no live-listing calls. Manual
review/export remains available below. Never manually stamp old PNGs.

## Link-Preview Cards

`website/scripts/renderPreviewCards.mjs --update` renders the 1200×630
`og:image` cards in `website/public/assets/og/` with Playwright from the site's
own Archivo font, light colour tokens, the Catch and Catch Host splash marks,
page copy from `website/src/content/meta.json` and, for the Host cards, an app
capture from this pipeline. It writes `website/src/content/previewCards.json`
with each card's path, alt text and input hash. `src/server/previewCards.ts`
maps `/host/`, `/host/apply/` and `/f/` to their cards and every other page to
the brand card. Page metadata and the private-link shell use that map, with the
hash prefix as a `?v=` query so chat apps refetch a re-rendered card.

`--check` runs in the website `pretypecheck` without a browser. It fails when a
card's copy, tokens, font, wordmark or renderer changed since it was rendered.
Re-render after editing those page titles or descriptions. Captures are hashed
by id only, because CI re-imports their bytes; re-rendering picks up the newest
capture.

## Fixture Boundary

Host slots use the named `host-marketing-india.json` scenario through the existing
`SalesDemoHostScenarioFixture` reader and synthetic builders. The shared
`host-demo.json` NYC seed world and persona projection remain independent.
The named scenario has no `seedWorld` configuration and is display-only capture
input: fictional Evening Club in Mumbai, Saturday Trivia Social at Harbour
Room, free INR 0 registration with open capacity 30, and one event id across
setup, Today, live, and recap. Planning is 0 booked/0 checked in; Today is 24/0;
live and follow-up are 24/18, with no waitlist. Recap has no fabricated scorecard
or reviews. The existing Host Today catalog entry has its own canonical slot.

The scenario explicitly records 17 October 2026, 18:30–20:30 Asia/Kolkata and
civil phase clocks: planning 16 October 12:00, Today 17 October 16:00,
live 17 October 19:00 and follow-up 18 October 10:00, all Asia/Kolkata. Production draft restore consumes local civil fields,
so the fixture constructs those fields in the capture process's local
representation instead of converting a UTC epoch. The focused restore test is
run under UTC, America/Los_Angeles and Asia/Kolkata. These values are never
submitted to a backend. The production fixed Pub quiz activity selects a team playbook, so this host-led
story uses the existing custom activity control labelled Trivia social with
`hostLedProgram`. The Guide selects the existing welcome and safety
modules, alongside mandatory platform modules (including attendance, guest
help, feedback and analytics); compatibility, reveal and
automated assignments are not selected. Production price/capacity/admission
controls remain visible without retouching.

These are draft synthetic render assets. Source support for free/open mode and
passing source tests does not establish the exact target build's route, flags,
backend configuration or public/store availability. Publication remains an
owner decision after target-build verification. `active` describes the local
media pipeline, not approval of a product availability claim.

## Rendering And Review

The implemented exporter maps manifest fixture keys to production screen builders
in `test/ui_captures/catalog/screen_capture_catalog.dart`. The export-only
`capture_runner_test.dart` renders those widgets using synthetic fixtures; it
does not compare or update golden baselines.

```sh
node tool/marketing/export_app_screenshots.mjs --list
node tool/marketing/export_app_screenshots.mjs --update --ids member-event-discovery
node tool/marketing/sync_website_media.mjs --update
node tool/marketing/sync_website_media.mjs --check
```

Select ids from `--list`. Review the generated source PNGs before sync. Rendering
and syncing local assets does not publish the website.

The iPhone export renders at the final frame's 2x pixel ratio with explicit iOS
widget behavior. It loads the local macOS system font by default; another host
must provide `--sf-font <path>` to an available native iOS font. Font files stay
local and are never copied into website assets. Generic review captures can
choose `--platform ios --sf-font <path>` via `tool/ui_capture/run_captures.mjs`;
without those options they retain the deterministic test platform/font setup.
An iPhone device geometry alone does not establish iOS typography.

Design rules govern the implementation. Fresh rendered review validates the
result; a reviewed golden baseline then records it for regression detection.
An existing golden is not authority for spacing, typography, or an invalid
configuration. Product exports reuse production widgets and fixtures, without
requiring the UI to match an old image. Keep export, review, baseline updates,
and website sync as distinct explicit operations.

The six create-event slots are views of the current three-step production
wizard: Basics, schedule and meeting-location views within When & where, booking
policy and expanded guide views within Booking & live guide, plus the final
review summary.
They are not six wizard steps. Location scrolls to `WhereStep`; Guide opens the
production customization disclosure. Catalog ids and website slot ids remain
stable so existing consumers keep their coverage.

## Hosted Export (CAT159 Enabling Slice)

`.github/workflows/marketing-captures.yml` runs the existing canonical exporter
on a standard GitHub-hosted `macos-26` runner, with repository-pinned Flutter
and Node and the runner's local SFNS font. Manual dispatch accepts only a full
lowercase 40-character source commit SHA from this repository. Applying
`capture:requested` to an open same-repository PR into `main` selects that
label event's exact PR head SHA. The source is checked out separately from
the immutable exporter/controller commit. Source and exporter
toolchain pins must match; dependency resolution enforces the source lockfile.
A clean source checkout and an active manifest of 1 to 100 canonical slots are
required; the manifest alone sets the count.

Execution prerequisite: integrate the workflow and request validator through
the existing owner-controlled queue first. Manual dispatch requires the workflow
on the default branch. A label request requires the new controller on the event's
base commit and a mergeable PR; GitHub does not run `pull_request` workflows for
merge conflicts. A draft source fix does not establish hosted rendering success.
After integration, either apply the capture label with the authorized GitHub
connector or dispatch manually:

```sh
gh workflow run marketing-captures.yml --ref main -f source_sha=<full-source-sha>
```

For a label request, checkout and receipt `workflowSha` identify the event's
base commit, which owns the executed exporter/controller. The workflow
definition still comes from GitHub's PR merge ref; `workflowDefinitionSha`
records its separate commit and `request.eventSha` records the event merge SHA.
For this explicit label mode the source is the PR head, never the synthetic
merge. Automatic CI calls instead bind both source and controller to the actual
tested event SHA, including a PR merge commit. GitHub's API run head remains the
PR head in that case; `runHeadSha` records it separately and the importer verifies
its parent relationship to the tested merge. The request
validator repeats the label/open/main/same-repository checks, binds environment
values to event JSON and verifies actual controller HEAD before source checkout.
See [GitHub's PR event semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

For the label entrypoint, only the exact `labeled` request starts a capture.
Unrelated labels, forks and closed PRs do not grant a request. Verify the published
product head before labeling and compare it again before artifact handoff.
After a new source head or an intentional retry, remove and reapply the label
to request a new run. Eligible jobs share a concurrency key by source SHA across
both trigger modes, preventing simultaneous duplicate renders; unrelated label
events do not enter that queue. Completed runs are not a durable deduplication
cache. `capture:requested` does not start CI, satisfy Required CI or change
merge/deployment authority.

Use the currently published exact head of each product PR; short SHAs and local
unpublished Programs commits cannot be dispatched. The job runs the manifest's
canonical catalog entries through the real iOS/SF Flutter capture path, frames
their light marketing exports, regenerates design context, syncs website
copies, then runs the existing provenance, input freshness, framing and
copy-byte checks. A per-capture plan reuses only byte-verified PNGs whose full
render-input fingerprint and native font match. Reused PNGs keep their original
render SHA, which must be an ancestor of the selected source; they are never
restamped. Only invalidated outputs are removed before rendering. A render/check
failure prevents artifact upload; there is no stale image fallback. Older source
exporters without this protocol retain the full-render behavior.

`--plan --sf-font <path>` prints render/reuse reasons; `--update-stale` renders
only invalidated selections. `--update` still forces rendering for intentional
review. Source dependency changes, new assets, font changes, missing or corrupt
PNGs all invalidate reuse. Reusing a valid source can repair a missing or stale
website copy without rerendering.

The seven-day immutable artifact is named
`canonical-marketing-<source-sha>-<run-id>-<attempt>`. It contains exactly the
manifest's framed source PNGs, their website copies, the authored capture manifest,
website manifest, design context, and `capture-receipt.json`. The receipt
records per-file hashes/sizes, embedded PNG provenance, exact source SHA/tree,
controller and workflow-definition SHAs, validated trigger request, helper hash,
toolchain/runner identity and run/attempt URL. Receipt version 2 additionally
records each capture's `rendered`/`reused` disposition and `verifiedSourceSha`.
For reuse, the PNG's `sourceRevision` identifies the original render and must not
be relabeled as the current render source. Consumers must verify the selected
source receipt, original provenance, full input validation and byte inventory;
they must not assume every image was newly rendered.
The job summary records the upload's artifact ID, digest and download URL;
retain that identity together with the receipt when reviewing or handing off.
SF font bytes, dependency caches and arbitrary checkout files are excluded.

Tracked changes outside the declared media/design outputs fail packaging,
including source and golden baseline changes. Automatic reusable calls expose
`capture_binding` with immutable artifact/source/run identity; they do not start
CI or grant merge/deployment authority. The producer and consumers preserve
existing regression checks. Export alone does not publish a website or prove
product/backend availability.

CI also materializes the route inventory and only the generated region of the
widget catalog in each complete source-preflight, Tools and Flutter analysis
checkout using `tool/ci/generated_inventories.mjs`. It preserves authored catalog
prose, component identities, fixtures, goldens and coverage decisions. A new route
still requires its authored coverage decision. First-phase migration retains
tracked outputs for existing local consumers; their eventual removal requires
an owned handoff, not deletion of another task's files.
