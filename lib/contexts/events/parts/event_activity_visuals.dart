import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:flutter/material.dart';

/// Presentation-only visual taxonomy for event activity surfaces.
///
/// This is intentionally separate from the persisted event schema. Production
/// events stay keyed by [ActivityKind], while the colors, patterns, labels, and
/// glyph choices here can evolve as the Explore direction matures.
enum EventActivityPattern {
  routeDots,
  routeDashes,
  stepDots,
  courtLines,
  glassGrid,
  courtArcs,
  shuttleStrokes,
  wheelArcs,
  rhythmRings,
  mandalaArcs,
  barMarks,
  plateCircles,
  quizCards,
  neonDots,
  overlapCircles,
  stampGrid,
}

class EventActivityVisualSpec {
  const EventActivityVisualSpec({
    required this.activityKind,
    required this.label,
    required this.colors,
    required this.pattern,
  });

  final ActivityKind activityKind;
  final String label;
  final List<Color> colors;
  final EventActivityPattern pattern;

  Color get accent => colors.first;
  Color get deep => colors.length > 1 ? colors[1] : colors.first;
  Color get soft => colors.last;
  IconData get icon => activityKindGlyph(activityKind);
}

IconData activityKindGlyph(ActivityKind activityKind) {
  return ActivityPalette.glyphs[activityKind] ??
      ActivityPalette.glyphs[ActivityKind.openActivity]!;
}

const primaryBrowseActivityKinds = <ActivityKind>[
  ActivityKind.socialRun,
  ActivityKind.walking,
  ActivityKind.pickleball,
  ActivityKind.padel,
  ActivityKind.tennis,
  ActivityKind.badminton,
  ActivityKind.cycling,
  ActivityKind.spinClass,
  ActivityKind.yoga,
  ActivityKind.dinner,
  ActivityKind.pubQuiz,
  ActivityKind.barCrawl,
  ActivityKind.singlesMixer,
  ActivityKind.openActivity,
];

const allActivityKindsForVisuals = <ActivityKind>[
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
  ActivityKind.dinner,
  ActivityKind.pubQuiz,
  ActivityKind.barCrawl,
  ActivityKind.singlesMixer,
  ActivityKind.openActivity,
];

/// Resolves the presentation spec for [kind]. Colors come from the centralized,
/// dark-aware [ActivityPalette] (design_language §3); label + pattern are
/// mode-independent metadata. The required [context] resolves both the active
/// palette and locale at the presentation boundary.
EventActivityVisualSpec eventActivityVisual(
  ActivityKind kind, {
  required BuildContext context,
}) {
  final swatch = ActivityPalette.of(context).forKind(kind);
  final meta = _activityMeta(kind, context.l10n);
  return EventActivityVisualSpec(
    activityKind: kind,
    label: meta.label,
    colors: <Color>[swatch.accent, swatch.deep, swatch.soft],
    pattern: meta.pattern,
  );
}

typedef _ActivityMeta = ({String label, EventActivityPattern pattern});

_ActivityMeta _activityMeta(ActivityKind kind, AppLocalizations l10n) =>
    switch (kind) {
      ActivityKind.socialRun => (
        label: l10n.coreEventActivityVisualsLabelSocialRun,
        pattern: EventActivityPattern.routeDots,
      ),
      ActivityKind.running => (
        label: l10n.coreEventActivityVisualsLabelRunning,
        pattern: EventActivityPattern.routeDashes,
      ),
      ActivityKind.walking => (
        label: l10n.coreEventActivityVisualsLabelWalking,
        pattern: EventActivityPattern.stepDots,
      ),
      ActivityKind.pickleball => (
        label: l10n.coreEventActivityVisualsLabelPickleball,
        pattern: EventActivityPattern.courtLines,
      ),
      ActivityKind.padel => (
        label: l10n.coreEventActivityVisualsLabelPadel,
        pattern: EventActivityPattern.glassGrid,
      ),
      ActivityKind.tennis => (
        label: l10n.coreEventActivityVisualsLabelTennis,
        pattern: EventActivityPattern.courtArcs,
      ),
      ActivityKind.badminton => (
        label: l10n.coreEventActivityVisualsLabelBadminton,
        pattern: EventActivityPattern.shuttleStrokes,
      ),
      ActivityKind.cycling => (
        label: l10n.coreEventActivityVisualsLabelCycling,
        pattern: EventActivityPattern.wheelArcs,
      ),
      ActivityKind.spinClass => (
        label: l10n.coreEventActivityVisualsLabelSpinClass,
        pattern: EventActivityPattern.rhythmRings,
      ),
      ActivityKind.yoga => (
        label: l10n.coreEventActivityVisualsLabelYoga,
        pattern: EventActivityPattern.mandalaArcs,
      ),
      ActivityKind.strengthTraining => (
        label: l10n.coreEventActivityVisualsLabelStrength,
        pattern: EventActivityPattern.barMarks,
      ),
      ActivityKind.dinner => (
        label: l10n.coreEventActivityVisualsLabelDinner,
        pattern: EventActivityPattern.plateCircles,
      ),
      ActivityKind.pubQuiz => (
        label: l10n.coreEventActivityVisualsLabelPubQuiz,
        pattern: EventActivityPattern.quizCards,
      ),
      ActivityKind.barCrawl => (
        label: l10n.coreEventActivityVisualsLabelBarCrawl,
        pattern: EventActivityPattern.neonDots,
      ),
      ActivityKind.singlesMixer => (
        label: l10n.coreEventActivityVisualsLabelSinglesMixer,
        pattern: EventActivityPattern.overlapCircles,
      ),
      ActivityKind.openActivity => (
        label: l10n.coreEventActivityVisualsLabelOpenFormat,
        pattern: EventActivityPattern.stampGrid,
      ),
    };
