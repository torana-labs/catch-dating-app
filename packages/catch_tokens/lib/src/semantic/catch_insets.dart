import 'package:catch_tokens/src/components/catch_welcome_tokens.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';
import 'package:catch_tokens/src/semantic/catch_layout.dart';
import 'package:flutter/material.dart';

/// Semantic inset contracts for repeated screen and component shells.
///
/// These are intentionally named for layout roles. Feature screens should use a
/// role here, or a layout primitive that embeds one, before composing raw
/// [EdgeInsets] from [CatchSpacing].
abstract final class CatchInsets {
  /// Default scroll/body padding for app pages with top chrome.
  static const EdgeInsets pageBody = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPt,
    CatchSpacing.screenPx,
    CatchSpacing.screenPb,
  );

  /// Customer-label lane beneath an operational roster person row. Aligns
  /// badges with the row's text column after its gutter, avatar, and gap.
  static const EdgeInsets operationalRosterInsightLane = EdgeInsets.only(
    left: CatchSpacing.s5 + 48 + CatchSpacing.s3,
    right: CatchSpacing.s5,
    bottom: CatchSpacing.s2,
  );

  /// Page body padding for flows that need extra scroll-end breathing room.
  static const EdgeInsets pageBodyRelaxed = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPt,
    CatchSpacing.screenPx,
    CatchSpacing.s8,
  );

  /// Page body padding when top chrome already supplies some separation.
  static const EdgeInsets pageBodyTight = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s3,
    CatchSpacing.screenPx,
    CatchSpacing.screenPb,
  );

  /// Tighter-top page body padding with extra scroll-end breathing room.
  static const EdgeInsets pageBodyRelaxedTight = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s3,
    CatchSpacing.screenPx,
    CatchSpacing.s8,
  );

  /// Page body padding for content that sits directly under a dense header.
  static const EdgeInsets pageBodyUnderHeader = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s1,
    CatchSpacing.screenPx,
    CatchSpacing.screenPb,
  );

  /// Compact-top scroll body for tab screens that own their title block inline
  /// (no pinned header) and need section-sized scroll-end breathing room — the
  /// Catches hub feed and its empty state share this single contract.
  static const EdgeInsets pageBodyHero = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s2,
    CatchSpacing.screenPx,
    CatchSpacing.s6,
  );

  /// Explore activity index padding: page gutters, section top breathing room,
  /// and enough scroll-end space to clear the floating map pill.
  static const EdgeInsets eventTypeBrowseIndex = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPx,
    CatchSpacing.screenPx,
    CatchLayout.eventTypeBrowseBottomPadding,
  );

  /// Loading state for the Explore activity index.
  static const EdgeInsets eventTypeBrowseSkeleton = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPx,
    CatchSpacing.screenPx,
    CatchSpacing.s4,
  );

  /// Horizontal page/list gutters when vertical padding is owned elsewhere.
  static const EdgeInsets pageHorizontal = EdgeInsets.symmetric(
    horizontal: CatchSpacing.screenPx,
  );

  /// Separation between the scroll-owned Today header and its first state.
  static const EdgeInsets hostTodayContentStart = EdgeInsets.only(
    top: CatchSpacing.s5,
  );

  /// Leading route action aligned to the canonical screen gutter.
  static const EdgeInsets topBarLeadingAction = EdgeInsets.only(
    left: CatchSpacing.screenPx,
  );

  /// Trailing route actions aligned to the canonical screen gutter.
  static const EdgeInsets topBarTrailingActions = EdgeInsets.only(
    right: CatchSpacing.screenPx,
  );

  /// Dense Host Inbox title row: preserves the page gutter while leaving a
  /// full 40px lane for the headline and expanding-search action.
  static const EdgeInsets hostInboxHeader = EdgeInsets.symmetric(
    horizontal: CatchSpacing.screenPx,
    vertical: CatchSpacing.s1,
  );

  /// Bottom breathing room for scrollable component bodies whose surrounding
  /// shell already owns horizontal and top padding.
  static const EdgeInsets scrollEnd = EdgeInsets.only(bottom: CatchSpacing.s6);

  /// Wider horizontal gutters for sparse auth/onboarding layouts.
  static const EdgeInsets pageHorizontalWide = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s6,
  );

  /// Inset Host authentication card below the shared brand stage. The whole
  /// stage scrolls when needed to keep focused controls clear of the keyboard.
  static const EdgeInsets hostAuthStage = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s4,
    CatchSpacing.screenPx,
    CatchSpacing.s5,
  );

  /// Side breathing room for the full-bleed Catches profile on wide panes.
  static const EdgeInsets catchesWideProfile = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s8,
  );

  /// Full-screen welcome hero padding.
  static const EdgeInsets welcomeHero = EdgeInsets.fromLTRB(
    CatchSpacing.s7,
    CatchSpacing.s6,
    CatchSpacing.s7,
    CatchSpacing.s7,
  );

  /// Reel row copy inset in the animated welcome splash.
  static const EdgeInsets welcomeReelRow = EdgeInsets.only(
    left: CatchWelcomeTokens.welcomeReelObjectLeft,
    right: CatchWelcomeTokens.welcomeReelObjectRight,
    top: CatchSpacing.micro14,
  );

  /// Header/body padding for page-level intro rows before dense content.
  static const EdgeInsets pageHeaderBody = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.s4,
    CatchSpacing.s5,
    CatchSpacing.s3,
  );

  /// Compact page-level intro padding before dense content.
  static const EdgeInsets pageHeaderCompact = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.s2,
    CatchSpacing.s5,
    CatchSpacing.s3,
  );

  // ── Shared root-screen header rhythm ────────────────────────────────────────
  //
  // Root destinations share one spacing contract for the band between their
  // title block, an optional pinned primary rail, and the first content row.
  // These role tokens
  // centralise that rhythm so screens stop tuning their own raw EdgeInsets.
  // The horizontal page gutter stays [CatchSpacing.screenPx] (s5) everywhere.

  /// Root-screen title block. Separation from the first body element belongs
  /// to the enclosing screen family, so the title contributes no trailing gap.
  static const EdgeInsets screenTitleBlock = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.s0,
    CatchSpacing.s5,
    CatchSpacing.s0,
  );

  /// Title block for a pinned peer-tab destination. The rail owns its full
  /// interactive height; this is the small visual handoff into that rail.
  static const EdgeInsets primaryRailTitleBlock = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.s0,
    CatchSpacing.s5,
    CatchSpacing.s2,
  );

  /// (1) Title block padding for root screens whose header is a compact
  /// eyebrow/title or title-only row (Home dashboard, Profile-style headers).
  /// Canonical = [pageHeaderCompact].
  static const EdgeInsets screenTitleBlockCompact = pageHeaderCompact;

  /// (3) Horizontal gutters for a pinned search/filter/tab control row when its
  /// vertical rhythm is owned by the control's own height slot (Profile tab
  /// bar, Chats host-filter row). Canonical = [pageHorizontal].
  static const EdgeInsets screenControlRow = pageHorizontal;

  /// (3) Padding for a pinned filter/scope rail that sits flush above the first
  /// content row, owning its top separation but deferring the bottom gap to the
  /// content below (Clubs/Explore filter rail).
  static const EdgeInsets screenControlRail = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.s4,
    CatchSpacing.s5,
    CatchSpacing.s0,
  );

  /// Section header padding above compact horizontal rails or lists.
  static const EdgeInsets sectionHeader = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.micro14,
    CatchSpacing.s5,
    CatchSpacing.s2,
  );

  /// Default padding for multi-step creation/edit forms.
  static const EdgeInsets formStepBody = pageBody;

  /// Page-gutter notices above the three-pane Host form builder.
  static const EdgeInsets formBuilderNotices = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPt,
    CatchSpacing.screenPx,
    CatchSpacing.s2,
  );

  /// Form-step padding with more bottom space for final/action-heavy steps.
  static const EdgeInsets formStepBodyRelaxed = pageBodyRelaxed;

  /// Scroll padding for form steps rendered beneath dockless pinned actions.
  /// The final field can clear the 56-point control row and its breathing room
  /// while ordinary content remains visible behind the action scrim.
  static const EdgeInsets formStepBodyWithBottomActions = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.screenPt,
    CatchSpacing.screenPx,
    CatchSpacing.s16 + CatchSpacing.s8,
  );

  /// Relaxed scroll-end variant for final/action-heavy overlaid form steps.
  static const EdgeInsets formStepBodyRelaxedWithBottomActions =
      EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.screenPt,
        CatchSpacing.screenPx,
        CatchSpacing.s16 + CatchSpacing.s12,
      );

  /// Long-form edit body padding under a top app bar.
  static const EdgeInsets formEditBodyRelaxed = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s4,
    CatchSpacing.screenPx,
    CatchSpacing.s7,
  );

  /// Top offset for titled form sections inside a continuous edit page.
  static const EdgeInsets formSectionTop = EdgeInsets.only(
    top: CatchSpacing.s2,
  );

  /// Top separation between a divided field-section rule and custom content
  /// such as the profile photo grid.
  static const EdgeInsets fieldSectionChildTop = EdgeInsets.only(
    top: CatchSpacing.s3,
  );

  /// Inline error offset below form controls inside step forms.
  static const EdgeInsets formFieldError = EdgeInsets.only(
    top: CatchSpacing.s1,
    left: CatchSpacing.s1,
  );

  /// Bottom-docked form action padding with page gutters and safe-area lift.
  static const EdgeInsets formActionDock = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s3,
    CatchSpacing.screenPx,
    CatchSpacing.micro18,
  );

  /// Bottom action skeleton inset used while the Host club editor is loading.
  static const EdgeInsets hostOrganizerEditorLoadingAction = EdgeInsets.fromLTRB(
    CatchSpacing.s3,
    CatchSpacing.s2,
    CatchSpacing.s3,
    CatchSpacing.s3,
  );

  /// Loading body rhythm for the Host create-event route.
  static const EdgeInsets hostCreateEventLoadingBody = EdgeInsets.fromLTRB(
    CatchSpacing.s4,
    CatchSpacing.s4,
    CatchSpacing.s4,
    CatchSpacing.s6,
  );

  /// Loading footer content above the Host create-event safe-area terminal.
  static const EdgeInsets hostCreateEventLoadingFooter = EdgeInsets.fromLTRB(
    CatchSpacing.s4,
    CatchSpacing.s3,
    CatchSpacing.s4,
    CatchSpacing.s0,
  );

  /// Default content padding inside cards and bordered panels.
  static const EdgeInsets content = EdgeInsets.all(CatchSpacing.s4);

  /// Confirm-dialog card padding from the implementation handoff.
  static const EdgeInsets confirmDialogCard = EdgeInsets.fromLTRB(
    22.0,
    CatchSpacing.s6,
    22.0,
    CatchSpacing.micro18,
  );

  /// Dense content padding for compact summary tiles and small controls.
  static const EdgeInsets contentDense = EdgeInsets.all(CatchSpacing.s3);

  /// Event Success live check-in summary strip content padding.
  static const EdgeInsets eventSuccessLiveSummaryContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s5,
    vertical: CatchSpacing.s4,
  );

  /// Full-bleed Host Control Room stage content padding.
  static const EdgeInsets eventSuccessControlRoomStage = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s6,
    CatchSpacing.screenPx,
    CatchSpacing.s7,
  );

  /// Relaxed content padding for empty states, large cards, and share panels.
  static const EdgeInsets contentRelaxed = EdgeInsets.all(CatchSpacing.s5);

  /// Spacious content padding for hero panels and full-page empty states.
  static const EdgeInsets contentSpacious = EdgeInsets.all(CatchSpacing.s6);

  /// Horizontal content padding when vertical rhythm is supplied separately.
  static const EdgeInsets contentHorizontal = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s4,
  );

  /// Inline horizontal padding for compact chips and segmented items.
  static const EdgeInsets inlineHorizontal = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s2,
  );

  /// Tight inline horizontal padding for tiny rating/star controls.
  static const EdgeInsets inlineHorizontalTight = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s1,
  );

  /// Relaxed inline horizontal padding for pills and message rows.
  static const EdgeInsets inlineHorizontalRelaxed = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
  );

  /// Micro horizontal padding for compact icon labels.
  static const EdgeInsets iconLabelHorizontal = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro6,
  );

  /// Margin between the selected country flag and dial code text.
  static const EdgeInsets countryCodeFlagMargin = EdgeInsets.only(
    right: CatchSpacing.micro6,
  );

  /// Pill horizontal padding for badges and compact chips.
  static const EdgeInsets pillHorizontal = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro14,
  );

  /// Tight vertical padding for small controls and menu rows.
  static const EdgeInsets controlVerticalTight = EdgeInsets.symmetric(
    vertical: CatchSpacing.s1,
  );

  /// Compact vertical padding for date markers and dense labels.
  static const EdgeInsets contentVerticalCompact = EdgeInsets.symmetric(
    vertical: CatchSpacing.s2,
  );

  /// Mid-compact vertical padding for button-like empty-state chips.
  static const EdgeInsets contentVerticalMedium = EdgeInsets.symmetric(
    vertical: CatchSpacing.micro14,
  );

  /// Standard vertical padding for rows and list sections.
  static const EdgeInsets contentVertical = EdgeInsets.symmetric(
    vertical: CatchSpacing.s3,
  );

  /// Large vertical padding for tappable rows.
  static const EdgeInsets tileVertical = EdgeInsets.symmetric(
    vertical: CatchSpacing.s4,
  );

  /// Compact but prominent vertical padding for filter rows and dense tiles.
  static const EdgeInsets tileVerticalCompact = EdgeInsets.symmetric(
    vertical: CatchSpacing.micro18,
  );

  /// Relaxed vertical padding for standalone panel sections.
  static const EdgeInsets contentVerticalRelaxed = EdgeInsets.symmetric(
    vertical: CatchSpacing.s5,
  );

  /// Spacious vertical padding for empty states and loading panels.
  static const EdgeInsets contentVerticalSpacious = EdgeInsets.symmetric(
    vertical: CatchSpacing.s6,
  );

  /// Oversized content padding for standalone empty/error states.
  static const EdgeInsets emptyStateContent = EdgeInsets.all(CatchSpacing.s8);

  /// Compact tile padding for dense detail facts and status rows.
  static const EdgeInsets tileContentCompact = EdgeInsets.all(
    CatchSpacing.micro14,
  );

  /// Standard tile padding for large tappable rows.
  static const EdgeInsets tileContent = EdgeInsets.all(CatchSpacing.micro18);

  /// Icon-chip padding for small square/circular icon marks.
  static const EdgeInsets iconChipContent = EdgeInsets.all(CatchSpacing.s2);

  /// Tight icon-chip padding for nested avatar/status marks.
  static const EdgeInsets iconChipContentTight = EdgeInsets.all(
    CatchSpacing.micro2,
  );

  /// Small info-tile padding where icon and label must stay compact.
  static const EdgeInsets infoTileContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro6,
    vertical: CatchSpacing.s1,
  );

  /// Dense stat/control padding for compact metric chips.
  static const EdgeInsets statChipContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s2,
    vertical: CatchSpacing.s3,
  );

  /// Compact pill/control padding used by status chips and inline actions.
  static const EdgeInsets compactControlContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.s2,
  );

  /// Label pill padding for over-media metadata.
  static const EdgeInsets compactLabelContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.micro6,
  );

  /// Tight role-badge padding over compact image thumbnails.
  static const EdgeInsets mediaRoleBadgeContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro6,
    vertical: CatchSpacing.micro3,
  );

  /// Balanced small-card/control padding.
  static const EdgeInsets controlContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.s3,
  );

  /// Dense list body padding where rows own their own vertical rhythm.
  static const EdgeInsets listBodyDense = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.s4,
  );

  /// Standard list body padding with page-adjacent horizontal gutters.
  static const EdgeInsets listBody = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s4,
    vertical: CatchSpacing.s3,
  );

  /// Ticket-card body inset after the perforated date rail.
  static const EdgeInsets eventTicketBody = EdgeInsets.fromLTRB(
    CatchSpacing.s5,
    CatchSpacing.micro14,
    CatchSpacing.s4,
    CatchSpacing.micro14,
  );

  /// Content block padding with slightly stronger bottom separation.
  static const EdgeInsets contentBlock = EdgeInsets.fromLTRB(
    CatchSpacing.s4,
    CatchSpacing.s3,
    CatchSpacing.s4,
    CatchSpacing.s4,
  );

  /// Chat event context content inside its compact tinted header.
  static const EdgeInsets chatEventContextContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.micro10,
  );

  /// Page-gutter dock inset for the conversation composer.
  static const EdgeInsets chatComposerDock = EdgeInsets.fromLTRB(
    CatchSpacing.screenPx,
    CatchSpacing.s0,
    CatchSpacing.screenPx,
    CatchSpacing.s3,
  );

  /// Date marker spacing between message groups.
  static const EdgeInsets chatDateMarker = EdgeInsets.only(
    top: CatchSpacing.s1,
    bottom: CatchSpacing.s4,
  );

  /// Suvbot action-row hit area inside the transparent action surface.
  static const EdgeInsets suvbotActionRow = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s1,
    vertical: CatchSpacing.s3,
  );

  /// Optical top adjustment for icons aligned with multiline supporting copy.
  static const EdgeInsets inlineIconTopTight = EdgeInsets.only(
    top: CatchSpacing.micro2,
  );

  /// Bottom action dock content for Club Detail.
  static const EdgeInsets organizerDetailDock = EdgeInsets.fromLTRB(
    CatchSpacing.micro18,
    CatchSpacing.micro14,
    CatchSpacing.micro18,
    CatchSpacing.micro18,
  );

  /// Hairline frame inset around compact poster and avatar media.
  static const EdgeInsets mediaFrameContent = EdgeInsets.all(
    CatchSpacing.micro3,
  );

  /// Editorial header content inside the Event Success paper ticket.
  static const EdgeInsets paperTicketHeader = EdgeInsets.fromLTRB(
    CatchSpacing.s4,
    CatchSpacing.s9,
    CatchSpacing.s4,
    CatchSpacing.s4,
  );

  /// Booking-conflict row content around its event glyph and metadata.
  static const EdgeInsets bookingConflictContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro14,
    vertical: CatchSpacing.s3,
  );

  /// Safe-area inset for the floating map overview control.
  static const EdgeInsets eventMapOverviewControl = EdgeInsets.only(
    top: CatchSpacing.s16,
    right: CatchSpacing.s5,
  );

  /// Applied-filter chip rail below the Explore filter controls.
  static const EdgeInsets exploreAppliedFilters = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s5,
    vertical: CatchSpacing.s2,
  );

  /// Repeated section/list item separation owned by the outer item wrapper.
  static const EdgeInsets sectionItemBottomGap = EdgeInsets.only(
    bottom: CatchSpacing.s3,
  );

  /// First Host lifecycle section label at the page-body boundary.
  ///
  /// The page owner already supplies the standard 24 pt body inset, so the
  /// first visible label must not add another leading inset of its own.
  static const EdgeInsets hostEventFirstSectionLabel = EdgeInsets.only(
    bottom: CatchSpacing.micro10,
  );

  /// Host lifecycle section label following content within the page body.
  static const EdgeInsets hostEventSectionLabel = EdgeInsets.only(
    top: CatchSpacing.s1,
    bottom: CatchSpacing.micro10,
  );

  /// Date rail content within a Host event lifecycle row.
  static const EdgeInsets hostEventLifecycleDate = EdgeInsets.fromLTRB(
    CatchSpacing.s3,
    CatchSpacing.s3,
    CatchSpacing.micro14,
    CatchSpacing.s3,
  );

  /// Compact selected-club trigger around the avatar, name, and chevron.
  static const EdgeInsets hostOrganizerSwitcher = EdgeInsets.fromLTRB(
    CatchSpacing.micro6,
    CatchSpacing.micro6,
    CatchSpacing.s3,
    CatchSpacing.micro6,
  );

  /// Popup menu item content in Host Today's club switcher.
  static const EdgeInsets hostOrganizerMenuItem = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro14,
    vertical: CatchLayout.menuRowVerticalPadding,
  );

  /// Horizontal row inset inside the Host organizer switcher sheet.
  static const EdgeInsets hostOrganizerSwitcherList = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s4,
  );

  /// Standard row content for the Host roster board.
  static const EdgeInsets tableRowContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro14,
    vertical: CatchSpacing.micro10,
  );

  /// Column-label header inside the Host roster board.
  static const EdgeInsets tableHeaderContent = EdgeInsets.fromLTRB(
    CatchSpacing.micro14,
    CatchSpacing.s3,
    CatchSpacing.micro14,
    CatchSpacing.micro10,
  );

  /// Empty-row content inside the Host roster board.
  static const EdgeInsets tableEmptyContent = EdgeInsets.fromLTRB(
    CatchSpacing.micro14,
    CatchSpacing.s4,
    CatchSpacing.micro14,
    CatchSpacing.s5,
  );

  /// Top rhythm for Launch Access loading and application bodies.
  static const EdgeInsets launchAccessBodyTop = EdgeInsets.only(
    top: CatchSpacing.s4,
  );

  /// Inner content of one payment history list row.
  static const EdgeInsets paymentHistoryTileContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s1,
    vertical: CatchSpacing.s2,
  );

  /// Compact translucent metric panel on the Catches hub hero.
  static const EdgeInsets catchesHubMetricContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s3,
    vertical: CatchSpacing.micro10,
  );

  /// Floating top chrome shared by loaded and loading Catches swipe screens.
  static const EdgeInsets swipeTopChrome = EdgeInsets.fromLTRB(
    CatchSpacing.s4,
    CatchSpacing.s3,
    CatchSpacing.s4,
    CatchSpacing.s0,
  );

  /// Remaining-count pill in the Catches swipe top chrome.
  static const EdgeInsets swipeRemainingCount = EdgeInsets.symmetric(
    horizontal: CatchSpacing.s4,
    vertical: CatchSpacing.s2,
  );

  /// Top alignment between the Profile tab shell and its bounded content.
  static const EdgeInsets profilePreviewBodyTop = EdgeInsets.only(
    top: CatchSpacing.s2,
  );

  /// Vertical rhythm for one Profile information skeleton row.
  static const EdgeInsets profileInfoSkeletonRow = EdgeInsets.symmetric(
    vertical: CatchSpacing.micro14,
  );

  static EdgeInsets eventDetailFactRow({
    required bool isFirst,
    required bool isLast,
  }) => EdgeInsets.only(
    top: isFirst ? CatchSpacing.s0 : CatchSpacing.s3,
    bottom: isLast ? CatchSpacing.s0 : CatchSpacing.s3,
  );

  static EdgeInsets eventTicketStubCell({required bool divided}) =>
      EdgeInsets.fromLTRB(
        divided ? CatchSpacing.s3 : CatchSpacing.s5,
        CatchSpacing.s2,
        CatchSpacing.s3,
        CatchSpacing.s2,
      );

  static EdgeInsets eventItineraryStep({required bool isLast}) =>
      EdgeInsets.only(bottom: isLast ? CatchSpacing.s0 : CatchSpacing.s3);

  /// Shared content padding for chat and share-card message bubbles.
  static const EdgeInsets chatBubbleContent = EdgeInsets.symmetric(
    horizontal: CatchSpacing.micro14,
    vertical: CatchSpacing.micro10,
  );

  /// Gap after the last message in a sender group.
  static const EdgeInsets chatBubbleGroupEnd = EdgeInsets.only(
    bottom: CatchSpacing.s3,
  );

  /// Tight gap between consecutive messages from the same sender.
  static const EdgeInsets chatBubbleGroupContinue = EdgeInsets.only(
    bottom: CatchSpacing.micro3,
  );

  /// Gap between a media attachment and the caption/timestamp in a bubble.
  static const EdgeInsets chatMediaAttachmentBottom = EdgeInsets.only(
    bottom: CatchSpacing.micro6,
  );

  /// Horizontal gutters for conversation lists. Matches the app-wide page
  /// gutter so Consumer Chats and Host Inbox align with every inset body.
  static const EdgeInsets chatListGutter = EdgeInsets.symmetric(
    horizontal: CatchSpacing.screenPx,
  );

  /// Vertical padding for a single chat conversation row.
  static const EdgeInsets chatListTileVertical = EdgeInsets.symmetric(
    vertical: CatchSpacing.s3,
  );

  /// Bottom gap between compact inline rows in detail screens.
  static const EdgeInsets detailInlineRowBottomGap = EdgeInsets.only(
    bottom: CatchSpacing.micro10,
  );

  /// Top alignment offset for small hint dots beside multiline detail copy.
  static const EdgeInsets detailHintDotTop = EdgeInsets.only(
    top: CatchSpacing.s1,
  );

  /// Safe-area minimum padding for fixed loading CTAs on detail screens.
  static const EdgeInsets detailLoadingCtaSafeArea = EdgeInsets.fromLTRB(
    CatchLayout.detailScreenHorizontalPadding,
    CatchSpacing.s3,
    CatchLayout.detailScreenHorizontalPadding,
    CatchSpacing.s3,
  );

  /// Default content padding inside cards and bordered panels.
  static const EdgeInsets cardContent = content;

  /// Dense card padding for compact summary tiles and small controls.
  static const EdgeInsets cardContentDense = contentDense;
}
