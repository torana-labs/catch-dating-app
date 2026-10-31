import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:catch_tokens/src/semantic/catch_opacity.dart';
import 'package:flutter/material.dart';

/// Design tokens for Catch — B&W editorial palette (paper + ink).
/// No brand accent; color is reserved for activity meaning (§3 of
/// design_language.md).
///
/// Access via `CatchTokens.of(context)` inside any widget.
/// `AppTheme` wires `light` / `dark` into [ThemeData.extensions].
@immutable
class CatchTokens extends ThemeExtension<CatchTokens> {
  const CatchTokens({
    required this.bg,
    required this.surface,
    required this.raised,
    required this.overlay,
    required this.ink,
    required this.ink2,
    required this.ink3,
    required this.line,
    required this.line2,
    required this.primary,
    required this.primaryInk,
    required this.primarySoft,
    required this.accent,
    required this.accentInk,
    required this.success,
    required this.warning,
    required this.danger,
    required this.like,
    required this.pass,
    required this.positiveText,
    required this.attentionText,
    required this.affinityText,
    required this.dangerText,
    required this.goldText,
    required this.gold,
    required this.heroGrad,
  });

  // ── Semantic colour roles ─────────────────────────────────────────────────────

  /// App background (cool gallery off-white in light mode).
  final Color bg;

  /// Card / modal surface.
  final Color surface;

  /// Slightly raised surface (e.g. input backgrounds).
  final Color raised;

  /// Modal scrim / overlay.
  final Color overlay;

  /// Primary text colour.
  final Color ink;

  /// Secondary text colour.
  final Color ink2;

  /// Tertiary / placeholder text colour.
  final Color ink3;

  /// Hairline divider.
  final Color line;

  /// Slightly heavier divider.
  final Color line2;

  /// Default action colour (ink in light, paper in dark).
  final Color primary;

  /// Text/icon colour on top of [primary] fills.
  final Color primaryInk;

  /// Tinted background for soft primary containers (chips, badges).
  final Color primarySoft;

  /// Compatibility alias for the default action colour.
  final Color accent;

  /// Text/icon colour on top of [accent] fills.
  final Color accentInk;

  /// Positive state colour.
  final Color success;

  /// Warning / attention state colour.
  final Color warning;

  /// Error / destructive state colour.
  final Color danger;

  /// Swipe-like affordance colour.
  final Color like;

  /// Swipe-pass affordance colour.
  final Color pass;

  /// Gold / highlight colour (streak, achievement).
  /// Readable categorical status foreground, paired with a subtle fill.
  final Color positiveText;

  /// Readable categorical status foreground, paired with a subtle fill.
  final Color attentionText;

  /// Readable categorical status foreground, paired with a subtle fill.
  final Color affinityText;

  /// Readable destructive text on neutral surfaces and badge tints.
  final Color dangerText;

  /// Readable gold text on neutral surfaces and badge tints.
  final Color goldText;

  final Color gold;

  /// Deprecated compatibility gradient for older surfaces. New event/club hero
  /// artwork should derive from the activity registry.
  final Gradient heroGrad;

  // ── Convenience accessor ──────────────────────────────────────────────────────

  /// Fixed absolute black for editorial overlays and scrims.
  static const Color editorialBlack = Color(0xFF000000);

  /// Fixed absolute white for editorial overlays and scrims.
  static const Color editorialWhite = Color(0xFFFFFFFF);

  static CatchTokens of(BuildContext context) =>
      Theme.of(context).extension<CatchTokens>()!;

  /// Legible foreground for arbitrary filled surfaces such as activity colors.
  Color onFill(Color fill) =>
      ThemeData.estimateBrightnessForColor(fill) == Brightness.dark
      ? editorialWhite
      : ink;

  /// Muted foreground for secondary text on arbitrary filled surfaces.
  Color onFillMuted(Color fill) =>
      onFill(fill).withValues(alpha: CatchOpacity.onFillMuted);

  /// Dashed divider tone used by ticket/perforation treatments.
  Color get ticketPerforationLine =>
      ink.withValues(alpha: CatchOpacity.ticketPerforationLine);

