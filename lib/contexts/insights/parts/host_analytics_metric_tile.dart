import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// How a [HostAnalyticsMetricTile] writes its value.
enum HostAnalyticsFigure {
  /// A whole count: "312".
  count,

  /// Money in minor units, compact: "₹1.48L".
  money,

  /// Money in minor units, in full: "₹12,974".
  moneyExact,

  /// A rating out of five to one decimal: "4.8".
  rating,
}

/// One analytics figure as a system stat: the caller's [label], the value,
/// and its change against the previous period as the note (up in the
/// success tone). With a [currencyCode] the value is money in minor units;
/// without one it is a count unless [figure] says otherwise. A caller's
/// [note] replaces the change, in [noteTone]; a null [value] shows a dash.
class HostAnalyticsMetricTile extends StatelessWidget {
  const HostAnalyticsMetricTile({
    super.key,
    required this.label,
    required this.value,
    this.previousValue,
    this.currencyCode,
    this.figure,
    this.note,
    this.noteTone = CatchMetricTileTone.secondary,
  });

  final String label;
  final num? value;
  final num? previousValue;
  final String? currencyCode;

  /// Null writes money when [currencyCode] is set and a count otherwise.
  final HostAnalyticsFigure? figure;
  final String? note;
  final CatchMetricTileTone noteTone;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final currencyCode = this.currencyCode;
    final value = this.value;
    final figure =
        this.figure ??
        (currencyCode == null
            ? HostAnalyticsFigure.count
            : HostAnalyticsFigure.money);
    final change = note != null || value == null
        ? null
        : hostAnalyticsChangePercent(value, previousValue);
    return CatchMetricTile.stat(
      label: label,
      value: value == null
          ? '—'
          : switch (figure) {
              HostAnalyticsFigure.count => NumberFormat.decimalPattern(
                locale,
              ).format(value.round()),
              HostAnalyticsFigure.money => NumberFormat.compactSimpleCurrency(
                locale: locale,
                name: currencyCode,
              ).format(value / 100),
              HostAnalyticsFigure.moneyExact => NumberFormat.simpleCurrency(
                locale: locale,
                name: currencyCode,
                decimalDigits: 0,
              ).format(value / 100),
              HostAnalyticsFigure.rating => NumberFormat(
                '0.0',
                locale,
              ).format(value),
            },
      note:
          note ??
          switch (change) {
            null => null,
            0 => l10n.hostTodayStatSame,
            > 0 => l10n.hostTodayStatUp(percent: change),
            _ => l10n.hostTodayStatDown(percent: -change),
          },
      noteTone: note != null
          ? noteTone
          : change != null && change > 0
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
