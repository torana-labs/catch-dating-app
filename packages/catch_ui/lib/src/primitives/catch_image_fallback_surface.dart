import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

class CatchImageFallbackSurface extends StatelessWidget {
  const CatchImageFallbackSurface({
    super.key,
    this.backgroundColor,
    this.iconColor,
    this.icon,
    this.iconSize = CatchIconSize.md,
  }) : _hero = false;

  /// Branded no-photo paint for a hero image. The image assembly owns any
  /// readability overlay; the fallback does not fetch or grade an image.
  const CatchImageFallbackSurface.hero({super.key})
    : backgroundColor = null,
      iconColor = null,
      icon = null,
      iconSize = CatchIconSize.md,
      _hero = true;

  final Color? backgroundColor;
  final Color? iconColor;
  final IconData? icon;
  final double iconSize;
  final bool _hero;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    if (_hero) {
      return DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              t.accent,
              Color.lerp(t.accent, t.ink, 0.36)!,
              Color.lerp(t.primary, t.ink, 0.50)!,
            ],
          ),
        ),
        child: const SizedBox.expand(),
      );
    }
    return ColoredBox(
      color: backgroundColor ?? t.surface,
      child: Center(
        child: Icon(
          icon ?? CatchIcons.photo,
          color: iconColor ?? t.ink3,
          size: iconSize,
        ),
      ),
    );
  }
}
