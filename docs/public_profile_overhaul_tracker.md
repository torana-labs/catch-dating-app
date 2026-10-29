---
doc_id: public_profile_overhaul_tracker
version: 0.3.1
updated: 2026-06-05
owner: public_profile
status: active
---

# Public Profile Overhaul Tracker

Last updated: 2026-06-05

## Goal

Make the shared public profile surface feel person-first, expressive, trustworthy in the right ways, and optimized for post-event matching. The surface is reused in the Catches decision flow, profile preview, chat header profile view, and public profile routes, so changes here should be treated as product-critical.

The next direction is to move away from the deck/card paradigm entirely. Now that likes can target a specific profile section, photo, compatibility signal, or running block, the primary interaction should become a structured, scrollable public profile screen with contextual reaction controls. Swiping left/right should be retired from the user experience unless a later product decision reintroduces a separate lightweight pass gesture.

## Completed Baseline

- Redesigned `ProfileCard` toward the approved Option A direction: large hero photo, light editorial sections, running as a supporting differentiator.
- Made meaningful profile blocks individually likeable/commentable.
- Replaced the generic bio with structured profile prompts and photo prompts.
- Added a source-of-truth prompt catalog in `lib/contexts/profiles/domain/profile_prompts.dart`.
- Migrated legacy bio content into the prompt "A perfect run with me looks like...".

## Implementation Log

### 2026-05-14: Confidence, Identity, Compatibility Slice

- Added `lib/contexts/profiles/domain/profile_insights.dart` as the pure scoring and insight layer.
- Added profile quality scoring for photos, prompts, captions, relationship goal, running details, background facts, and lifestyle facts.
- Added owner-only profile quality guidance at the top of Edit Profile.
- Added derived/selected emotional run tags on the running identity card.
- Added "Why you might click" / profile signals section to the shared `ProfileCard`.
- Wired swipe-stack cards with viewer profile and shared run title so compatibility reasons can use real context.
- Added `SwipeReactionTargetType.compatibility` so the compatibility block can be liked/commented on like other meaningful blocks.
- Updated Firestore swipe validation to allow compatibility reactions.

### 2026-05-14: Preferred Run-Time Identity Slice

- Added `PreferredRunTime` to private `UserProfile` and public `PublicProfile`.
- Added `preferredRunTimes` to onboarding completion and Edit Profile Running Details.
- Projected preferred run times through `syncPublicProfile` and the generated Firestore TypeScript contract.
- Added morning/evening/midday emotional run tags from selected run-time preferences.
- Added viewer-aware time-of-day compatibility reasons such as "You both like morning runs".
- Folded run-time preferences into profile-quality scoring so running identity means pace, distance, why, and when.

### 2026-05-15: Cardless Profile Direction

- Product direction changed from swipe deck + profile card to a full structured profile surface.
- Contextual reactions remain the primary action model: users like/comment on the photo or section that caught their attention.
- Swipes/Catches, Profile Preview, and Public Profile should share the same section renderer, but the renderer should not require an outer card frame.
- The old `Swipe` domain/storage naming can remain temporarily as an implementation detail, but user-facing copy and UI should move toward "catch", "like", "pass", and "profile" language instead of "swipe".
- The Catches flow should use a Hinge-style floating dismiss action in the lower-left corner and contextual like/comment controls on reactionable blocks.
- In the Catches flow, liking or commenting on a block should submit the like and advance to the next profile. Preview and Public Profile should render the same sections without reaction controls.

### 2026-05-15: Cardless Profile Surface Implementation

- Added `ProfileSurface` as the shared cardless renderer for Catches, Profile Preview, and Public Profile.
- Removed the old `ProfileCard` shell, swipe stamps, `flutter_card_swiper` dependency, and generic bottom like/pass button row from the Catches decision screen.
- Catches now renders the first queue candidate as a full structured `ProfileSurface`, uses mode-gated section reaction controls, and exposes a floating lower-left X for pass/dismiss.
- Preview and Public Profile use the same `ProfileSurface` renderer in passive modes so they do not show reaction controls.
- The existing `SwipeQueueNotifier.swipe` path still records likes/passes and removes the current profile from the queue, so section likes/comments advance to the next candidate without a separate UI-only queue mechanism.

