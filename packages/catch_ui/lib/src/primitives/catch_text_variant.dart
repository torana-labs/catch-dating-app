import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_fonts.dart';
import 'package:flutter/widgets.dart';

/// The system's text roles: the 19 type roles of
/// `GeneratedCatchTypeRoleTokens`, in their order, then the three responsive
/// roles that change size with the size class.
///
/// `@catch/web-ui` names the same 22 in kebab case (`display-hero`,
/// `page-title`). Pick a role, never a size: the role carries size, line
/// height, weight, tracking and family.
enum CatchTextVariant {
  displayHero,
  displayXl,
  displayLg,
  displayTitle,
  displaySection,
  displaySm,
  displayXs,
  bodyLead,
  bodyInput,
  body,
  bodySmall,
  bodyMeta,
  titleBar,
  titleRow,
  labelButton,
  labelAction,
  labelKicker,
  labelBadge,
  labelCode,

  /// 38 on compact, 48 on medium, 64 on expanded.
  pageTitle,

  /// 24 on compact and medium, 30 on expanded.
  sectionTitle,

  /// 48 on compact, 64 on medium, 96 on expanded.
  hero;

  /// Whether the role changes size with the size class.
  bool get isResponsive =>
      this == pageTitle || this == sectionTitle || this == hero;

  /// The role's metrics at [sizeClass], from the generated type tokens.
  TextStyle metrics(CatchWindowSize sizeClass) => switch (this) {
    displayHero => GeneratedCatchTypeRoleTokens.displayHero,
    displayXl => GeneratedCatchTypeRoleTokens.displayXl,
    displayLg => GeneratedCatchTypeRoleTokens.displayLg,
    displayTitle => GeneratedCatchTypeRoleTokens.displayTitle,
    displaySection => GeneratedCatchTypeRoleTokens.displaySection,
    displaySm => GeneratedCatchTypeRoleTokens.displaySm,
    displayXs => GeneratedCatchTypeRoleTokens.displayXs,
    bodyLead => GeneratedCatchTypeRoleTokens.bodyLead,
    bodyInput => GeneratedCatchTypeRoleTokens.bodyInput,
    body => GeneratedCatchTypeRoleTokens.body,
    bodySmall => GeneratedCatchTypeRoleTokens.bodySmall,
    bodyMeta => GeneratedCatchTypeRoleTokens.bodyMeta,
    titleBar => GeneratedCatchTypeRoleTokens.titleBar,
    titleRow => GeneratedCatchTypeRoleTokens.titleRow,
    labelButton => GeneratedCatchTypeRoleTokens.labelButton,
    labelAction => GeneratedCatchTypeRoleTokens.labelAction,
    labelKicker => GeneratedCatchTypeRoleTokens.labelKicker,
    labelBadge => GeneratedCatchTypeRoleTokens.labelBadge,
    labelCode => GeneratedCatchTypeRoleTokens.labelCode,
    pageTitle => switch (sizeClass) {
      CatchWindowSize.compact =>
        GeneratedCatchTypeVariantTokens.pageTitleCompact,
      CatchWindowSize.medium => GeneratedCatchTypeVariantTokens.pageTitleMedium,
      CatchWindowSize.expanded =>
        GeneratedCatchTypeVariantTokens.pageTitleExpanded,
    },
    sectionTitle => switch (sizeClass) {
      CatchWindowSize.compact =>
        GeneratedCatchTypeVariantTokens.sectionTitleCompact,
      CatchWindowSize.medium =>
        GeneratedCatchTypeVariantTokens.sectionTitleMedium,
      CatchWindowSize.expanded =>
        GeneratedCatchTypeVariantTokens.sectionTitleExpanded,
    },
    hero => switch (sizeClass) {
      CatchWindowSize.compact => GeneratedCatchTypeVariantTokens.heroCompact,
      CatchWindowSize.medium => GeneratedCatchTypeVariantTokens.heroMedium,
      CatchWindowSize.expanded => GeneratedCatchTypeVariantTokens.heroExpanded,
    },
  };

  /// Whether the role is set in the display voice (Archivo). The responsive
  /// roles always resolve to display roles.
  bool get isDisplay => switch (this) {
    displayHero ||
    displayXl ||
    displayLg ||
    displayTitle ||
    displaySection ||
    displaySm ||
    displayXs ||
    pageTitle ||
    sectionTitle ||
    hero => true,
    _ => false,
  };

  /// The role's style at [sizeClass], with no colour: Archivo through
  /// [CatchFonts.voice] for display roles and the platform function family
  /// through [CatchFonts.sans] for the rest, as `CatchTextStyles` sets them.
  TextStyle style(CatchWindowSize sizeClass) {
    final role = metrics(sizeClass);
    if (isDisplay) {
      return CatchFonts.voice(
        fontSize: role.fontSize!,
        height: role.height!,
        fontWeight: role.fontWeight!,
        letterSpacing: role.letterSpacing!,
      );
    }
    return CatchFonts.sans(
      fontSize: role.fontSize!,
      height: role.height!,
      fontWeight: role.fontWeight!,
      letterSpacing: role.letterSpacing!,
    );
  }
}

/// A text colour by meaning. [inherit] takes the ink of the ground behind the
/// text. `@catch/web-ui` names the same eight.
enum CatchTextTone {
  inherit,
  primary,
  secondary,
  tertiary,
  success,
  warning,
  danger,
  info;

  /// The colour for this tone, or null for [inherit].
  Color? color(CatchTokens tokens) => switch (this) {
    inherit => null,
    primary => tokens.ink,
    secondary => tokens.ink2,
    tertiary => tokens.ink3,
    // The status tones read the system roles, not the older success,
    // warning and danger aliases P7 deletes (the same colours).
    success => tokens.deepMint,
    warning => tokens.deepYellow,
    danger => tokens.deepCoral,
    info => tokens.deepIndigo,
  };
}
