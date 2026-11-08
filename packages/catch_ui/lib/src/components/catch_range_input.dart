import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/components/catch_contract_field_policy.dart';
import 'package:catch_ui/src/components/catch_slider_input.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Edits an ordered numeric interval through two independently movable ends.
///
/// Owns contract-derived bounds, native range semantics and Catch track styling.
/// Callers own draft updates and end-of-drag persistence; the surrounding Field
/// owns labels, validation and save orchestration.
class CatchRangeInput extends StatelessWidget {
  const CatchRangeInput({
    super.key,
    required this.values,
    required this.onChanged,
    this.minimumContract,
    this.maximumContract,
    this.contractExemption,
    this.onChangeEnd,
    this.min,
    this.max,
    this.divisions,
    this.minLabel,
    this.maxLabel,
    this.semanticValueBuilder,
  });

  final RangeValues values;
  final ValueChanged<RangeValues>? onChanged;
  final ValueChanged<RangeValues>? onChangeEnd;
  final CatchContractFieldConstraints? minimumContract;
  final CatchContractFieldConstraints? maximumContract;
  final String? contractExemption;
  final double? min;
  final double? max;
  final int? divisions;
  final String? minLabel;
  final String? maxLabel;
  final SemanticFormatterCallback? semanticValueBuilder;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final effectiveMin =
        CatchContractFieldPolicy.effectiveMinimum(
          minimumContract,
          min,
        )?.toDouble() ??
        0;
    final effectiveMax =
        CatchContractFieldPolicy.effectiveMaximum(
          maximumContract,
          max,
        )?.toDouble() ??
        100;
    final contractStep =
        minimumContract?.multipleOf ?? maximumContract?.multipleOf;
    final effectiveDivisions =
        divisions ??
        (contractStep == null
            ? null
            : ((effectiveMax - effectiveMin) / contractStep).round());
    assert(
      values.start >= effectiveMin && values.end <= effectiveMax,
      'CatchRangeInput values must stay inside contract-derived bounds.',
    );
    final slider = SliderTheme(
      // Design-system RangeSlider: the track CatchSliderInput draws.
      data: CatchSliderInput.themeOf(context),
      child: RangeSlider(
        min: effectiveMin,
        max: effectiveMax,
        divisions: effectiveDivisions,
        values: values,
        semanticFormatterCallback: semanticValueBuilder,
        onChanged: onChanged,
        onChangeEnd: onChangeEnd,
      ),
    );

    if (minLabel == null && maxLabel == null) return slider;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        slider,
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                minLabel ?? '',
                style: CatchTextStyles.supporting(context, color: t.ink3),
              ),
              Text(
                maxLabel ?? '',
                style: CatchTextStyles.supporting(context, color: t.ink3),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