### 2026-05-31: Editorial Flagship (UI-elevation Phase 2)

- Rebuilt the shared renderer to the locked design language (`design_language.md`) while keeping the cardless, contextual-reaction model. The old `ScrollableProfile` + per-section widget set is superseded by:
  - `lib/swipes/presentation/profile_redesign/profile_view.dart` — a pure, fixture-friendly **section-based `ProfileView`** (`ProfileCompatibilitySection`, `ProfilePromptSectionData`, `ProfileRunningSection`, `ProfilePhotoSection`, `ProfileFactsSection`), each carrying an optional `ProfileReactionTarget`.
  - `profile_view_mapper.dart` — `profileViewFromCardContent(...)` maps the existing `ProfileCardContent` (so the data/insights layer is reused) onto the sections; section order + all seven reaction targets (`heroPhoto`, `photo`, `profilePrompt`, `compatibility`, `running`, `details`, `lifestyle`) mirror the legacy surface 1:1 — **no like/comment affordance lost**.
  - `catch_profile_view.dart` — editorial `ProfileBody`: dark "wow" graded hero (Archivo name, mono kicker in the activity pigment, mono meta), hairline-separated sections, `proseL` prompt answers, mono section labels, `CatchChip` tags. Per-section `ProfileReactionAction` render only when `onReact != null` (Catches); preview/public are calm.
- `ProfileSurface` now builds `ProfileBody` via the mapper for all three modes, so Catches + Profile Preview + Public Profile share the flagship at once.
- **Visual regression coverage started:** `test/goldens/profile_view_test.dart` renders the full reactable surface in light + dark (advances the "Add visual regression coverage" item below). The [UI capture pipeline](plans/ui_capture_pipeline_plan.md) will extend per-screen coverage.
- **Remaining:** reconcile the legacy profile widget tests for the new editorial treatment (section titles are tracked-mono **uppercase**; the no-photo state is on-brand **activity art**, not a "Photo coming soon" label); re-add `relationshipGoal` as a "Looking for" detail; finish the preview-tab nested-scroll integration (the flagship is a `CustomScrollView`). Device QA (floating pass-X, bottom-nav coexistence, reaction density) still pending.

### 2026-06-05: Prompt Picker and Catches Copy Cleanup

- Added catalog-backed profile prompt pickers in onboarding and Edit Profile so the three profile-prompt slots are no longer locked to the default prompt set.
- Enforced prompt uniqueness across profile prompt slots and photo prompt/caption slots. Picker menus filter out prompt IDs used elsewhere, and domain/save-path normalization makes the edited slot win if stale or legacy data already contains duplicates.
- Broadened `test/goldens/profile_view_test.dart` beyond the flagship reactable profile with dense long-content/multi-photo coverage and a missing-photo Dynamic Type variant, both rendered in light and dark.
- Cleaned visible user-facing copy away from "swipe" language in profile-completion, Catches empty states, hub copy, attended-event labels, block copy, dashboard copy, and event-success playbook copy. Backend/domain/storage names still use `Swipe`/`swipes` pending a separate migration decision.
- Deferred profile-quality coaching and compatibility-reason expansion for a guided follow-up pass.

## Current Product Decisions

- Do not add photo verification as a profile-card trust signal. Catch users meet at an event before seeing the profile, so photo verification is not the main trust problem.
- Do not add phone verification as a visible trust signal. Phone OTP login already verifies phone number.
- Do not add "recently active" as a primary trust signal while matching is bound to the 24-hour post-event swipe window.
- Profile completeness is a useful confidence signal and can be used to incentivize better profiles.
- Run host or member history may be useful, but it should be framed as social context and community proof, not identity verification.
- "Why you might click" is a high-priority profile-card feature. It should include running and non-running compatibility reasons.
- Same-city compatibility is not useful while swiping is city/event scoped.
- Time-of-day preference is now an explicit profile field and can later be enriched with attendance-derived behavior.
- Section-level reactions make generic left/right swiping redundant. The next UX pass should remove swipe gestures and card chrome, then provide clear contextual like/comment and pass/next controls.
- The sections should not become visually flat. Remove the outer card container, but keep polished section surfaces, gradients, inset photos, and rhythm so the content has more breathing room.
- Reaction controls are enabled only in the Catches decision context for now. Profile Preview and Public Profile should remain visually identical in content/layout but without like/comment controls.
- In the Catches flow, use always-visible section reaction controls for the first implementation. This follows the Hinge discoverability pattern and avoids hiding the main action behind a tap state.
- The pass affordance should be a floating lower-left X, visually separate from section reactions and placed so it coexists with bottom navigation.

