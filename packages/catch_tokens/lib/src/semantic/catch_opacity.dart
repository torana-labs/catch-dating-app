import 'package:catch_tokens/generated/catch_design_tokens.g.dart';

/// Semantic opacity levels for component states and editorial visual effects.
abstract final class CatchOpacity {
  static const double visible = 1.0;
  static const double none = 0.0;
  static const double onFillMuted = 0.76;
  static const double avatarFallbackGlyph = 0.75;
  static const double editorialGridLine = 0.08;
  static const double ticketPerforationLine = 0.22;
  static const double eventDateRailGlyph = 0.14;

  /// Filled-surface scrim for text/icons that need contrast on colored
  /// backgrounds — activity stamps, active date-marker text.
  static const double scrimFill = 0.72;

  /// Barely visible platform text field used behind custom OTP digit boxes.
  static const double hiddenInput = 0.01;

  /// Photo-obscuring avatar scrim.
  static const double avatarPhotoScrim = 0.16;

  /// Disabled control opacity for non-semantic fade states.
  static const double disabledControl = 0.40;

  /// Shared notification palette blends, preserving the existing tone mix.
  static const double noticeFill = 0.08;
  static const double noticeIconFill = 0.16;
  static const double noticeBorder = 0.32;

  /// Explore feed weight for events that remain informative but the viewer
  /// cannot currently join.
  static const double discoveryIneligible = 0.64;

  /// Translucent fill for floating icon-button chrome over photos and maps.
  static const double iconButtonFloatFill = 0.90;

  /// High-opacity fill for compact overlay pills on image/map surfaces.
  static const double overlayPillFill = 0.93;

  /// Surface fill for labelled floating pills over scrolling content.
  static const double floatingPillFill = 0.94;

  /// High-opacity blur fill for the floating iOS tab bar glass.
  static const double tabBarGlassFill = 0.93;

  /// Selected tab pill fill inside the bottom tab bar.
  static const double tabBarPillFill = 0.08;

  /// Pointer hover preview inside the bottom tab bar.
  static const double tabBarHoverFill = 0.06;

  /// Keyboard focus preview inside the bottom tab bar.
  static const double tabBarFocusFill = 0.10;

  /// Contact and drag preview inside the bottom tab bar.
  static const double tabBarPressedFill = 0.14;

  /// Very light tint for accent-color backgrounds (date pills, soft status
  /// pills).
  static const double subtleFill = 0.12;

  /// Tone wash behind a tinted Callout (design-system color-mix 7%).
  static const double calloutFill = 0.07;

  // CoverStory (design-system components/explore/CoverStory) — the dark wow cover.
  static const double coverStoryGlow = 0.58;
  static const double coverStoryContrastScrim = 0.62;
  static const double coverStoryContrastScrimMid = 0.48;
  static const double coverStoryGhostGlyph = 0.07;
  static const double coverStoryScrim = 0.035;
  static const double coverStoryBody = 0.76;
  static const double coverStoryData = 0.70;
  static const double coverStoryLocation = 0.65;
  static const double coverStorySearchBorder = 0.28;
  static const double coverStoryKickerMix = 0.55;

  /// Soft warning-state fill.
  static const double warningFill = 0.14;

  /// Soft danger-state fill.
  static const double dangerFill = 0.10;

  /// Almost-clear image scrim stop for full-photo gradients.
  static const double photoScrimBarelyVisible = 0.05;

  /// Nearly transparent image scrim stop for profile-card overlays.
  static const double photoScrimLow = 0.04;

  /// Light image scrim stop for hero/photo gradients.
  static const double photoScrimLight = 0.10;

  /// Mid-light image scrim stop for hero/photo gradients.
  static const double photoScrimMedium = 0.16;

  /// Bottom-edge alpha for photo-frame scrims.
  static const double photoFrameEdge = 0.18;

  /// Hairline border on subtle-tint containers (date pills, soft badges).
  static const double subtleBorder = 0.22;

  /// Activity-art fallback icon opacity on photo-replacement surfaces.
  static const double fallbackArtworkIcon = 0.24;

  /// Pattern marks over activity artwork (EventBackdropImage); the website
  /// reads the same token as --catch-opacity-activity-artwork-pattern.
  static const double activityArtworkPattern =
      GeneratedCatchOpacityTokens.activityArtworkPattern;

