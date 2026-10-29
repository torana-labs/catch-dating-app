import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

AppErrorContext _eventSuccessHostRetryContext(
  EventSuccessHostRetryIntent intent,
) {
  return switch (intent) {
    EventSuccessHostRetryIntent.assignmentParticipantProfiles ||
    EventSuccessHostRetryIntent.rotationParticipantProfiles ||
    EventSuccessHostRetryIntent.wingmanProfiles => AppErrorContext.profile,
    EventSuccessHostRetryIntent.plan ||
    EventSuccessHostRetryIntent.roster ||
    EventSuccessHostRetryIntent.assignments ||
    EventSuccessHostRetryIntent.rotationAssignments ||
    EventSuccessHostRetryIntent.rotationDrafts ||
    EventSuccessHostRetryIntent.preferences ||
    EventSuccessHostRetryIntent.wingmanRequests ||
    EventSuccessHostRetryIntent.scorecard ||
    EventSuccessHostRetryIntent.spatialLayout => AppErrorContext.event,
  };
}

class EventSuccessHostResourceErrorState extends StatelessWidget {
  const EventSuccessHostResourceErrorState({
    super.key,
    required this.failure,
    this.onRetry,
    this.compact = false,
  });

  final EventSuccessHostResourceFailure failure;
  final VoidCallback? onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final errorContext = _eventSuccessHostRetryContext(failure.retryIntent);
    final descriptor = appErrorDescriptor(
      failure.error,
      l10n: context.l10n,
      context: errorContext,
    );
    final resource = switch (failure.retryIntent) {
      EventSuccessHostRetryIntent.plan =>
        context.l10n.eventSuccessHostResourceLiveGuide,
      EventSuccessHostRetryIntent.roster =>
        context.l10n.eventSuccessHostResourceGuestRoster,
      EventSuccessHostRetryIntent.assignments =>
        context.l10n.eventSuccessHostResourceMicroPodAssignments,
      EventSuccessHostRetryIntent.rotationAssignments =>
        context.l10n.eventSuccessHostResourcePublishedRotations,
      EventSuccessHostRetryIntent.rotationDrafts =>
        context.l10n.eventSuccessHostResourceRotationDrafts,
      EventSuccessHostRetryIntent.assignmentParticipantProfiles =>
        context.l10n.eventSuccessHostResourceMicroPodProfiles,
      EventSuccessHostRetryIntent.rotationParticipantProfiles =>
        context.l10n.eventSuccessHostResourceRotationProfiles,
      EventSuccessHostRetryIntent.preferences =>
        context.l10n.eventSuccessHostResourceAttendeePreferences,
      EventSuccessHostRetryIntent.wingmanRequests =>
        context.l10n.eventSuccessHostResourceHostHelpRequests,
      EventSuccessHostRetryIntent.wingmanProfiles =>
        context.l10n.eventSuccessHostResourceHostHelpProfiles,
      EventSuccessHostRetryIntent.scorecard =>
        context.l10n.eventSuccessHostResourceEventReport,
      EventSuccessHostRetryIntent.spatialLayout =>
        context.l10n.eventSuccessHostResourceRoomLayout,
    };
    return CatchErrorState(
      title: context.l10n.eventSuccessHostResourceUnavailableTitle(
        resource: resource,
      ),
      message: descriptor.message,
      icon: descriptor.icon,
      retryLabel: descriptor.retryLabel,
      onRetry: onRetry,
      mode: (compact)
          ? CatchErrorStateMode.compact
          : CatchErrorStateMode.inline,
    );
  }
}