## Workstream 0: Cardless Contextual Reaction Surface

The core change is to promote the shared profile renderer from "card content inside a deck" to "the actual screen body." This affects Catches, Profile Preview, Public Profile, and any chat/header profile entry point.

Target behavior:

- Replace the swipe deck with one full-screen profile at a time.
- Keep the first profile section photo-dominant, but remove the outer card border, shadow, and artificial rounded card frame.
- Keep rich section surfaces; removing the container should free width/height for larger photos, stronger prompts, and more generous spacing.
- Render the same ordered sections currently inside the card: hero photo, compatibility/profile signals, profile prompts, running rhythm, additional photos, details, and lifestyle.
- Keep each meaningful block individually likeable/commentable where a reaction makes sense, using always-visible controls in the Catches flow unless visual review proves they are too noisy.
- Add a floating lower-left X dismiss/pass affordance so users still have a clear way to dismiss a candidate without liking.
- Auto-advance to the next candidate after a like or comment in the Catches flow.
- Preserve the post-event catch-window model, but rename UI language away from swiping where possible.
- Preserve the shared rendering path for Catches, Profile Preview, and Public Profile so visual changes do not drift.

Implementation notes:

- Keep `ProfileSurface` as the chrome-free section renderer and let routes own optional wrappers/chrome.
- The shared section renderer should accept reaction controls as optional inputs. Catches passes reaction callbacks; Preview/Public Profile pass none.
- Prefer an explicit render mode or capabilities object over separate widgets, for example `ProfileSurfaceMode.catches`, `ProfileSurfaceMode.preview`, and `ProfileSurfaceMode.publicProfile`.
- The section renderer should own layout/content only; route-level screens should own top bars, bottom action bars, safe areas, candidate progression, floating dismiss, and moderation actions.
- Keep `ProfileCardContent` as the pure derivation layer unless the rename to a cardless term is part of a later cleanup pass.
- Do not remove the persisted `swipes` collection or `Swipe` model in the first UI pass; that is a separate storage/API rename with migration risk.
- Revisit bottom navigation and action placement: contextual section reactions should not compete with persistent bottom app navigation, pass/next, or report/block menus.
- Candidate UI/code names:
  - User-facing flow: `Catches`, `Catch Window`, or `Profiles`.
  - Route/widget names: `CatchReviewScreen`, `ProfileSurface`, `PublicProfileSurface`, or `ProfileSectionFeed`.
  - Data/backend names: keep `Swipe`/`swipes` until a separate migration pass.

Resolved UX decisions:

- Remove the outer card/deck container, but keep rich section surfaces.
- Use a floating lower-left X for pass/dismiss.
- Auto-advance to the next candidate after a successful like or comment in the Catches flow.
- Hide reaction controls in Preview and Public Profile while keeping the same root renderer.
- Keep backend `Swipe` naming temporarily.

Open UX decisions:

- Exact floating X treatment: size, elevation, safe-area inset, and whether it sits just above or partially over the bottom nav.
- Exact visual density of always-visible section reaction controls after production render review.
- Should comment sheets stay as bottom sheets, or become inline composer affordances on larger surfaces?
- What is the empty/end-of-stack state once swiping is no longer the metaphor?

## Workstream 1: Confidence Signals

Confidence signals should answer "is this profile worth engaging with?" rather than "is this person real?"

Candidate signals:

| Signal | Source | Use | Status |
| --- | --- | --- | --- |
| Profile complete | Computed from prompts, photos, captions, run details, facts | Badge or profile-quality nudge | Implemented |
| Met at this event | Current swipe/event context | Subtle context line: "Met at Thursday Social Run" | Implemented for swipe context |
| Club regular | Attendance or club membership history | Soft social proof | Needs data audit |
| Run host | Host role/history | Community credibility | Needs product decision |
| First Catch run | Attendance count | Context, not a penalty | Proposed |
| Repeat runner | Attendance count | Context, not a ranking | Proposed |

