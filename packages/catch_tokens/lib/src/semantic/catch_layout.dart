import 'dart:math' as math;

import 'package:catch_tokens/src/components/catch_field_tokens.dart';
import 'package:catch_tokens/src/primitives/catch_icon.dart';
import 'package:catch_tokens/src/primitives/catch_radius.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';
import 'package:catch_tokens/src/primitives/catch_stroke.dart';
import 'package:flutter/material.dart';

abstract final class CatchLayout {
  /// Center full-bleed page bodies in a width-clamped [ConstrainedBox].
  static const double maxContentWidth = 600;

  /// A leaf remains usable before another navigation ancestor is revealed.
  static const double workspaceDetailMinWidth = 360;

  /// An ancestor editor retains its reading lane when a child is visible.
  static const double workspaceEditorWidth = maxContentWidth;

  static const int roomMapMaxVisiblePositions = 8;
  static const double roomMapPositionExtent = CatchSpacing.s5;
  static const double roomMapUnitWidthFactor = 0.62;
  static const double roomMapUnitHeightFactor = 0.56;
  static const double maxContentWithDockHeight =
      maxContentWidth + CatchSpacing.s16;
  static const double pageBodyHorizontalGutters = CatchSpacing.screenPx * 2;
  static const double screenPageMaxExtent =
      maxContentWidth + pageBodyHorizontalGutters;

  /// Reading lane for the Host Forms directory on capable widths. Forms rows
  /// carry lifecycle, response, and consequence summaries that need more room
  /// than prose while remaining visibly one bounded list.
  static const double hostFormsDirectoryMaxContentWidth = 840;
  static const double hostFormsDirectoryPageMaxExtent =
      hostFormsDirectoryMaxContentWidth + pageBodyHorizontalGutters;

  /// Bounded command workspace for a live Host Event on tablet and desktop.
  /// The stage remains dominant while one supporting operations pane can stay
  /// visible without turning the runtime into a dashboard.
  static const double hostEventLiveWorkspaceMaxContentWidth = 1040;

  /// Supporting operations lane beside the live command stage.
  static const double hostEventLiveSupportingPaneWidth = 360;

  /// Plot height for the compact host demand/bookings trend.
  static const double analyticsTrendHeight = 120;

  /// Confirm-dialog max card width from the implementation handoff.
  static const double confirmDialogMaxWidth = 320.0;

  /// Full-screen confirm-dialog inset from the implementation handoff.
  static const double confirmDialogInset = CatchSpacing.s7;

  /// Shared horizontal gutter for detail screens with sliver-native content.
  static const double detailScreenHorizontalPadding = CatchSpacing.s5;

  /// Available content width inside a detail screen's horizontal gutters.
  static double detailScreenContentWidthFor(double width) =>
      (width - (detailScreenHorizontalPadding * 2))
          .clamp(0.0, double.infinity)
          .toDouble();

  /// First content offset after a detail hero or pinned header.
  static const double detailScreenTopPadding = CatchSpacing.s3;

  /// Standard gap between major sections on detail screens.
  static const double detailScreenSectionGap = CatchSpacing.s6;

  /// Standard gap between related cards/content inside one detail section.
  static const double detailScreenContentGap = CatchSpacing.s4;

  /// Space between a section title and its first row/list item.
  static const double detailScreenSectionTitleBottomGap = CatchSpacing.s4;

  /// Space between a compact title and supporting copy inside one section.
  static const double detailScreenSupportingGap = CatchSpacing.s2;

  /// Space between dense rows inside a single detail card.
  static const double detailScreenInlineRowGap = CatchSpacing.micro10;

  /// Bottom breathing room inside sliver-native detail sections.
  static const double detailScreenBottomPadding = CatchSpacing.s6;

  /// Vertical gap between agenda cards that belong to the same day.
  static const double agendaItemGap = CatchSpacing.micro10;

  /// Vertical gap between different agenda day groups.
  static const double agendaGroupGap = CatchSpacing.s6;

  /// Gap between an agenda day label and the first event card.
  static const double agendaDayLabelBottomGap = CatchSpacing.s2;

  /// Default top and bottom insets for standalone agenda lists.
  static const double agendaListTopPadding = CatchSpacing.s1;
  static const double agendaListBottomPadding = detailScreenBottomPadding;

  /// Shared inset for club interaction media on list tiles and detail headers.
  static const double clubInteractionMediaInset = CatchSpacing.s3;
  static const EdgeInsets clubInteractionMediaPadding = EdgeInsets.all(
    clubInteractionMediaInset,
  );

