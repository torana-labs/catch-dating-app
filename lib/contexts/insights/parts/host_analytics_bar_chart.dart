import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One period of a host report series: when it starts, its count, and
/// whether it is still running.
@immutable
class HostAnalyticsBar {
  const HostAnalyticsBar({
    required this.periodStart,
    required this.value,
    this.partial = false,
  });

  final DateTime periodStart;
  final num value;

  /// The period has not ended yet, so its count is still growing.
  final bool partial;

  @override
  bool operator ==(Object other) =>
      other is HostAnalyticsBar &&
      other.periodStart == periodStart &&
      other.value == value &&
      other.partial == partial;

  @override
  int get hashCode => Object.hash(periodStart, value, partial);
}

/// A report series as the system bar chart: each period labelled by its
/// start ("29 Sep", or the weekday when [daily]), the running period
/// outlined, and [label] read aloud.
class HostAnalyticsBarChart extends StatelessWidget {
  const HostAnalyticsBarChart({
    super.key,
    required this.bars,
    required this.label,
    this.daily = false,
  });

  final List<HostAnalyticsBar> bars;
  final String label;
  final bool daily;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final format = daily ? DateFormat.E(locale) : DateFormat('d MMM', locale);
    return CatchBarIndicator.chart(
      label: label,
      bars: [
        for (final bar in bars)
          CatchBarIndicatorBar(
            label: format.format(bar.periodStart),
            value: bar.value < 0 ? 0 : bar.value,
            partial: bar.partial,
          ),
      ],
    );
  }
}
