import 'package:catch_tokens/catch_tokens.dart';

/// Semantic geometry used only to make Widgetbook contract states reviewable.
///
/// Product widgets continue to own their responsive layout. These values bound
/// a preview canvas or deliberately exercise truncation at a named width; they
/// must not leak into application UI as a second design-token scale.
abstract final class WidgetbookPreviewLayout {
  static const double compactLabelWidth = 152;
  static const double compactBadgeWidth = 124;
  static const double scaledStatusWidth = 220;
  static const double fullWidthButtonWidth = 220;
  static const double passiveChipTruncationWidth = 150;
  static const double activityChipTruncationWidth = 160;
  static const double standardContractWidth = 360;
  static const double wideContractWidth = 420;
  static const double mediumComponentWidth = 280;
  static const double compactComponentWidth = 260;
  static const double narrowComponentWidth = 180;
  static const double compactControlWidth = 160;
  static const double compactItemWidth = 96;
  static const double smallPreviewExtent = 96;
  static const double compactPreviewExtent = 260;
  static const double phoneChromeWidth = 390;
  static const double tabletChromeWidth = 834;
  static const double desktopChromeWidth = 1180;
  static const double dockFrameWidth = 430;
  static const double fieldLeadingWidth = CatchSpacing.s12;
  static const double fieldContentClampWidth = 180;
  static const double fieldActionBarWrapWidth = 190;
  static const double fieldFocusTargetWidth = 120;
  static const double fieldFocusTargetHeight = 44;
  static const double controlShellWidth = 180;
  static const double surfaceCardWidth = 220;
  static const double metricStripLongCopyWidth = 260;
  static const double metricStripCellWidth = 112;
  static const double catalogCardWidth = 136;
  static const double catalogRailWidth = 320;
  static const double eventDetailPreviewWidth = 320;
  static const double catalogExpandedRailWidth = 340;
  static const double catalogSheetGrabberWidth = CatchSpacing.s16;
  static const double catalogSheetGrabberHeight = 5;

  static const double stateViewportHeight = 220;
  static const double insetPreviewHeight = 160;
  static const double sliverPreviewHeight = 320;
  static const double routeViewportHeight = 260;
  static const double startupViewportHeight = 360;
  static const double bodyFrameExtent = 360;
  static const double compactPanelHeight = 140;
  static const double mediaPanelHeight = 180;
  static const double tallNarrowPanelHeight = 240;
  static const double thumbnailWidth = 148;
  static const double thumbnailHeight = 104;
  static const double mediaPanelWidth = 340;
  static const double avatarPreviewExtent = 56;
  static const double navigationBarHeight = 56;
  static const double photoLikePanelHeight = 132;
  static const double surfaceSpecWidth = 188;
  static const double compactCardHeight = 130;
  static const double catalogThumbnailHeight = 112;
  static const double catalogFeaturePanelHeight = 172;
  static const double tallRouteViewportHeight = 460;
  static const double feedbackViewportHeight = 420;
  static const double catalogRailHeight = 128;
  static const double catalogSliverSpacerHeight = 120;
  static const double celebrationViewportHeight = 640;
  static const double tabletChromeHeight = 720;
  static const double desktopChromeHeight = 720;
  static const double paperCelebrationViewportHeight = 740;
  static const double paperScaffoldViewportHeight = 720;
  static const double phonePreviewCornerRadius = CatchSpacing.s7;
  static const double defaultPhonePreviewHeight = 520;
  static const double hostEditorViewportHeight = 820;

  static const double profileDensePreviewHeight = 96;
  static const double profileCompactPreviewHeight = 120;
  static const double profileInlinePreviewHeight = 180;
  static const double profilePolaroidPreviewHeight = 176;
  static const double profileStandardPreviewHeight = 260;
  static const double profileMediaPreviewHeight = 280;
  static const double profileMediumPreviewHeight = 300;
  static const double profileSectionPreviewHeight = 360;
  static const double profileWidePreviewExtent = 430;
  static const double profileSheetPreviewHeight = 520;
  static const double profileExpandedEditorHeight = 560;
  static const double profilePhonePreviewHeight = 760;
  static const double profileEditorPreviewHeight = 820;
  static const double profileExpandedPreviewHeight = 880;