  /// Activity glyph over activity artwork (EventBackdropImage); the website
  /// reads the same token as --catch-opacity-activity-artwork-glyph.
  static const double activityArtworkGlyph =
      GeneratedCatchOpacityTokens.activityArtworkGlyph;

  /// Muted border on medium-contrast component shells (activity stamps).
  static const double mutedBorder = 0.54;

  /// Muted border for urgent/attention card shells.
  static const double mutedBorderUrgent = 0.32;

  /// Disabled / muted content text.
  static const double mutedContent = 0.36;

  /// Gradient-stop band — muted background layer (action-card gradients).
  static const double gradientBand = 0.62;

  /// Gradient-stop band — soft background layer (action-card gradients).
  static const double gradientBandSoft = 0.28;

  /// Dark-pill fill overlay — editorial status pill on the dark tone.
  static const double darkPillFill = 0.68;

  /// Confirm-dialog backdrop alpha from the implementation handoff.
  static const double confirmDialogScrim = 0.46;

  /// Muted copy/icon foreground on fixed dark overlay surfaces.
  static const double onDarkMuted = 0.70;

  /// Hairline separators over fixed dark editorial hero surfaces.
  static const double darkHeroDivider = 0.18;

  /// Translucent pill fills over fixed dark editorial hero surfaces.
  static const double darkHeroPillFill = 0.16;

  /// Canonical light-fill badge treatment over dark, media, or art surfaces.
  static const double badgeOnDarkFill = 0.12;

  /// Canonical light hairline for badges over dark, media, or art surfaces.
  static const double badgeOnDarkBorder = 0.18;

  /// Backing ring opacity for overlapping avatar stacks on dark/art surfaces.
  static const double avatarStackRing = 0.28;

  static const double activityAvatarPrint = 0.08;
  static const double activityAvatarInnerRule = 0.16;
  static const double activityAvatarDim = 0.20;
  static const double activityMapPinShadow =
      GeneratedCatchOpacityTokens.activityMapPinShadow;
  static const double distanceRing = 0.28;
  static const double distanceRingLabelFill = 0.94;
  static const double activityArtPrint = 0.07;
  static const double activityArtInnerRule = 0.14;
  static const double activityArtGlyph = 0.16;
  static const double activityArtDim = 0.18;

  /// Prominent but softened text/icon foreground on primary dark surfaces.
  static const double primaryInkProminent = 0.82;

  /// Frosted floating chrome over full-bleed media.
  static const double floatingChromeFill = 0.84;

  /// Hairline border for frosted floating chrome over full-bleed media.
  static const double floatingChromeBorder = 0.72;

  /// Floating circular control surface over full-bleed media.
  static const double floatingControlFill = 0.88;

  static const double welcomeHeroBody = 0.88;
  static const double welcomeIntroBody = 0.66;
  static const double welcomeReelDimMin = 0.12;
  static const double welcomeReelDimDistanceRows = 3.2;
  static const double welcomeReelDecolorPigment = 0.26;
  static const double welcomeSecondaryButtonFill = 0.14;
  static const double welcomeSecondaryButtonBorder = 0.42;
  static const double welcomeTrackPattern = 0.16;
  static const double welcomeReelMaskLead = 0.14;
  static const double welcomeReelMaskTail = 0.88;
  static const double mapDistanceRingStroke = 0.38;
  static const double mapDistanceRingFill = 0.08;
  static const double mapUserLocationStroke = 0.92;
  static const double eventSuccessQrErrorFill = 0.84;
  static const double strideInactiveBar = 0.55;
  static const double emptyHeroArtStroke = 0.25;
  static const double suvbotDestructiveFill = 0.24;
  static const double profileInlineUnderlineActive = 0.90;
  static const double profileInlineUnderlineInactive = 0.35;
  static const double profileDisabledIcon = 0.45;
  static const double eventDetailLightBorder = 0.24;
  static const double arrivalCelebrationPeak = 0.62;
  static const double arrivalCelebrationMidMultiplier = 0.85;
  static const double arrivalCelebrationLowMultiplier = 0.50;
  static const double manualQaHeroMeta = 0.86;
  static const double hostDangerBorder = 0.45;
  static const double imageEditControlFill = 0.85;
  static const double revealAttendeePanelFill = 0.92;
  static const double revealAttendeeBorder = 0.24;
  static const double revealAttendeeActionDock = 0.88;
  static const double chatUnreadBorder = 0.36;
  static const double paymentReferralBorder = 0.24;
  static const double paymentHelpBorder = 0.40;
  static const double paymentCheckoutScrim = 0.55;
  static const double locationPickerTopChromeFill = 0.94;
  static const double locationPickerPanelFill = 0.96;
  static const double eventDetailCtaDarkDivider = 0.12;
  static const double readinessWarningBorder = 0.32;
  static const double eventSuccessPreviewMeta = 0.86;
  static const double eventDetailPrimarySoft = 0.18;
  static const double mapOverlayChromeFill = 0.92;
  static const double photoDragGhost = 0.35;
  static const double profileInfoDivider = 0.62;