  /// Club detail hero media and caption sizing.
  static const double clubDetailHeroCoverHeightRatio = 0.61;
  static const double clubDetailHeroNoCoverPhoneHeight = 220.0;
  static const double clubDetailHeroNoCoverWideHeight = 164.0;
  static const double clubDetailHeroCoverWideMinHeight = 164.0;
  static const double clubDetailHeroCoverWideMaxHeight = 260.0;
  static const double clubDetailHeroTitleTopPadding = CatchSpacing.s3;
  static const double clubDetailHeroTitleBottomPadding = CatchSpacing.s3;
  static const double clubDetailHeroTitleLocationGap = CatchSpacing.s2;
  static const double clubDetailHeroExpandedTitleSize = 34.0;
  static const double clubDetailHeroExpandedTitleLineHeight = 0.96;
  static const double clubDetailHeroCollapsedTitleSize = 28.0;
  static const double clubDetailHeroCollapsedTitleLineHeight = 0.96;
  static const double clubDetailHeroLocationLineExtent = 24.0;
  static const double clubDetailHeroCaptionSlack = CatchSpacing.s1;
  static const double clubDetailHeroCaptionExtent =
      clubDetailHeroTitleTopPadding +
      (clubDetailHeroExpandedTitleSize *
          clubDetailHeroExpandedTitleLineHeight *
          2) +
      clubDetailHeroTitleLocationGap +
      clubDetailHeroLocationLineExtent +
      clubDetailHeroTitleBottomPadding +
      clubDetailHeroCaptionSlack;
  static const double clubDetailHeroLoadingExtent =
      clubDetailHeroNoCoverPhoneHeight + clubDetailHeroCaptionExtent;
  static double clubDetailHeroLocationTextWidthFor(double captionWidth) =>
      (captionWidth - CatchIcon.md - CatchSpacing.micro6)
          .clamp(0.0, double.infinity)
          .toDouble();

  /// Event detail hero sizing for standard photo/activity headers.
  static const double eventDetailHeroStandardHeightRatio = 0.58;
  static const double eventDetailHeroStandardMinHeight = 220.0;
  static const double eventDetailHeroStandardMaxHeight = 252.0;
  static const double eventDetailHeroStandardWideHeight = 220.0;
  static const double eventDetailHeroTitleBottomInset = CatchSpacing.s5;

  /// Event detail hero sizing for ticket and spotlight presentations.
  static const double eventDetailHeroTicketPhoneHeight = 380.0;
  static const double eventDetailHeroTicketWideHeight = 360.0;
  static const double ticketHeroCompactHeightThreshold = 360.0;
  static const double ticketHeroVisualCompactRatio = 0.48;
  static const double ticketHeroVisualExpandedRatio = 0.62;
  static const double ticketHeroVisualMinHeight = 96.0;
  static const double ticketHeroVisualMaxHeight = 290.0;
  static const double eventDetailTicketTitleCompactSize = 30.0;
  static const double eventDetailTicketTitleExpandedSize = 42.0;
  static const double eventDetailTicketTitleLineHeight = 0.92;
  // Standard (photo) hero title — condensed poster cut, design-system EventHero.
  static const double eventDetailHeroStandardTitleSize = 32.0;

  static const double catchesProfileBottomPadding = 112.0;
  static const double catchesHubBackgroundIconSize = 156.0;
  static const double catchesHubBackgroundIconRightOffset = -34.0;
  static const double catchesHubBackgroundIconTopOffset = -42.0;
  static const double celebrationViewportVerticalPadding =
      CatchSpacing.s4 + CatchSpacing.s5;
  static const double celebrationPaperTopPadding =
      CatchSpacing.s12 + CatchSpacing.s6;
  static const double celebrationPaperBottomPadding = CatchSpacing.s6;
  static const double celebrationPaperViewportVerticalPadding =
      celebrationPaperTopPadding + celebrationPaperBottomPadding;
  static const double celebrationPaperDetailRowVerticalPadding =
      CatchSpacing.micro14;
  static const double celebrationPaperActionTopGap = CatchSpacing.s6;
  static const double celebrationDetailLabelWidth = 78.0;
  static const double bottomActionScrimHeight = 128.0;
  static const double floatingControlExtent = 48.0;
  static const double selectionBadgeRadius = 14.0;
  static const double badgeMdVerticalPadding =
      CatchSpacing.micro6 + CatchStroke.hairline;
  static const double badgeMdDotExtent =
      CatchSpacing.micro6 + CatchStroke.hairline;
  static const double badgeActionHeight = 33.0;
  static const double badgeActionIconSize = 15.0;
  static const double activityAvatarDefaultSize = 40.0;
  static const double activityAvatarInitialsScale = 0.32;
  static const double personAvatarInitialsScale = 0.34;
  static const double avatarCountFontScale = 0.30;
  static const double avatarVeilGlyphScale = 0.38;
  static const double avatarObscuringBlurSigma = 3.5;
  static const double avatarObscuringScale = 1.16;
  // A label rectangle stays inside the circular frame, including its corners.
  static const double avatarLabelContentScale = 0.7;
  static const double activityAvatarGradientRotationDegrees = 150.0;
  static const double activityAvatarRingSpread = 2.0;
  static const double activityAvatarTextureStrokeWidth = 2.0;
  static const double activityAvatarTextureStride = 13.0;
  static const double activityMapPinRestingSize = 26.0;
  static const double activityMapPinSelectedSize = 38.0;
  static const double activityMapPinFlagMaxWidth = 180.0;
  static const BoxConstraints activityMapPinSlotConstraints =
      BoxConstraints.tightFor(width: activityMapPinFlagMaxWidth);
  static const double activityMapPinNativeCanvasPadding = 4.0;
  static const double activityMapPinShadowBlur = 3.0;
  static const double activityMapPinShadowDy = 2.0;
  static const double eventMapLoadingPinExtent =
      CatchSpacing.s12 + CatchSpacing.s4;
  static const double eventMapLoadingLabelWidth = CatchSpacing.s16 * 2;
  static const double distanceRingDefaultSize = 170.0;
  static const double distanceRingStrokeWidth = 1.2;
  static const double distanceRingLabelOverhang = 10.0;
  static const double distanceRingLabelHorizontal = 9.0;
  static const double distanceRingLabelFontSize = 8.5;
  static const double activityArtDefaultHeight = 180.0;
  static const double activityArtDefaultRadius = 22.0;
  static const double activityArtTextureStrokeWidth = 2.0;
  static const double activityArtTextureStride = 16.0;
  static const double activityArtGlyphRight = -18.0;
  static const double activityArtGlyphBottom = -24.0;
  static const double activityArtGlyphScale = 0.95;
  static const double statStripVerticalPadding = 13.0;
  static const double statStripLabelFontSize = 9.0;
  static const double fieldRowVerticalPadding =
      CatchFieldTokens.rowVerticalPadding;
  static const double fieldRowTextLaneInset = CatchFieldTokens.textLaneInset;
  static const double fieldRowDividerIconInset = fieldRowTextLaneInset;
  static const double fieldTrailingValueMaxWidth =
      CatchFieldTokens.trailingValueMaxWidth;
  static const double searchFieldIconSize = 15.0;
  static const double searchFieldIconGap = 10.0;
  static const double searchFieldClearSize = 32.0;
  static const double searchFieldClearIconSize = 16.0;
  static const double toggleTrackWidth = 46.0;
  static const double toggleTrackHeight = 28.0;
  static const double toggleKnobExtent = 22.0;
  static const double toggleTrackPadding = CatchSpacing.micro3;
  static const double menuRowMinHeight = 56.0;
  static const double menuRowVerticalPadding = 10.0;
  static const double menuRowGap = 12.0;
  static const double menuRowIconSize = 20.0;
  static const double menuRowCheckSize = 16.0;
  static const double menuViewportInset = CatchSpacing.s4;
  static const double activityChipIconSize = 15.0;
  static const double activityChipIconGap = 7.0;
  static const double buttonLgHeight = CatchSpacing.s12 + CatchSpacing.s2;
  static const double bottomActionHorizontalPadding = CatchSpacing.screenPx;
  static const double bottomActionMinimumBottomPadding = CatchSpacing.micro18;
  static const double bottomActionBlurSigma = 10.0;
  static const double controlCompactMinHeight =
      CatchSpacing.s12 + CatchSpacing.s1;
  static const double controlMdMinHeight = CatchSpacing.s12 + CatchSpacing.s2;
  static const double noticeTitleMessageGap = CatchSpacing.micro2;
  static const double personUnreadBadgeHorizontalPadding =
      CatchSpacing.micro6 + CatchStroke.hairline;
  static const double countBadgeMinExtent = 17.0;
  static const double countBadgeHorizontalPadding = CatchSpacing.s1;
  static const double countBadgeVerticalPadding = CatchStroke.hairline;
  static const double countBadgeBorderWidth = CatchStroke.underline;

