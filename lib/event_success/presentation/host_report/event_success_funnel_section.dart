import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_report_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessFunnelSection extends StatelessWidget {
  const EventSuccessFunnelSection({super.key, required this.brief});

  final EventSuccessBrief brief;

  @override
  Widget build(BuildContext context) {
    final funnel = brief.scorecard.funnel;
    return CatchSection.plain(
      title: context.l10n.eventSuccessEventSuccessHostReportTextEventFunnel,
      subtitle: eventSuccessFunnelSummaryCopy(funnel),
      child: CatchMetricSection.dataQuality(
        metrics: [
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.addPerson,
            value: eventSuccessReportPercent(funnel.demandConversionRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelDemandToBooked,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelTotaldemandcountPeopleInDemand(
                  totalDemandCount: funnel.totalDemandCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.success,
            value: eventSuccessReportPercent(funnel.requestApprovalRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelRequestsApproved,
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.pending,
            value: eventSuccessReportPercent(
              funnel.waitlistOfferAcceptanceRate,
            ),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelOffersAccepted,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelWaitlistjoincountWaitlisted(
                  waitlistJoinCount: funnel.waitlistJoinCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.payment,
            value: eventSuccessReportPercent(funnel.paymentCompletionRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelPaymentComplete,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelPaymentcompletedcountPaid(
                  paymentCompletedCount: funnel.paymentCompletedCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.chat,
            value: eventSuccessReportPercent(funnel.repeatAttendeeRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelRepeatAttendees,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelChatstartedcountChatsStarted(
                  chatStartedCount: funnel.chatStartedCount,
                ),
          ),
        ],
      ),
    );
  }
}
