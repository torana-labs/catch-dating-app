import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/widgets.dart';

/// Every piece of text, in one [CatchTextVariant] role.
///
/// Pick a role, never a size. Colour comes from the ground behind the text
/// (ink on day, the night ink on night, the format's ink on a colour) unless a
/// [tone] is set. The responsive roles read the size class from the nearest
/// [CatchScope] (compact outside a root). The web `CatchText` takes the same
/// variant, tone, align, maxLines and numeric props.
class CatchText extends StatelessWidget {
  const CatchText(
    this.data, {
    super.key,
    this.variant = CatchTextVariant.body,
    this.tone = CatchTextTone.inherit,
    this.align,
    this.maxLines,
    this.numeric = false,
    this.semanticsLabel,
  }) : assert(maxLines == null || maxLines > 0);

  final String data;
  final CatchTextVariant variant;
  final CatchTextTone tone;
  final TextAlign? align;

  /// Clamps to this many lines and ends the last with an ellipsis.
  final int? maxLines;

  /// Tabular figures, for scores, prices and times that change.
  final bool numeric;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    var style = variant
        .style(CatchScope.sizeClassOf(context))
        .copyWith(color: tone.color(CatchTokens.of(context)));
    if (numeric) {
      style = style.copyWith(
        fontFeatures: const [FontFeature.tabularFigures()],
      );
    }
    return Text(
      data,
      style: style,
      textAlign: align,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      semanticsLabel: semanticsLabel,
    );
  }
}
