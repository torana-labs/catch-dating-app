import 'package:flutter/widgets.dart';

class CatchOption<T> {
  const CatchOption({
    required this.value,
    required this.label,
    this.icon,
    this.semanticLabel,
    this.enabled = true,
    this.disabledReason,
    this.count,
  }) : assert(enabled || disabledReason != null);

  final T value;
  final String label;
  final IconData? icon;
  final String? semanticLabel;
  final bool enabled;
  final String? disabledReason;

  /// A count after the label, in segmented controls: "Arriving 4".
  final int? count;
}
