import 'package:catch_dating_app/hosts/data/host_analytics_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_count_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Public presence totals with explicit unavailable-data and measurement limits.
class HostAnalyticsPresenceSection extends StatelessWidget {
  const HostAnalyticsPresenceSection({super.key, required this.report});

  final HostAnalyticsReport report;

  @override
  Widget build(BuildContext context) {
    final summary = report.discoverySummary;
    final unavailable = report.dataQuality.any(
      (row) =>
          (row.id == 'client-behavior-events' ||
              row.id == 'bigquery-host-mart' ||
              row.id == 'mart') &&
          row.state == HostAnalyticsDataQualityState.missing,
    );
    final empty =
        summary.listingViews == 0 &&
        summary.eventViews == 0 &&
        summary.outboundClicks == 0;
    return CatchSection.content(
      key: const ValueKey('host-analytics-presence'),
      title: context.l10n.hostsHostAnalyticsLabelPublicPresence,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchMetricSection.grid(
            items: [
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelProfileViews,
                value: unavailable
                    ? '—'
                    : HostCountFormatters.compact(summary.listingViews),
              ),
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelEventViews,
                value: unavailable
                    ? '—'
                    : HostCountFormatters.compact(summary.eventViews),
              ),
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelOutboundSourceClicks,
                value: unavailable
                    ? '—'
                    : HostCountFormatters.compact(summary.outboundClicks),
              ),
            ],
          ),
          gapH12,
          if (unavailable || empty) ...[
            CatchText(
              unavailable
                  ? context.l10n.hostsHostAnalyticsTextPresenceUnavailable
                  : context.l10n.hostsHostAnalyticsTextPresenceEmpty,
              key: const ValueKey('host-analytics-presence-empty'),
              variant: CatchTextVariant.supporting,
            ),
            gapH6,
          ],
          CatchText(
            context.l10n.hostsHostAnalyticsTextPresenceObservedTotals,
            variant: CatchTextVariant.supporting,
          ),
          gapH6,
          CatchText(
            context.l10n.hostsHostAnalyticsTextPresenceExternalLimits,
            variant: CatchTextVariant.supporting,
          ),
        ],
      ),
    );
  }
}
