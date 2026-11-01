import 'package:flutter/material.dart';

/// The workspace screen patterns shared with `@catch/web-ui`'s CatchPaneLayout.
enum CatchPaneLayoutMode { queue, listDetail, feed, reading, wideTable }

/// One layout for workspace screens. It measures its own width, decides the
/// columns for the pattern, and folds the second pane away when there is no
/// room: a queue's inspector or a list's detail then replaces the main pane
/// while [detailOpen] is true.
///
/// [children] are the main pane, then the detail (queue, listDetail) or the
/// aside (feed, reading), as in `@catch/web-ui`'s main, detail and aside.
class CatchPaneLayout extends StatelessWidget {
  const CatchPaneLayout({
    super.key,
    required this.pattern,
    required this.children,
    this.detailOpen = false,
  });

  final CatchPaneLayoutMode pattern;

  /// The main pane, then the optional second pane; later children are ignored.
  final List<Widget> children;

  /// Unsplit queue and listDetail: show the detail instead of the main pane.
  final bool detailOpen;

  /// The narrowest width at which each pattern places its panes side by side.
  static double splitWidthOf(CatchPaneLayoutMode pattern) => switch (pattern) {
    CatchPaneLayoutMode.queue => 900,
    CatchPaneLayoutMode.listDetail => 600,
    CatchPaneLayoutMode.feed => 960,
    CatchPaneLayoutMode.reading => 960,
    CatchPaneLayoutMode.wideTable => double.infinity,
  };

  /// The second pane's width when split.
  static double secondPaneWidthOf(CatchPaneLayoutMode pattern, double width) =>
      switch (pattern) {
        CatchPaneLayoutMode.queue => width >= 1440 ? 480 : 440,
        _ => 360,
      };

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final width = constraints.maxWidth;
      final paired =
          pattern == CatchPaneLayoutMode.queue ||
          pattern == CatchPaneLayoutMode.listDetail;
      final main = children.first;
      if (children.length == 1) return main;
      final second = children[1];
      final split = width >= splitWidthOf(pattern);
      if (!split) {
        if (!paired) {
          return ListView(children: [main, second]);
        }
        return detailOpen ? second : main;
      }
      final line = BorderSide(color: Theme.of(context).dividerColor);
      final secondWidth = pattern == CatchPaneLayoutMode.listDetail
          ? null
          : secondPaneWidthOf(pattern, width);
      if (pattern == CatchPaneLayoutMode.listDetail) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: secondPaneWidthOf(pattern, width),
              child: DecoratedBox(
                decoration: BoxDecoration(border: Border(right: line)),
                child: main,
              ),
            ),
            Expanded(child: second),
          ],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: main),
          SizedBox(
            width: secondWidth,
            child: pattern == CatchPaneLayoutMode.queue
                ? DecoratedBox(
                    decoration: BoxDecoration(border: Border(left: line)),
                    child: second,
                  )
                : second,
          ),
        ],
      );
    },
  );
}
