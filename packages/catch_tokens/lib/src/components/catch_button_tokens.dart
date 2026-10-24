import 'package:catch_tokens/src/primitives/catch_radius.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';
import 'package:catch_tokens/src/primitives/catch_stroke.dart';

/// Exact component tokens for CatchButton (UI blueprint D20).
///
/// One shape, three heights and one state model for every labelled action.
/// The web reads the same values as `--catch-button-*`.
abstract final class CatchButtonTokens {
  /// Every button draws 4px corners; pills belong to chips and filters.
  static const double radius = CatchRadius.xs;

  static const double largeHeight = CatchSpacing.s12;
  static const double mediumHeight = CatchSpacing.s10;
  static const double smallHeight = CatchSpacing.s8;

  static const double largePaddingX = CatchSpacing.s5;
  static const double mediumPaddingX = CatchSpacing.s4;
  static const double smallPaddingX = CatchSpacing.s3;

  /// Label-colour overlays painted over the fill.
  static const double hoverFilledAlpha = 0.08;
  static const double hoverOutlineAlpha = 0.05;
  static const double pressedAlpha = 0.14;

  /// Press feedback; skipped when the platform asks for reduced motion.
  static const double pressedScale = 0.97;

  static const double disabledOpacity = 0.4;

  /// Keyboard focus ring, drawn outside the button so focus never moves layout.
  static const double focusRingWidth = CatchStroke.focusRing;
  static const double focusRingOffset = CatchSpacing.micro2;
  static const double focusRingOutset = focusRingOffset + focusRingWidth;
}
