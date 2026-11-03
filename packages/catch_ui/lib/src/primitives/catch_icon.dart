import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';

/// One icon role from `CatchIcons`, at 16, 18, 20 or 24.
///
/// It takes the colour of the text around it: the [IconTheme] that
/// [CatchRoot] and the ground scopes set. There is no tone. Without a [label]
/// the icon is decorative and hidden from screen readers; with one it is a
/// labelled image. React's `CatchIcon` names the same role as a string.
///
/// The web draws a 2px stroke up to 20 and 1.75 at 24; a glyph font has no
/// stroke to set, so Flutter draws the Lucide glyphs as they are.
class CatchIcon extends StatelessWidget {
  const CatchIcon(
    this.icon, {
    super.key,
    this.size = CatchIconSize.control,
    this.label,
  }) : assert(
         size == CatchIconSize.xs ||
             size == CatchIconSize.md ||
             size == CatchIconSize.control ||
             size == CatchIconSize.lg,
         'CatchIcon size is 16, 18, 20 or 24.',
       );

  /// A role from `CatchIcons`.
  final IconData icon;

  /// 16 ([CatchIconSize.xs]), 18 ([CatchIconSize.md]), 20
  /// ([CatchIconSize.control], the default) or 24 ([CatchIconSize.lg]).
  final double size;

  /// Read aloud; leave null for a decorative icon.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final glyph = ExcludeSemantics(child: Icon(icon, size: size));
    if (label == null) return glyph;
    return Semantics(label: label, image: true, child: glyph);
  }
}
