import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

enum CatchKickerTextVariant { md, lg, fieldSection }

/// Handoff `Kicker`: uppercase mono eyebrow for section starts and editorial
/// labels.
class CatchKickerText extends StatelessWidget {
  const CatchKickerText({
    super.key,
    required this.label,
    this.color,
    this.variant = CatchKickerTextVariant.md,
    this.textAlign,
    this.maxLines = 1,
  });

  final String label;
  final Color? color;
  final CatchKickerTextVariant variant;
  final TextAlign? textAlign;
  final int? maxLines;

  static TextStyle styleOf(
    BuildContext context, {
    Color? color,
    CatchKickerTextVariant variant = CatchKickerTextVariant.md,
  }) {
    return switch (variant) {
      CatchKickerTextVariant.md => CatchTextStyles.kicker(
        context,
        color: color,
      ),
      CatchKickerTextVariant.lg => CatchTextStyles.kickerLg(
        context,
        color: color,
      ),
      CatchKickerTextVariant.fieldSection => CatchTextStyles.fieldSectionKicker(
        context,
        color: color,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      maxLines: maxLines,
      overflow: maxLines == null ? TextOverflow.clip : TextOverflow.ellipsis,
      textAlign: textAlign,
      style: styleOf(context, color: color, variant: variant),
    );
  }
}
