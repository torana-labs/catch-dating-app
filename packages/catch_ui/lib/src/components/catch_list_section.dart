import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_baseline_overhang_layout.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_index_row.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
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
/// muted label voice, as the system SectionHeader draws it. With no title,
/// the kicker alone is the section's small grey label: a group inside a
/// screen, such as "Arriving" on live Needs.
///
/// A [timeline] joins the rows' leading markers with a 2 px line, run of show
/// style; put it on a section with no [dividers]. Each [CatchIndexRow] draws
/// its own stretch of the line, so rows may be wrapped in feature widgets.
/// [columns] flows the rows down into 2 or 3 columns 24 px apart (a
/// scoreboard), which separate the rows instead of lines, and folds back to
/// one column on compact windows.
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

  /// A muted line over the title: "Each person gets at most one a week".
  /// Without a title, the section's small label.
  final String? kicker;

  /// Muted text at the end of the title: "3 before doors".
  final String? note;
  final CatchSectionAction? action;
  final CatchSectionPlacement dividers;

  /// The copy shown instead of the rows when there are none.
  final String? empty;
  final bool timeline;
  final int? columns;

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
    final rows = timeline ? _joined() : children;
    final perColumn = split ? (rows.length / columns).ceil() : rows.length;
    // The kicker over the title, with the action or note on the title's
    // baseline. At large text the action takes its own line under the title,
    // so the title wraps only between words.
    Widget? header;
    if (title == null && kicker != null) {
      header = Semantics(
        header: true,
        child: CatchText(
          kicker!,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
      );
    }
    if (title != null) {
      final kicker = this.kicker;
      final action = this.action;
      final note = this.note;
      final heading = Semantics(
        header: true,
        child: CatchText(title, variant: CatchTextVariant.sectionTitle),
      );
      // The section's link reads underlined, as the system Section draws
      // it, at the small button's size and padding.
      final button = action == null
          ? null
          : CatchButton.text(
              label: action.label,
              onPressed: action.onPressed,
              textStyle: CatchTextStyles.sectionAction(context),
              padding: const EdgeInsets.symmetric(
                horizontal: CatchButtonTokens.smallPaddingX,
              ),
              minimumSize: const Size(0, CatchButtonTokens.smallHeight),
            );
      final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.6;
      final Widget? trailing = button != null
          // The quiet action's label sits on the title's baseline. Its 48 px
          // target overhangs the title line instead of making it taller, so a
          // section with an action starts where any other section does.
          ? largeText
                // At large text the action drops under the title, moved
                // back by its own leading padding so its label lines up with
                // the title; its target extends outward instead.
                ? Transform.translate(
                    offset: Offset(
                      Directionality.of(context) == TextDirection.rtl
                          ? CatchButtonTokens.smallPaddingX
                          : -CatchButtonTokens.smallPaddingX,
                      0,
                    ),
                    child: button,
                  )
                : CatchBaselineOverhangLayout(child: button)
          : note != null
          ? CatchText(
              note,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
              maxLines: 1,
            )
          : null;
      final Widget titleLine = trailing == null
          ? heading
          : largeText && action != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              spacing: CatchSpacing.s1,
              children: [heading, trailing],
            )
          : CatchOverhangStack(
              direction: Axis.horizontal,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              spacing: CatchSpacing.s3,
              children: [
                Expanded(child: heading),
                trailing,
              ],
            );
      header = kicker == null
          ? titleLine
          : CatchOverhangStack(
              direction: Axis.vertical,
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
    return CatchOverhangStack(
      direction: Axis.vertical,
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: CatchSpacing.s2,
      children: [
        ?header,
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

  /// Each row marked as a timeline step; all but the last draw the line
  /// down to the next marker.
  List<Widget> _joined() => [
    for (var index = 0; index < children.length; index++)
      CatchTimelineStepScope(
        joinsNext: index < children.length - 1,
        child: children[index],
      ),
  ];
}
