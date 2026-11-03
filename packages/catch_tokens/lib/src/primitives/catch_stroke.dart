import 'package:catch_tokens/generated/catch_design_tokens.g.dart';

/// Stroke widths that are part of reusable component geometry.
abstract final class CatchStroke {
  static const double hairline = GeneratedCatchStrokeTokens.hairline;

  /// Control outlines.
  static const double control = GeneratedCatchStrokeTokens.control;

  /// Focus ring.
  static const double focus = GeneratedCatchStrokeTokens.focus;

  /// Selected choice cards and avatar rings.
  static const double selected = GeneratedCatchStrokeTokens.selected;
  static const double meterSm = GeneratedCatchStrokeTokens.meterSm;
  static const double meterMd = GeneratedCatchStrokeTokens.meterMd;
  static const double meterLg = GeneratedCatchStrokeTokens.meterLg;

  static const double emphasis = GeneratedCatchStrokeTokens.emphasis;
  static const double progressIndicator =
      GeneratedCatchStrokeTokens.progressIndicator;
  static const double avatarRing = GeneratedCatchStrokeTokens.avatarRing;

  /// Typographic underline compatibility alias. Border emphasis should use
  /// `CatchBorderRole.selected`, `CatchBorderRole.danger`, or
  /// `CatchBorderRole.warning` instead of selecting this width directly.
  static const double underline = GeneratedCatchStrokeTokens.underline;
  static const double focusRing = GeneratedCatchStrokeTokens.focusRing;
  static const double selection = GeneratedCatchStrokeTokens.selection;
  static const double passProgress = GeneratedCatchStrokeTokens.passProgress;
}
