import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_table_cell.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// Where a [CatchTable] column places its label and cells.
enum CatchTablePlacement { start, end }

/// What a [CatchTable] column holds, as the system Table column kind: [text],
/// a two-line [title], right-aligned [number] figures or a [badge]. A
/// [number] column places its label and cells at the end unless told
/// otherwise.
enum CatchTableColumnVariant { text, title, number, badge }

/// One column of a [CatchTable]: header label, what it holds, its share of
/// the width (or a fixed [width]) and the placement of its label and cells.
@immutable
class CatchTableColumn {
  const CatchTableColumn({
    required this.label,
    this.flex = 1,
    this.width,
    this.placement,
    this.variant = CatchTableColumnVariant.text,
    this.labelInset = 0,
  });

  final String label;

  /// The share of the width left after the fixed columns.
  final int flex;

  /// A fixed width in logical pixels; wins over [flex].
  final double? width;

  /// Null places a [CatchTableColumnVariant.number] column at the end and
  /// every other column at the start.
  final CatchTablePlacement? placement;
  final CatchTableColumnVariant variant;

  /// Leading inset for the header label, for example to align it with cell
  /// text that follows an avatar.
  final double labelInset;

  /// [placement], or the one [variant] implies.
  CatchTablePlacement get resolvedPlacement =>
      placement ??
      (variant == CatchTableColumnVariant.number
          ? CatchTablePlacement.end
          : CatchTablePlacement.start);

  Widget _sized(Widget child) => width == null
      ? Expanded(flex: flex, child: child)
      : SizedBox(width: width, child: child);
}

/// Bordered data table with an uppercase header row and divided rows.
///
/// Columns are published through [CatchTableScope], so each [CatchTableRow]
/// lays its cells out against the same widths. [emptyBuilder] replaces the
/// rows below the header when there is nothing to list. [label] names the
/// table for screen readers.
///
/// The system Table passes data: columns with a [CatchTableColumnVariant]
/// and rows built with [CatchTableRow.cells]. Widget rows in [children]
/// still work for older callers.
class CatchTable extends StatelessWidget {
  const CatchTable({
    super.key,
    required this.columns,
    this.children = const [],
    this.emptyBuilder,
    this.label,
  });

  final List<CatchTableColumn> columns;
  final List<Widget> children;
  final WidgetBuilder? emptyBuilder;

  /// The table caption read aloud: "Guests by household".
  final String? label;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final headerStyle = CatchTextStyles.monoLabel(
      context,
      color: t.ink3,
    ).copyWith(fontSize: 8.5);

    final table = CatchTableScope(
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
                    column._sized(
                      Padding(
                        padding: EdgeInsets.only(left: column.labelInset),
                        child: Text(
                          column.label.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign:
                              column.resolvedPlacement ==
                                  CatchTablePlacement.end
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
    final label = this.label;
    if (label == null) return table;
    return Semantics(container: true, label: label, child: table);
  }
}

/// One divided row of a [CatchTable]; each cell takes its column's width and
/// placement.
class CatchTableRow extends StatelessWidget {
  const CatchTableRow({super.key, required this.children})
    : cells = null,
      onTap = null;

  /// The system Table row as data: one [CatchTableCell] per column. An
  /// [onTap] makes the whole row pressable (open it in the inspector).
  const CatchTableRow.cells({
    super.key,
    required List<CatchTableCell> this.cells,
    this.onTap,
  }) : children = const [];

  final List<Widget> children;

  /// The data cells, in column order.
  final List<CatchTableCell>? cells;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final columns = CatchTableScope.columnsOf(context);
    final cells = this.cells;
    final children = cells == null
        ? this.children
        : [
            for (final (index, cell) in cells.indexed)
              _CatchTableCellView(
                cell: cell,
                placement: index < columns.length
                    ? columns[index].resolvedPlacement
                    : CatchTablePlacement.start,
              ),
          ];
    final row = DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: t.line)),
      ),
      child: Padding(
        padding: CatchInsets.tableRowContent,
        child: Row(
          children: [
            for (final (index, cell) in children.indexed) ...[
              if (index > 0) const SizedBox(width: CatchSpacing.s2),
              (index < columns.length
                  ? columns[index]._sized
                  : (Widget child) => Expanded(child: child))(
                Align(
                  alignment:
                      index < columns.length &&
                          columns[index].resolvedPlacement ==
                              CatchTablePlacement.end
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
    final onTap = this.onTap;
    if (onTap == null) return row;
    return CatchRowPressSurface(onTap: onTap, child: row);
  }
}

/// Draws one [CatchTableCell] by its kind.
class _CatchTableCellView extends StatelessWidget {
  const _CatchTableCellView({required this.cell, required this.placement});

  final CatchTableCell cell;
  final CatchTablePlacement placement;

  @override
  Widget build(BuildContext context) {
    final align = placement == CatchTablePlacement.end ? TextAlign.end : null;
    final badge = cell.badge;
    if (badge != null) return badge;
    final subtitle = cell.subtitle;
    if (cell.variant == CatchTableCellVariant.title) {
      return Column(
        crossAxisAlignment: placement == CatchTablePlacement.end
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          CatchText(
            cell.text,
            variant: CatchTextVariant.titleRow,
            align: align,
            maxLines: 1,
          ),
          if (subtitle != null)
            CatchText(
              subtitle,
              variant: CatchTextVariant.bodyMeta,
              tone: CatchTextTone.secondary,
              align: align,
              maxLines: 1,
            ),
        ],
      );
    }
    return CatchText(
      cell.text,
      variant: CatchTextVariant.bodySmall,
      tone: switch (cell.tone) {
        null => CatchTextTone.primary,
        CatchTableCellTone.secondary => CatchTextTone.secondary,
        CatchTableCellTone.success => CatchTextTone.success,
        CatchTableCellTone.warning => CatchTextTone.warning,
        CatchTableCellTone.danger => CatchTextTone.danger,
      },
      align: align,
      numeric: cell.variant == CatchTableCellVariant.number,
      maxLines: 2,
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