Run host/member history explanation:

- This is not a verification badge.
- It can show that the person participates in the same real-world running community.
- Examples: "2 Catch runs attended", "Regular at Indore Morning Runs", "Run host", "Met at Thursday 5K".
- This should be light and contextual, not a status hierarchy that makes newer users feel lower value.

## Workstream 2: Emotional Run Identity

These tags should make running feel personal rather than purely numeric.

Derived candidates:

| Tag | Derivation | Notes |
| --- | --- | --- |
| Morning regular | Preferred run times include early morning or morning | Implemented from selected run times |
| Evening regular | Preferred run times include evening or night | Implemented from selected run times |
| Midday miles | Preferred run times include afternoon | Implemented from selected run times |
| Easy miles | Pace preference and run choices skew easy/social | Implemented from public pace |
| Tempo energy | Pace preference or selected run vibe skews faster | Implemented from public pace |
| 5K regular | Preferred or attended distances cluster around 5K | Implemented from preferred distances |
| Long-run person | Preferred or attended distances skew longer | Implemented from preferred distances |
| Club regular | Multiple events with same club | Depends on run-club data |
| New to Catch | Low attendance count | Should be friendly, not a warning |

Asked/edit-profile candidates:

| Tag | Prompt or field source | Notes |
| --- | --- | --- |
| Chatty miles | "My ideal run vibe is..." | Good matchability signal |
| Quiet miles | Same | Important compatibility signal |
| Coffee after | "After a run, find me..." | Strong social hook |
| Race-training | Running goal field or prompt | More emotional than pace alone |
| Run for headspace | Running reason field or prompt | Implemented from running reasons |
| Route explorer | Running style field or prompt | Useful personality signal |
| Walk-run friendly | Running style field or prompt | Inclusion and expectation-setting |
| Music runner | Running preference field | Potential conversation hook |

## Workstream 3: Why You Might Click

This feature should generate 1-3 short compatibility reasons for the profile card. Reasons must be specific, true, and not overstate certainty.

Running reasons:

| Reason | Source |
| --- | --- |
| You both prefer morning runs | Preferred run times now; attendance later |
| Your pace ranges overlap | Pace range fields |
| You both like easy social runs | Running vibe/reason |
| You both prefer 5K runs | Preferred distances |
| You both showed up to the same run | Event context |
| You both run with the same club | Run-club membership/history |
| You both like coffee-after-run energy | Prompt/tag |

Non-running reasons:

| Reason | Source |
| --- | --- |
| You are looking for the same thing | Relationship goal |
| You both wrote thoughtful prompts | Profile quality/completeness |
| You both mention food, music, books, travel, or similar themes | Prompt/caption text matching, later NLP |
| You both prefer low-pressure conversation starters | Prompt interaction patterns, future |
| You share language preferences | Profile facts |
| You have compatible age preferences | Match filters |
| Their profile has a prompt you can easily respond to | Prompt quality heuristic |

Avoid:

- Same city while the matching pool is already city scoped.
- Vague reasons like "You seem compatible".
- Reasons based on sensitive or protected attributes.
- Reasons that imply exact inference from weak data.

## Workstream 4: Profile Quality Guidance

The goal is to improve conversion by helping users build profiles that make others more likely to start a conversation.

Candidate surfaces:

| Surface | Purpose | Notes |
| --- | --- | --- |
| Edit Profile top panel | Profile strength, missing items, primary CTA | Best main home |
| Prompt section inline nudges | Suggest stronger prompt answers | Useful but should not feel noisy |
| Photo section inline nudges | Encourage captions and varied photos | High impact |
| Preview tab checklist | Show what would improve the public card | Good education surface |
| Post-onboarding nudge | Catch incomplete profiles after signup | Keep low friction |

Draft guidance categories:

