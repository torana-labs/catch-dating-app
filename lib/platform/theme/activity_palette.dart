import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The expressive "activity color" layer — the *only* chroma in Catch's
/// otherwise black-and-white system (see `docs/design_language.md` §3). One
/// confident mid-tone **pigment** per [ActivityKind]; light/dark swatches are
/// derived so the system is dark-aware and editable in exactly one place.
///
/// To re-tune the palette, edit `design/tokens/catch.tokens.json`. Everything
/// else (deep shade, soft tint, dark-mode pop) is derived.
@immutable
class ActivitySwatch {
  const ActivitySwatch({
    required this.accent,
    required this.deep,
    required this.soft,
  });

  /// Mid-tone pigment — CTAs, kickers, stamps, gradient start.
  final Color accent;

  /// Darker shade — icons on light surfaces, gradient end.
  final Color deep;

  /// Mode-aware tint — soft fills/backgrounds.
  final Color soft;

  static ActivitySwatch _derive(Color pigment, Brightness brightness) {
    final hsl = HSLColor.fromColor(pigment);
    final deep = hsl
        .withLightness((hsl.lightness - 0.13).clamp(0.0, 1.0))
        .withSaturation((hsl.saturation + 0.04).clamp(0.0, 1.0))
        .toColor();
    if (brightness == Brightness.light) {
      final soft = hsl
          .withLightness(0.93)
          .withSaturation((hsl.saturation * 0.55).clamp(0.0, 1.0))
          .toColor();
      return ActivitySwatch(accent: pigment, deep: deep, soft: soft);
    }
    // Dark: lift the accent a touch so it pops; soft becomes a deep muted tint.
    final accent = hsl
        .withLightness((hsl.lightness + 0.07).clamp(0.0, 1.0))
        .toColor();
    final soft = hsl
        .withLightness(0.22)
        .withSaturation((hsl.saturation * 0.5).clamp(0.0, 1.0))
        .toColor();
    return ActivitySwatch(accent: accent, deep: deep, soft: soft);
  }

  static ActivitySwatch lerp(ActivitySwatch a, ActivitySwatch b, double t) =>
      ActivitySwatch(
        accent: Color.lerp(a.accent, b.accent, t)!,
        deep: Color.lerp(a.deep, b.deep, t)!,
        soft: Color.lerp(a.soft, b.soft, t)!,
      );
}

/// Resolved activity design descriptor: the Flutter equivalent of the design
/// pack's `getActivity(id)` result.
@immutable
class ActivityStyle {
  const ActivityStyle({
    required this.kind,
    required this.label,
    required this.glyph,
    required this.swatch,
  });

  final ActivityKind kind;
  final String label;
  final IconData glyph;
  final ActivitySwatch swatch;

  Color get accent => swatch.accent;
  Color get deep => swatch.deep;
  Color get soft => swatch.soft;

  /// Presentation-only content supplied to the shared chip renderer.
  CatchChipData get chipData => CatchChipData(
    label: label,
    icon: glyph,
    accent: accent,
    deep: deep,
    soft: soft,
  );

  /// Presentation-only colors supplied to shared avatar renderers.
  CatchAvatarColors get avatarColors =>
      CatchAvatarColors(accent: accent, deep: deep, soft: soft);
}

@immutable
class ActivityPalette extends ThemeExtension<ActivityPalette> {
  const ActivityPalette(this.swatches);

  final Map<ActivityKind, ActivitySwatch> swatches;

  static const List<ActivityKind> activityOrder = <ActivityKind>[
    ActivityKind.socialRun,
    ActivityKind.running,
    ActivityKind.walking,
    ActivityKind.pickleball,
    ActivityKind.padel,
    ActivityKind.tennis,
    ActivityKind.badminton,
    ActivityKind.cycling,
    ActivityKind.spinClass,
    ActivityKind.yoga,
    ActivityKind.strengthTraining,
    ActivityKind.pubQuiz,
    ActivityKind.barCrawl,
    ActivityKind.dinner,
    ActivityKind.singlesMixer,
    ActivityKind.openActivity,
  ];

