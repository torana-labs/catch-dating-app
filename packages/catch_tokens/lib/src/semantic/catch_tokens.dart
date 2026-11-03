import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:catch_tokens/src/semantic/catch_opacity.dart';
import 'package:flutter/material.dart';

/// Design tokens for Catch: the system v15 colour roles (blueprint D22), day
/// and night, with the older role names kept as aliases until P7 deletes them.
///
/// Access via `CatchTokens.of(context)` inside any widget.
/// `AppTheme` wires `light` / `dark` into [ThemeData.extensions].
@immutable
class CatchTokens extends ThemeExtension<CatchTokens> {
  const CatchTokens({
    required this.ground,
    required this.tile,
    required this.nested,
    required this.paper,
    required this.map,
    required this.scrim,
    required this.onPrimary,
    required this.controlLine,
    required this.fieldLine,
    required this.focus,
    required this.track,
    required this.switchOff,
    required this.formatRun,
    required this.formatDinner,
    required this.formatGames,
    required this.formatCourts,
    required this.formatNightsOut,
    required this.indigo,
    required this.onFormat,
    required this.tintMint,
    required this.tintYellow,
    required this.tintCoral,
    required this.tintIndigo,
    required this.tintPink,
    required this.deepMint,
    required this.deepYellow,
    required this.deepCoral,
    required this.deepIndigo,
    required this.deepPink,
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

  // ── System v15 colour roles ───────────────────────────────────────────────────

  /// Page background. Day screens are white; night screens are ink.
  final Color ground;

  /// The grey tile block and segmented tracks.
  final Color tile;

  /// Anything sitting inside a tile: chips, fields, nested boxes.
  final Color nested;

  /// Warm paper ground for website bands and the night primary button.
  final Color paper;

  /// Map ground behind pins and routes.
  final Color map;

  /// Dims the screen behind sheets and dialogs.
  final Color scrim;

  /// Label on a primary button.
  final Color onPrimary;

  /// Outline of secondary buttons, chips, icon buttons and choice cards.
  final Color controlLine;

  /// Text field outline at rest.
  final Color fieldLine;

  /// Focus ring.
  final Color focus;

  /// Meter and slider tracks on white.
  final Color track;

  /// Switch track when off.
  final Color switchOff;

  /// Runs and walks.
  final Color formatRun;

  /// Suppers and dinners.
  final Color formatDinner;

  /// Games, quizzes and trivia.
  final Color formatGames;

  /// Racket sports and courts.
  final Color formatCourts;

  /// Parties, crawls and nights out.
  final Color formatNightsOut;

  /// Person colours for avatars, placeholders and charts; never an event colour.
  final Color indigo;

  /// Text and icons on any format colour.
  final Color onFormat;

  /// Success and confirmed rows.
  final Color tintMint;

  /// Warning badges.
  final Color tintYellow;

  /// Danger and refund notes.
  final Color tintCoral;

  /// Information badges.
  final Color tintIndigo;

  /// Social labels and soft highlights.
  final Color tintPink;

  /// Text and icons on tintMint.
  final Color deepMint;

  /// Text on tintYellow.
  final Color deepYellow;

  /// Text on tintCoral and destructive text actions.
  final Color deepCoral;

  /// Text on tintIndigo.
  final Color deepIndigo;

  /// Text on tintPink.
  final Color deepPink;

  // ── Older role names: each resolves to a system role. P7 deletes the aliases. ─

  /// Alias of [tile].
  final Color bg;

  /// Alias of [ground].
  final Color surface;

  /// Alias of [nested].
  final Color raised;

  /// Alias of [scrim].
  final Color overlay;

  /// Primary text colour.
  final Color ink;

  /// Secondary text colour.
  final Color ink2;

  /// Tertiary / placeholder text colour.
  final Color ink3;

  /// Hairline divider.
  final Color line;

  /// Alias of [controlLine].
  final Color line2;

  /// Default action colour (ink in light, paper in dark).
  final Color primary;

  /// Alias of [onPrimary].
  final Color primaryInk;

  /// Alias of [tile]; the system has no soft primary.
  final Color primarySoft;

  /// Alias of [primary].
  final Color accent;

  /// Alias of [onPrimary].
  final Color accentInk;

  /// Alias of [deepMint].
  final Color success;

  /// Alias of [deepYellow].
  final Color warning;

  /// Alias of [deepCoral].
  final Color danger;

  /// Alias of [primary].
  final Color like;

  /// Alias of [ink3].
  final Color pass;

  /// Alias of [deepMint].
  final Color positiveText;

  /// Alias of [deepYellow].
  final Color attentionText;

  /// Alias of [deepPink].
  final Color affinityText;

  /// Alias of [deepCoral].
  final Color dangerText;

  /// Alias of [deepYellow].
  final Color goldText;

  /// Alias of [deepYellow].
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

  // ── Day ───────────────────────────────────────────────────────────────────────

  static const light = CatchTokens(
    ground: GeneratedCatchColorTokens.lightGround,
    tile: GeneratedCatchColorTokens.lightTile,
    nested: GeneratedCatchColorTokens.lightNested,
    paper: GeneratedCatchColorTokens.lightPaper,
    map: GeneratedCatchColorTokens.lightMap,
    scrim: GeneratedCatchColorTokens.lightScrim,
    onPrimary: GeneratedCatchColorTokens.lightOnPrimary,
    controlLine: GeneratedCatchColorTokens.lightControlLine,
    fieldLine: GeneratedCatchColorTokens.lightFieldLine,
    focus: GeneratedCatchColorTokens.lightFocus,
    track: GeneratedCatchColorTokens.lightTrack,
    switchOff: GeneratedCatchColorTokens.lightSwitchOff,
    formatRun: GeneratedCatchColorTokens.lightFormatRun,
    formatDinner: GeneratedCatchColorTokens.lightFormatDinner,
    formatGames: GeneratedCatchColorTokens.lightFormatGames,
    formatCourts: GeneratedCatchColorTokens.lightFormatCourts,
    formatNightsOut: GeneratedCatchColorTokens.lightFormatNightsOut,
    indigo: GeneratedCatchColorTokens.lightIndigo,
    onFormat: GeneratedCatchColorTokens.lightOnFormat,
    tintMint: GeneratedCatchColorTokens.lightTintMint,
    tintYellow: GeneratedCatchColorTokens.lightTintYellow,
    tintCoral: GeneratedCatchColorTokens.lightTintCoral,
    tintIndigo: GeneratedCatchColorTokens.lightTintIndigo,
    tintPink: GeneratedCatchColorTokens.lightTintPink,
    deepMint: GeneratedCatchColorTokens.lightDeepMint,
    deepYellow: GeneratedCatchColorTokens.lightDeepYellow,
    deepCoral: GeneratedCatchColorTokens.lightDeepCoral,
    deepIndigo: GeneratedCatchColorTokens.lightDeepIndigo,
    deepPink: GeneratedCatchColorTokens.lightDeepPink,
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

  // ── Night ─────────────────────────────────────────────────────────────────────

  static const dark = CatchTokens(
    ground: GeneratedCatchColorTokens.darkGround,
    tile: GeneratedCatchColorTokens.darkTile,
    nested: GeneratedCatchColorTokens.darkNested,
    paper: GeneratedCatchColorTokens.darkPaper,
    map: GeneratedCatchColorTokens.darkMap,
    scrim: GeneratedCatchColorTokens.darkScrim,
    onPrimary: GeneratedCatchColorTokens.darkOnPrimary,
    controlLine: GeneratedCatchColorTokens.darkControlLine,
    fieldLine: GeneratedCatchColorTokens.darkFieldLine,
    focus: GeneratedCatchColorTokens.darkFocus,
    track: GeneratedCatchColorTokens.darkTrack,
    switchOff: GeneratedCatchColorTokens.darkSwitchOff,
    formatRun: GeneratedCatchColorTokens.darkFormatRun,
    formatDinner: GeneratedCatchColorTokens.darkFormatDinner,
    formatGames: GeneratedCatchColorTokens.darkFormatGames,
    formatCourts: GeneratedCatchColorTokens.darkFormatCourts,
    formatNightsOut: GeneratedCatchColorTokens.darkFormatNightsOut,
    indigo: GeneratedCatchColorTokens.darkIndigo,
    onFormat: GeneratedCatchColorTokens.darkOnFormat,
    tintMint: GeneratedCatchColorTokens.darkTintMint,
    tintYellow: GeneratedCatchColorTokens.darkTintYellow,
    tintCoral: GeneratedCatchColorTokens.darkTintCoral,
    tintIndigo: GeneratedCatchColorTokens.darkTintIndigo,
    tintPink: GeneratedCatchColorTokens.darkTintPink,
    deepMint: GeneratedCatchColorTokens.darkDeepMint,
    deepYellow: GeneratedCatchColorTokens.darkDeepYellow,
    deepCoral: GeneratedCatchColorTokens.darkDeepCoral,
    deepIndigo: GeneratedCatchColorTokens.darkDeepIndigo,
    deepPink: GeneratedCatchColorTokens.darkDeepPink,
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
    Color? ground,
    Color? tile,
    Color? nested,
    Color? paper,
    Color? map,
    Color? scrim,
    Color? onPrimary,
    Color? controlLine,
    Color? fieldLine,
    Color? focus,
    Color? track,
    Color? switchOff,
    Color? formatRun,
    Color? formatDinner,
    Color? formatGames,
    Color? formatCourts,
    Color? formatNightsOut,
    Color? indigo,
    Color? onFormat,
    Color? tintMint,
    Color? tintYellow,
    Color? tintCoral,
    Color? tintIndigo,
    Color? tintPink,
    Color? deepMint,
    Color? deepYellow,
    Color? deepCoral,
    Color? deepIndigo,
    Color? deepPink,
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
    ground: ground ?? this.ground,
    tile: tile ?? this.tile,
    nested: nested ?? this.nested,
    paper: paper ?? this.paper,
    map: map ?? this.map,
    scrim: scrim ?? this.scrim,
    onPrimary: onPrimary ?? this.onPrimary,
    controlLine: controlLine ?? this.controlLine,
    fieldLine: fieldLine ?? this.fieldLine,
    focus: focus ?? this.focus,
    track: track ?? this.track,
    switchOff: switchOff ?? this.switchOff,
    formatRun: formatRun ?? this.formatRun,
    formatDinner: formatDinner ?? this.formatDinner,
    formatGames: formatGames ?? this.formatGames,
    formatCourts: formatCourts ?? this.formatCourts,
    formatNightsOut: formatNightsOut ?? this.formatNightsOut,
    indigo: indigo ?? this.indigo,
    onFormat: onFormat ?? this.onFormat,
    tintMint: tintMint ?? this.tintMint,
    tintYellow: tintYellow ?? this.tintYellow,
    tintCoral: tintCoral ?? this.tintCoral,
    tintIndigo: tintIndigo ?? this.tintIndigo,
    tintPink: tintPink ?? this.tintPink,
    deepMint: deepMint ?? this.deepMint,
    deepYellow: deepYellow ?? this.deepYellow,
    deepCoral: deepCoral ?? this.deepCoral,
    deepIndigo: deepIndigo ?? this.deepIndigo,
    deepPink: deepPink ?? this.deepPink,
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
      ground: Color.lerp(ground, other.ground, t)!,
      tile: Color.lerp(tile, other.tile, t)!,
      nested: Color.lerp(nested, other.nested, t)!,
      paper: Color.lerp(paper, other.paper, t)!,
      map: Color.lerp(map, other.map, t)!,
      scrim: Color.lerp(scrim, other.scrim, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      controlLine: Color.lerp(controlLine, other.controlLine, t)!,
      fieldLine: Color.lerp(fieldLine, other.fieldLine, t)!,
      focus: Color.lerp(focus, other.focus, t)!,
      track: Color.lerp(track, other.track, t)!,
      switchOff: Color.lerp(switchOff, other.switchOff, t)!,
      formatRun: Color.lerp(formatRun, other.formatRun, t)!,
      formatDinner: Color.lerp(formatDinner, other.formatDinner, t)!,
      formatGames: Color.lerp(formatGames, other.formatGames, t)!,
      formatCourts: Color.lerp(formatCourts, other.formatCourts, t)!,
      formatNightsOut: Color.lerp(formatNightsOut, other.formatNightsOut, t)!,
      indigo: Color.lerp(indigo, other.indigo, t)!,
      onFormat: Color.lerp(onFormat, other.onFormat, t)!,
      tintMint: Color.lerp(tintMint, other.tintMint, t)!,
      tintYellow: Color.lerp(tintYellow, other.tintYellow, t)!,
      tintCoral: Color.lerp(tintCoral, other.tintCoral, t)!,
      tintIndigo: Color.lerp(tintIndigo, other.tintIndigo, t)!,
      tintPink: Color.lerp(tintPink, other.tintPink, t)!,
      deepMint: Color.lerp(deepMint, other.deepMint, t)!,
      deepYellow: Color.lerp(deepYellow, other.deepYellow, t)!,
      deepCoral: Color.lerp(deepCoral, other.deepCoral, t)!,
      deepIndigo: Color.lerp(deepIndigo, other.deepIndigo, t)!,
      deepPink: Color.lerp(deepPink, other.deepPink, t)!,
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
