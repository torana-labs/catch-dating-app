import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_models.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/domain/event_success_preference.dart';
import 'package:catch_dating_app/event_success/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_card.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_resource_error_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_funnel_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_report_quality_section.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostReportPageBody extends StatelessWidget {
  const EventSuccessHostReportPageBody({
    super.key,
    required this.event,
    required this.plan,
    required this.planIsPersisted,
    this.scorecard,
    this.helpSection,
    this.deliverySection,
    this.assignments,
    this.rotationAssignments,
    this.preferences,
    this.wingmanRequests,
    required this.resourceFailures,
    required this.onRetryResource,
    required this.embedded,
  });

  final Event event;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final EventSuccessScorecard? scorecard;
  final Widget? helpSection;
  final Widget? deliverySection;
  final List<EventSuccessAssignment>? assignments;
  final List<EventSuccessAssignment>? rotationAssignments;
  final List<EventSuccessPreference>? preferences;
  final List<EventSuccessWingmanRequest>? wingmanRequests;
  final List<EventSuccessHostResourceFailure> resourceFailures;
  final ValueChanged<EventSuccessHostRetryIntent>? onRetryResource;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final entries = helpSection == null && deliverySection == null
        ? null
        : CatchSectionList(
            emptyStateOmitted: true,
            mainAxisSize: MainAxisSize.min,
            children: [?helpSection, ?deliverySection],
          );
    if (!planIsPersisted) {
      return EventSuccessHostTabPageBody(
        embedded: embedded,
        children: [
          ?entries,
          if (entries != null) const SizedBox(height: CatchGaps.section),
          CatchSection.status(
            key: const ValueKey('event-success-report-status'),
            icon: CatchIcons.insights,
            title: context
                .l10n
                .eventSuccessEventSuccessHostReportTitleNoEventReportYet,
            message: context
                .l10n
                .eventSuccessEventSuccessHostReportBodyTheLiveEventGuide,
          ),
        ],
      );
    }

    final runtime = EventSuccessRuntime(
      plan: plan,
      event: event,
      now: DateTime.now(),
    );
    if (!runtime.hostReportEnabled) {
      return EventSuccessHostTabPageBody(
        embedded: embedded,
        children: [
          ?entries,
          if (entries != null) const SizedBox(height: CatchGaps.section),
          CatchSection.status(
            key: const ValueKey('event-success-report-status'),
            icon: CatchIcons.insights,
            title: context
                .l10n
                .eventSuccessEventSuccessHostReportTitlePostEventInsightsAre,
            message: context
                .l10n
                .eventSuccessEventSuccessHostReportBodyThisEventGuideDoes,
          ),
        ],
      );
    }

    final reportScorecard = scorecard;
    final reportFailures = resourceFailures
        .where(
          (failure) => switch (failure.retryIntent) {
            EventSuccessHostRetryIntent.assignments ||
            EventSuccessHostRetryIntent.rotationAssignments ||
            EventSuccessHostRetryIntent.preferences ||
            EventSuccessHostRetryIntent.wingmanRequests ||
            EventSuccessHostRetryIntent.scorecard => true,
            _ => false,
          },
        )
        .toList(growable: false);
    final errorStates = [
      for (final failure in reportFailures)
        EventSuccessHostResourceErrorState(
          failure: failure,
          onRetry: onRetryResource == null
              ? null
              : () => onRetryResource!(failure.retryIntent),
        ),
    ];
    if (reportScorecard == null) {
      return EventSuccessHostTabPageBody(
        embedded: embedded,
        children: [
          ?entries,
          if (entries != null) const SizedBox(height: CatchGaps.section),
          ...errorStates.expand((error) => [error, gapH16]),
          if (!reportFailures.any(
            (failure) =>
                failure.retryIntent == EventSuccessHostRetryIntent.scorecard,
          ))
            CatchSection.status(
              key: const ValueKey('event-success-report-status'),
              icon: CatchIcons.insights,
              title: context
                  .l10n
                  .eventSuccessEventSuccessHostReportTitleWaitingForAttendeeFeedback,
              message: context
                  .l10n
                  .eventSuccessEventSuccessHostReportBodyThePostEventReport,
            ),
        ],
      );
    }

    final brief = plan.buildBriefFromScorecard(
      event: event,
      scorecard: reportScorecard,
      assignments: assignments,
      rotationAssignments: rotationAssignments,
      preferences: preferences,
      wingmanRequests: wingmanRequests,
    );
    final feedbackCount = brief.scorecard.feedbackResponseCount;

    return EventSuccessHostTabPageBody(
      embedded: embedded,
      children: [
        ?entries,
        if (helpSection != null || deliverySection != null)
          const SizedBox(height: CatchGaps.section),
        ...errorStates.expand((error) => [error, gapH16]),
        CatchBanner(
          icon: CatchIcons.taskDone,
          title: context.l10n
              .eventSuccessEventSuccessHostReportTitleFeedbackcountAttendeeFeedbackResponse(
                feedbackCount: feedbackCount,
                value2: feedbackCount == 1
                    ? ''
                    : context.l10n.eventSuccessEventSuccessHostReportTitleS,
              ),
          message: context
              .l10n
              .eventSuccessEventSuccessHostReportBodyTheReportCombinesAttendance,
        ),
        gapH16,
        EventSuccessReportQualitySection(brief: brief),
        gapH16,
        EventSuccessFunnelSection(brief: brief),
        gapH16,
        EventSuccessReportSectionList(brief: brief),
      ],
    );
  }
}
