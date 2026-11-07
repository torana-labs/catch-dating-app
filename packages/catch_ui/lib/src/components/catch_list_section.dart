import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
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
/// its title when there is none.
class CatchListSection extends StatelessWidget {
  const CatchListSection({
    super.key,
    required this.children,
    this.title,
    this.note,
    this.action,
    this.dividers = CatchSectionPlacement.between,
    this.empty,
  });

  final List<Widget> children;
  final String? title;

  /// Muted text at the end of the title: "3 before doors".
  final String? note;
  final CatchSectionAction? action;
  final CatchSectionPlacement dividers;

  /// The copy shown instead of the rows when there are none.
  final String? empty;

  @override
  Widget build(BuildContext context) {
    final title = this.title;
    final note = this.note;
    final action = this.action;
    final empty = this.empty;
    final line = dividers == CatchSectionPlacement.none
        ? null
        : const CatchDivider.section();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: CatchSpacing.s2,
      children: [
        if (title != null)
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            spacing: CatchSpacing.s3,
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: CatchText(
                    title,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                ),
              ),
              if (action != null)
                CatchButton(
                  label: action.label,
                  onPressed: action.onPressed,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                )
              else if (note != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: CatchSpacing.s1),
                  child: CatchText(
                    note,
                    variant: CatchTextVariant.labelKicker,
                    tone: CatchTextTone.secondary,
                    maxLines: 1,
                  ),
                ),
            ],
          ),
        if (children.isEmpty && empty != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s3),
            child: CatchText(
              empty,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          )
        else if (children.isNotEmpty)
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < children.length; index++) ...[
                if (index > 0) ?line,
                children[index],
              ],
              if (dividers == CatchSectionPlacement.all) ?line,
            ],
          ),
      ],
    );
  }
}
