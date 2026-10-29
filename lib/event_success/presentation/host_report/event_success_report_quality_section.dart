import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_report_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessReportQualitySection extends StatelessWidget {
  const EventSuccessReportQualitySection({super.key, required this.brief});

  final EventSuccessBrief brief;

  @override
  Widget build(BuildContext context) {
    final scorecard = brief.scorecard;
    return CatchSection.plain(
      title:
          context.l10n.eventSuccessEventSuccessHostReportTextHowReliableIsThis,
      subtitle: context
          .l10n
          .eventSuccessEventSuccessHostReportTextShowsWhetherTheReport,
      child: CatchMetricSection.dataQuality(
        metrics: [
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.feedback,
            value: eventSuccessReportPercent(scorecard.feedbackResponseRate),
            label: context.l10n.eventSuccessEventSuccessHostReportLabelFeedback,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelFeedbackresponsecountCheckedincountFeedback(
                  feedbackResponseCount: scorecard.feedbackResponseCount,
                  checkedInCount: scorecard.checkedInCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.people,
            value: '${scorecard.conversationExcludedAttendeeCount}',
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelConversationExclusions,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelConversationgraphresponsecountCheckedincountResponses(
                  conversationGraphResponseCount:
                      scorecard.conversationGraphResponseCount,
                  checkedInCount: scorecard.checkedInCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.like,
            value: eventSuccessReportPercent(scorecard.caughtSomeoneRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelCaughtSomeone,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelAttendeeswhocaughtsomeoneCaughtSomeone(
                  attendeesWhoCaughtSomeone:
                      scorecard.attendeesWhoCaughtSomeone,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.like,
            value: '${scorecard.catchSentCount}',
            label:
                context.l10n.eventSuccessEventSuccessHostReportLabelCatchesSent,
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.people,
            value: eventSuccessReportPercent(scorecard.assignmentCoverageRate),
            label: context
                .l10n
                .eventSuccessEventSuccessHostReportLabelPeopleIncluded,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelAssignmentparticipantcountAssigned(
                  assignmentParticipantCount:
                      scorecard.assignmentParticipantCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.hide,
            value: eventSuccessReportPercent(scorecard.assignmentOptOutRate),
            label: context.l10n.eventSuccessEventSuccessHostReportLabelOptedOut,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelAssignmentoptoutcountOptedOut(
                  assignmentOptOutCount: scorecard.assignmentOptOutCount,
                ),
          ),
          CatchMetricData(
            partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
            missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
            icon: CatchIcons.support,
            value: eventSuccessReportPercent(scorecard.wingmanRequestRate),
            label:
                context.l10n.eventSuccessEventSuccessHostReportLabelWingmanHelp,
            caption: context.l10n
                .eventSuccessEventSuccessHostReportLabelWingmanrequestcountHostHelpRequests(
                  wingmanRequestCount: scorecard.wingmanRequestCount,
                ),
          ),
        ],
      ),
    );
  }
}
