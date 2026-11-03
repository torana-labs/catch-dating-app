import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:flutter/widgets.dart';

enum CatchStackDirection { column, row }

/// Cross-axis placement. A column with none set gives every child its full
/// width when it has one, as the web's flex box stretches its blocks (a
/// child's own width does not survive it, so a column that keeps widths sets
/// [start]; and under an intrinsic-sizing parent, which cannot measure it, set
/// one); a row with none set top-aligns its children.
enum CatchStackAlign { start, center, end, stretch, baseline }

/// Main-axis placement. A row fills its width, so it can spread its children;
/// a column is as tall as its children.
enum CatchStackJustify { start, center, end, between }

/// A spacing token between children. [section] is 28 on compact and 40 wider.
/// `@catch/web-ui` takes the same steps as numbers.
enum CatchStackGap {
  none(CatchSpacing.s0),
  g2(CatchSpacing.micro2),
  g4(CatchSpacing.s1),
  g6(CatchSpacing.micro6),
  g8(CatchSpacing.s2),
  g12(CatchSpacing.s3),
  g16(CatchSpacing.s4),
  g20(CatchSpacing.s5),
  g24(CatchSpacing.s6),
  g28(CatchSpacing.s7),
  g32(CatchSpacing.s8),
  g40(CatchSpacing.s10),
  g48(CatchSpacing.s12),
  g64(CatchSpacing.s16),
  section(null);

  const CatchStackGap(this._extent);

  final double? _extent;

  /// The gap in pixels at [sizeClass].
  double resolve(CatchWindowSize sizeClass) =>
      _extent ??
      (sizeClass == CatchWindowSize.compact
          ? GeneratedCatchLayoutTokens.sectionGapCompact
          : GeneratedCatchLayoutTokens.sectionGapWide);
}

/// Lays children out in a column or a row with a token gap.
///
/// [equal] (rows only) gives the children equal shares of the width.
/// [collapseBelow] (rows only, medium or expanded) stacks the row into a
/// column below that size class, read from the nearest [CatchScope] (compact
/// outside a root); a collapsed row drops [equal] and keeps [align] only when
/// it is center or end. [wrap] flows the children onto new runs with the gap
/// between runs too. Framework `Column` and `Row` stay legal for arrangement;
/// this is what a body uses when it wants a token gap.
class CatchStack extends StatelessWidget {
  const CatchStack({
    super.key,
    this.direction = CatchStackDirection.column,
    this.gap = CatchStackGap.g12,
    this.align,
    this.justify,
    this.wrap = false,
    this.equal = false,
    this.collapseBelow,
    required this.children,
  }) : assert(
         collapseBelow != CatchWindowSize.compact,
         'collapseBelow is medium or expanded.',
       );

  final CatchStackDirection direction;
  final CatchStackGap gap;
  final CatchStackAlign? align;
  final CatchStackJustify? justify;
  final bool wrap;
  final bool equal;
  final CatchWindowSize? collapseBelow;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final sizeClass = CatchScope.sizeClassOf(context);
    var isRow = direction == CatchStackDirection.row;
    var isEqual = equal && isRow;
    var crossAlign = align;
    final collapse = collapseBelow;
    if (isRow && collapse != null && sizeClass.index < collapse.index) {
      isRow = false;
      isEqual = false;
      crossAlign =
          crossAlign == CatchStackAlign.center ||
              crossAlign == CatchStackAlign.end
          ? crossAlign
          : null;
    }
    final spacing = gap.resolve(sizeClass);
    final axis = isRow ? Axis.horizontal : Axis.vertical;

    if (wrap) {
      return Wrap(
        direction: axis,
        spacing: spacing,
        runSpacing: spacing,
        alignment: switch (justify) {
          null || CatchStackJustify.start => WrapAlignment.start,
          CatchStackJustify.center => WrapAlignment.center,
          CatchStackJustify.end => WrapAlignment.end,
          CatchStackJustify.between => WrapAlignment.spaceBetween,
        },
        crossAxisAlignment: switch (crossAlign) {
          CatchStackAlign.center => WrapCrossAlignment.center,
          CatchStackAlign.end => WrapCrossAlignment.end,
          _ => WrapCrossAlignment.start,
        },
        children: children,
      );
    }

    final mainAlign = switch (justify) {
      null || CatchStackJustify.start => MainAxisAlignment.start,
      CatchStackJustify.center => MainAxisAlignment.center,
      CatchStackJustify.end => MainAxisAlignment.end,
      CatchStackJustify.between => MainAxisAlignment.spaceBetween,
    };
    final items = [
      for (final child in children) isEqual ? Expanded(child: child) : child,
    ];

    if (!isRow && crossAlign == null) {
      // An unset column stretches its children when it has a width to give,
      // and starts them when it does not (inside a row or a horizontal list).
      return LayoutBuilder(
        builder: (context, constraints) => Flex(
          direction: axis,
          spacing: spacing,
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: mainAlign,
          crossAxisAlignment: constraints.hasBoundedWidth
              ? CrossAxisAlignment.stretch
              : CrossAxisAlignment.start,
          children: items,
        ),
      );
    }
    final baseline = crossAlign == CatchStackAlign.baseline && isRow;
    return Flex(
      direction: axis,
      spacing: spacing,
      mainAxisSize: isRow ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: mainAlign,
      crossAxisAlignment: switch (crossAlign) {
        null || CatchStackAlign.start => CrossAxisAlignment.start,
        CatchStackAlign.center => CrossAxisAlignment.center,
        CatchStackAlign.end => CrossAxisAlignment.end,
        CatchStackAlign.stretch => CrossAxisAlignment.stretch,
        // A column has no baseline to share; its children start-align.
        CatchStackAlign.baseline =>
          baseline ? CrossAxisAlignment.baseline : CrossAxisAlignment.start,
      },
      textBaseline: baseline ? TextBaseline.alphabetic : null,
      children: items,
    );
  }
}
