import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_step_row_data.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:flutter/material.dart';

/// Ordered instructional rows with automatic numbering and a connecting trace.
///
/// Owns the sequence geometry and caller-provided copy. It does not select a
/// current step or edit form values. The final row has no trailing connector.
/// A step's marker, such as a time, replaces its number, and its tag sits
/// under the body in the accent colour.
class CatchStepList extends StatelessWidget {
  const CatchStepList({super.key, required this.steps, this.accent});

  final List<CatchStepRowData> steps;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final accentColor = accent ?? t.primary;
    final indexStyle = CatchTextStyles.mono(
      context,
      color: accentColor,
    ).copyWith(fontWeight: FontWeight.w700);
    final labels = [
      for (var i = 0; i < steps.length; i++)
        steps[i].marker ?? (i + 1).toString().padLeft(2, '0'),
    ];
    // Reserve the widest scaled label, while keeping the standard column as
    // the minimum. Numbers and markers must never split across lines.
    var indexWidth = CatchLayout.journeyStepsIndexColumnWidth;
    for (final label in labels) {
      final indexPainter = TextPainter(
        text: TextSpan(text: label, style: indexStyle),
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
        maxLines: 1,
      )..layout();
      indexWidth = math.max(indexWidth, indexPainter.width.ceilToDouble());
      indexPainter.dispose();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < steps.length; i++)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: indexWidth,
                  child: Padding(
                    padding: const EdgeInsets.only(top: CatchStroke.hairline),
                    child: Text(
                      labels[i],
                      style: indexStyle,
                      maxLines: 1,
                      softWrap: false,
                    ),
                  ),
                ),
                SizedBox(
                  width: CatchLayout.journeyStepsRailColumnWidth,
                  child: Column(
                    children: [
                      const SizedBox(height: CatchSpacing.micro3),
                      Container(
                        width: CatchLayout.journeyStepsNodeExtent,
                        height: CatchLayout.journeyStepsNodeExtent,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: t.bg,
                          border: Border.all(
                            color: accentColor,
                            width: CatchStroke.avatarRing,
                          ),
                        ),
                      ),
                      if (i < steps.length - 1)
                        Expanded(
                          child: Container(
                            width: CatchStroke.underline,
                            color: t.line2,
                          ),
                        ),
                    ],
                  ),
                ),
                gapW10,
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: i < steps.length - 1 ? CatchSpacing.s5 : 0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          steps[i].title,
                          style: CatchTextStyles.bodyLead(
                            context,
                            color: CatchTokens.of(context).ink,
                          ),
                        ),
                        if (steps[i].body != null) ...[
                          const SizedBox(height: CatchSpacing.micro3),
                          Text(
                            steps[i].body!,
                            style: CatchTextStyles.supporting(context),
                          ),
                        ],
                        if (steps[i].tag case final tag?
                            when tag.trim().isNotEmpty) ...[
                          gapH6,
                          Text(
                            tag,
                            style: CatchTextStyles.statusLabel(
                              context,
                              color: accentColor,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