  static double countBadgeWidth(double textWidth) {
    final padded = textWidth + countBadgeHorizontalPadding * 2;
    return (padded < countBadgeMinExtent ? countBadgeMinExtent : padded) +
        countBadgeBorderWidth * 2;
  }

  static const double countPillIconSize = CatchIcon.sm + CatchSpacing.micro2;
  static const double countPillMinExtent = CatchSpacing.s11;
  static const double countPillLabelVerticalPadding =
      CatchSpacing.micro10 + CatchStroke.hairline;
  static const double settingsRowVerticalPadding =
      CatchSpacing.s3 + CatchStroke.hairline;
  static const double settingsRowDividerIconInset = fieldRowTextLaneInset;
  static const double settingsRowChevronIconSize = CatchIcon.xs;
  static const double clubProfileImagePickerExtent = 120.0;
  static const double clubCoverThumbnailExtent = 64.0;
  static const double posterRadius = CatchSpacing.micro6;
  static const double posterMediaRadius = CatchSpacing.micro3;
  static const double posterMinimalMediaHeight = 104.0;
  static const double personPolaroidRadius = CatchSpacing.micro6;
  static const double personPolaroidMediaRadius = CatchSpacing.micro3;
  static const double clubCoverCompactMediaRadius = CatchRadius.md;
  static const double eventTypeTileMaxWidth = 340.0;
  static const double eventTypeTileSingleColumnHeight = 88.0;
  static const double eventTypeTileTwoColumnHeight = 72.0;
  static const double eventTypeIndexRowHeight = 66.0;
  static const double eventTypeIndexDotSize = 12.0;
  static const double eventTypeBrowseBottomPadding = 84.0;
  static const double eventTypeColorCueTopOffset = -30.0;
  static const double eventTypeDisplaySize = 26.0;
  static const double eventTypeColorCueActiveExtent = 102.0;
  static const double eventTypeColorCueInactiveExtent = 92.0;
  static const double eventTypeSkeletonTextWidth = 172.0;
  static const double eventTypeSkeletonCardHeight = 120.0;
  static const double photoSlotDeleteExtent = CatchSpacing.s7;
  static const double photoSlotDeleteControlInset = 34.0;
  static const double hostMediaThumbnailExtent = 88;
  static const double hostMediaManagerCoverWidth = 128;
  static const double hostMediaInheritedLogoExtent = 52;
  static const double hostMediaCoverMaxWidth = 540;
  static const double hostMediaWideGridBreakpoint = 720;
  static const double reactionControlExtent = CatchSpacing.s11;
  static const double reactionControlIconSize = 21.0;
  static const double profileFallbackArtworkIconSize = 160.0;
  static const double profileFactLabelGutter = 116.0;
  static const double profileReactionPassExtent = 56.0;
  static const double profileCardOverlayTrailingInset = 92.0;
  static const double profileInlineMinimumUnderlineWidth = 28.0;
  static const double passButtonExtent = CatchSpacing.s16;
  static const double clubMemberSealCompactExtent = CatchSpacing.s16;
  static const double clubMemberSealExtent = 70.0;
  static const double countryCodeSelectorWidth = 136.0;
  static const double activityLoadingIndicatorExtent = CatchIcon.md;
  static const double analyticsMetricPreviewWidth = 220.0;
  static const double rosterFilterTileMinHeight = 56.0;
  // Shared roster board (design-system components/hosting/RosterBoard).
  static const double rosterRowAvatarExtent = 32.0;
  static const double rosterDecideTargetExtent = 32.0;
  static const double rosterHeaderIdentityInset = 42.0;
  static const double chatListAvatarExtent = CatchSpacing.s11;
  static const double chatListTextGap = CatchSpacing.s3;
  static const double chatInputInnerPadding =
      CatchSpacing.s2 - CatchStroke.emphasis;

