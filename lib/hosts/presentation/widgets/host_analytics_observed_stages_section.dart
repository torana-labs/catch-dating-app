import 'package:catch_dating_app/hosts/data/host_analytics_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_count_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Observed period stage counts with source completeness, without cohort joins.
class HostAnalyticsObservedStagesSection extends StatelessWidget {
  const HostAnalyticsObservedStagesSection({super.key, required this.report});
  final HostAnalyticsReport report;

  @override
  Widget build(BuildContext context) {
    final cards = {for (final card in report.summaryCards) card.id: card};
    return CatchSection.content(
      key: const ValueKey('host-analytics-observed-stages'),
      title: context.l10n.hostsHostAnalyticsLabelObservedStages,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchMetricSection.dataQuality(
            metrics: [
              for (final item in <(String, String)>[
                (
                  'outboundBookingClicks',
                  context.l10n.hostsHostAnalyticsLabelProviderBookingClicks,
                ),
                (
                  'internalFormDrafts',
                  context.l10n.hostsHostAnalyticsLabelFormDrafts,
                ),
                (
                  'internalFormSubmissions',
                  context.l10n.hostsHostAnalyticsLabelFormSubmissions,
                ),
                (
                  'internalFormCheckoutAttempts',
                  context.l10n.hostsHostAnalyticsLabelFormCheckoutAttempts,
                ),
                (
                  'internalFormFeesCaptured',
                  context.l10n.hostsHostAnalyticsLabelFormFeesCaptured,
                ),
                (
                  'internalDirectCheckoutAttempts',
                  context.l10n.hostsHostAnalyticsLabelDirectCheckoutAttempts,
                ),
                (
                  'internalDirectPaymentsCaptured',
                  context.l10n.hostsHostAnalyticsLabelDirectPaymentsCaptured,
                ),
                (
                  'internalDirectPaidAdmissions',
                  context.l10n.hostsHostAnalyticsLabelDirectPaidAdmissions,
                ),
                for (final id in const [
                  'internalFormFreeAdmissions',
                  'internalFormAttestedAdmissions',
                  'internalOfferCheckoutAttempts',
                  'internalOfferPaymentsCaptured',
                  'internalOfferPaidAdmissions',
                ])
                  if (cards[id] case final card?) (id, card.label),
              ])
                CatchMetricData(
                  label: item.$2,
                  value: HostCountFormatters.compact(
                    (cards[item.$1]?.value ?? 0).round(),
                  ),
                  icon: CatchIcons.insightsOutlined,
                  caption: cards[item.$1]?.caption,
                  partialBadgeLabel:
                      context.l10n.hostsHostAnalyticsLabelPartial,
                  missingBadgeLabel:
                      context.l10n.hostsHostAnalyticsLabelMissing,
                  status: switch (cards[item.$1]?.status) {
                    HostAnalyticsMetricStatus.ready =>
                      CatchMetricDataStatus.ready,
                    HostAnalyticsMetricStatus.partial =>
                      CatchMetricDataStatus.partial,
                    _ => CatchMetricDataStatus.missing,
                  },
                ),
            ],
          ),
          gapH12,
          CatchText(
            context.l10n.hostsHostAnalyticsTextObservedStageLimits,
            variant: CatchTextVariant.supporting,
          ),
        ],
      ),
    );
  }
}
