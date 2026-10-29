import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

enum EventSuccessHostTab { setup, live, report }

enum EventSuccessLiveWorkspace { now, guests, room }

enum EventSuccessHostSectionStatus { loading, error, ready }

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

class EventSuccessHostSectionState {
  const EventSuccessHostSectionState._({
    required this.status,
    required this.plan,
    required this.planIsPersisted,
    required this.roster,
    required this.scorecard,
    required this.assignments,
    required this.assignmentParticipantProfiles,
    required this.rotationAssignments,
    required this.rotationDraftAssignments,
    required this.rotationParticipantProfiles,
    required this.preferences,
    required this.wingmanRequests,
    required this.wingmanProfiles,
    required this.resourceFailures,
    this.error,
    this.retryIntent,
  });

  factory EventSuccessHostSectionState.resolve({
    required Event event,
    required DateTime now,
    required CatchAsyncState<EventSuccessPlan?> planState,
    required CatchAsyncState<EventParticipationRoster> rosterState,
    required CatchAsyncState<EventSuccessScorecard?> scorecardState,
    required CatchAsyncState<List<EventSuccessAssignment>> assignmentsState,
    required CatchAsyncState<List<PublicProfile>>
    assignmentParticipantProfilesState,
    required CatchAsyncState<List<EventSuccessAssignment>>
    rotationAssignmentsState,
    required CatchAsyncState<List<EventSuccessAssignmentDraft>>
    rotationDraftsState,
    required CatchAsyncState<List<PublicProfile>>
    rotationParticipantProfilesState,
    required CatchAsyncState<List<EventSuccessPreference>> preferencesState,
    required CatchAsyncState<List<EventSuccessWingmanRequest>>
    wingmanRequestsState,
    required CatchAsyncState<List<PublicProfile>> wingmanProfilesState,
  }) {
    final persistedPlan = planState.value;
    final plan =
        persistedPlan ?? EventSuccessPlan.defaultForEvent(event, now: now);
    final matchingDraftAssignments =
        (rotationDraftsState.value ?? const <EventSuccessAssignmentDraft>[])
            .where(
              (draft) =>
                  draft.baseAssignmentRevision ==
                      plan.assignmentDraftRevision &&
                  draft.roundIndex == plan.publishedRotationRoundIndex + 1,
            )
            .map((draft) => draft.assignment)
            .toList(growable: false);
    final resourceFailures = _eventSuccessHostResourceFailures([
      (rosterState, EventSuccessHostRetryIntent.roster),
      (assignmentsState, EventSuccessHostRetryIntent.assignments),
      (
        rotationAssignmentsState,
        EventSuccessHostRetryIntent.rotationAssignments,
      ),
      (rotationDraftsState, EventSuccessHostRetryIntent.rotationDrafts),
      (
        assignmentParticipantProfilesState,
        EventSuccessHostRetryIntent.assignmentParticipantProfiles,
      ),
      (
        rotationParticipantProfilesState,
        EventSuccessHostRetryIntent.rotationParticipantProfiles,
      ),
      (preferencesState, EventSuccessHostRetryIntent.preferences),
      (wingmanRequestsState, EventSuccessHostRetryIntent.wingmanRequests),
      (wingmanProfilesState, EventSuccessHostRetryIntent.wingmanProfiles),
      (scorecardState, EventSuccessHostRetryIntent.scorecard),
    ]);
    final fallback = EventSuccessHostSectionState._(
      status: EventSuccessHostSectionStatus.ready,
      plan: plan,
      planIsPersisted:
          planState.status == CatchAsyncStatus.data && persistedPlan != null,
      roster: rosterState.value ?? EventParticipationRoster.empty(),
      scorecard: scorecardState.value,
      assignments: assignmentsState.value ?? const <EventSuccessAssignment>[],
      assignmentParticipantProfiles:
          assignmentParticipantProfilesState.value ?? const <PublicProfile>[],
      rotationAssignments:
          rotationAssignmentsState.value ?? const <EventSuccessAssignment>[],
      rotationDraftAssignments: matchingDraftAssignments,
      rotationParticipantProfiles:
          rotationParticipantProfilesState.value ?? const <PublicProfile>[],
      preferences: preferencesState.value ?? const <EventSuccessPreference>[],
      wingmanRequests:
          wingmanRequestsState.value ?? const <EventSuccessWingmanRequest>[],
      wingmanProfiles: wingmanProfilesState.value ?? const <PublicProfile>[],
      resourceFailures: resourceFailures,
    );

    if (planState.status == CatchAsyncStatus.loading) {
      return fallback.copyWith(status: EventSuccessHostSectionStatus.loading);
    }

    if (planState.status == CatchAsyncStatus.error && planState.error != null) {
      return fallback.copyWith(
        status: EventSuccessHostSectionStatus.error,
        error: planState.error,
        retryIntent: EventSuccessHostRetryIntent.plan,
      );
    }

    return fallback;
  }

  final EventSuccessHostSectionStatus status;
  final EventSuccessPlan plan;
  final bool planIsPersisted;
  final EventParticipationRoster roster;
  final EventSuccessScorecard? scorecard;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> assignmentParticipantProfiles;
  final List<EventSuccessAssignment> rotationAssignments;
  final List<EventSuccessAssignment> rotationDraftAssignments;
  final List<PublicProfile> rotationParticipantProfiles;
  final List<EventSuccessPreference> preferences;
  final List<EventSuccessWingmanRequest> wingmanRequests;
  final List<PublicProfile> wingmanProfiles;
  final List<EventSuccessHostResourceFailure> resourceFailures;
  final Object? error;
  final EventSuccessHostRetryIntent? retryIntent;

  EventSuccessHostSectionState copyWith({
    EventSuccessHostSectionStatus? status,
    Object? error,
    EventSuccessHostRetryIntent? retryIntent,
  }) {
    return EventSuccessHostSectionState._(
      status: status ?? this.status,
      plan: plan,
      planIsPersisted: planIsPersisted,
      roster: roster,
      scorecard: scorecard,
      assignments: assignments,
      assignmentParticipantProfiles: assignmentParticipantProfiles,
      rotationAssignments: rotationAssignments,
      rotationDraftAssignments: rotationDraftAssignments,
      rotationParticipantProfiles: rotationParticipantProfiles,
      preferences: preferences,
      wingmanRequests: wingmanRequests,
      wingmanProfiles: wingmanProfiles,
      resourceFailures: resourceFailures,
      error: error ?? this.error,
      retryIntent: retryIntent ?? this.retryIntent,
    );
  }
}

List<EventSuccessHostResourceFailure> _eventSuccessHostResourceFailures(
  Iterable<(CatchAsyncState<dynamic>, EventSuccessHostRetryIntent)> values,
) {
  final failures = <EventSuccessHostResourceFailure>[];
  for (final (value, intent) in values) {
    if (value.status == CatchAsyncStatus.error && value.error != null) {
      failures.add(
        EventSuccessHostResourceFailure(
          retryIntent: intent,
          error: value.error!,
        ),
      );
    }
  }
  return List.unmodifiable(failures);
}