  /// Low-contrast inset treatment for boundaries between sibling field/list
  /// rows. Outer section rules keep the full `line` token.
  static const double fieldRowDivider = 0.38;
  static const double profileProgressTrack = 0.70;
  static const double profileShadowDark = 0.34;
  static const double profileShadowLight = 0.10;

  /// Midpoint stop for bottom action scrims over scrolling page content or
  /// full-bleed media.
  static const double bottomActionScrim = 0.82;

  /// Hover overlay for buttons and tappable controls.
  static const double controlOverlayHover =
      GeneratedCatchOpacityTokens.controlOverlayHover;

  /// Pressed/splash overlay for buttons and tappable controls.
  static const double controlOverlayPressed = 0.08;

  /// Animated loading-dot sequence.
  static const List<double> loadingDotAlphas = <double>[0.4, 0.6, 0.8];

  /// Inactive page-dot opacity.
  static const double pageDotInactive = 0.90;

  /// Frosted white overlay fill for icon marks on dark activity imagery.
  static const double lightOverlayFill = 0.18;

  /// Frosted white overlay border for icon marks on dark activity imagery.
  static const double lightOverlayBorder = 0.42;

  /// Error container fill inside inline banners.
  static const double errorContainerFill = 0.47;

  /// Error container border inside inline banners.
  static const double errorContainerBorder = 0.24;

  /// Near-opaque sash/surface fill on media cards.
  static const double surfaceSashFill = 0.92;

  /// Club-cover fallback art overlay highlight.
  static const double clubCoverHighlightOverlay = 0.10;

  /// Club-cover fallback art low scrim.
  static const double clubCoverLowScrim = 0.04;

  /// Club-cover fallback location-chip fill.
  static const double clubCoverChipFill = 0.72;

  /// Club-cover fallback location-chip border.
  static const double clubCoverChipBorder = 0.62;

  /// Club-cover fallback pattern block overlay.
  static const double clubCoverPatternBlock = 0.44;

  /// Club-cover fallback pattern line overlay.
  static const double clubCoverPatternLine = 0.28;

  /// Club-cover fallback pattern dot overlay.
  static const double clubCoverPatternDot = 0.50;

  /// Club-cover deterministic palette accent blend.
  static const double clubCoverAccentBlend = 0.22;

  /// Club-cover deterministic palette deep blend.
  static const double clubCoverDeepBlend = 0.18;

  /// Club-cover deterministic palette line.
  static const double clubCoverPaletteLine = 0.30;

  /// Club-cover deterministic palette block.
  static const double clubCoverPaletteBlock = 0.45;

  /// Event detail hero top-control scrim.
  static const double eventHeroOverlayScrim = 0.35;

  /// Event detail hero middle gradient scrim.
  static const double eventHeroGradientMidScrim = 0.10;

  /// Event detail hero standard bottom gradient scrim.
  static const double eventHeroGradientBottomScrim = 0.34;

  /// Event detail hero spotlight bottom gradient scrim.
  static const double eventHeroSpotlightBottomScrim = 0.52;

  /// Muted foreground inside event-detail hero overlays.
  static const double eventHeroMutedInk = 0.72;

  /// Prominent foreground/content on Event Success stage surfaces.
  static const double eventSuccessProminent = 0.82;
  static const double eventSuccessPaperLine = 0.26;
  static const double eventSuccessPaperMark = 0.10;

  /// Companion stage nav/chrome foreground.
  static const double eventSuccessChrome = 0.84;

  /// Muted foreground/content on Event Success stage surfaces.
  static const double eventSuccessMutedInk = 0.72;

  /// Disabled foreground on Event Success stage controls.
  static const double eventSuccessDisabled = 0.36;

