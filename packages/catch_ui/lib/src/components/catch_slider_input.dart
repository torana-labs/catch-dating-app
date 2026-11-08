import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system Slider with one value: a thumb on the Catch track.
///
/// [divisions] snaps it to steps (three rounds, four, five). A [label] sits
/// at the start of a row over the track and names it for screen readers;
/// [valueLabelBuilder] writes the current value at the end of that row
/// ("4 rounds"). Callers own the value: [onChanged] while dragging,
/// [onChangeEnd] when it settles. It shares its track with CatchRangeInput.
class CatchSliderInput extends StatelessWidget {
  const CatchSliderInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.onChangeEnd,
    this.min = 0,
    this.max = 100,
    this.divisions,
    this.label,
    this.valueLabelBuilder,
    this.semanticValueBuilder,
  }) : assert(min < max, 'min must be below max.'),
       assert(value >= min && value <= max, 'value must sit within min..max.');

  final double value;

  /// Null disables the slider.
  final ValueChanged<double>? onChanged;
  final ValueChanged<double>? onChangeEnd;
  final double min;
  final double max;
  final int? divisions;
  final String? label;
  final String Function(double value)? valueLabelBuilder;
  final SemanticFormatterCallback? semanticValueBuilder;

  /// The Catch slider track: 4 px line2 track, ink fill, a 24 px surface
  /// thumb lifted off it, no tick marks and a full touch target.
  static SliderThemeData themeOf(BuildContext context) {
    final t = CatchTokens.of(context);
    return SliderTheme.of(context).copyWith(
      trackHeight: CatchSpacing.s1,
      activeTrackColor: t.primary,
      inactiveTrackColor: t.line2,
      thumbColor: t.surface,
      thumbShape: const RoundSliderThumbShape(
        enabledThumbRadius: CatchSpacing.s3,
        elevation: CatchElevation.physicalControl,
      ),
      rangeThumbShape: const RoundRangeSliderThumbShape(
        enabledThumbRadius: CatchSpacing.s3,
        elevation: CatchElevation.physicalControl,
      ),
      overlayColor: t.primary.withValues(
        alpha: CatchOpacity.controlOverlayPressed,
      ),
      // The native render object derives its hit height from the largest
      // slider part. A surrounding minimum-height box alone does not enlarge
      // that gesture owner; the overlay shape does.
      overlayShape: RoundSliderOverlayShape(
        overlayRadius: CatchPlatformTokens.minimumInteractiveExtent / 2,
      ),
      activeTickMarkColor: Colors.transparent,
      inactiveTickMarkColor: Colors.transparent,
      disabledActiveTickMarkColor: Colors.transparent,
      disabledInactiveTickMarkColor: Colors.transparent,
    );
  }

  @override
  Widget build(BuildContext context) {
    final label = this.label;
    final valueLabel = valueLabelBuilder?.call(value);
    final slider = Semantics(
      label: label,
      child: SliderTheme(
        data: themeOf(context),
        child: Slider(
          value: value,
          min: min,
          max: max,
          divisions: divisions,
          semanticFormatterCallback: semanticValueBuilder,
          onChanged: onChanged,
          onChangeEnd: onChangeEnd,
        ),
      ),
    );
    if (label == null && valueLabel == null) return slider;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
          child: ExcludeSemantics(
            child: Row(
              spacing: CatchSpacing.s2,
              children: [
                Expanded(
                  child: CatchText(
                    label ?? '',
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                ),
                if (valueLabel != null)
                  CatchText(
                    valueLabel,
                    variant: CatchTextVariant.labelAction,
                    numeric: true,
                  ),
              ],
            ),
          ),
        ),
        slider,
      ],
    );
  }
}
