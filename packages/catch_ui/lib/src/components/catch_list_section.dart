import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_index_row.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// Where the lines of a system section go: between its rows, also under the
/// last row, or nowhere (a row of stats, a map).
enum CatchSectionPlacement { between, all, none }

/// The quiet action at the end of a section's title: "All events", "Insights".
@immutable
class CatchSectionAction {
  const CatchSectionAction({required this.label, this.onPressed});

  final String label;

  /// Null disables the action.
  final VoidCallback? onPressed;
}

/// The system Section's layout, which the unnamed `CatchSection` constructor
/// places; product code calls that constructor.
///
/// The section title, with the [action] as a quiet small button or else the
/// [note] as muted text at its end, sits 8 px above the rows. The section owns
/// the lines between rows ([dividers]), so system `CatchIndexRow` rows draw
/// none of their own. With no [children] it shows the [empty] copy, or only
/// its title when there is none. A [kicker] sits over the title in the
/// muted label voice, as the system SectionHeader draws it.
///
/// A [timeline] joins the rows' leading markers with a 2 px line, run of show
/// style; put it on a section with no [dividers]. [columns] flows the rows
/// down into 2 or 3 columns 24 px apart (a scoreboard), which separate the
/// rows instead of lines, and folds back to one column on compact windows.
class CatchListSection extends StatelessWidget {
  const CatchListSection({
    super.key,
    required this.children,
    this.title,
    this.kicker,
    this.note,
    this.action,
    this.dividers = CatchSectionPlacement.between,
    this.empty,
    this.timeline = false,
    this.columns,
  }) : assert(columns == null || columns == 2 || columns == 3);

  final List<Widget> children;
  final String? title;

  /// A muted line over the title: "Each person gets at most one a week."
  final String? kicker;

  /// Muted text at the end of the title: "3 before doors".
  final String? note;
  final CatchSectionAction? action;
  final CatchSectionPlacement dividers;

  /// The copy shown instead of the rows when there are none.
  final String? empty;
  final bool timeline;
  final int? columns;

  /// Where a timeline line sits from the start: under a 12 px marker, or
  /// under a marker that follows a [CatchIndexRow.time].
  static const double _timelineInset =
      CatchSpacing.micro6 - CatchStroke.hairline;
  static const double _timelineInsetAfterTime =
      CatchIndexRow.timeWidth + CatchSpacing.s3 + _timelineInset;

  /// From the row's top padding to just under its marker.
  static const double _timelineTop =
      CatchSpacing.micro18 + CatchStroke.hairline;

  @override
  Widget build(BuildContext context) {
    final title = this.title;
    final empty = this.empty;
    final columns = this.columns;
    final split =
        columns != null &&
        CatchRootScope.sizeClassOf(context) != CatchWindowSize.compact;
    final line = dividers == CatchSectionPlacement.none || columns != null
        ? null
        : const CatchDivider.section();
    final rows = timeline ? _joined(context) : children;
    final perColumn = split ? (rows.length / columns).ceil() : rows.length;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: CatchSpacing.s2,
      children: [
        if (title != null) _header(context, title),
        if (children.isEmpty && empty != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s3),
            child: CatchText(
              empty,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          )
        else if (split)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: CatchSpacing.s6,
            children: [
              for (var start = 0; start < rows.length; start += perColumn)
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: rows.sublist(
                      start,
                      (start + perColumn).clamp(0, rows.length),
                    ),
                  ),
                ),
            ],
          )
        else if (rows.isNotEmpty)
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < rows.length; index++) ...[
                if (index > 0) ?line,
                rows[index],
              ],
              if (dividers == CatchSectionPlacement.all) ?line,
            ],
          ),
      ],
    );
  }

  /// The kicker over the title, with the [action] or [note] on the title's
  /// baseline. At large text the action takes its own line under the title,
  /// so the title wraps only between words.
  Widget _header(BuildContext context, String title) {
    final kicker = this.kicker;
    final action = this.action;
    final note = this.note;
    final heading = Semantics(
      header: true,
      child: CatchText(title, variant: CatchTextVariant.sectionTitle),
    );
    final Widget? trailing = action != null
        ? CatchButton(
            label: action.label,
            onPressed: action.onPressed,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
          )
        : note != null
        ? CatchText(
            note,
            variant: CatchTextVariant.labelKicker,
            tone: CatchTextTone.secondary,
            maxLines: 1,
          )
        : null;
    final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.6;
    final Widget titleLine = trailing == null
        ? heading
        : largeText && action != null
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s1,
            children: [heading, trailing],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            spacing: CatchSpacing.s3,
            children: [
              Expanded(child: heading),
              trailing,
            ],
          );
    if (kicker == null) return titleLine;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      spacing: CatchSpacing.s1,
      children: [
        CatchText(
          kicker,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        titleLine,
      ],
    );
  }

  /// Each row but the last with the line that joins its marker to the next.
  List<Widget> _joined(BuildContext context) {
    final color = CatchTokens.of(context).line;
    return [
      for (var index = 0; index < children.length; index++)
        if (index == children.length - 1)
          children[index]
        else
          Stack(
            clipBehavior: Clip.none,
            children: [children[index], _connector(children[index], color)],
          ),
    ];
  }

  Widget _connector(Widget row, Color color) {
    final indexRow = row is CatchIndexRow ? row : null;
    final pad = switch (indexRow?.density) {
      CatchIndexRowSize.compact => CatchSpacing.micro10,
      CatchIndexRowSize.roomy => CatchSpacing.micro14,
      _ => CatchSpacing.s3,
    };
    return PositionedDirectional(
      start: indexRow?.time != null ? _timelineInsetAfterTime : _timelineInset,
      top: pad + _timelineTop,
      bottom: -(pad + CatchSpacing.micro3),
      width: CatchStroke.focusRing,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(CatchStroke.hairline),
        ),
      ),
    );
  }
}