  static const double foundationTileWidth = 132;
  static const double foundationSwatchHeight = 56;
  static const double foundationActivityTileWidth = 170;
  static const double foundationMetricLabelWidth = 160;
  static const double foundationMetricBarHeight = CatchSpacing.s3;
  static const double foundationMetricValueWidth = 72;
  static const double foundationInsetTileWidth = 220;
  static const double foundationInsetSampleHeight = 84;
  static const double foundationRadiusTileWidth = 136;
  static const double foundationRadiusSampleWidth = 112;
  static const double foundationRadiusSampleHeight = 72;
  static const double foundationElevationSampleWidth = 96;
  static const double foundationElevationSampleHeight = CatchSpacing.s16;
  static const double foundationTypeLabelWidth = 184;
  static const double foundationIconCellWidth = 96;
  static const double foundationAspectRatioTileWidth = 148;
  static const double foundationMotionTrackHeight = CatchSpacing.s8;
  static const double foundationMotionBarWidth = 220;
  static const double foundationCurveTileWidth = 180;
  static const double foundationPhotoGradeTileWidth = 220;
  static const double foundationWordmarkTileWidth = 240;
  static const double foundationWordmarkStageHeight = 76;

  static const double reviewCardWidth = 400;
  static const double reviewCardRadius = CatchSpacing.micro18;

  static const double exploreRoutePreviewHeight = 620;
  static const double exploreTallPreviewHeight = 680;
  static const double exploreExpandedPreviewHeight = 820;
  static const double exploreComparisonWidth = 560;
  static const double exploreMediaPreviewHeight = 280;
  static const double eventCompactAvatarWidth = 116;

  static const double onboardingWelcomeMediaTop = 44;
  static const double onboardingWelcomeMediaBottom = 34;
  static const double onboardingWelcomeFocusWidth =
      CatchWelcomeTokens.welcomeFocusLockupMaxWidth;
  static const double onboardingReelRowPreviewHeight = 92;

  static const double utilityMediaPreviewHeight = 146;
  static const double utilityCompactPreviewHeight = 82;
  static const double utilityTallPreviewHeight = 347;

  static const double catchesCompactPreviewHeight = 230;
  static const double catchesSkeletonPreviewHeight = 440;
  static const double catchesSectionPreviewHeight = 210;
  static const double catchesSummaryPreviewHeight = 108;
  static const double catchesCardPreviewHeight = 168;
  static const double matchesTallPreviewHeight = 340;
  static const double organizerRoutePreviewHeight = 480;
  static const double organizerExpandedPreviewHeight = 500;
  static const double organizerAvatarPreviewExtent = 120;

  static const double skeletonCardHeight = 84;
  static const double skeletonBoxWidth = 96;
  static const double skeletonTextWidth = 180;
  static const double skeletonCircleExtent = CatchSpacing.s12;
  static const double skeletonCustomHeight = CatchSpacing.s10;
  static const double skeletonListItemHeight = 72;

  static const double loadingIndicatorExtent = CatchSpacing.s12;
  static const double loadingIndicatorSmallExtent = CatchSpacing.s8;
  static const double loadingSlotHeight = 80;

  static const double kickerTruncationWidth = 120;
  static const double monoLabelTruncationWidth = 110;

  static const double organizerCoverWidth = 280;
  static const double organizerCoverHeight = 180;
  static const double organizerCoverCompactExtent = 72;

  static const double activityArtPairWidth = 180;
  static const double activityArtPairHeight = 96;
  static const double activityArtCustomWidth = 280;
  static const double activityArtCustomHeight = 88;

  static const double networkIconExtent = 128;
  static const double networkLandscapeWidth = 220;
  static const double networkLandscapeHeight = 124;
  static const double networkFallbackExtent = 96;

  static const double distanceRingLongLabelWidth = 150;
  static const double codeInputWidth = 320;
  static const double codeInputShortWidth = 240;
  static const double codeInputCellWidth = CatchSpacing.s16;
}
