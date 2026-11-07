import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// How many visits one traffic source brought: [source] is the report's
/// source name (instagram, whatsapp, facebook, google, qr, email, direct or
/// other).
@immutable
class HostAnalyticsSourceShare {
  const HostAnalyticsSourceShare({required this.source, required this.count});

  final String source;
  final int count;

  @override
  bool operator ==(Object other) =>
      other is HostAnalyticsSourceShare &&
      other.source == source &&
      other.count == count;

  @override
  int get hashCode => Object.hash(source, count);
}

/// Traffic sources as the system stack meter: the three largest in ink,
/// the courts colour and the games colour, and everything else together as
/// Other on the muted track, each with its share in the legend.
class HostAnalyticsSourceMeter extends StatelessWidget {
  const HostAnalyticsSourceMeter({
    super.key,
    required this.shares,
    required this.label,
  });

  final List<HostAnalyticsSourceShare> shares;
  final String label;

  static const _colors = [
    CatchMeterPartColor.ink,
    CatchMeterPartColor.courts,
    CatchMeterPartColor.games,
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ranked = [
      for (final share in shares)
        if (share.count > 0) share,
    ]..sort((a, b) => b.count.compareTo(a.count));
    final named = ranked
        .where((share) => share.source != 'other')
        .take(_colors.length)
        .toList();
    final rest = ranked
        .where((share) => !named.contains(share))
        .fold<int>(0, (sum, share) => sum + share.count);
    final total = ranked.fold<int>(0, (sum, share) => sum + share.count);
    return CatchMeter(
      variant: CatchMeterVariant.stack,
      value: total,
      max: total <= 0 ? 1 : total,
      label: label,
      parts: [
        for (final (index, share) in named.indexed)
          CatchMeterPart(
            label: l10n.hostsHostAnalyticsLabelTrafficSource(
              source: share.source,
            ),
            value: share.count,
            color: _colors[index],
          ),
        if (rest > 0)
          CatchMeterPart(
            label: l10n.hostsHostAnalyticsLabelTrafficSource(source: 'other'),
            value: rest,
            color: CatchMeterPartColor.muted,
          ),
      ],
    );
  }
}
