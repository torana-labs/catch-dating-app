import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';

/// Semantic ink an icon draws in. [inherit] uses the surrounding [IconTheme].
enum CatchIconTone { inherit, ink, muted, primary, success, warning, danger }

/// Draws one icon role at a [CatchIconSize] extent in a semantic tone.
///
/// The glyph is a role from `CatchIcons`; React's `CatchIcon` names the same
/// role. Without a [semanticLabel] the icon is decorative.
class CatchIcon extends StatelessWidget {
  const CatchIcon(
    this.icon, {
    super.key,
    this.size = CatchIconSize.md,
    this.tone = CatchIconTone.inherit,
    this.semanticLabel,
  });

  /// A role from `CatchIcons`.
  final IconData icon;

  /// A [CatchIconSize] extent.
  final double size;

  final CatchIconTone tone;

  /// Accessible name; leave null for a decorative icon.
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final color = switch (tone) {
      CatchIconTone.inherit => null,
      CatchIconTone.ink => tokens.ink,
      CatchIconTone.muted => tokens.ink2,
      CatchIconTone.primary => tokens.primary,
      CatchIconTone.success => tokens.success,
      CatchIconTone.warning => tokens.warning,
      CatchIconTone.danger => tokens.danger,
    };
    return Icon(icon, size: size, color: color, semanticLabel: semanticLabel);
  }
}
