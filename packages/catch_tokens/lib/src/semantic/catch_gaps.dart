import 'package:catch_tokens/generated/catch_design_tokens.g.dart';

/// Semantic vertical and horizontal gaps for common layout relationships.
///
/// Generated from the `gap` group in `design/tokens/catch.tokens.json`, which
/// the web reads as `--catch-gap-*`. Use `CatchSpacing` for primitive math
/// inside reusable components. Feature screens should prefer these
/// relationship tokens so the code says why a gap exists, not only how large
/// it is.
abstract final class CatchGaps {
  /// Tight icon/label or metadata pair spacing.
  static const double inline = GeneratedCatchGapTokens.inline;

  /// Gap between a screen-header title and the kicker/subtitle paired with it
  /// (browse-header title→subtitle, Home dashboard eyebrow→title). Centralises
  /// the subtitle-to-title relationship of the shared root-screen header rhythm.
  static const double headerTitleToSubtitle =
      GeneratedCatchGapTokens.headerTitleToSubtitle;

  /// Distance between closely related rows inside the same content cluster.
  static const double related = GeneratedCatchGapTokens.related;

  /// Standard gap between controls in one form or settings group.
  static const double formField = GeneratedCatchGapTokens.formField;

  /// Gap between peer sections on phones (`layout.sectionGapCompact`); P7
  /// deletes this alias.
  static const double section = GeneratedCatchGapTokens.section;

  /// Extra separation between major page regions.
  static const double majorSection = GeneratedCatchGapTokens.majorSection;
}
