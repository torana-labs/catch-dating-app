---
doc_id: containment_audit
version: 1.0.1
updated: 2026-08-07
owner: design_parity_review
status: ready-for-implementation
---

# Containment Audit — every border earns its rule

Doctrine: `docs/design_language.md` §7.1 (R1 collection object · R2
actionable module · R3 plane change · R4 status tone · R5 list frame;
depth ≤ 1; chips/skeletons/stage-paper-celebration exempt). This audit
classifies every bordered/filled surface in feature presentation code
(236 widgets inventoried 2026-07-05) and turns the failures into flatten
work items.

Workflow for Codex: verify claims with `rg` before changing, inspect the
read-only impact plan, use per-item commits, and run focused tests, analyzer,
Widgetbook, and catalog checks. Git and CI preserve proof. Every flatten item
lists its skeleton mimics — skeletons always follow their subject.
Lab/manual-QA screens (`event_policy_lab`, `event_success_lab`,
`manual_qa`) are review harnesses: SKIPPED, not audited.

---

## KEEP verdicts (no work — the rule each border earns)

- **R1 collection objects:** CatchPolaroid, EventDateRailCard,
  EventActionCard, AttendedEventTile, CatchCrossPathsCard (+
  CrossPathsPolaroidRail), ExploreFeedOrganizerRow, ExploreExternalEventRow,
  ActivityTypeRow/MoreActivityTypesRow (browse grid), VibeTile, PhotoSlotTile,
  OrganizerProfileImageTile, DraftCard, PlaceSuggestionRow, HostAnalyticsEventTile,
  HostCapacityTile, CatchRosterTileCell (+ roster table grammar),
  ChatShareCard/EventShareCard/ClubShareCard (+ pills as share-material),
  MessageBubble/ShareCardBubble (chat material), RecapHeader, OrganizerHeroHeader,
  analytics metric-tile grids (kit v1).
- **R2 actionable modules:** EventDetailHostCard (actions earn the box),
  EventDetailCalloutCard, EventDetailMapCard (whole-tap), OrganizerNextRunBanner,
  EmptyHeroCard, StrideCard, DashboardQuickActionTile, CatchesIntroCard,
  HostTodayEventHero, HostTodayTaskCard, HostEmptyActionCard,
  HostInviteLinkRow, HostWaitlistBulkOfferAction, SuvbotResetActionRow,
  LiveCheckInQrCard, HostCheckInQrPanel, HostPaymentAccount* cards,
  HostClubManagementPanel, HostOrganizerPayoutPrompt, BookingConflictEventRow,
  Group/RotationOverride editors, _SetupDisclosureSection, PromptField,
  OnboardingRunningPrefsStep (form input modules), PhoneCountryCodePicker
  (control chrome), HostParticipationLifecycleBoard, TargetAttendeeControl.
- **R3 plane changes:** all sheets (broadcast composer, QR scanner, reaction
  comment, draft picker, booking conflict, payment checkout),
  PlaceSearchSection/SelectedPointSection + EventLocationMap overlay panels,
  CatchesTopOverlay, MapPill, AppShellNavigationBar, LiveNowConsole,
  HostRosterSearchBar.
- **R4 status tone:** NoticeCard, ReadinessIssues, IssueList,
  HostFullCapacityBanner, EditHostedEventScopeNotice, SwipeWindowBanner,
  PaymentConfirmationNotice, PaymentReferralBanner,
  CompatibilitySignalHostCard, StageCard/PresetReviewCard (primarySoft
  setup signals), EventSuccessPrompt/ConversationCue/Recommendation cards,
  PlaybookSummaryCard.
- **R5 list frames:** OrganizerHostSection, OrganizerContactSection,
  HostTeamManagementSection, HostOrganizerTeamCard, contained
  create/edit-club scaffolds' section frames.
- **Exempt classes:** every `*Pill`/`*Chip`/`*Badge`/`*Seal`/`*Dot`/marker
  (data-chip anatomy), every `*Skeleton` (follows subject), the entire
  stage/paper/live-reveal/celebration grammar (S5 calibration), HeroTime/
  HeroActivity chips, PhotoCaption, MonthDayTile.

Depth check: no depth-2 bordered nesting found outside plane changes after
the contained-flush work — record any encountered during execution.

---

## FLATTEN work items

### N1. Reviews become divided rows `[codex]` — the headline

