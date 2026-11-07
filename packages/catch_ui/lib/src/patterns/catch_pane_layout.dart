import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

/// The screen patterns shared with `@catch/web-ui`'s CatchPaneLayout and the
/// system's PaneLayout.
enum CatchPaneLayoutMode {
  queue,
  listDetail,
  feed,
  reading,
  wideTable,
  editor,
  operations,
  browse,
}

/// One layout for workspace screens. It measures its own width, decides the
/// columns for the pattern, and folds the second pane away when there is no
/// room: a queue's inspector or a list's detail then replaces the main pane
/// while [detailOpen] is true.
///
/// [children] are the main pane, then the detail (queue, listDetail), the
/// aside (feed, reading, operations) or the live preview (editor), as in
/// `@catch/web-ui`'s main, detail and aside. An editor takes a third child,
/// its step list. The widths are the system's: list 360, reading lane 600,
/// preview 320, live pane 360, live cap 1040, queue inspector 440 (480 from
/// 1440).
///
/// - editor: the form in the 600 px lane with the 320 px preview on its right
///   and the step list on its left from 960 px; below that the form alone,
///   since the top bar's step carries the position.
/// - operations: the live console capped at 1040 px, with the 360 px live
///   pane beside it from 960 px.
/// - browse: a wide grid that never splits; [children] are its cells, in
///   columns of at least 280 px from 600 px and one column below.
class CatchPaneLayout extends StatelessWidget {
  const CatchPaneLayout({
    super.key,
    required this.pattern,
    required this.children,
    this.detailOpen = false,
  });

  final CatchPaneLayoutMode pattern;

  /// The main pane, then the optional second pane (and an editor's step
  /// list); later children are ignored. A browse grid's cells.
  final List<Widget> children;

  /// Unsplit queue and listDetail: show the detail instead of the main pane.
  final bool detailOpen;

  /// An editor's step list, the system's default `--pane-steps`.
  static const double editorStepsWidth = 200;

  /// A browse cell's narrowest width.
  static const double browseCellMinWidth = 280;

  /// The narrowest width at which each pattern places its panes side by side.
  static double splitWidthOf(CatchPaneLayoutMode pattern) => switch (pattern) {
    CatchPaneLayoutMode.queue => 900,
    CatchPaneLayoutMode.listDetail => 600,
    CatchPaneLayoutMode.feed => 960,
    CatchPaneLayoutMode.reading => 960,
    CatchPaneLayoutMode.editor => 960,
    CatchPaneLayoutMode.operations => 960,
    CatchPaneLayoutMode.wideTable => double.infinity,
    CatchPaneLayoutMode.browse => double.infinity,
  };

  /// The second pane's width when split.
  static double secondPaneWidthOf(CatchPaneLayoutMode pattern, double width) =>
      switch (pattern) {
        CatchPaneLayoutMode.queue => width >= 1440 ? 480 : 440,
        CatchPaneLayoutMode.editor => GeneratedCatchLayoutTokens.panePreview,
        CatchPaneLayoutMode.operations => GeneratedCatchLayoutTokens.paneLive,
        _ => GeneratedCatchLayoutTokens.paneList,
      };

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final width = constraints.maxWidth;
      if (pattern == CatchPaneLayoutMode.browse) {
        final columns = width < GeneratedCatchWindowSizeTokens.mediumMinWidth
            ? 1
            : ((width + CatchSpacing.s6) /
                      (browseCellMinWidth + CatchSpacing.s6))
                  .floor()
                  .clamp(1, children.isEmpty ? 1 : children.length);
        final cellWidth = (width - CatchSpacing.s6 * (columns - 1)) / columns;
        return SingleChildScrollView(
          child: Wrap(
            spacing: CatchSpacing.s6,
            runSpacing: CatchSpacing.s6,
            children: [
              for (final cell in children)
                SizedBox(width: cellWidth, child: cell),
            ],
          ),
        );
      }
      final main = children.first;
      if (children.length == 1) {
        return pattern == CatchPaneLayoutMode.operations
            ? Align(
                alignment: AlignmentDirectional.topStart,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: GeneratedCatchLayoutTokens.liveCap,
                  ),
                  child: main,
                ),
              )
            : main;
      }
      final second = children[1];
      final split = width >= splitWidthOf(pattern);
      if (pattern == CatchPaneLayoutMode.editor) {
        if (!split) return main;
        final steps = children.length > 2 ? children[2] : null;
        final gap = steps == null ? CatchSpacing.s12 : CatchSpacing.s10;
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: gap,
          children: [
            if (steps != null) SizedBox(width: editorStepsWidth, child: steps),
            Flexible(
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: GeneratedCatchLayoutTokens.paneLane,
                ),
                child: SizedBox(width: double.infinity, child: main),
              ),
            ),
            SizedBox(width: secondPaneWidthOf(pattern, width), child: second),
          ],
        );
      }
      final paired =
          pattern == CatchPaneLayoutMode.queue ||
          pattern == CatchPaneLayoutMode.listDetail;
      if (!split) {
        if (!paired) {
          return ListView(children: [main, second]);
        }
        return detailOpen ? second : main;
      }
      final line = BorderSide(color: Theme.of(context).dividerColor);
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
      final row = Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: pattern == CatchPaneLayoutMode.operations
            ? CatchSpacing.s6
            : 0,
        children: [
          Expanded(child: main),
          SizedBox(
            width: secondPaneWidthOf(pattern, width),
            child: pattern == CatchPaneLayoutMode.queue
                ? DecoratedBox(
                    decoration: BoxDecoration(border: Border(left: line)),
                    child: second,
                  )
                : second,
          ),
        ],
      );
      return pattern == CatchPaneLayoutMode.operations
          ? Align(
              alignment: AlignmentDirectional.topStart,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: GeneratedCatchLayoutTokens.liveCap,
                ),
                child: row,
              ),
            )
          : row;
    },
  );
}