  /// The icon role for each activity, from `design/tokens/catch.icons.json`.
  static final Map<ActivityKind, IconData> glyphs = <ActivityKind, IconData>{
    ActivityKind.socialRun: CatchIcons.activitySocialRun,
    ActivityKind.running: CatchIcons.activityRunning,
    ActivityKind.walking: CatchIcons.activityWalking,
    ActivityKind.pickleball: CatchIcons.activityPickleball,
    ActivityKind.padel: CatchIcons.activityPadel,
    ActivityKind.tennis: CatchIcons.activityTennis,
    ActivityKind.badminton: CatchIcons.activityBadminton,
    ActivityKind.cycling: CatchIcons.activityCycling,
    ActivityKind.spinClass: CatchIcons.activitySpinClass,
    ActivityKind.yoga: CatchIcons.activityYoga,
    ActivityKind.strengthTraining: CatchIcons.activityStrengthTraining,
    ActivityKind.pubQuiz: CatchIcons.activityPubQuiz,
    ActivityKind.barCrawl: CatchIcons.activityBarCrawl,
    ActivityKind.dinner: CatchIcons.activityDinner,
    ActivityKind.singlesMixer: CatchIcons.activitySinglesMixer,
    ActivityKind.openActivity: CatchIcons.activityOpenActivity,
  };

  /// Activity pigments generated from the canonical design-token JSON
  /// (design_language §3).
  /// Confident mid-tones — bold, not candy, never beige.
  static const Map<ActivityKind, Color> pigments = <ActivityKind, Color>{
    ActivityKind.socialRun: GeneratedCatchActivityPigmentTokens.socialRun,
    ActivityKind.running: GeneratedCatchActivityPigmentTokens.running,
    ActivityKind.walking: GeneratedCatchActivityPigmentTokens.walking,
    ActivityKind.pickleball: GeneratedCatchActivityPigmentTokens.pickleball,
    ActivityKind.padel: GeneratedCatchActivityPigmentTokens.padel,
    ActivityKind.tennis: GeneratedCatchActivityPigmentTokens.tennis,
    ActivityKind.badminton: GeneratedCatchActivityPigmentTokens.badminton,
    ActivityKind.cycling: GeneratedCatchActivityPigmentTokens.cycling,
    ActivityKind.spinClass: GeneratedCatchActivityPigmentTokens.spinClass,
    ActivityKind.yoga: GeneratedCatchActivityPigmentTokens.yoga,
    ActivityKind.strengthTraining:
        GeneratedCatchActivityPigmentTokens.strengthTraining,
    ActivityKind.dinner: GeneratedCatchActivityPigmentTokens.dinner,
    ActivityKind.pubQuiz: GeneratedCatchActivityPigmentTokens.pubQuiz,
    ActivityKind.barCrawl: GeneratedCatchActivityPigmentTokens.barCrawl,
    ActivityKind.singlesMixer: GeneratedCatchActivityPigmentTokens.singlesMixer,
    ActivityKind.openActivity: GeneratedCatchActivityPigmentTokens.openActivity,
  };

  factory ActivityPalette.forBrightness(Brightness brightness) =>
      ActivityPalette(<ActivityKind, ActivitySwatch>{
        for (final entry in pigments.entries)
          entry.key: ActivitySwatch._derive(entry.value, brightness),
      });

  static final ActivityPalette light = ActivityPalette.forBrightness(
    Brightness.light,
  );
  static final ActivityPalette dark = ActivityPalette.forBrightness(
    Brightness.dark,
  );

  ActivitySwatch forKind(ActivityKind kind) =>
      swatches[kind] ?? swatches[ActivityKind.openActivity] ?? _fallback;

  ActivityStyle getActivity(ActivityKind kind) => ActivityStyle(
    kind: kind,
    label: kind.label,
    glyph: glyphs[kind] ?? glyphs[ActivityKind.openActivity]!,
    swatch: forKind(kind),
  );

  static ActivityStyle resolve(BuildContext context, ActivityKind kind) =>
      ActivityPalette.of(context).getActivity(kind);

  static final _fallback = ActivitySwatch._derive(
    GeneratedCatchActivityPigmentTokens.openActivity,
    Brightness.light,
  );

  /// Tolerant of a missing extension (e.g. bare test harnesses) — falls back to
  /// the light palette rather than throwing.
  static ActivityPalette of(BuildContext context) =>
      Theme.of(context).extension<ActivityPalette>() ?? light;

  @override
  ActivityPalette copyWith({Map<ActivityKind, ActivitySwatch>? swatches}) =>
      ActivityPalette(swatches ?? this.swatches);

  @override
  ActivityPalette lerp(ActivityPalette? other, double t) {
    if (other is! ActivityPalette) return this;
    return ActivityPalette(<ActivityKind, ActivitySwatch>{
      for (final kind in swatches.keys)
        kind: ActivitySwatch.lerp(
          swatches[kind]!,
          other.swatches[kind] ?? swatches[kind]!,
          t,
        ),
    });
  }
}
