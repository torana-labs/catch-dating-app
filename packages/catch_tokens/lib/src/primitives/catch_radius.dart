import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';

/// Corner radius constants from the design-system radius scale.
abstract final class CatchRadius {
  static const double none = GeneratedCatchRadiusTokens.none;
  static const double xs = GeneratedCatchRadiusTokens.xs;
  static const double sm = GeneratedCatchRadiusTokens.sm;
  static const double md = GeneratedCatchRadiusTokens.md;
  static const double lg = GeneratedCatchRadiusTokens.lg;
  static const double xl = GeneratedCatchRadiusTokens.xl;
  static const double profileHeroBottom = CatchSpacing.s7;
  static const double segmentedInner = CatchSpacing.micro18;
  static const double segmentedOuter = 22.0;
  static const double infoTile = 10.0;

  /// Alias of [sm]; P7 deletes it.
  static const double interactiveTile =
      GeneratedCatchRadiusTokens.interactiveTile;
  static const double heroCard = 22.0;
  static const double profilePhotoBottom = 30.0;
  static const double attendedEventTile = 18.0;
  static const double pill = GeneratedCatchRadiusTokens.pill;
}