  /// Left inset for the chat-row hairline divider so it starts past the avatar
  /// and aligns with the text column. Kept in terms of the avatar extent + the
  /// avatar→text gap so the divider can't drift from the row layout.
  static const double chatListDividerInset =
      chatListAvatarExtent + chatListTextGap;
  static const double hostInboxHeaderHeight = CatchSpacing.s12;
  static const double hostInboxScopeSelectorHeight = CatchSpacing.s8;
  static const double browseHeaderHeight = 88.0;
  static const double browseHeaderContentHeight = 60.0;
  static const double browseHeaderSearchExtent = 52.0;
  static const double horizontalRailHeight = 92.0;
  static const double horizontalRailDividerHeight = CatchSpacing.s6;
  static const int actionMenuMaxItems = 5;
  static const double actionMenuWidth = 280.0;
  static const double actionMenuContentWidth =
      actionMenuWidth - CatchSpacing.s16;
  static const double selectionMenuWidth = 360.0;

  static double menuWidthFor({
    required double preferredWidth,
    required double viewportWidth,
  }) => math.min(
    preferredWidth,
    math.max(0, viewportWidth - (menuViewportInset * 2)),
  );

  static double menuMaxHeightFor(double viewportHeight) {
    final totalInset = menuViewportInset * 2;
    return viewportHeight > totalInset
        ? viewportHeight - totalInset
        : double.infinity;
  }

  static double menuOverlayChildMaxHeightFor({
    required double viewportHeight,
    required double verticalSafePadding,
    required double overlayBottomClearance,
  }) {
    final totalInset = menuViewportInset * 2;
    return math.max(
      0,
      viewportHeight -
          verticalSafePadding -
          overlayBottomClearance -
          totalInset,
    );
  }

