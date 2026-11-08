import 'package:catch_dating_app/contexts/insights/parts/host_analytics_bar_indicator.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_source_meter.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Insights in board order: the period, the stats, bookings over time,
/// where visitors came from and the fullest nights in one column; on
/// expanded windows a feed with the stats and bookings on the left and
/// the sources and nights on the right.
class HostInsightsBody extends StatelessWidget {
  const HostInsightsBody({
    super.key,
    required this.state,
    required this.onRangeChanged,
    required this.onOpenNight,
  });

  final HostInsightsState state;
  final ValueChanged<HostInsightsRange> onRangeChanged;
  final ValueChanged<HostAnalyticsNight> onOpenNight;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final period = CatchPageTabBar<HostInsightsRange>.segmented(
      key: const ValueKey<String>('host-insights-period'),
      selected: state.range,
      label: l10n.hostInsightsPeriodLabel,
      onChanged: onRangeChanged,
      options: [
        for (final range in HostInsightsRange.values)
          CatchOption(
            value: range,
            label: switch (range) {
              HostInsightsRange.sevenDays => l10n.hostInsightsPeriodSevenDays,
              HostInsightsRange.thirtyDays => l10n.hostInsightsPeriodThirtyDays,
              HostInsightsRange.ninetyDays => l10n.hostInsightsPeriodNinetyDays,
            },
          ),
      ],
    );
    if (state.status == HostInsightsStatus.loading) {
      return CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.section,
          children: [period, const _HostInsightsLoading()],
        ),
      );
    }

    final bookingsTitle = state.daily
        ? l10n.hostInsightsBookingsEachDay
        : l10n.hostInsightsBookingsEachWeek;
    final stats = state.stats.isEmpty
        ? null
        : _HostInsightsStatRow(stats: state.stats);
    final bookings = CatchSection(
      title: bookingsTitle,
      dividers: CatchSectionPlacement.none,
      empty: l10n.hostInsightsBookingsEmpty,
      children: [
        if (state.hasBookings)
          HostAnalyticsBarIndicator(
            bars: state.bars,
            label: bookingsTitle,
            daily: state.daily,
          ),
      ],
    );
    final sources = !state.hasSources && !state.hasVisits
        ? null
        : CatchSection(
            title: l10n.hostInsightsSourcesTitle,
            dividers: CatchSectionPlacement.none,
            children: [
              if (state.hasSources)
                HostAnalyticsSourceMeter(
                  shares: state.sources,
                  label: l10n.hostInsightsSourcesTitle,
                ),
              if (state.hasVisits)
                CatchIndexRow(
                  key: const ValueKey<String>('host-insights-visits'),
                  title: l10n.hostInsightsVisits(count: state.visits),
                  subtitle: l10n.hostInsightsLinkClicks(
                    count: state.linkClicks,
                  ),
                  onTap: null,
                ),
            ],
          );
    final nights = CatchSection(
      title: l10n.hostInsightsFullestNightsTitle,
      empty: l10n.hostInsightsFullestNightsEmpty,
      children: [
        for (final night in state.nights)
          HostAnalyticsNightRow(
            key: ValueKey<String>('host-insights-night-${night.eventId}'),
            night: night,
            onTap: () => onOpenNight(night),
          ),
      ],
    );

    if (CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded) {
      return CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.feed,
          children: [
            CatchStack(
              gap: CatchStackGap.g28,
              children: [period, ?stats, bookings],
            ),
            CatchStack(gap: CatchStackGap.g28, children: [?sources, nights]),
          ],
        ),
      );
    }
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [period, ?stats, bookings, ?sources, nights],
      ),
    );
  }
}

/// The stats two to a row, in equal widths; four stats make two rows.
class _HostInsightsStatRow extends StatelessWidget {
  const _HostInsightsStatRow({required this.stats});

  const _HostInsightsStatRow.placeholder()
    : stats = const [
        HostInsightsStat(kind: HostInsightsStatKind.bookings, value: 0),
        HostInsightsStat(kind: HostInsightsStatKind.ticketSales, value: 0),
      ];

  final List<HostInsightsStat> stats;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    Widget tile(HostInsightsStat stat) => HostAnalyticsMetricTile(
      label: switch (stat.kind) {
        HostInsightsStatKind.bookings => l10n.hostTodayStatBookings,
        HostInsightsStatKind.ticketSales => l10n.hostTodayStatTicketSales,
        HostInsightsStatKind.cameBack => l10n.hostInsightsStatCameBack,
        HostInsightsStatKind.followers => l10n.hostInsightsStatFollowers,
      },
      value: stat.value,
      previousValue: stat.previousValue,
      currencyCode: stat.currencyCode,
      figure: stat.figure,
    );
    return CatchStack(
      children: [
        for (var start = 0; start < stats.length; start += 2)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              for (final stat in stats.skip(start).take(2)) tile(stat),
            ],
          ),
      ],
    );
  }
}

/// The loading shape under the period: the stats, then the chart and
/// night rows, drawn from the real components.
class _HostInsightsLoading extends StatelessWidget {
  const _HostInsightsLoading();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = CatchIndexRow(
      title: l10n.hostInsightsFullestNightsTitle,
      subtitle: l10n.hostInsightsFullestNightsEmpty,
      onTap: null,
      density: CatchIndexRowSize.regular,
    );
    return CatchSkeleton.content(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          const _HostInsightsStatRow.placeholder(),
          CatchSection(
            title: l10n.hostInsightsBookingsEachWeek,
            children: [row],
          ),
          CatchSection(
            title: l10n.hostInsightsFullestNightsTitle,
            children: [row, row],
          ),
        ],
      ),
    );
  }
}
