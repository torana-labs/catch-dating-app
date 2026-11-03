import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

String catchCountLabel(int count) => count > 99 ? '99+' : '$count';

/// Canonical integer count marker.
///
/// The default constructor overlays the count on [child]. Use
/// [CatchCountBadge.label] when a semantic adapter needs the count marker by
/// itself. Both forms hide at zero and share the same `99+` clamp.
class CatchCountBadge extends StatelessWidget {
  const CatchCountBadge({
    super.key,
    required this.count,
    required Widget this._child,
    this.alignment = Alignment.topRight,
    this.offset = const Offset(-2, 2),
  }) : semanticsLabel = null,
       _navigationIcon = null;

  const CatchCountBadge.label({
    super.key,
    required this.count,
    this.semanticsLabel,
  }) : _child = null,
       alignment = Alignment.center,
       offset = Offset.zero,
       _navigationIcon = null;

  /// Icon-sized count overlay shared by bottom and side navigation.
  const CatchCountBadge.navigationIcon({
    super.key,
    required IconData icon,
    required Color color,
    this.count = 0,
    this._child,
  }) : _navigationIcon = (icon: icon, color: color),
       semanticsLabel = null,
       alignment = Alignment.topRight,
       offset = const Offset(-1, 2);

  final ({IconData icon, Color color})? _navigationIcon;

  final int count;
  final String? semanticsLabel;
  final Widget? _child;
  final AlignmentGeometry alignment;
  final Offset offset;

  /// Width reserved by an attached control for the scaled count marker.
  static double labelWidth(BuildContext context, int count) {
    if (count <= 0) return 0;
    final painter = TextPainter(
      text: TextSpan(
        text: catchCountLabel(count),
        style: CatchTextStyles.statusLabel(context),
      ),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final width = CatchLayout.countBadgeWidth(painter.width);
    painter.dispose();
    return width;
  }

  @override
  Widget build(BuildContext context) {
    if (_navigationIcon case final navigation?) {
      return SizedBox(
        width: CatchLayout.tabBarIconBoxExtent,
        height: CatchLayout.tabBarIconBoxExtent,
        child: CatchCountBadge(
          count: count,
          offset: offset,
          child: Align(
            child:
                _child ??
                Icon(
                  navigation.icon,
                  size: CatchLayout.tabBarIconSize,
                  color: navigation.color,
                ),
          ),
        ),
      );
    }
    final child = _child;
    if (count <= 0 && child != null) return child;

    final t = CatchTokens.of(context);
    final label = count <= 0
        ? const SizedBox.shrink()
        : CatchLegacySurface(
            radius: CatchRadius.pill,
            backgroundColor: t.primary,
            borderSpec: CatchBorderSpec(
              role: CatchBorderRole.separator,
              color: t.surface,
              width: CatchLayout.countBadgeBorderWidth,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                minWidth: CatchLayout.countBadgeMinExtent,
                minHeight: CatchLayout.countBadgeMinExtent,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchLayout.countBadgeHorizontalPadding,
                  vertical: CatchLayout.countBadgeVerticalPadding,
                ),
                child: Center(
                  widthFactor: 1,
                  heightFactor: 1,
                  child: Text(
                    catchCountLabel(count),
                    style: CatchTextStyles.statusLabel(
                      context,
                      color: t.primaryInk,
                    ),
                  ),
                ),
              ),
            ),
          );
    if (child == null) {
      return semanticsLabel == null
          ? label
          : Semantics(
              label: semanticsLabel,
              child: ExcludeSemantics(child: label),
            );
    }

    return Stack(
      // A count must not loosen the constraints that its child receives.
      // Otherwise full-width controls shrink while the marker stays at the
      // original far edge; zero and nonzero counts would change the control.
      fit: StackFit.passthrough,
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned.fill(
          child: IgnorePointer(
            child: OverflowBox(
              alignment: alignment,
              minWidth: 0,
              maxWidth: double.infinity,
              minHeight: 0,
              maxHeight: double.infinity,
              child: Transform.translate(offset: offset, child: label),
            ),
          ),
        ),
      ],
    );
  }
}