  static double actionMenuAlignmentXFor(double menuWidth) =>
      -(menuWidth - iconButtonSize);
  static const double avatarStatusDotExtent = 9.0;
  static const double eventHeroBackdropIconSize = 220.0;
  static const double eventCardBackdropIconSize =
      CatchSpacing.s16 * 2 + CatchSpacing.s12 + CatchSpacing.s1;
  static const double eventThumbnailBackdropIconSize =
      CatchSpacing.s16 * 2 + CatchSpacing.s4;
  static const double eventActivityGlyphExtent =
      CatchSpacing.s12 + CatchSpacing.s2;
  static const double eventActivityGlyphIconSize =
      CatchIcon.lg + CatchSpacing.micro2;
  static const double eventHeroBadgeExtent = 56.0;
  static const double eventHeroBadgeRadius = eventHeroBadgeExtent / 2;
  static const double eventHeroBadgeIconSize = 26.0;
  static const double eventDetailTicketStubBandHeight = 72.0;
  static const double eventDetailHintDotExtent = 7.0;
  static const double eventDetailHintDotTopInset = 7.0;
  static const double eventDetailMapCardHeight = 126.0;
  static const double eventDetailPhotoStripTileHeight = 108.0;
  static const double eventDetailHairlineDividerHeight = 25.0;
  static const double eventDetailItineraryTimeColumnWidth = 50.0;
  static const double eventDetailItineraryRailColumnWidth = 20.0;
  static const double eventDetailItineraryDotExtent = 9.0;
  static const double eventDetailItineraryDotTopInset = 3.0;
  static const double eventDetailItineraryRailVerticalInset = 2.0;
  // JourneySteps (design-system components/events/JourneySteps) — numbered
  // node-rail sequence shared by the first-run dashboard and onboarding.
  static const double dashboardEmptyHeroHeight = 370.0;
  static const double dashboardQuickActionSkeletonHeight = 76.0;
  static const double dashboardRecommendedEventSkeletonHeight = 112.0;
  static const double journeyStepsIndexColumnWidth = 30.0;
  static const double journeyStepsRailColumnWidth = 20.0;
  static const double journeyStepsNodeExtent = 11.0;
  // CoverStory (design-system components/explore/CoverStory).
  static const double exploreDiscoveryCoverHeight = 316.0;
  static const double coverStoryGhostGlyphSize = 210.0;
  static const double coverStorySearchExtent = iconButtonNavSize;
  static const double coverStoryGhostRightInset = 34.0;
  static const double coverStoryGhostBottomInset = 14.0;
  static const double coverStoryContentMaxWidth = 320.0;
  static const Alignment coverStoryGlowCenter = Alignment(0.7, 1.2);
  static const double coverStoryGlowRadius = 1.2;
  static const List<double> coverStoryGlowStops = [0.0, 0.6];
  static const List<double> coverStoryContrastStops = [0.0, 0.78, 1.0];
  static const double coverStoryScrimStride = 18.0;
  // "Your hosts" HostCard (design-system components/events/HostCard).
  static const double eventDetailHostAvatarExtent = 46.0;
  static const double eventDetailHostSealSize = 15.0;
  static const double eventDetailHostNameSize = 16.0;
  static const double eventDetailHostStatValueSize = 17.0;
  static const double eventDetailHostStatLabelSize = 9.0;
  static const double eventDetailConflictMedallionExtent = 52.0;
  static const double eventDetailConflictEventGlyphExtent = 38.0;
  static const double paymentCheckoutBackdropHeight = 230.0;
  static const double paymentCheckoutMedallionExtent = 52.0;
  static const double eventSuccessStageNavExtent = CatchSpacing.s12;
  static const double eventSuccessStageGlyphExtent = 88.0;
  static const double eventSuccessStageGlyphIconSize = CatchSpacing.s10;
  static const double eventSuccessArrivalRingExtent = 140.0;
  static const double eventSuccessVenueQrExtent = 168.0;
  static const double eventSuccessVenueQrErrorMaxWidth = 320.0;
  static const double eventSuccessCountdownDialWidthFactor = 0.68;
  static const double eventSuccessCountdownDialMinExtent = 168.0;
  static const double eventSuccessCountdownDialMaxExtent = 228.0;
  static const double eventSuccessCountdownNumberWidthFactor = 0.55;
  static const double eventSuccessCountdownNumberReferenceSize = 100.0;
  static const Alignment eventSuccessCountdownCaptionAlignment = Alignment(
    0,
    0.62,
  );
  static const double eventSuccessArrivalRingInnerPadding = CatchSpacing.micro6;
  static const double eventSuccessBouncyGlowBlur = 22.0;
  static const double eventSuccessPaperBarcodeWidth = 92.0;
  static const double eventSuccessPaperBarcodeHeight = 34.0;
  static const double frameworkErrorMaxWidth = 460.0;
  static const double errorIconExtent = CatchSpacing.s16;
  static const double errorIconSize = 30.0;
  static const double iconButtonSize = CatchSpacing.s11;
  static const double iconButtonNavSize = CatchSpacing.s11;
  static const double iconButtonGlyphScale = 0.44;
  static const double iosPickerHeight = 216.0;
  static const double iosPickerToolbarHeight = 52.0;
  static const double iosPickerTitleSidePadding = 96.0;
  static const double menuItemHeightCompact = CatchSpacing.s11;
  static const double menuItemHeight = CatchSpacing.s12;
  static const double noticeMaxWidth = 520.0;
  static const double noticeIconExtent = CatchSpacing.s9;

  /// Available strip width (after page gutters) needed for inline actions.
  static const double statusStripInlineMinWidth = 320;
  static const double otpDigitHeight = CatchSpacing.s16;
  static const double otpDigitGap = CatchSpacing.micro10;
  static const double otpCaretWidth = 2.0;
  static const double otpCaretHeight = CatchSpacing.s6;
  static const double pageDotSelectedWidth = 22.0;
  static const double pageDotExtent = CatchSpacing.micro6;
  static const double sheetGrabberWidth = CatchSpacing.s10;
  static const double sheetGrabberWideWidth = CatchSpacing.s12;
  static const double sheetGrabberHeight = CatchSpacing.s1;
  static const double sheetHairlineGrabberHeight = CatchStroke.hairline * 3;
  static const double sheetGrabberTallHeight = 5.0;
  static const double sheetTopPadding = CatchSpacing.micro10;
  static const double sheetHorizontalPadding = 22.0;
  static const double sheetBottomPadding = 26.0;