`ReviewCard` + `ReviewOwnerResponseCard` (reviews_section.dart:293, :371)
render card-per-review. DS ReviewRow contract: rows inside ONE hairline
container (R5), divider on every row after the first, inline list capped at
2–3, closed with a quiet mono "ALL N REVIEWS →" row. Apply exactly that:
one `CatchSurface(borderColor: t.line)` list frame per reviews block,
`CatchDivider.fieldRow`-separated review rows, owner responses as indented
flat blocks inside their row (hairline-left or spacing — no nested border;
depth ≤ 1). Surfaces affected: club detail, event social section, reviews
history (history may keep uncapped list; the cap applies to inline
previews). `ReviewHistoryRowSkeleton` follows. Stars stay ink (already
aligned).

### N2. Filters screen adopts the flat form grammar `[codex]`

`FiltersSection` (swipes/filters_screen.dart) boxes its filter groups.
Migrate to the settings/profile-edit grammar: `CatchSection.fieldRows` +
flush rows + hairline dividers. Coordinate with the screen's outstanding
gutter-scanner HIGH findings (same file) — fix both in one pass.

### N3. Calendar stats header flattens to a metric strip `[codex]`

`CalendarStatsHeader` (+ its skeleton) boxes summary stats. Replace the
bordered surface with the flat `CatchMetricStrip` treatment club detail
uses. Values/labels unchanged; skeleton follows.

### N4. Analytics info panels lose their boxes `[confirm]`

`UserAnalyticsTrendSection`, `UserAnalyticsTipsSection`,
`HostAnalyticsTrendSection`, `HostAnalyticsReviewDiscoveryPanel`, and
`HostAnalyticsEventList`'s empty-state surface: charts, tips, and stat
pairs are information inside kicker sections — the border is an information
box. Flatten: section kicker + flat content (chart bars, stat columns, tip
rows with dividers where stacked = R5). The metric-tile GRIDS keep their
borders (R1 peers). Visible change on both analytics surfaces — owner
confirm before execution.

### N5. Informational empty/locked states go inline `[codex]`

`UserAnalyticsEmptyState`, `WhoIsGoingEmptyState`, and the Catches-hub
explainer surface (`CatchesHubEmptyState`'s bordered how-it-works card):
informational, not actionable — render flat (icon + title + supporting,
CatchEmptyState inline layout, no border). `GuestWhoIsGoingCard`: verify tone —
if its fill is neutral it flattens the same way; if it deliberately reads
as a locked/status treatment, re-tone it as an explicit R4 surface and
record which.

### N6. Host event summary card becomes a list frame `[codex]`

`HostEventSummaryCard` (host_event_manage_screen.dart) boxes a stack of
icon/label/value rows — that is an R5 list frame at most: one hairline
container + divided rows, or fully flat rows inside its parent section if
the section already provides the frame. Pick whichever the surrounding
composition already uses; no card.

### N7. Event-detail info sections — verify against the DS template `[codex]`

`WhatToExpectSection` and `EventDetailPolicySummary` were recently moved
INTO contained cards (section-header pass); under the doctrine they are
information and would flatten — but the event-detail template is the
DS-blessed slice, so check `templates/catch-event-detail` + the
`HintList`/`MechanismList`/`Itinerary` component contracts in
`~/Downloads/Catch Design System (2)/` first. Where the template renders
these flat/hairline, flatten to divided sections; where it genuinely boxes
them, record the rule the box earns. Same check covers
`EventDetailHintList` and `ItineraryRow`.

### N8. Form-step surface batch — box only the modules `[codex]`

`HostProfileForm`, `EventPolicyStep` (six surfaces), `EventSuccessStep`,
`OrganizerHostDefaultsStep`/`_PolicyDefaultsCard`, `EventSuccessDefaultsSection`,
`IntegrationNotesCard`, `ChatEventContextHeader`: per surface, apply the
test — input/editor modules and pickers keep their box (R2); pure grouping
or explainer text flattens to `CatchSection`/fieldRows grammar. Record the
verdict per surface in the same reviewed change; expected outcome is most of the six
EventPolicyStep boxes collapse into one section with divided rows.

---

## Enforcement (after the burn-down)

Once N1–N8 land: add a `design:containment` inventory scanner — every
`CatchSurface` with a visible border/fill in presentation code must carry a
`// containment: R<n>` marker comment or appear in this audit's KEEP list;
new unmarked surfaces are MEDIUM findings. Inventory-first, ratchet later,
per the enforcement doctrine. Scanner work is manifest + `.mjs` only.