  /// Fixed editorial dark fill for badges/pills that intentionally remain dark
  /// regardless of app theme.
  Color get darkPillFill =>
      editorialBlack.withValues(alpha: CatchOpacity.darkPillFill);

  /// Fixed dark scrim for text overlays on image/activity backdrops.
  Color get darkScrimFill =>
      editorialBlack.withValues(alpha: CatchOpacity.scrimFill);

  /// Foreground for fixed editorial dark pills.
  Color get darkPillInk => editorialWhite;

  /// Muted foreground on fixed editorial dark overlays.
  Color get darkMutedInk =>
      editorialWhite.withValues(alpha: CatchOpacity.onDarkMuted);

  /// Opaque-looking surface treatment for labelled controls that float above
  /// scrollable content while still allowing a hint of the backdrop through.
  Color get floatingPillFill =>
      surface.withValues(alpha: CatchOpacity.floatingPillFill);

  // ── Paper/ink palette — light (launch default) ───────────────────────────────

  // B&W base — light (browse/forms register)
  static const light = CatchTokens(
    bg: GeneratedCatchColorTokens.lightBg,
    surface: GeneratedCatchColorTokens.lightSurface,
    raised: GeneratedCatchColorTokens.lightRaised,
    overlay: GeneratedCatchColorTokens.lightOverlay,
    ink: GeneratedCatchColorTokens.lightInk,
    ink2: GeneratedCatchColorTokens.lightInk2,
    ink3: GeneratedCatchColorTokens.lightInk3,
    line: GeneratedCatchColorTokens.lightLine,
    line2: GeneratedCatchColorTokens.lightLine2,
    primary: GeneratedCatchColorTokens.lightPrimary, // default action = ink
    primaryInk: GeneratedCatchColorTokens.lightPrimaryInk,
    primarySoft: GeneratedCatchColorTokens.lightPrimarySoft,
    // no brand accent; activity color overrides contextually
    accent: GeneratedCatchColorTokens.lightAccent,
    accentInk: GeneratedCatchColorTokens.lightAccentInk,
    success: GeneratedCatchColorTokens.lightSuccess,
    warning: GeneratedCatchColorTokens.lightWarning,
    danger: GeneratedCatchColorTokens.lightDanger,
    like: GeneratedCatchColorTokens.lightLike,
    pass: GeneratedCatchColorTokens.lightPass,
    positiveText: GeneratedCatchColorTokens.lightPositiveText,
    attentionText: GeneratedCatchColorTokens.lightAttentionText,
    affinityText: GeneratedCatchColorTokens.lightAffinityText,
    dangerText: GeneratedCatchColorTokens.lightDangerText,
    goldText: GeneratedCatchColorTokens.lightGoldText,
    gold: GeneratedCatchColorTokens.lightGold,
    // deprecated: hero gradients now derive from ActivityPalette
    heroGrad: GeneratedCatchGradientTokens.lightHeroGrad,
  );

  // ── Paper/ink palette — dark ("wow" surfaces) ───────────────────────────────

  // B&W base — dark (wow surfaces)
  static const dark = CatchTokens(
    bg: GeneratedCatchColorTokens.darkBg,
    surface: GeneratedCatchColorTokens.darkSurface,
    raised: GeneratedCatchColorTokens.darkRaised,
    overlay: GeneratedCatchColorTokens.darkOverlay,
    ink: GeneratedCatchColorTokens.darkInk,
    ink2: GeneratedCatchColorTokens.darkInk2,
    ink3: GeneratedCatchColorTokens.darkInk3,
    line: GeneratedCatchColorTokens.darkLine,
    line2: GeneratedCatchColorTokens.darkLine2,
    primary:
        GeneratedCatchColorTokens.darkPrimary, // default action = paper on dark
    primaryInk: GeneratedCatchColorTokens.darkPrimaryInk,
    primarySoft: GeneratedCatchColorTokens.darkPrimarySoft,
    accent: GeneratedCatchColorTokens.darkAccent,
    accentInk: GeneratedCatchColorTokens.darkAccentInk,
    success: GeneratedCatchColorTokens.darkSuccess,
    warning: GeneratedCatchColorTokens.darkWarning,
    danger: GeneratedCatchColorTokens.darkDanger,
    like: GeneratedCatchColorTokens.darkLike,
    pass: GeneratedCatchColorTokens.darkPass,
    positiveText: GeneratedCatchColorTokens.darkPositiveText,
    attentionText: GeneratedCatchColorTokens.darkAttentionText,
    affinityText: GeneratedCatchColorTokens.darkAffinityText,
    dangerText: GeneratedCatchColorTokens.darkDangerText,
    goldText: GeneratedCatchColorTokens.darkGoldText,
    gold: GeneratedCatchColorTokens.darkGold,
    heroGrad: GeneratedCatchGradientTokens.darkHeroGrad,
  );