  /// Visual breathing room retained above any physical or keyboard obstruction.
  static const double sheetBottomSafeAreaGap = CatchSpacing.s4;
  static const double sheetTopRadius = 26.0;
  static const double sheetBottomRadius = 30.0;
  static const double sheetGrabberBottomMargin = CatchSpacing.s4;
  static const double sheetHeaderBodyGap = CatchSpacing.micro18;
  static const double sheetHeaderGap = CatchSpacing.s3;
  static const double sheetGlyphTileSize = CatchSpacing.s11;
  static const double sheetGlyphTileRadius = CatchSpacing.s3;
  static const double sheetGlyphIconSize = 22.0;
  static const double sheetMaxHeightFraction = 0.56;
  static const double sheetViewportMaxHeightFraction = 0.9;
  static const double skeletonCardHeight = 120.0;
  static const double skeletonCardCompactHeight = 96.0;
  static const double skeletonTextHeight = CatchIcon.sm;
  static const double skeletonCircleExtent = CatchSpacing.s12;
  static const double avatarRowExtent = 42.0;
  static const double skeletonAvatarCompactExtent = avatarRowExtent;
  static const double avatarIdentityExtent = 64.0;
  static const double skeletonMediaTileExtent = 52.0;
  static const double skeletonTextMicroWidth = 22.0;
  static const double skeletonTextTinyWidth = CatchSpacing.s3;
  static const double skeletonTextDateWidth = 30.0;
  static const double skeletonTextTimeWidth = 42.0;
  static const double skeletonTextValueWidth = CatchSpacing.s12;
  static const double skeletonTextChipWidth = 54.0;
  static const double skeletonTextStatusWidth = 72.0;
  static const double skeletonTextActionWidth = 76.0;
  static const double skeletonTextMetaLabelWidth = 78.0;
  static const double skeletonTextEyebrowWidth = 86.0;
  static const double skeletonTextLabelWidth = 92.0;
  static const double skeletonTextCompactWidth = 104.0;
  static const double skeletonTextBodyWidth = 112.0;
  static const double skeletonTextPillWidth = 118.0;
  static const double skeletonTextSecondaryWidth = 126.0;
  static const double skeletonTextTertiaryWidth = 128.0;
  static const double skeletonTextRowWidth = 130.0;
  static const double skeletonTextSectionWidth = 136.0;
  static const double skeletonTextBodyWideWidth = 138.0;
  static const double skeletonTextSectionWideWidth = 146.0;
  static const double skeletonTextInlineTitleWidth = 148.0;
  static const double skeletonTextWideWidth = 150.0;
  static const double skeletonTextDetailWidth = 154.0;
  static const double skeletonTextDetailWideWidth = 156.0;
  static const double skeletonTextActionLabelWidth = 168.0;
  static const double skeletonTextHeadlineWidth = 178.0;
  static const double skeletonTextCardTitleWidth = 180.0;
  static const double skeletonTextBodyLongWidth = 188.0;
  static const double skeletonTextLongWidth = 190.0;
  static const double skeletonTextFeatureWidth = 216.0;
  static const double skeletonTextHeroWidth = 220.0;
  static const double skeletonTextHeroWideWidth = 230.0;
  static const double skeletonTextPageTitleWidth = 232.0;
  static const double skeletonTextBannerWidth = 240.0;
  static const double skeletonTextDescriptionWidth = CatchSpacing.s16 * 3;
  static const double skeletonChipNarrowWidth =
      CatchSpacing.s16 + CatchSpacing.s4;
  static const double skeletonChipMediumWidth =
      CatchSpacing.s16 + CatchSpacing.s6;
  static const double skeletonChipWideWidth =
      CatchSpacing.s16 + CatchSpacing.s10;
  static const double skeletonStatusPillWidth = 82.0;
  static const double stepHeaderTopBarHeight = 80.0;
  static const double stepHeaderCounterTopPadding = CatchSpacing.s2;
  static const double stepHeaderProgressHeight = 2.0;
  static const double statusBarTopPadding = CatchSpacing.micro14;
  static const double statusBarHorizontalPadding = CatchSpacing.s7;
  static const double statusBarBottomPadding = CatchSpacing.micro6;
  static const double statusBarIconSize = 14.0;
  static const double statusBarIconGap = CatchSpacing.micro6;
  static const double tabBarExtent = 64.0;
  static const double tabBarBlurSigma = 10.0;
  static const double tabBarHorizontalPadding = CatchSpacing.s3;
  static const double tabBarFloatingContentHorizontalPadding = CatchSpacing.s3;
  static const double tabBarFloatingHorizontalInset = CatchSpacing.s4;
  static const double tabBarFloatingBottomInset = CatchSpacing.s3;
  static const double tabBarCompactItemExtent = 48.0;
  static const double tabBarMinimumTapExtent = tabBarCompactItemExtent;
  static const double tabBarMinimumSelectedExtent = 88.0;
  static const double tabBarIndicatorExtent = 48.0;
  // The icon box owns a small amount of transparent badge clearance. These
  // asymmetric geometric insets produce equal optical pill padding.
  static const double tabBarPillLeadingPadding = CatchSpacing.s2;
  static const double tabBarPillTrailingPadding = CatchSpacing.s3;
  static const double tabBarLabelGap = CatchSpacing.micro6;
  static const double tabBarIconBoxExtent = 30.0;
  static const double tabBarIconSize = 22.0;
  static const double tabBarDragHysteresis = CatchSpacing.s2;
  static const double tabBarDragCancelSlop = CatchSpacing.s6;
  static const double tabBarDragBottomLimit =
      tabBarExtent + tabBarDragCancelSlop;
  static const double tabBarCompactItemHorizontalPadding =
      (tabBarCompactItemExtent - tabBarIconBoxExtent) / 2;
  static const double appShellNavigationIdentityExtent = CatchSpacing.s7;
  static const double appShellRailWidth = 96.0;
  static const double appShellLargeTextRailWidth = 168.0;
  static const double appShellSidebarWidth = 240.0;
  static const double workspaceDirectoryWidth = 360.0;

  static const double hostMessagingSendsMaxContentWidth = 840.0;
  static const double hostMessagingSendsPageMaxExtent =
      hostMessagingSendsMaxContentWidth + pageBodyHorizontalGutters;
  static const double hostCreateEventStepRailWidth = 240.0;
  static const double hostCreateEventConsequencePaneWidth = 320.0;
  static const double hostCreateEventFormLaneMaxWidth = 680.0;
  static const double appShellRailItemMinHeight = 64.0;
  static const double appShellSidebarItemMinHeight = 48.0;
  static const double tabRailHeight = 44.0;

