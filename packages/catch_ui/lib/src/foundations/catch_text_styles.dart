import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_fonts.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Package-internal welcome paint; use CatchWelcomeText from the public API.
/// The welcome reel is set in the page-title display role.
@internal
TextStyle catchWelcomeTextStyle(Color color) => CatchTextStyles._display(
  GeneratedCatchTypeRoleTokens.displayTitle,
  color: color,
);

/// Catch's typographic scale — the system's type roles (blueprint D22), which
/// `GeneratedCatchTypeRoleTokens` carries: Archivo for the display roles and the
/// platform system font for every other role.
///
/// **Fidelity rules** (`docs/design_language.md` and the generated design
/// context pack):
/// - Archivo is the roman-only display voice. It is not used for long-form or
///   user-authored reading text.
/// - Function and body tracking is zero. The display roles own their negative
///   tracking.
/// - Body/prose roles use the platform system font with generous leading.
///
/// **Scale discipline:** the older names below read the role that replaces them
/// (no near-duplicate mid-sizes or per-call height and weight overrides). P2.1
/// moves the function roles from the platform profiles onto the system roles.
///
/// Prefer the named styles over ad hoc [TextStyle]; use `copyWith` only for local
/// state (unread/disabled).
abstract final class CatchTextStyles {
  /// Navigation label, measured by the shared tab-rail owner.
  static TextStyle tabLabel(
    BuildContext context, {
    bool selected = false,
    Color? color,
  }) => control(
    context,
    selected: selected,
    color: color,
  ).copyWith(fontWeight: selected ? FontWeight.w600 : FontWeight.w500);

  /// Standard command label, with emphasis reserved for active state.
  static TextStyle control(
    BuildContext context, {
    bool selected = false,
    Color? color,
  }) => _functionProfile(
    CatchPlatformTokens.typography.control,
    color: color ?? CatchTokens.of(context).ink,
  ).copyWith(fontWeight: selected ? FontWeight.w600 : FontWeight.w400);

  static TextStyle selectionLabel(
    BuildContext context, {
    required bool selected,
  }) => supporting(
    context,
    color: selected
        ? CatchTokens.of(context).primaryInk
        : CatchTokens.of(context).ink2,
  ).copyWith(fontWeight: selected ? FontWeight.w600 : FontWeight.w500);

  static TextStyle supportingStrong(BuildContext context, {Color? color}) =>
      supporting(
        context,
        color: color ?? CatchTokens.of(context).ink,
      ).copyWith(fontWeight: FontWeight.w500);

  /// Prominent measured quantity, aligned with tabular figures.
  static TextStyle metric(BuildContext context, {Color? color}) => _tabular(
    _functionProfile(
      CatchPlatformTokens.typography.metric,
      color: color ?? CatchTokens.of(context).ink,
    ),
  );

  // ===========================================================================
  // DISPLAY — Archivo (brand display and deliberate poster moments)
  // ===========================================================================

  /// 24px display (`display-sm`): compact brand headings, card and room titles.
  static TextStyle displayXs(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displaySm,
    color: color ?? _ink(context),
  );

  /// 30px display (`display-section`): event and club titles in lists and hero
  /// bars.
  static TextStyle displayS(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displaySection,
    color: color ?? _ink(context),
  );

  /// 38px display (`display-title`): page heroes and the welcome reel.
  static TextStyle displayM(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displayTitle,
    color: color ?? _ink(context),
  );

  /// 48px display (`display-lg`): celebration and live-countdown moments.
  static TextStyle displayL(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displayLg,
    color: color ?? _ink(context),
  );

  /// 64px display (`display-xl`): poster-scale moments.
  static TextStyle displayXl(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displayXl,
    color: color ?? _ink(context),
  );

  /// 96px display (`display-hero`): the largest poster moment.
  static TextStyle displayXxl(BuildContext context, {Color? color}) => _display(
    GeneratedCatchTypeRoleTokens.displayHero,
    color: color ?? _ink(context),
  );

  /// System title scale for functional root-screen headings.
  static TextStyle headline(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.headline,
        color: color ?? CatchTokens.of(context).ink,
      );

  // ===========================================================================
  // FUNCTION — platform system font (UI titles, body, labels, controls)

  // ===========================================================================

