import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_status_indicator.dart';
import 'package:flutter/material.dart';

enum CatchStatusRowTone { neutral, success, warning, danger, live }

/// Quiet, unboxed status made from a semantic dot and supporting copy.
class CatchStatusRow extends StatelessWidget {
  const CatchStatusRow({
    super.key,
    required this.label,
    this.tone = CatchStatusRowTone.neutral,
  });

  final String label;
  final CatchStatusRowTone tone;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final color = switch (tone) {
      CatchStatusRowTone.neutral => t.ink3,
      CatchStatusRowTone.success => t.success,
      CatchStatusRowTone.warning => t.warning,
      CatchStatusRowTone.danger => t.danger,
      CatchStatusRowTone.live => t.primary,
    };

    return LayoutBuilder(
      builder: (context, constraints) {
        final copy = Text(
          label,
          style: CatchTextStyles.supporting(context, color: color),
        );
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchStatusIndicator(color: color, size: CatchIconSize.unsavedDot),
            gapW6,
            if (constraints.hasBoundedWidth) Flexible(child: copy) else copy,
          ],
        );
      },
    );
  }
}