  /// Leading glyph plus its readable separation inside an option label.
  static double get optionGroupIconSlotExtent => CatchIcon.sm + CatchSpacing.s2;
  static const double topBarHeight = 56.0;
  static const double topBarLargeHeight = 104.0;
  static const double topBarLargeTextActionReserve =
      topBarHeight + CatchSpacing.s2;
  static const double hostEventManageTopBarHeight =
      topBarLargeHeight + CatchSpacing.s4;
  static const double hostRosterDrawerMaxWidth = 440.0;
  static const double hostRosterDrawerHandleWidth = 48.0;
  static const double hostRosterDrawerHandleHeight = 88.0;
  static const double topBarTabHeight = CatchSpacing.s12;
  static const double topBarCollapsedFadeExtent = 72.0;
  static const double topBarCompactSearchBottomHeight = 68.0;
  static const double topBarTrailingMaxRatio = 0.58;
  static const double exploreSheetPeekSize = 0.11;
  static const double exploreSheetMapSize = 0.70;
  static const double exploreSheetFullSize = 1.0;

  static double tabBarReservedBottomInset(double bottomSafeArea) =>
      tabBarExtent + tabBarFloatingBottomInset + bottomSafeArea;

  static double tabBarFloatingHorizontalInsetFor(double textScale) =>
      textScale >= 1.6 ? 0 : tabBarFloatingHorizontalInset;

  static double tabBarContentHorizontalPaddingFor(double textScale) =>
      textScale >= 1.6
      ? CatchSpacing.s1
      : tabBarFloatingContentHorizontalPadding;

  static double tabBarSelectedExtentFor({
    required double availableWidth,
    required int itemCount,
    required double labelWidth,
  }) {
    if (itemCount <= 1) return availableWidth;
    final desired =
        tabBarPillLeadingPadding +
        tabBarIconBoxExtent +
        tabBarLabelGap +
        labelWidth +
        tabBarPillTrailingPadding;
    final maximum = availableWidth - (tabBarMinimumTapExtent * (itemCount - 1));
    return desired
        .clamp(
          tabBarMinimumSelectedExtent,
          maximum < tabBarMinimumSelectedExtent
              ? tabBarMinimumSelectedExtent
              : maximum,
        )
        .toDouble();
  }

  static double hostRosterDrawerWidthFor(double viewportWidth) =>
      (viewportWidth - hostRosterDrawerHandleWidth)
          .clamp(0.0, hostRosterDrawerMaxWidth)
          .toDouble();

  static double hostRosterDrawerHandleTopFor(double viewportHeight) =>
      ((viewportHeight - hostRosterDrawerHandleHeight) / 2)
          .clamp(CatchSpacing.s6, double.infinity)
          .toDouble();

  static double distanceRingAvailableDiameterFor(Size viewport) {
    final shortestSide = viewport.width < viewport.height
        ? viewport.width
        : viewport.height;
    return shortestSide * 0.9;
  }

