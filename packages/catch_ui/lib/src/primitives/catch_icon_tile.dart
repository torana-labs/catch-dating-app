import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

enum CatchIconTileVariant { tile, plain, bubble, error }

/// Non-interactive icon presentation with tiled, empty and error recipes.
///
/// Commands use CatchIconAction; these recipes add no tap target or callback.
class CatchIconTile extends StatelessWidget {
  const CatchIconTile({
    super.key,
    required IconData this.icon,
    required Color this.iconColor,
    this.backgroundColor,
    this.borderColor,
    this.size = 42,
    this.iconSize = 21,
    this.radius = CatchRadius.md,
  }) : variant = CatchIconTileVariant.tile;

  /// The quiet glyph or circular accent used inside successful empty states.
  const CatchIconTile.empty({
    super.key,
    required IconData this.icon,
    this.variant = CatchIconTileVariant.plain,
    double? size,
    double? iconSize,
  }) : assert(
         variant == CatchIconTileVariant.plain ||
             variant == CatchIconTileVariant.bubble,
       ),
       size = size ?? 76,
       iconSize = iconSize ?? 34,
       iconColor = null,
       backgroundColor = null,
       borderColor = null,
       radius = CatchRadius.md;

  /// Centered branded error medallion; surrounding recovery content owns copy.
  const CatchIconTile.error({
    super.key,
    this.icon,
    this.size = CatchLayout.errorIconExtent,
    this.iconSize = CatchLayout.errorIconSize,
  }) : variant = CatchIconTileVariant.error,
       iconColor = null,
       backgroundColor = null,
       borderColor = null,
       radius = CatchRadius.md;

  final IconData? icon;
  final Color? iconColor;
  final Color? backgroundColor;
  final Color? borderColor;
  final double size;
  final double iconSize;
  final double radius;
  final CatchIconTileVariant variant;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final glyph = Icon(
      icon ?? CatchIcons.error,
      color:
          iconColor ??
          switch (variant) {
            CatchIconTileVariant.plain => t.ink3,
            CatchIconTileVariant.error => t.danger,
            CatchIconTileVariant.tile ||
            CatchIconTileVariant.bubble => t.primary,
          },
      size: iconSize,
    );
    if (variant == CatchIconTileVariant.plain) return glyph;

    final tiled = variant == CatchIconTileVariant.tile;
    final content = DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor ?? (tiled ? t.raised : t.primarySoft),
        shape: tiled ? BoxShape.rectangle : BoxShape.circle,
        borderRadius: tiled ? BorderRadius.circular(radius) : null,
        border: tiled ? Border.all(color: borderColor ?? t.line) : null,
      ),
      child: SizedBox.square(dimension: size, child: glyph),
    );
    return variant == CatchIconTileVariant.error
        ? Align(child: content)
        : content;
  }
}
