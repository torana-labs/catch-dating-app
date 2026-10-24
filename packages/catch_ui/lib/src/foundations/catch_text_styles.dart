import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_fonts.dart';
import 'package:flutter/material.dart';

/// Display-size axis owned by the editorial recipes in [CatchTextStyles].
enum CatchTextStylesSize {
  s(22),
  m(27),
  l(32),
  xl(38);

  const CatchTextStylesSize(this.size);

  final double size;
}

/// Catch's typographic scale — one principled hierarchy across three roles:
/// Archivo for *voice/head* (brand display, heroes, deliberate poster moments),
/// the platform system font for *function* (body, controls, names, dense UI),
/// and IBM Plex Mono for *data* (kickers, numerics, labels).
///
/// **Fidelity rules** (`docs/design_language.md` and the generated design
/// context pack):
/// - Archivo is the roman-only display voice. It is not used for long-form or
///   user-authored reading text.
/// - Display/body tracking is zero by default. Uppercase mono roles own their
///   explicit tracking here, and the welcome reel owns one named `-0.5` parity
///   exception.
/// - Body/prose roles use the platform system font with generous leading.
///
/// **Scale discipline:** dramatic jumps in the display tier (no near-duplicate
/// mid-sizes); fine steps only where function needs them (labels/body).
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

  static const double _kickerTracking = 1.76; // 0.16em at 11px.
  static const double _kickerLargeTracking = 2.16; // 0.18em at 12px.
  static const double _monoCapsTracking = 1.43; // 0.13em at 11px.
  static const double _badgeCapsTracking = 0.72; // 0.08em at 9px.

  // ===========================================================================
  // VOICE — Archivo (brand display and deliberate poster moments)
  // ===========================================================================

  /// Biggest brand moment — onboarding/celebration impact, live countdowns.
  static TextStyle display(BuildContext context, {Color? color}) => _voice(
    context,
    size: 44,
    weight: FontWeight.w600,
    height: 0.98,
    color: color,
  );

  /// System title scale for functional root-screen headings.
  static TextStyle headline(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.headline,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Smaller brand headline — a step under [headline].
  static TextStyle headlineS(BuildContext context, {Color? color}) => _voice(
    context,
    size: 26,
    weight: FontWeight.w600,
    height: 1.10,
    color: color,
  );

  /// Welcome reel and fixed Catch word — the single approved negative-tracking
  /// display exception from `splash_welcome_spec.md`.
  static TextStyle welcomeReelHeadline(BuildContext context, {Color? color}) =>
      _voice(
        context,
        size: 36,
        weight: FontWeight.w600,
        height: 1.02,
        letterSpacing: -0.5,
        color: color,
      );

  /// Brand-led onboarding introduction copy. This is intentionally Archivo;
  /// ordinary app prose remains in the platform function family.
  static TextStyle welcomeIntroBody(BuildContext context, {Color? color}) =>
      _voice(
        context,
        size: 15,
        weight: FontWeight.w400,
        height: 1.48,
        color: color,
      );

  /// Editorial club identity treatment on the named display-step scale.
  static TextStyle clubDisplay(
    BuildContext context, {
    required CatchTextStylesSize step,
    double height = 1.0,
    Color? color,
    FontWeight weight = FontWeight.w600,
  }) {
    return CatchFonts.voice(
      fontSize: step.size,
      fontWeight: weight,
      height: height,
      color: color ?? CatchTokens.of(context).ink,
    );
  }

  /// Ticket/event identity treatment on the named display-step scale.
  static TextStyle eventDisplay(
    BuildContext context, {
    required CatchTextStylesSize step,
    double height = 1.0,
    Color? color,
    FontWeight weight = FontWeight.w600,
  }) {
    return CatchFonts.voice(
      fontSize: step.size,
      fontWeight: weight,
      height: height,
      color: color ?? CatchTokens.of(context).ink,
    );
  }

  /// Condensed poster title (`.t-event-title`).
  static TextStyle eventTitle(BuildContext context, {Color? color}) =>
      CatchFonts.head(
        fontSize: 36,
        height: 1,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Host live-console title (`.t-console-title`).
  static TextStyle consoleTitle(BuildContext context, {Color? color}) =>
      CatchFonts.head(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        height: 1.15,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Condensed hint/list copy (`.t-hint`).
  static TextStyle hint(BuildContext context, {Color? color}) =>
      CatchFonts.head(
        fontSize: 16.5,
        fontWeight: FontWeight.w600,
        height: 1.25,
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
  }) => CatchTextStyles.fieldRowTitle(context, color: color).copyWith(
    fontSize: CatchFieldTokens.valueFontSize,
    fontWeight: fontWeight,
    height: CatchFieldTokens.valueLineHeight,
  );

  /// CatchField primary text (`.t-title-s` in the design handoff).
  static TextStyle fieldRowTitle(BuildContext context, {Color? color}) =>
      _functionProfile(
        CatchPlatformTokens.typography.fieldValue,
        color: color ?? CatchTokens.of(context).ink,
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

  static TextStyle labelL(BuildContext context, {Color? color}) =>
      _functionStrong14(context, color: color);

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

  /// OTP digit boxes (`.t-code`).
  static TextStyle otpDigit(BuildContext context, {Color? color}) => _mono(
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
  // DATA — IBM Plex Mono (kickers, numerics, labels)
  // ===========================================================================

  /// Uppercase kicker — eyebrows, time-line labels (`TONIGHT · 8:50 PM`).
  /// Render text already upper-cased; this sets weight, size, and leading.
  static TextStyle kicker(BuildContext context, {Color? color}) => _mono(
    context,
    size: 11,
    weight: FontWeight.w700,
    height: 1.15,
    letterSpacing: _kickerTracking,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Exact FieldSection kicker from the canonical Field handoff.
  static TextStyle fieldSectionKicker(BuildContext context, {Color? color}) =>
      _mono(
        context,
        size: CatchFieldTokens.sectionKickerFontSize,
        weight: FontWeight.w600,
        height: 1.15,
        letterSpacing: CatchFieldTokens.sectionKickerLetterSpacing,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Larger uppercase kicker for editorial sashes (`TONIGHT'S PICK`).
  static TextStyle kickerLg(BuildContext context, {Color? color}) => _mono(
    context,
    size: 12,
    weight: FontWeight.w700,
    height: 1.1,
    letterSpacing: _kickerLargeTracking,
    color: color ?? CatchTokens.of(context).ink,
  );

  /// Compact count paired with a section kicker in the field handoff.
  static TextStyle sectionCount(BuildContext context, {Color? color}) => _mono(
    context,
    size: CatchFieldTokens.sectionCountFontSize,
    weight: FontWeight.w600,
    height: 1.15,
    letterSpacing: CatchFieldTokens.sectionCountLetterSpacing,
    color: color ?? CatchTokens.of(context).ink3,
  );

  /// Sentence/data mono label — ticket meta, counts, and compact phrases.
  /// This role is deliberately untracked because its content is not caps-only.
  static TextStyle monoLabel(BuildContext context, {Color? color}) => _mono(
    context,
    size: 11,
    weight: FontWeight.w600,
    height: 1.15,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Uppercase mono label. Use through an owner that also enforces uppercase.
  static TextStyle monoCapsLabel(BuildContext context, {Color? color}) => _mono(
    context,
    size: 11,
    weight: FontWeight.w600,
    height: 1.15,
    letterSpacing: _monoCapsTracking,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Smallest mono label — date-rail weekday/month, micro meta.
  static TextStyle monoLabelS(BuildContext context, {Color? color}) => _mono(
    context,
    size: 10,
    weight: FontWeight.w700,
    height: 1.15,
    color: color ?? CatchTokens.of(context).ink2,
  );

  /// Default mono run — pace, distance, codes, inline data.
  static TextStyle mono(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 13,
        height: 1.40,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Tabular numerals for prominent quantities (`6/6`, `2.3 km`).
  static TextStyle numericLarge(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        height: 1.2,
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

  /// Compact mono meta (`.t-meta`).
  static TextStyle meta(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 10.5,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: color ?? CatchTokens.of(context).ink2,
      );

  /// Tiny status badge label (`.t-badge`).
  static TextStyle badge(BuildContext context, {Color? color}) =>
      CatchFonts.mono(
        fontSize: 9,
        fontWeight: FontWeight.w700,
        height: 1.1,
        color: color ?? CatchTokens.of(context).ink,
      );

  /// Tiny uppercase status badge label (`.t-badge`).
  static TextStyle badgeCaps(BuildContext context, {Color? color}) => _mono(
    context,
    size: 9,
    weight: FontWeight.w700,
    height: 1.1,
    letterSpacing: _badgeCapsTracking,
    color: color,
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
  static TextStyle clubMemberSeal(BuildContext context, {Color? color}) =>
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

  static TextStyle _voice(
    BuildContext context, {
    required double size,
    required FontWeight weight,
    required double height,
    double letterSpacing = 0,
    Color? color,
  }) => CatchFonts.voice(
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: letterSpacing,
    color: color ?? CatchTokens.of(context).ink,
  );

  static TextStyle _mono(
    BuildContext context, {
    required double size,
    required FontWeight weight,
    required double height,
    double letterSpacing = 0,
    Color? color,
  }) => CatchFonts.mono(
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: letterSpacing,
    color: color ?? CatchTokens.of(context).ink,
  );
}
