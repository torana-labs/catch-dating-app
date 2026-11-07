import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One analytics figure as a system stat: the caller's [label], the value,
/// and its change against the previous period as the note (up in the
/// success tone). With a [currencyCode] the value is money in minor units;
/// without one it is a count.
class HostAnalyticsMetricTile extends StatelessWidget {
  const HostAnalyticsMetricTile({
    super.key,
    required this.label,
    required this.value,
    this.previousValue,
    this.currencyCode,
  });

  final String label;
  final num value;
  final num? previousValue;
  final String? currencyCode;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final currencyCode = this.currencyCode;
    final change = hostAnalyticsChangePercent(value, previousValue);
    return CatchMetricTile.stat(
      label: label,
      value: currencyCode == null
          ? NumberFormat.decimalPattern(locale).format(value.round())
          : NumberFormat.compactSimpleCurrency(
              locale: locale,
              name: currencyCode,
            ).format(value / 100),
      note: switch (change) {
        null => null,
        0 => l10n.hostTodayStatSame,
        > 0 => l10n.hostTodayStatUp(percent: change),
        _ => l10n.hostTodayStatDown(percent: -change),
      },
      noteTone: change != null && change > 0
          ? CatchMetricTileTone.success
          : CatchMetricTileTone.secondary,
    );
  }
}

/// The whole-percent change of [value] against [previous], or null when
/// there is no previous value to compare with.
int? hostAnalyticsChangePercent(num value, num? previous) {
  if (previous == null || previous <= 0) return null;
  return ((value - previous) / previous * 100).round();
}