  /// Muted foreground on Event Success stage chrome.
  static const double eventSuccessMuted = 0.34;

  /// Subtle Event Success border.
  static const double eventSuccessSubtleBorder = 0.18;

  /// Subtle Event Success privacy border.
  static const double eventSuccessPrivacyBorder = 0.15;

  /// Event Success stage panel fill.
  static const double eventSuccessPanelFill = 0.90;

  /// Event Success action dock fill.
  static const double eventSuccessActionDockFill = 0.88;

  /// Event Success stage-panel breathing border base.
  static const double eventSuccessPanelBorderBase = 0.22;

  /// Event Success stage-panel breathing border delta.
  static const double eventSuccessPanelBorderBreath = 0.12;

  /// Event Success stage-theme background color blend.
  static const double eventSuccessStageBgBlend = 0.42;

  /// Event Success stage-theme mid color blend.
  static const double eventSuccessStageMidBlend = 0.35;

  /// Event Success motif base line opacity.
  static const double eventSuccessMotifBase = 0.12;

  /// Event Success motif accent line opacity.
  static const double eventSuccessMotifAccent = 0.34;

  /// Portable Event Success marquee asset tint.
  static const double revealCinematicAssetTint = 0.48;

  /// Event Success stage bouncy-press glow multiplier.
  static const double eventSuccessBouncyGlow = 0.36;

  /// Event Success live room glow base.
  static const double eventSuccessRoomGlowBase = 0.18;

  /// Event Success live room glow pulse.
  static const double eventSuccessRoomGlowPulse = 0.22;

  /// Event Success arrival ring accent foreground.
  static const double eventSuccessArrivalAccent = 0.72;

  /// Event Success arrival ring caption.
  static const double eventSuccessArrivalCaption = 0.78;

  /// Event Success arrival ring filled-dot highlight.
  static const double eventSuccessArrivalHighlight = 0.92;

  /// Event Success reveal countdown surface fill.
  static const double revealSurfaceFill = 0.12;

  /// Event Success reveal countdown surface border.
  static const double revealSurfaceBorder = 0.18;

  /// Event Success countdown foreground muted label.
  static const double revealMutedForeground = 0.78;

  /// Event Success countdown gradient start.
  static const double revealGradientStart = 0.08;

  /// Event Success reveal border.
  static const double revealGoldBorder = 0.34;

  /// Event Success reveal glow base.
  static const double revealGlowBase = 0.20;

  /// Event Success reveal glow urgency delta.
  static const double revealGlowUrgency = 0.12;

  /// Event Success reveal beat active fill.
  static const double revealBeatFillActive = 0.24;

  /// Event Success reveal beat inactive fill.
  static const double revealBeatFillInactive = 0.10;

  /// Event Success reveal beat active border.
  static const double revealBeatBorderActive = 0.52;

  /// Event Success reveal beat inactive border.
  static const double revealBeatBorderInactive = 0.16;

  /// Event Success reveal cue fill.
  static const double revealCueFill = 0.09;

  /// Event Success reveal cue border.
  static const double revealCueBorder = 0.13;

  /// Event Success reveal atmosphere glow base.
  static const double revealAtmosphereGlowBase = 0.08;

  /// Event Success reveal atmosphere glow urgency delta.
  static const double revealAtmosphereGlowUrgency = 0.07;

  /// Event Success reveal atmosphere line base.
  static const double revealAtmosphereLineBase = 0.10;

  /// Event Success reveal atmosphere hot-line base.
  static const double revealAtmosphereHotLineBase = 0.22;

  /// Event Success reveal atmosphere hot-line urgency delta.
  static const double revealAtmosphereHotLineUrgency = 0.16;

  /// Event Success reveal dial base.
  static const double revealDialBase = 0.13;

  /// Event Success reveal dial glow base.
  static const double revealDialGlowBase = 0.16;

  /// Event Success reveal dial glow urgency delta.
  static const double revealDialGlowUrgency = 0.10;

  /// Event Success reveal dial sweep accent.
  static const double revealDialSweepAccent = 0.40;

  /// Event Success reveal dial sweep foreground.
  static const double revealDialSweepForeground = 0.90;

  /// Event Success reveal dial center fill.
  static const double revealDialCenterFill = 0.045;

  /// Event Success reveal dial inner glow base.
  static const double revealDialInnerGlowBase = 0.08;

