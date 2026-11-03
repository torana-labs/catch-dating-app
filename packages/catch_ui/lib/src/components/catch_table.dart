import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

/// Where a [CatchTable] column places its label and cells.
enum CatchTablePlacement { start, end }

/// One column of a [CatchTable]: header label, share of the width and
/// placement of its label and cells.
@immutable
class CatchTableColumn {
  const CatchTableColumn({
    required this.label,
    this.flex = 1,
    this.placement = CatchTablePlacement.start,
    this.labelInset = 0,
  });

  final String label;
  final int flex;
  final CatchTablePlacement placement;

  /// Leading inset for the header label, for example to align it with cell
  /// text that follows an avatar.
  final double labelInset;
}

/// Bordered data table with an uppercase header row and divided rows.
///
/// Columns are published through [CatchTableScope], so each [CatchTableRow]
/// lays its cells out against the same widths. [emptyBuilder] replaces the
/// rows below the header when there is nothing to list.
class CatchTable extends StatelessWidget {
  const CatchTable({
    super.key,
    required this.columns,
    this.children = const [],
    this.emptyBuilder,
  });

  final List<CatchTableColumn> columns;
  final List<Widget> children;
  final WidgetBuilder? emptyBuilder;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final headerStyle = CatchTextStyles.monoLabel(
      context,
      color: t.ink3,
    ).copyWith(fontSize: 8.5);

    return CatchTableScope(
      columns: columns,
      child: CatchLegacySurface(
        radius: CatchRadius.md,
        backgroundColor: t.surface,
        borderRole: CatchBorderRole.boundary,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: CatchInsets.tableHeaderContent,
              child: Row(
                children: [
                  for (final (index, column) in columns.indexed) ...[
                    if (index > 0) const SizedBox(width: CatchSpacing.s2),
                    Expanded(
                      flex: column.flex,
                      child: Padding(
                        padding: EdgeInsets.only(left: column.labelInset),
                        child: Text(
                          column.label.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: column.placement == CatchTablePlacement.end
                              ? TextAlign.right
                              : null,
                          style: headerStyle,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (emptyBuilder case final buildEmpty?)
              DecoratedBox(
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: t.line)),
                ),
                child: Padding(
                  padding: CatchInsets.tableEmptyContent,
                  child: buildEmpty(context),
                ),
              )
            else
              ...children,
          ],
        ),
      ),
    );
  }
}

/// One divided row of a [CatchTable]; each cell takes its column's width and
/// placement.
class CatchTableRow extends StatelessWidget {
  const CatchTableRow({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final columns = CatchTableScope.columnsOf(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: t.line)),
      ),
      child: Padding(
        padding: CatchInsets.tableRowContent,
        child: Row(
          children: [
            for (final (index, cell) in children.indexed) ...[
              if (index > 0) const SizedBox(width: CatchSpacing.s2),
              Expanded(
                flex: index < columns.length ? columns[index].flex : 1,
                child: Align(
                  alignment:
                      index < columns.length &&
                          columns[index].placement == CatchTablePlacement.end
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: cell,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Publishes a [CatchTable]'s columns to its rows.
class CatchTableScope extends InheritedWidget {
  const CatchTableScope({
    super.key,
    required this.columns,
    required super.child,
  });

  final List<CatchTableColumn> columns;

  /// The enclosing table's columns, or none outside a table.
  static List<CatchTableColumn> columnsOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CatchTableScope>()?.columns ??
      const [];

  @override
  bool updateShouldNotify(CatchTableScope oldWidget) =>
      columns != oldWidget.columns;
}