- Add at least 3 clear photos.
- Add captions to photos that create easy openers.
- Answer 3 prompts with specifics, not generic claims.
- Include one running-specific detail that says how it feels to run with you.
- Fill pace, distance, why, and run-time preferences so compatibility reasons can be generated.
- Use one playful or personal detail outside running.

## Workstream 5: Data Model and Scoring

Likely additions:

- Profile completeness score or derived view model.
- Emotional run tags, with `derived` vs `userSelected` provenance.
- Compatibility reason generator that receives viewer profile, target profile, and event context.
- Optional per-block quality hints for prompts/photos.

Open modeling questions:

- Should historical event/run-club participation be projected into public profiles, or fetched as event context only?
- Should attendance history later refine selected time-of-day preferences, and should that influence recommendations separately from profile display?
- Should compatibility reasons stay client-side, move to Functions, or be precomputed for the event swipe window once they depend on richer context?
- Should complete profiles get a public badge everywhere, or only inside the compatibility/profile-signals section?

## Open Implementation Backlog

| Priority | Item | Status | Notes |
| --- | --- | --- | --- |
| P0 | Replace swipe deck/card UI with cardless structured profile surface | Implemented; needs device QA | `ProfileSurface` is shared by Catches, Preview, and Public Profile. Production visual QA is still needed on device. |
| P0 | Add Hinge-style floating pass X after removing swipe gestures | Implemented; needs device QA | Catches uses `CatchesPassButton` in the lower-left. Exact visual inset/elevation still needs device QA. |
| P0 | Update demo data to seed `profilePrompts`, `profilePhotos.prompt`, and preferred run times | Implemented | `tool/demo/seed_demo_data.mjs` now builds profile prompts, photo prompt selections inside grouped profile photos, and preferred run times from generated catalogs and validates seeded docs. |
| P1 | Add one-shot legacy profile prompt backfill/repair tooling | Implemented | `tool/data/recompute_public_profiles.mjs` and schema-contract repair docs cover stale public-profile projection repair, including legacy `bio` cleanup. |
| P1 | Implement mode-based reaction controls in the shared renderer | Implemented locally | Catches enables like/comment controls; Preview/Public Profile use the same renderer with controls disabled. |
| P1 | Add prompt-picker UX for profile prompts and photo captions | Implemented locally | Onboarding and Edit Profile now use catalog-backed profile prompt pickers. Photo prompt editing filters prompts already used by other photos, and domain/save-path normalization clears duplicate prompt selections. |
| P1 | Expand compatibility reasons beyond v1 heuristics | Partially implemented | Existing reasons cover run title, relationship goal, running reason, time, distance, pace, language, and easy openers. Missing club/run history, prompt/caption themes, and richer non-running signals. |
| P2 | Add richer profile quality coaching | Partially implemented | Edit Profile has a top strength card. Still missing inline prompt/photo coaching, Preview checklist, and post-onboarding nudges. |
| P2 | Add visual regression coverage for profile surfaces | Expanded locally | `test/goldens/profile_view_test.dart` now covers the full reactable surface, a dense long-content/multi-photo profile, and a missing-photo Dynamic Type profile in light + dark. UI capture pipeline/device captures still need a later route-level pass. |
| P2 | Audit user-facing copy for "swipe" language | Implemented locally | Visible profile-completion, Catches, dashboard, block, and event-success copy now uses Catches/catch/profile language. Storage/domain/test identifiers still use `Swipe`/`swipes` until a separate migration. |

## Proposed Iteration Order

1. Expand compatibility reasons with approved run-history and non-running signals.
2. Add owner-only profile quality guidance in Preview and inline prompt/photo coaching.
3. Do device visual QA for the floating pass X, bottom navigation coexistence, and section reaction density.
4. Extend route-level screenshot captures through the UI capture pipeline.

## Verification Plan

- Widget tests for profile-surface rendering with and without each signal category.
- Widget tests for cardless profile rendering with and without each signal category.
- Unit tests for profile completeness scoring.
- Unit tests for emotional tag derivation.
- Unit tests for compatibility reason generation and ordering.
- Golden or screenshot checks for long names, long prompts, missing photos, dense chip sets, cardless action placement, and bottom navigation coexistence.
- Focused `flutter analyze` and profile/public-profile/swipe tests.
