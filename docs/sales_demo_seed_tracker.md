---
doc_id: sales_demo_seed_tracker
version: 0.1.17
updated: 2026-10-30
owner: demo_data
status: active
---

# Sales Demo Synthetic Seed Tracker

This tracker owns the shift from test-fixture demo data to sales-grade demo
data. `docs/demo_data_seeding.md` remains the operating manual for the seeding
commands; this document tracks the higher-quality synthetic supply, host-demo
acceptance criteria, and migration work needed before the demo can be used as a
host sales surface.

## Operating Documents

| Document | Purpose |
|---|---|
| [sales demo persona cohorts](https://github.com/torana-labs/catch-knowledge/blob/main/strategy/sales-demo-persona-cohorts.md) (catch-knowledge) | Cohort scope, NYC/India library decisions, roster reuse policy, and city overlay boundaries. |
| [sales demo image generation runbook](https://github.com/torana-labs/catch-knowledge/blob/main/runbooks/sales-demo-image-generation.md) (catch-knowledge) | Step-by-step ChatGPT-web image production, review, local artifact organization, UID-owned Storage upload, and validation workflow. |
| `demo_data_seeding.md` | Existing seed commands, scenario ownership, cleanup/reset behavior, and app-visible validation workflow. |

## Target Outcome

A host can sign into a controlled test account, open event management, and see a
live event that feels already launched: a coherent roster, polished attendee
profiles, realistic event policy behavior, exact meeting locations, active event
success operations, and post-event reporting. The same high-quality synthetic
people and assets should then feed browse, investor, payments, safety, dogfood,
and empty-state demos wherever synthetic users are needed.

## Current Problems

| Area | Problem |
|---|---|
| Synthetic people | Generated users are sparse, random, and often internally inconsistent across name, gender, image, ethnicity, age, height, city, and profile copy. |
| Photos | Most synthetic users have a single remote image URL instead of a complete profile photo set with storage-owned assets and prompt metadata. |
| Host demo | `create-host-account` creates the host shell but not a sales-ready roster, event-success plan, report state, or high-fidelity participants. |
| Market fit | The world seed is India-first; U.S. host pitches need a U.S.-appropriate market pack, demographics, venues, GPS pins, event formats, and copy. |
| Event policies | Seeded event documents do not yet cover the full event policy snapshots that hosts need to understand access, pricing, waitlist, cancellation, and settlement behavior. |
| Reuse | Demo scenarios create their own synthetic data instead of drawing from one canonical asset/persona library. |

## Quality Principles

- The persona library is canonical. Scenarios place known synthetic people into
  situations; they do not invent one-off users.
- Every seeded public profile used in sales surfaces has four to six coherent
  photos, prompt answers, photo prompts, height, age, gender, city, occupation,
  and continuity notes.
- Photo sets should look like normal high-quality dating profiles, not running
  profiles. Each generated set needs a clear solo image, social/dateable context,
  and broad personality variety; an active lifestyle image is optional and capped.
- Demo photos are generated or licensed, uploaded to controlled storage, and
  referenced by stable URLs plus storage paths. Scraped or fragile hotlinks are
  not acceptable for sales demos.
- Market packs own venues, coordinates, city copy, event formats, and demographic
  mix. A U.S. host demo should not accidentally inherit India-specific locations
  or cultural cues.
- Host sales demos must exercise the actual app surfaces: setup, live, roster,
  check-in, event success, payment/access policy affordances, and report views.

## Acceptance Criteria

| Surface | Minimum Bar |
|---|---|
| Host account | Test host owns one polished club and lands on an upcoming managed event without permission dead ends. |
| Roster | The managed event has at least 20 signed-up or checked-in participants from the canonical persona library. |
| Profiles | Every visible participant has 4+ coherent uploaded photos, complete profile prompts, plausible height/age/city/gender metadata, and no name/photo demographic mismatch. |
| Photo mix | Persona photos follow `photo_activity_taxonomy.json` for vocabulary and `photo_composition_index.json` for profile, catalog, city, and cohort ratios. The current draft requires at least four distinct categories per profile, one required clear solo portrait, at most one active lifestyle image per profile, at most one running image per profile, and running capped at 15% of the catalog. |
| Event setup | Event document includes exact venue coordinates, route/meeting details, policy snapshot, pricing/access state, capacity, and realistic host-facing copy. |
| Live operations | Event-success plan, preferences, compatibility responses, assignments, wingman requests, and check-in state are present enough to avoid empty live-console states. |
| Report | Post-event scorecard and feedback data exist for at least one sales-demo event so hosts can inspect afterglow value. |
| Reuse | Browse, investor, payments, safety, dogfood, and warm-user demos can select from the same persona/assets catalog instead of creating lower-quality substitutes. |
| Validation | Seed tooling rejects personas with too few photos, unknown prompt IDs, duplicate positions, missing storage paths, or unpublished assets when a live seed requires them. |

## Work Board

| ID | Workstream | Status | Notes |
|---|---|---|---|
| SDS-001 | Persistent tracker and acceptance contract | Done | Tracker created 2026-05-25; keep it current until the sales demo can be verified end to end. |
| SDS-002 | Persona catalog schema and validator | In progress | Initial validator and CLI gate are in place; seed write integration still needs to call it. |
| SDS-003 | Initial U.S./NYC persona pack | Done | Draft now has 24 coherent NYC personas and 96 planned photo slots for one 20-person host roster plus browse/overflow reuse. |
| SDS-004 | Image generation and storage pipeline | In progress | Photo activity taxonomy, composition index, Markdown review command, and local OpenAI pilot generator are in place; review/upload still pending after pilot assets are produced. |
| SDS-005 | Seeder integration | Pending | Teach world/demo ops to write users/public profiles from the catalog with full `profilePhotos` metadata. |
| SDS-006 | U.S. market and venue pack | Pending | Add New York venues, exact GPS pins, meeting details, route formats, and host-friendly event copy. |
| SDS-007 | Host sales scenario | Pending | Replace the sparse `create-host-account` path with a full roster, event policy, live plan, and report state. |
| SDS-008 | Event policy coverage | Pending | Seed representative invite-only, approval, paid, waitlist, cancellation, refund, and settlement snapshots. |
| SDS-009 | Event-success live/report coverage | Pending | Write arrival/check-in state, preferences, assignments, wingman requests, feedback, and scorecards for host demos. |
| SDS-010 | Demo migration | Pending | Point browse, investor, payments, safety, dogfood, and warm-user demos at the canonical high-quality catalog. |
| SDS-011 | QA checklist | Pending | Add dry-run and app-visible checks for host demo readiness, profile completeness, and asset reachability. |
| SDS-012 | Image production runbook | Done | The [sales demo image generation runbook](https://github.com/torana-labs/catch-knowledge/blob/main/runbooks/sales-demo-image-generation.md) now defines ChatGPT-web batching, local manifests, review gates, UID-owned Storage paths, upload algorithm, and stop conditions. |
| SDS-013 | Persona cohort policy | Done | The [sales demo persona cohorts](https://github.com/torana-labs/catch-knowledge/blob/main/strategy/sales-demo-persona-cohorts.md) doc now defines the NYC-first cohort, planned India core cohort, roster reuse rules, and city overlay limits. |

## Open Product Decisions

| Decision | Default Until Changed |
|---|---|
| Primary U.S. demo market | New York City, because it supports a dense activity/dating host story and varied event formats. |
| Minimum persona catalog size | 24 reusable New York personas for the first U.S. host sales pass, plus a planned 36-person India core cohort for reusable Indian demo rosters. |
| Per-profile photo count | Four required, six preferred for the sales catalog. |
| Photo activity mix | `photo_composition_index.json` owns repeatable per-profile, catalog-wide, city, and cohort share targets before image generation. |
| Asset source | Generated synthetic people or licensed stock with strict continuity review, uploaded to UID-owned Catch-controlled Storage paths before live seeding. |
| Image model default | Avoid additional API spend unless explicitly approved. Use ChatGPT web for the first production batch, continue comparing OpenAI GPT Image against Gemini/Nano Banana outputs when available, and standardize only after visual review confirms identity continuity and no generated-image markers. |
| Demographic mix | U.S.-plausible, city-appropriate, balanced by gender and broad ethnicity without tokenizing or forcing exact quotas into every event. |

## Image Generation Plan

Use the [sales demo image generation runbook](https://github.com/torana-labs/catch-knowledge/blob/main/runbooks/sales-demo-image-generation.md) in catch-knowledge for the current production workflow.
It is written for subscription ChatGPT web generation, one conversation per
persona, and four-person waves so medium-reasoning sessions can do the repetitive
download, review, normalization, and manifest work without re-deciding the data
model.

The first asset pass should generate only two or three full personas before any
batch run. Each pilot persona needs a hero portrait first, then the remaining
photos generated or edited against that reference so face, height, build, hair,
and ethnicity remain internally consistent. The pilot is accepted only if the
photos look like normal dating-app profiles, not ads or fitness profile shots.

Default generation settings for the pilot:

- Use portrait output for profile photos, preferably 1024x1536 or the closest
  supported vertical aspect ratio.
- Generate in high quality, then downscale/crop into app sizes with stable
  storage paths and thumbnails.
- Keep prompts text-free, logo-free, adult-only, and explicit about synthetic
  people.
- Store provider, model, prompt, revised prompt when available, review status,
  storage path, and rejection reason for every generated asset.
- Do not publish to live seed writes until `--require-published-assets` passes.

Run the pilot dry run first:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
```

Then generate the local review assets:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --apply
```

Run the Gemini/Nano Banana comparison pilot with the same persona/photo set:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --image-pilot-config tool/demo/demo_seed/personas/image_generation_pilot.gemini.json \
  --personas nyc_maya_shah_001 \
  --image-output-dir build/demo-persona-images-gemini
```

Apply it after `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `GOOGLE_GENAI_API_KEY`
is available:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --image-pilot-config tool/demo/demo_seed/personas/image_generation_pilot.gemini.json \
  --personas nyc_maya_shah_001 \
  --image-output-dir build/demo-persona-images-gemini \
  --apply
```

If API billing, missing API keys, or project limits block the first pilot, a
subscription web UI is acceptable as a manual review fallback, but it does not
replace the scripted pipeline. Save every downloaded image under ignored
`build/` output, write a local manifest with review notes, and keep the catalog
unpublished until the same assets are normalized, uploaded, and validated by
`--require-published-assets`.

Current manual fallback output:

- ChatGPT web: `build/demo-persona-images/chatgpt-web-maya-shah-pilot.manifest.json`
- Gemini web: `build/demo-persona-images-gemini-web/gemini-web-maya-shah-pilot.manifest.json`
- ChatGPT web NYC wave 1 heroes:
  `build/demo-persona-images-web/us-nyc-sales-personas-v1/manifest.json`
  has approved hero images for Maya Shah, Jordan Ellis, Sofia Martinez, and
  Ethan Brooks. Sofia and Ethan required one regeneration each; rejected first
  drafts are preserved as `.rejected-01.png` raw assets.
- ChatGPT web NYC wave 1 photo-1 pass:
  the same manifest now has approved second images for Maya's cafe/coffee
  context, Jordan's bridge/friends context, Sofia's pickleball context, and
  Ethan's casual run context. No upload has been attempted.
- ChatGPT web NYC wave 1 photo-2 pass:
  the same manifest now has approved third images for Maya's gallery opening,
  Jordan's restaurant dinner, Sofia's rooftop dinner, and Ethan's apartment
  cooking context. No upload has been attempted.
- ChatGPT web NYC wave 1 photo-3 pass:
  the same manifest now has approved fourth images for Maya's casual waterfront
  run, Jordan's basketball court, Sofia's bookstore weekend, and Ethan's museum
  steps context. Maya's first position-3 stroll candidate was rejected because it
  did not clearly show running; the rejected raw asset is preserved. No upload
  has been attempted.
- ChatGPT web NYC wave 2 photo-0 pass:
  the same manifest now has approved hero portraits for Aisha Williams, Daniel
  Kim, Priya Desai, and Marcus Chen. Aisha's first in-web response was rejected
  because it ignored the park brief and produced a beachside restaurant image;
  it was not downloaded. Daniel required a simplified third prompt after two
  ChatGPT web attempts stalled at the generation/final-touches state; those
  stalled attempts were not downloaded. No upload has been attempted.
- ChatGPT web NYC wave 2 photo-1 pass:
  the same manifest now has approved second images for Aisha's friends brunch,
  Daniel's park-steps group walk, Priya's sidewalk coffee-window candid, and
  Marcus's pickleball court candid. Priya's first coffee-window response was
  rejected in-web because it left a large blank lower half; it was not
  downloaded. No upload has been attempted.
- ChatGPT web NYC wave 2 photo-2 pass:
  in progress. Marcus Chen's music studio image is approved and normalized.
  The first studio candidate was rejected in-web because it included a small
  shirt mark and weaker aspect framing; it was not downloaded. Daniel, Aisha,
  and Priya position-2 slots are still pending. No upload has been attempted.

## Session Log

| Date | Change |
|---|---|
| 2026-05-25 | Created this tracker, documented the sales-demo acceptance criteria, and started the persona-catalog validator/workstream. |
| 2026-05-25 | Added `validate-persona-catalog`, the first NYC sales persona draft, and validation tests. Draft assets intentionally fail the live uploaded-asset gate until image generation/upload is complete. |
| 2026-05-25 | Added `photo_activity_taxonomy.json` and updated the draft personas away from running-heavy photos toward normal dating-profile contexts before image generation. |
| 2026-05-25 | Corrected the photo mix to include running as a minority activity: 2 of 32 draft photos are running, with one running photo per profile and a 15% catalog cap. Added `persona-photo-plan` for prompt review before generation. |
| 2026-05-25 | Added `photo_composition_index.json` so profile, catalog, city, and cohort photo ratios are validated for all major photo types, not only running. |
| 2026-05-25 | Expanded the NYC sales persona catalog to 24 personas and 96 planned photos, with 12 men, 12 women, and a validated photo mix: 24 solo portraits, 15 social dining, 15 culture/nightlife, 13 active lifestyle, 11 friends/group, 8 creative/work, 6 everyday candids, and 4 travel/outdoor photos. |
| 2026-05-25 | Added `persona-image-generate` and `image_generation_pilot.json` so the first 3-person OpenAI pilot can be dry-run, generated into ignored local `build/` output, and reviewed before any catalog mutation or storage upload. |
| 2026-05-25 | Attempted the OpenAI image pilot; OpenAI rejected the first request with `billing_hard_limit_reached` before generating any images. The failed run wrote `build/demo-persona-images/us-nyc-sales-persona-image-pilot-v1.manifest.json`. |
| 2026-05-25 | Used ChatGPT web as a manual fallback for `nyc_maya_shah_001`; saved four local review images under `build/demo-persona-images/maya-shah/` and wrote `build/demo-persona-images/chatgpt-web-maya-shah-pilot.manifest.json`. First two images are strong candidates; gallery and active photos need review because aspect ratio/scale and running-pose control drifted. |
| 2026-05-25 | Added Gemini/Nano Banana provider support and `image_generation_pilot.gemini.json` for a direct API comparison against the Maya Shah ChatGPT web set. Dry run succeeds; apply is blocked until a Gemini API key is available in the shell. |
| 2026-05-25 | Used the logged-in Gemini Pro web UI as a no-extra-API-billing fallback for the same `nyc_maya_shah_001` four-photo comparison set. Saved outputs under `build/demo-persona-images-gemini-web/maya-shah/` and wrote `build/demo-persona-images-gemini-web/gemini-web-maya-shah-pilot.manifest.json`. Gemini produced consistent 1536x2752 vertical images and a stronger casual running scene, but every inspected download includes a visible generated-image marker that blocks publishing as-is. |
| 2026-05-25 | Added the sales demo image generation runbook and persona cohorts doc (both now in catch-knowledge) so lower-cost medium-reasoning sessions can generate ChatGPT-web images in four-person waves, organize local manifests, upload approved images to UID-owned Storage paths, and reuse a New York cohort plus planned India core cohort across demo surfaces. |
| 2026-05-25 | Started ChatGPT-web production wave 1 for `us-nyc-sales-personas-v1`: approved hero portraits for `nyc_maya_shah_001`, `nyc_jordan_ellis_002`, `nyc_sofia_martinez_003`, and `nyc_ethan_brooks_004`; normalized approved JPEGs under ignored `build/demo-persona-images-web/`; no upload attempted. |
| 2026-05-25 | Continued ChatGPT-web production wave 1: approved and normalized photo position 1 for Maya Shah, Jordan Ellis, Sofia Martinez, and Ethan Brooks. Sofia's pickleball image is usable but review notes flag future prompt tightening toward less polished/body-forward sports framing. |
| 2026-05-25 | Continued ChatGPT-web production wave 1: approved and normalized photo position 2 for Maya Shah, Jordan Ellis, Sofia Martinez, and Ethan Brooks. Maya's gallery image is the strongest scale/context proof; Sofia's rooftop dinner is polished but acceptable for the sales-demo profile set. |
| 2026-05-25 | Completed the local four-photo minimum for wave 1: approved and normalized photo position 3 for Maya Shah, Jordan Ellis, Sofia Martinez, and Ethan Brooks. Maya's first position-3 candidate was rejected as a waterfront stroll and regenerated as an explicit casual running photo; upload remains pending. |
| 2026-05-25 | Started ChatGPT-web production wave 2: created local folders for Aisha Williams, Daniel Kim, Priya Desai, and Marcus Chen, then approved and normalized Aisha's Central Park hero portrait. A first Aisha beachside-restaurant response was rejected in-web and not downloaded. |
| 2026-05-25 | Completed ChatGPT-web production wave 2 photo position 0: approved and normalized hero portraits for Daniel Kim, Priya Desai, and Marcus Chen. Daniel's first two web generations stalled without downloadable output; the approved asset came from a simplified fictional-subject prompt. Upload remains pending. |
| 2026-05-25 | Completed ChatGPT-web production wave 2 photo position 1: approved and normalized Aisha's friends brunch, Daniel's park-steps group walk, Priya's sidewalk coffee-window candid, and Marcus's pickleball court candid. Priya's first coffee-window output was rejected in-web for a blank lower frame and was not downloaded. Manifest approved count is now 24; upload remains pending. |
| 2026-05-25 | Started ChatGPT-web production wave 2 photo position 2: approved and normalized Marcus Chen's music studio image after rejecting the first in-web studio candidate for a small shirt mark and weaker aspect framing. Manifest approved count is now 25; upload remains pending. |