  static double activityMapPinAnchorOffset(bool selected) => selected
      ? activityMapPinSelectedSize + CatchSpacing.s5
      : activityMapPinRestingSize / 2;
  static const double exploreSheetRevealOvershootSize = 0.655;
  static const double exploreHeaderContentHeight = 60.0;
  static const double exploreFilterRailHeight = 66.0;
  static const double exploreErrorSliverHeight = 180.0;
  static const double exploreEventsSkeletonHeight = 160.0;
  static const double exploreTicketRailCardWidth = 336.0;
  // Tracks the card's 16:10 media (width*10/16) + the ticket stub/divider budget,
  // so rail height follows card width and can't drift. (A prior fixed 352 assumed
  // a 136px media and overflowed once the media became aspect-ratio-driven via
  // LayoutBuilder; 216 = divider + the 2-line stub headroom the old rail reserved.)
  static const double exploreTicketRailHeight =
      exploreTicketRailCardWidth * 10 / 16 + 216.0;
  static const double eventRecapGridGap = 10.0;
  static const double eventRecapStatInset = 10.0;
  static const double eventActivityStampExtent = 42.0;
  static const double eventActivityStampIconSize = 22.0;
  static const double eventCompactDatePillWidth = 52.0;
  static const double eventCompactDatePillHeight = 58.0;
  static const double eventDateRailWidth = 66.0;
  static const double eventDateRailGlyphSize = 50.0;
  static const double eventTicketDecisionInlineMinWidth = 220.0;
  static const double clubAvatarRailColumnWidth = 76.0;
  static const double clubDirectorySkeletonTitleWidth = 180.0;
  static const double clubDirectorySkeletonSubtitleWidth = 132.0;
  static const double clubDirectorySkeletonShortChipWidth = 72.0;
  static const double clubDirectorySkeletonLongChipWidth = 96.0;
  static const double clubDirectorySkeletonFooterWidth = 140.0;
  static const double clubDirectorySkeletonActionWidth = 70.0;
  static const double clubEditorPhotoSkeletonHeight = 132.0;
  static const double recommendationRailGap = 10.0;
  static const double recommendationRailItemWidthFraction = 0.78;
  static const double recommendationRailItemMinWidth = 280.0;
  static const double recommendationRailItemMaxWidth = 340.0;
  static const double heroSignalChipHorizontalPadding = 11.0;
  static const double heroSignalChipVerticalPadding = 7.0;
  static const double compactDarkPillHorizontalPadding = 11.0;
  static const double compactDarkPillVerticalPadding = 7.0;
  static const double calendarHeaderTitleFontSize = 26.0;
  static const double calendarHeaderTitleLineHeight = 1.12;
  static const double calendarHeaderTitleMinHeight = 36.0;
  static const double calendarWeekdayFontSize = 13.0;
  static const double calendarWeekdayLineHeight = 1.45;
  static const double calendarDateFontSize = 13.0;
  static const double calendarDateLineHeight = 1.30;
  static const double calendarWeekStripBottomInset = 4.0;
  static const double calendarWeekStripVerticalInsetTotal = 16.0;
  static const double calendarMonthWeekdayFontSize = 11.0;
  static const double calendarMonthWeekdayLineHeight = 1.30;
  static const double calendarMonthGridHeight = 240.0;
  static const double calendarMonthGridGapTotal = 30.0;
  static const double calendarHeaderSkeletonToggleWidth = 80.0;
  static const double eventInfoTileExtent = 44.0;
  static const double strideChartHeight = 84.0;
  static const double calendarStatDividerHeight = 44.0;
  static const double calendarStatDividerHorizontalMargin = 10.0;
  static const double calendarEmptyIconSize = 44.0;
  static const double emptyHeroArtOffset = -40.0;
  static const double emptyHeroArtSize = 200.0;
  static const List<double> emptyHeroCircleRadii = <double>[40.0, 60.0, 80.0];
  static const double appShellCupertinoNavHeight = 50.0;
  static const double appShellNavigationBadgeWidth = 38.0;
  static const double appShellNavigationBadgeHeight = 30.0;
  static const double organizerSwitcherAvatarExtent = CatchSpacing.s10;
  static const double eventSuccessResetButtonMinWidth = 40.0;
  static const double eventSuccessResetButtonMinHeight = 32.0;
  static const double hostPayoutSetupButtonWidth = 120.0;
  static const double hostOrganizerMetricRowHeight = 78.0;
  static const double hostOrganizerTeamDividerInset = 54.0;
  static const double hostOrganizerTrendChartHeight = 76.0;
  static const double hostPaymentActionSkeletonHeight = 44.0;
  static const double hostChartSkeletonHeight = 132.0;
  static const double hostCreateEventRouteFormSkeletonHeight = 192.0;
  static const double afterglowBeatSlideOffset = 14.0;
  static const double suvbotCircleActionExtent = 34.0;
  static const double suvbotLoadingControlsHeight = 84.0;
  static const double profileHeightStepButtonExtent = 36.0;
  static const double profileSignalChipHorizontalPadding = 10.0;
  static const double profileSignalChipVerticalPadding = 7.0;
  static const double manualQaEditorHeight = 780.0;
  static const double clubAvatarRailHeight = 108.0;
  static const double clubCreateButtonExtent = 64.0;
  static const double attendedEventTileArtExtent = 58.0;
  static const double chatBubbleMaxWidthFraction = 0.78;
  static const double chatBubbleMaxWidth = 520.0;
  static const double chatShareCardWidth = 360.0;
  static const double chatShareCardAspectRatio = 4 / 5;
  static const double chatShareCardPixelRatio = 3.0;
  static const double chatShareCardHeaderIconExtent = 40.0;
  static const int chatShareCardMaxMessages = 3;
  static const double richShareCardWidth = 360.0;
  static const double richShareCardAspectRatio = 4 / 5;
  static const double richShareCardPixelRatio = 3.0;
  static const double richShareCardHeaderIconExtent = 40.0;
  static const int richShareCardMaxTags = 3;
  static const double chatUnreadStripWidth = 4.0;
  static const double chatUnreadPillWidth = CatchSpacing.s6;
  static const double celebrationIconExtent = 86.0;
  static const double questionnaireDotExtent = 28.0;
  static const double eventTicketDividerHeight = 20.0;
  static const double ticketNotchRadius = 10.0;
  static const double ticketNotchDepth = 8.0;

  /// Center of the perforation below a ticket's media region.
  static double ticketNotchCenterY(double mediaHeight) =>
      mediaHeight + eventTicketDividerHeight / 2;
  static const double ticketPerforationStartOffset = 0.5;
  static const double ticketPerforationDashLength = 2.2;
  static const double ticketPerforationStride = 7.0;
  static const double hostTargetStepperWidth = 150.0;
  static const double skeletonTextShortWidth = 64.0;
  static const double skeletonTextTitleWidth = 132.0;
  static const double chatNewMatchTileWidth = 64.0;
  static const double chatNewMatchAvatarExtent = 64.0;
  static const double clubFilterDividerHeight = 22.0;
  static const double profileTagPillHorizontalPadding = 11.0;
  static const double profileTagPillVerticalPadding = 7.0;
  static const double profileRunStatHorizontalPadding = 12.0;
  static const double profileRunStatVerticalPadding = 11.0;
  static const double profileInfoChipHorizontalPadding = 10.0;
  static const double profileInfoChipVerticalPadding = 6.0;
  static const double profilePhotoEditorBoundaryMargin = 160.0;
}
