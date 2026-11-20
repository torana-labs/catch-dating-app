import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';

enum EventSuccessHostTab { setup, live, report }

enum EventSuccessLiveWorkspace { now, guests, room }

enum EventSuccessHostRetryIntent {
  plan,
  roster,
  assignments,
  rotationAssignments,
  rotationDrafts,
  assignmentParticipantProfiles,
  rotationParticipantProfiles,
  preferences,
  wingmanRequests,
  wingmanProfiles,
  scorecard,
  spatialLayout,
}

class EventSuccessHostResourceFailure {
  const EventSuccessHostResourceFailure({
    required this.retryIntent,
    required this.error,
  });

  final EventSuccessHostRetryIntent retryIntent;
  final Object error;
}

class EventSuccessSetupActionState {
  const EventSuccessSetupActionState({this.isSaving = false, this.error});

  factory EventSuccessSetupActionState.resolve({
    required bool ensurePending,
    required bool savePending,
    Object? ensureError,
    Object? saveError,
  }) {
    return EventSuccessSetupActionState(
      isSaving: ensurePending || savePending,
      error: saveError ?? ensureError,
    );
  }

  final bool isSaving;
  final Object? error;

  bool get hasError => error != null;
}

class EventSuccessSetupSaveRequest {
  const EventSuccessSetupSaveRequest({
    required this.event,
    required this.plan,
    required this.planIsPersisted,
    required this.draft,
    required this.attendeePrompt,
    required this.layoutId,
  });

  final Event event;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final EventSuccessHostDraft draft;
  final String attendeePrompt;
  final String? layoutId;
}

enum EventSuccessSpatialLayoutStatus {
  notApplicable,
  unconfigured,
  loading,
  error,
  ready,
}

class EventSuccessSpatialLayoutState {
  const EventSuccessSpatialLayoutState._({
    required this.status,
    this.layout,
    this.error,
  });

  const EventSuccessSpatialLayoutState.notApplicable()
    : this._(status: EventSuccessSpatialLayoutStatus.notApplicable);

  const EventSuccessSpatialLayoutState.unconfigured()
    : this._(status: EventSuccessSpatialLayoutStatus.unconfigured);

  const EventSuccessSpatialLayoutState.loading()
    : this._(status: EventSuccessSpatialLayoutStatus.loading);

  const EventSuccessSpatialLayoutState.error(Object error)
    : this._(status: EventSuccessSpatialLayoutStatus.error, error: error);

  const EventSuccessSpatialLayoutState.ready(EventSuccessLayout layout)
    : this._(status: EventSuccessSpatialLayoutStatus.ready, layout: layout);

  final EventSuccessSpatialLayoutStatus status;
  final EventSuccessLayout? layout;
  final Object? error;
}

class EventSuccessLiveActionState {
  const EventSuccessLiveActionState({
    this.isChangingStep = false,
    this.isCompleting = false,
    this.stepError,
    this.completeError,
  });

  factory EventSuccessLiveActionState.resolve({
    required bool stepPending,
    required bool completePending,
    Object? stepError,
    Object? completeError,
  }) {
    return EventSuccessLiveActionState(
      isChangingStep: stepPending,
      isCompleting: completePending,
      stepError: stepError,
      completeError: completeError,
    );
  }

  final bool isChangingStep;
  final bool isCompleting;
  final Object? stepError;
  final Object? completeError;
}

class EventSuccessOperationalRosterSummary {
  const EventSuccessOperationalRosterSummary({
    required this.checkedInCount,
    required this.expectedCount,
  }) : assert(checkedInCount >= 0),
       assert(expectedCount == null || expectedCount >= 0);

  final int checkedInCount;
  final int? expectedCount;
}

class EventSuccessAssignmentGenerationActionState {
  const EventSuccessAssignmentGenerationActionState({
    this.isGenerating = false,
    this.error,
  });

  factory EventSuccessAssignmentGenerationActionState.resolve({
    required bool pending,
    Object? error,
  }) {
    return EventSuccessAssignmentGenerationActionState(
      isGenerating: pending,
      error: error,
    );
  }

  final bool isGenerating;
  final Object? error;
}
