import 'package:catch_ui/src/primitives/catch_legacy_text_variant.dart';
import 'package:flutter/widgets.dart';

/// The pre-redesign text: one [CatchLegacyTextVariant] role.
///
/// Legacy: the registry records it as the `legacy` member of `catch.text`,
/// kept for legacy callers until P7 deletes it. New screens use `CatchText`
/// with a role and a tone.
///
/// The web `CatchLegacyText` takes the same variant, color, line-limit and
/// alignment props. A line limit ends in an ellipsis.
class CatchLegacyText extends StatelessWidget {
  const CatchLegacyText(
    this.data, {
    super.key,
    required this.variant,
    this.color,
    this.maxLines,
    this.textAlign,
  }) : assert(maxLines == null || maxLines > 0);

  final String data;
  final CatchLegacyTextVariant variant;

  /// Overrides the role's default color.
  final Color? color;
  final int? maxLines;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    return Text(
      data,
      style: variant.style(context, color: color),
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      textAlign: textAlign,
    );
  }
}
