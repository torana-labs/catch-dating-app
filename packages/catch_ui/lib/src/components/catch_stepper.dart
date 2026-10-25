import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_stepper_repeat_button.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Bounded numeric adjustment with accelerated hold-to-repeat controls.
///
/// [CatchStepper.actions] uses caller-owned stepping through the same
/// renderer; the default recipe clamps numeric changes to the supplied limits.
class CatchStepper extends StatelessWidget {
  const CatchStepper({
    super.key,
    required this.value,
    required this.onChanged,
    required this.decreaseSemanticLabel,
    required this.increaseSemanticLabel,
    this.min,
    this.max,
    this.step = 1,
    this.unit,
    this.valueLabelBuilder,
    this.enabled = true,
  }) : assert(step > 0, 'CatchStepper requires a positive step.'),
       assert(min == null || max == null || min <= max),
       _actions = null;

  const CatchStepper.actions({
    super.key,
    required this.value,
    required VoidCallback? onDecrease,
    required VoidCallback? onIncrease,
    required this.decreaseSemanticLabel,
    required this.increaseSemanticLabel,
    this.unit,
    this.valueLabelBuilder,
    this.enabled = true,
  }) : onChanged = null,
       min = null,
       max = null,
       step = 1,
       _actions = (decrease: onDecrease, increase: onIncrease);

  final num value;
  final ValueChanged<num>? onChanged;
  final num? min;
  final num? max;
  final num step;
  final String? unit;
  final String Function(num value)? valueLabelBuilder;
  final String decreaseSemanticLabel;
  final String increaseSemanticLabel;
  final bool enabled;
  final ({VoidCallback? decrease, VoidCallback? increase})? _actions;

  VoidCallback? get _decrease {
    if (!enabled) return null;
    if (_actions case final actions?) return actions.decrease;
    if (onChanged == null || (min != null && value <= min!)) return null;
    return () => onChanged!(_nextValue(-step));
  }

  VoidCallback? get _increase {
    if (!enabled) return null;
    if (_actions case final actions?) return actions.increase;
    if (onChanged == null || (max != null && value >= max!)) return null;
    return () => onChanged!(_nextValue(step));
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final decrease = _decrease;
    final increase = _increase;
    final number = valueLabelBuilder?.call(value) ?? _formatNumber(value);
    final formatted = unit == null ? number : '$number $unit';
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Row(
        key: const ValueKey('catch-field-stepper'),
        mainAxisSize: MainAxisSize.min,
        children: [
          CatchStepperRepeatButton(
            icon: CatchIcons.removeRounded,
            semanticLabel: decreaseSemanticLabel,
            enabled: decrease != null,
            onStep: () => decrease?.call(),
          ),
          SizedBox(width: CatchStepperRepeatButton.layoutGap),
          ConstrainedBox(
            constraints: const BoxConstraints(
              minWidth: CatchFieldTokens.stepperValueMinWidth,
            ),
            child: Text(
              formatted,
              key: const ValueKey('catch-field-stepper-value'),
              maxLines: 1,
              textAlign: TextAlign.center,
              style: CatchTextStyles.bodyLead(context, color: t.ink),
            ),
          ),
          SizedBox(width: CatchStepperRepeatButton.layoutGap),
          CatchStepperRepeatButton(
            icon: CatchIcons.addRounded,
            semanticLabel: increaseSemanticLabel,
            enabled: increase != null,
            onStep: () => increase?.call(),
          ),
        ],
      ),
    );
  }

  String _formatNumber(num number) => number == number.roundToDouble()
      ? number.toInt().toString()
      : number.toString();

  num _nextValue(num delta) {
    num next = value + delta;
    if (next is double) {
      // Remove arithmetic noise at the precision supplied by the caller.
      // A fixed two-place rounding would silently change sub-cent steps.
      final valuePlaces = _decimalPlaces(value);
      final deltaPlaces = _decimalPlaces(delta);
      final places = valuePlaces > deltaPlaces ? valuePlaces : deltaPlaces;
      if (places <= 20) next = num.parse(next.toStringAsFixed(places));
    }
    if (min != null && next < min!) next = min!;
    if (max != null && next > max!) next = max!;
    return next;
  }

  int _decimalPlaces(num number) {
    final parts = number.toString().toLowerCase().split('e');
    final decimalPoint = parts.first.indexOf('.');
    final fraction = decimalPoint < 0
        ? 0
        : parts.first.length - decimalPoint - 1;
    final exponent = parts.length == 1 ? 0 : int.parse(parts.last);
    final places = fraction - exponent;
    return places < 0 ? 0 : places;
  }
}