  /// Large UI title for sections, cards, and sheet headings.
  static TextStyle titleL(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.title,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Canonical sans section/card title.
  static TextStyle sectionTitle(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.name,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Small sans title.
  static TextStyle titleS(BuildContext context, {Color? color}) =>
      _functionStrong14(context, color: color);

  /// Canonical field value lane, including its line-height contract.
  static TextStyle fieldRowValue(
    BuildContext context, {
    required Color color,
    FontWeight? fontWeight,
  }) => CatchTextStyles.bodyLead(context, color: color).copyWith(
    fontSize: CatchFieldTokens.valueFontSize,
    fontWeight: fontWeight,
    height: CatchFieldTokens.valueLineHeight,
  );

  /// Lead-in supporting copy (slightly heavier than [supporting]).
  static TextStyle bodyLead(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.fieldValue,
        color: color ?? CatchTokens.of(context).ink2,
      );

  static TextStyle bodyL(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.body,
        color: color ?? CatchTokens.of(context).ink,
      );

  static TextStyle bodyM(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.secondary,
        color: color ?? CatchTokens.of(context).ink,
      );

  static TextStyle bodyS(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.context,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// The workhorse supporting label — dense meta, secondary copy.
  static TextStyle supporting(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.secondary,
        color: color ?? CatchTokens.of(context).ink2,
      );

  static TextStyle fieldLabel(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.fieldLabel,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Readable sentence-case status label (sans).
  static TextStyle statusLabel(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.status,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Approved floating navigation label, independent of generic buttons.
  static TextStyle navigationLabel(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.navigationLabel,
        color: color ?? CatchTokens.of(context).ink,
      );

  static TextStyle buttonSm(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.control,
        color: color ?? CatchTokens.of(context).ink,
      ).copyWith(fontWeight: FontWeight.w600);

  static TextStyle buttonMd(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.control,
        color: color ?? CatchTokens.of(context).ink,
      ).copyWith(fontWeight: FontWeight.w600);

  static TextStyle buttonLg(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.body,
        color: color ?? CatchTokens.of(context).ink,
      ).copyWith(fontWeight: FontWeight.w600);

  /// Count badge on overlapping avatars (parametric size).
  static TextStyle avatarCount(
    BuildContext context, {
    required double size,
    Color? color,
  }) => CatchFonts.sans(
    fontSize: size,
    fontWeight: FontWeight.w800,
    height: 1,
    color: color ?? CatchTokens.of(context).surface,
  );

  /// Initials inside person and activity avatars. One parametric contract keeps
  /// both avatar families aligned without feature-owned tracking expressions.
  static TextStyle avatarInitials(
    BuildContext context, {
    required double size,
    Color? color,
  }) => CatchFonts.sans(
    fontSize: size,
    fontWeight: FontWeight.w600,
    height: 1,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Initials on a palette-ground monogram. From 24px up they take the
  /// display voice (D19), as an organiser's mark does; smaller initials keep
  /// the avatar initials role.
  static TextStyle avatarMonogram(
    BuildContext context, {
    required double size,
    required Color color,
  }) => size >= _displayMinimumSize
      ? CatchFonts.voice(
          fontSize: size,
          fontWeight: _displayWeight,
          height: 1,
          letterSpacing: size * -0.02,
          color: color,
        )
      : avatarInitials(context, size: size, color: color);

  /// OTP digit boxes (`.t-code`).
  static TextStyle otpDigit(BuildContext context, {Color? color}) => _figures(
    context,
    size: 26,
    weight: FontWeight.w600,
    height: 1,
    color: color,
  );

  /// Compact tabular stat figure (sans).
  static TextStyle statCompact(BuildContext context, {Color? color}) =>
      _tabular(
        _functionProfile(
          CatchPlatformTokens.typography.secondary,
          color: color ?? CatchTokens.of(context).ink,
        ).copyWith(fontWeight: FontWeight.w700),
      );

  static TextStyle transparentInput() =>
      const TextStyle(color: Colors.transparent);

  // ===========================================================================
  // LABELS — the system's label roles (kickers, counts, badges), tabular figures
  // ===========================================================================

  /// Kicker: eyebrows and time-line labels (`label-kicker`). An owner that also
  /// enforces uppercase renders the text already upper-cased.
  static TextStyle kicker(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelKicker,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// FieldSection kicker (`label-kicker`).
  static TextStyle fieldSectionKicker(BuildContext context, {Color? color}) =>
      _label(
        GeneratedCatchTypeRoleTokens.labelKicker,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Larger kicker for editorial sashes (`label-kicker`).
  static TextStyle kickerLg(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelKicker,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Compact count paired with a section kicker (`label-badge`).
  static TextStyle sectionCount(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelBadge,
    color: color ?? CatchTokens.of(context).ink3,
  );

  /// Ticket meta, counts and compact phrases (`label-kicker`).
  static TextStyle monoLabel(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelKicker,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Label for an owner that also enforces uppercase (`label-kicker`).
  static TextStyle monoCapsLabel(BuildContext context, {Color? color}) =>
      _label(
        GeneratedCatchTypeRoleTokens.labelKicker,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Smallest label — date-rail weekday/month, micro meta (`label-badge`).
  static TextStyle monoLabelS(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelBadge,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Default mono run — pace, distance, codes, inline data.
  static TextStyle mono(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 13,
        height: 1.40,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Tabular numerals for prominent quantities (`title-row`: `6/6`, `2.3 km`).
  static TextStyle numericLarge(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.titleRow,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Smaller tabular figure for inline meta (`7 km · 4 min walk`).
  static TextStyle numericMeta(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Meta lines and timestamps (`body-meta`).
  static TextStyle meta(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.bodyMeta,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Badges and counts (`label-badge`). Nothing is set smaller.
  static TextStyle badge(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelBadge,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Badge label for an owner that also enforces uppercase (`label-badge`).
  static TextStyle badgeCaps(BuildContext context, {Color? color}) => _label(
    GeneratedCatchTypeRoleTokens.labelBadge,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Oversized tabular stat number.
  static TextStyle statDisplay(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 36,
        fontWeight: FontWeight.w700,
        height: 1,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Compact numeric seal on club cards.
  static TextStyle organizerMemberSeal(BuildContext context, {Color? color}) =>
      statusLabel(context, color: color).copyWith(height: 1.05);

  static TextStyle debugDetails(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 12,
        height: 1.35,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Icon-font style for raster-only art such as native map marker PNGs.
  ///
  /// This is deliberately not an app-text role. It preserves the font metadata
  /// carried by [icon] while keeping icon rasterization inside the design-system
  /// boundary instead of allowing feature-owned raw [TextStyle] construction.
  static TextStyle iconRasterGlyph({
    required IconData icon,
    required double size,
    required Color color,
    List<Shadow> shadows = const <Shadow>[],
  }) => TextStyle(
    color: color,
    fontFamily: icon.fontFamily,
    package: icon.fontPackage,
    fontFamilyFallback: icon.fontFamilyFallback,
    fontSize: size,
    height: 1,
    shadows: shadows,
  );

  /// Material fallback slots for unstyled framework widgets.
  ///
  /// These remain in the platform function family and live beside the semantic
  /// scale so ThemeData cannot become an independent typography source.
  static TextTheme materialTextTheme(TextTheme base, CatchTokens tokens) {
    final profile = CatchPlatformTokens.typography;
    TextStyle style(TextStyle metrics, {bool secondary = false}) =>
        _functionProfile(metrics, color: secondary ? tokens.ink2 : tokens.ink);
    return base.copyWith(
      displayLarge: style(profile.displayLarge),
      displayMedium: style(profile.displayMedium),
      displaySmall: style(profile.displaySmall),
      headlineLarge: style(profile.displayMedium),
      headlineMedium: style(profile.headline),
      headlineSmall: style(profile.title),
      titleLarge: style(profile.title),
      titleMedium: style(profile.name),
      titleSmall: style(
        profile.secondary,
      ).copyWith(fontWeight: FontWeight.w600),
      bodyLarge: style(profile.body),
      bodyMedium: style(profile.secondary),
      bodySmall: style(profile.context, secondary: true),
      labelLarge: style(profile.control),
      labelMedium: style(profile.status, secondary: true),
      labelSmall: style(profile.context, secondary: true),
    );
  }

  // ===========================================================================
  // Private builders — route through CatchFonts (which applies optical sizing).
  // ===========================================================================

  static TextStyle _functionProfile(
    TextStyle metrics, {
    required Color color,
  }) => CatchFonts.sans(
    fontSize: metrics.fontSize!,
    height: metrics.height!,
    fontWeight: metrics.fontWeight!,
    letterSpacing: metrics.letterSpacing!,
    color: color,
  );

  static TextStyle _functionStrong14(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.secondary,
        color: color ?? CatchTokens.of(context).ink,
      ).copyWith(fontWeight: FontWeight.w700);

  static TextStyle _tabular(TextStyle style) =>
      style.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);

  static TextStyle _figures(
    BuildContext context, {
    required double size,
    required FontWeight weight,
    required double height,
    Color? color,
  }) => CatchFonts.mono(
    fontSize: size,
    fontWeight: weight,
    height: height,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// A system role on the function family, with figures that align in columns.
  static TextStyle _label(TextStyle role, {required Color color}) =>
      _tabular(_functionProfile(role, color: color));

  static const FontWeight _displayWeight = FontWeight(760);

  /// Avatar initials take Archivo from 24px, the size an organiser's mark uses.
  static const double _displayMinimumSize = 24;

  static Color _ink(BuildContext context) => CatchTokens.of(context).ink;

  static TextStyle _display(TextStyle role, {required Color color}) =>
      CatchFonts.voice(
        fontSize: role.fontSize!,
        fontWeight: role.fontWeight!,
        height: role.height!,
        letterSpacing: role.letterSpacing!,
        color: color,
      );
}
