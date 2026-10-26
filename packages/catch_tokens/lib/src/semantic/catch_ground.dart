import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:flutter/painting.dart';

/// A Website v2 ground from the palette tokens (CAT-245): a fill with the ink
/// and secondary ink that clear AA on it. `@catch/web-ui` names the same nine
/// grounds in the same order as `CatchGround`.
enum CatchGround {
  white(
    GeneratedCatchGroundTokens.whiteFill,
    GeneratedCatchGroundTokens.whiteInk,
    GeneratedCatchGroundTokens.whiteInkSecondary,
  ),
  paper(
    GeneratedCatchGroundTokens.paperFill,
    GeneratedCatchGroundTokens.paperInk,
    GeneratedCatchGroundTokens.paperInkSecondary,
  ),
  ink(
    GeneratedCatchGroundTokens.inkFill,
    GeneratedCatchGroundTokens.inkInk,
    GeneratedCatchGroundTokens.inkInkSecondary,
  ),
  coral(
    GeneratedCatchGroundTokens.coralFill,
    GeneratedCatchGroundTokens.coralInk,
    GeneratedCatchGroundTokens.coralInkSecondary,
  ),
  pink(
    GeneratedCatchGroundTokens.pinkFill,
    GeneratedCatchGroundTokens.pinkInk,
    GeneratedCatchGroundTokens.pinkInkSecondary,
  ),
  yellow(
    GeneratedCatchGroundTokens.yellowFill,
    GeneratedCatchGroundTokens.yellowInk,
    GeneratedCatchGroundTokens.yellowInkSecondary,
  ),
  mint(
    GeneratedCatchGroundTokens.mintFill,
    GeneratedCatchGroundTokens.mintInk,
    GeneratedCatchGroundTokens.mintInkSecondary,
  ),
  indigo(
    GeneratedCatchGroundTokens.indigoFill,
    GeneratedCatchGroundTokens.indigoInk,
    GeneratedCatchGroundTokens.indigoInkSecondary,
  ),
  magenta(
    GeneratedCatchGroundTokens.magentaFill,
    GeneratedCatchGroundTokens.magentaInk,
    GeneratedCatchGroundTokens.magentaInkSecondary,
  );

  const CatchGround(this.fillColor, this.inkColor, this.secondaryInkColor);

  final Color fillColor;

  /// Text and glyphs on the ground.
  final Color inkColor;

  /// Supporting text on the ground.
  final Color secondaryInkColor;

  /// The ink ground carries light text; every other ground carries dark text.
  bool get isDark => this == CatchGround.ink;
}
