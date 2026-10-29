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
    final links = report.linkSummary;
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
        summary.outboundClicks == 0 &&
        summary.linkClicks == 0;
    String count(int value) =>
        unavailable ? '—' : HostCountFormatters.compact(value);
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
                value: count(summary.listingViews),
              ),
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelEventViews,
                value: count(summary.eventViews),
              ),
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelOutboundSourceClicks,
                value: count(summary.outboundClicks),
              ),
              CatchMetricValue(
                label: context.l10n.hostsHostAnalyticsLabelLinkClicks,
                value: count(summary.linkClicks),
              ),
            ],
          ),
          if (!unavailable && links.links.isNotEmpty) ...[
            gapH12,
            CatchMetricSection.grid(
              key: const ValueKey('host-analytics-link-clicks'),
              items: [
                for (final link in links.links.take(6))
                  CatchMetricValue(
                    label:
                        link.label ??
                        context.l10n.hostsHostAnalyticsLabelRemovedLink,
                    value: HostCountFormatters.compact(link.clicks),
                  ),
              ],
            ),
          ],
          if (!unavailable && links.trafficSources.isNotEmpty) ...[
            gapH6,
            CatchText(
              context.l10n.hostsHostAnalyticsTextLinkClicksBySource(
                sources: [
                  for (final MapEntry(key: source, value: clicks)
                      in links.trafficSources.entries)
                    context.l10n.hostsHostAnalyticsTextTrafficSourceClicks(
                      source: context.l10n.hostsHostAnalyticsLabelTrafficSource(
                        source: source.name,
                      ),
                      count: HostCountFormatters.compact(clicks),
                    ),
                ].join(', '),
              ),
              key: const ValueKey('host-analytics-link-sources'),
              variant: CatchTextVariant.supporting,
            ),
          ],
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