  /// Event Success reveal dial inner glow urgency delta.
  static const double revealDialInnerGlowUrgency = 0.06;

  /// Event Success reveal cinematic flash peak.
  static const double revealCinematicFlash = 0.62;

  /// Event Success reveal cinematic particle peak.
  static const double revealCinematicParticle = 0.70;

  /// Event Success warning/issue border.
  static const double eventSuccessWarningBorder = 0.28;

  /// Event recap hero kicker on fixed dark surfaces.
  static const double eventRecapHeroKicker = 0.68;

  /// Event recap hero metadata on fixed dark surfaces.
  static const double eventRecapHeroMeta = 0.76;

  /// Event recap hero stat label on fixed dark surfaces.
  static const double eventRecapHeroStatLabel = 0.56;

  /// Event recap roster-tile name scrim.
  static const double eventRecapTileScrim = 0.74;

  /// Flagship profile hero scrim stops (design-system ProfileHero, at
  /// 0/45/78/100% → 0.14 / 0 / 0.34 / 0.74). Legible name/meta without crushing
  /// the portrait.
  static const double profileHeroScrimTop = 0.14;
  static const double profileHeroScrimMid = 0.34;
  static const double profileHeroScrimBottom = 0.74;

  /// Activity-art fallback icon opacity on the flagship profile hero.
  static const double profileFallbackArtworkIcon = 0.18;

  /// Activity-art fallback pattern opacity on the flagship profile hero.
  static const double profileFallbackArtworkPattern = 0.20;

  /// Muted profile hero metadata on dark photo overlays.
  static const double profileHeroMuted = 0.86;

  /// Loading scrim over profile-photo upload slots.
  static const double photoUploadLoadingScrim = 0.45;
  static const double hostMediaStatusScrim = 0.88;

  /// Floating edit chrome over profile-photo slots.
  static const double photoSlotEditChrome = 0.85;

  /// Prompt chip scrim over profile-photo slots.
  static const double photoPromptScrim = 0.58;

  /// Floating delete chrome over profile-photo slots.
  static const double photoSlotDeleteChrome = 0.90;

  /// Compact club member seal fill.
  static const double clubMemberSealCompactFill = 0.90;

  /// Full club member seal fill.
  static const double clubMemberSealFill = 0.72;

  /// Club member seal accent border.
  static const double clubMemberSealBorder = 0.46;

  /// Club rating pill fill.
  static const double clubRatingFill = 0.13;

  /// Club rating pill border.
  static const double clubRatingBorder = 0.30;

  /// Floating pass-button fill over profile media.
  static const double passButtonFill = 0.96;

  /// Floating pass-button shadow.
  static const double passButtonShadow = 0.24;

  /// Overlay reaction-control fill over profile photos.
  static const double reactionOverlayFill = 0.94;

  /// Overlay reaction-control border over profile photos.
  static const double reactionOverlayBorder = 0.70;

  /// Active event-type tile soft fill.
  static const double eventTypeTileFill = 0.62;

  /// Active event-type color-cue accent stop.
  static const double eventTypeCueAccentActive = 1.0;

  /// Inactive event-type color-cue accent stop.
  static const double eventTypeCueAccentInactive = 0.92;

  /// Active event-type color-cue deep stop.
  static const double eventTypeCueDeepActive = 0.70;

  /// Inactive event-type color-cue deep stop.
  static const double eventTypeCueDeepInactive = 0.58;

  /// Active event-type color-cue glow.
  static const double eventTypeCueGlowActive = 0.34;

  /// Inactive event-type color-cue glow.
  static const double eventTypeCueGlowInactive = 0.26;

  /// Roster filter unselected tile fill.
  static const double rosterFilterFill = 0.42;

  /// Roster filter unselected tile border.
  static const double rosterFilterBorder = 0.20;

  /// Roster filter selected secondary label.
  static const double rosterFilterSelectedLabel = 0.78;

  /// Activity notification unread border.
  static const double activityUnreadBorder = 0.34;

  /// Activity notification unread fill.
  static const double activityUnreadFill = 0.06;

  /// Activity notification icon-chip default fill.
  static const double activityIconFill = 0.11;

  /// Activity notification icon-chip border.
  static const double activityIconBorder = 0.14;

  /// Disabled/muted affordance inside Explore rows.
  static const double exploreMutedAffordance = 0.32;
}