  /// B&W editorial light token set.
  static const editorialLight = light;

  /// B&W editorial dark token set.
  static const editorialDark = dark;

  // ── ThemeExtension boilerplate ────────────────────────────────────────────────

  @override
  CatchTokens copyWith({
    Color? bg,
    Color? surface,
    Color? raised,
    Color? overlay,
    Color? ink,
    Color? ink2,
    Color? ink3,
    Color? line,
    Color? line2,
    Color? primary,
    Color? primaryInk,
    Color? primarySoft,
    Color? accent,
    Color? accentInk,
    Color? success,
    Color? warning,
    Color? danger,
    Color? like,
    Color? pass,
    Color? positiveText,
    Color? attentionText,
    Color? affinityText,
    Color? dangerText,
    Color? goldText,
    Color? gold,
    Gradient? heroGrad,
  }) => CatchTokens(
    bg: bg ?? this.bg,
    surface: surface ?? this.surface,
    raised: raised ?? this.raised,
    overlay: overlay ?? this.overlay,
    ink: ink ?? this.ink,
    ink2: ink2 ?? this.ink2,
    ink3: ink3 ?? this.ink3,
    line: line ?? this.line,
    line2: line2 ?? this.line2,
    primary: primary ?? this.primary,
    primaryInk: primaryInk ?? this.primaryInk,
    primarySoft: primarySoft ?? this.primarySoft,
    accent: accent ?? this.accent,
    accentInk: accentInk ?? this.accentInk,
    success: success ?? this.success,
    warning: warning ?? this.warning,
    danger: danger ?? this.danger,
    like: like ?? this.like,
    pass: pass ?? this.pass,
    positiveText: positiveText ?? this.positiveText,
    attentionText: attentionText ?? this.attentionText,
    affinityText: affinityText ?? this.affinityText,
    dangerText: dangerText ?? this.dangerText,
    goldText: goldText ?? this.goldText,
    gold: gold ?? this.gold,
    heroGrad: heroGrad ?? this.heroGrad,
  );

  @override
  CatchTokens lerp(CatchTokens? other, double t) {
    if (other is! CatchTokens) return this;
    return CatchTokens(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      raised: Color.lerp(raised, other.raised, t)!,
      overlay: Color.lerp(overlay, other.overlay, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      ink2: Color.lerp(ink2, other.ink2, t)!,
      ink3: Color.lerp(ink3, other.ink3, t)!,
      line: Color.lerp(line, other.line, t)!,
      line2: Color.lerp(line2, other.line2, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      primaryInk: Color.lerp(primaryInk, other.primaryInk, t)!,
      primarySoft: Color.lerp(primarySoft, other.primarySoft, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentInk: Color.lerp(accentInk, other.accentInk, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      like: Color.lerp(like, other.like, t)!,
      pass: Color.lerp(pass, other.pass, t)!,
      positiveText: Color.lerp(positiveText, other.positiveText, t)!,
      attentionText: Color.lerp(attentionText, other.attentionText, t)!,
      affinityText: Color.lerp(affinityText, other.affinityText, t)!,
      dangerText: Color.lerp(dangerText, other.dangerText, t)!,
      goldText: Color.lerp(goldText, other.goldText, t)!,
      gold: Color.lerp(gold, other.gold, t)!,
      heroGrad: Gradient.lerp(heroGrad, other.heroGrad, t)!,
    );
  }
}
