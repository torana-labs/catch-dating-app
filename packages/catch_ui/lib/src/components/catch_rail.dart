import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

/// When a rail wraps into rows instead of scrolling.
enum CatchRailMode { auto, never, always }

/// A horizontal row that scrolls with a peek of the next item, shared with
/// `@catch/web-ui`'s CatchRail. In [CatchRailMode.auto] it wraps into rows
/// once there is room for a desktop grid (840 and wider).
class CatchRail extends StatelessWidget {
  const CatchRail({
    super.key,
    required this.label,
    required this.children,
    this.itemWidth,
    this.wrap = CatchRailMode.auto,
  });

  /// The list's accessible name.
  final String label;
  final List<Widget> children;

  /// Each item's width; null fits each item (a row of chips).
  final double? itemWidth;
  final CatchRailMode wrap;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final spacing = itemWidth == null ? CatchSpacing.s2 : CatchSpacing.s3;
      final wraps = switch (wrap) {
        CatchRailMode.always => true,
        CatchRailMode.never => false,
        CatchRailMode.auto => constraints.maxWidth >= 840,
      };
      final items = [
        for (final child in children)
          itemWidth == null ? child : SizedBox(width: itemWidth, child: child),
      ];
      return Semantics(
        container: true,
        label: label,
        child: wraps
            ? Wrap(spacing: spacing, runSpacing: spacing, children: items)
            : SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: spacing,
                  children: items,
                ),
              ),
      );
    },
  );
}
