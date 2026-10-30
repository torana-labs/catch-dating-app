import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_callable_responses.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        CompleteEventSuccessFirstHelloMissionCallableRequest,
        ConfigureEventAssignmentFeaturesCallableRequest,
        EventIdCallableRequest,
        EventSuccessSpatialActionCallableRequest,
        GetEventSuccessSpatialLayoutCallableRequest,
        OverrideEventSuccessGroupsCallableRequest,
        OverrideEventSuccessRotationsCallableRequest,
        PrepareEventSuccessRotationDraftCallableRequest,
        PreviewEventAssignmentFeaturesCallableRequest,
        PublishEventSuccessRotationRoundCallableRequest,
        EventSuccessLiveActionCallableRequest,
        HeartbeatEventSuccessPresenceCallableRequest,
        ResolveEventSuccessLateArrivalCallableRequest,
        SetEventSuccessAccountabilityResolutionCallableRequest,
        StartEventSuccessFirstHelloMissionCallableRequest,
        SubmitEventSuccessWingmanRequestCallableRequest,
        UpsertEventSuccessLayoutCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_repository.g.dart';
part 'event_success_repository/accountability.dart';
part 'event_success_repository/arrival.dart';
part 'event_success_repository/assignment.dart';
part 'event_success_repository/compatibility.dart';
part 'event_success_repository/feedback.dart';
part 'event_success_repository/layout.dart';
part 'event_success_repository/plan.dart';
part 'event_success_repository/preference.dart';
part 'event_success_repository/presence.dart';
part 'event_success_repository/providers.dart';
part 'event_success_repository/standings.dart';
part 'event_success_repository/wingman.dart';

const _plansPath = 'eventSuccessPlans';
const _feedbackPath = 'eventSuccessFeedback';
const _assignmentsPath = 'eventSuccessAssignments';
const _assignmentDraftsPath = 'eventSuccessAssignmentDrafts';
const _preferencesPath = 'eventSuccessPreferences';
const _wingmanRequestsPath = 'eventSuccessWingmanRequests';
const _arrivalMissionsPath = 'eventSuccessArrivalMissions';
const _compatibilityResponsesPath = 'eventSuccessCompatibilityResponses';
const _scorecardsPath = 'eventSuccessScorecards';
const _standingsPath = 'eventSuccessStandings';
const _layoutsPath = 'organizerEventSuccessLayouts';
const _lateArrivalsPath = 'eventSuccessLateArrivals';

Map<String, dynamic> _eventSuccessPlanToClientJson(EventSuccessPlan plan) {
  final data = plan.toJson();
  // These fields are authored only by revision-fenced backend live controls.
  data.remove('liveControlRevision');
  data.remove('assignmentDraftRevision');
  data.remove('publishedRotationRoundIndex');
  data.remove('publishedRevealRoundIndex');
  return data;
}

abstract class _EventSuccessRepositoryCore {
  const _EventSuccessRepositoryCore();

  FirebaseFirestore get _db;
  FirebaseFunctions? get _functions;

  CollectionReference<EventSuccessFeedback> get _feedbackRef;
  CollectionReference<EventSuccessAssignment> get _assignmentsRef;
  CollectionReference<EventSuccessAssignmentDraft> get _assignmentDraftsRef;
  CollectionReference<EventSuccessPreference> get _preferencesRef;
  CollectionReference<EventSuccessWingmanRequest> get _wingmanRequestsRef;
  CollectionReference<EventSuccessStandings> get _standingsRef;
  CollectionReference<EventSuccessLayout> get _layoutsRef;

  DocumentReference<EventSuccessPlan> _planRef(String eventId);

  DocumentReference<EventSuccessFeedback> _feedbackDoc({
    required String eventId,
    required String uid,
  });

  DocumentReference<EventSuccessAssignment> _assignmentDoc({
    required String eventId,
    required String moduleId,
    required String uid,
  });

  DocumentReference<EventSuccessPreference> _preferenceDoc({
    required String eventId,
    required String uid,
  });

  DocumentReference<EventSuccessWingmanRequest> _wingmanRequestDoc({
    required String eventId,
    required String uid,
  });

  DocumentReference<EventSuccessArrivalMission> _arrivalMissionDoc({
    required String eventId,
    required String uid,
  });

  DocumentReference<EventSuccessCompatibilityResponse>
  _compatibilityResponseDoc({required String eventId, required String uid});
}

class EventSuccessRepository extends _EventSuccessRepositoryCore
    with
        _EventSuccessPlanRepository,
        _EventSuccessFeedbackRepository,
        _EventSuccessAssignmentRepository,
        _EventSuccessPreferenceRepository,
        _EventSuccessCompatibilityRepository,
        _EventSuccessWingmanRepository,
        _EventSuccessArrivalRepository,
        _EventSuccessLayoutRepository,
        _EventSuccessStandingsRepository,
        _EventSuccessPresenceRepository,
        _EventSuccessAccountabilityRepository {
  const EventSuccessRepository(this._db, {FirebaseFunctions? functions})
    // Keep the public named parameter as `functions:` for tests and callers.
    // ignore: prefer_initializing_formals
    : _functions = functions;

  @override
  final FirebaseFirestore _db;

  @override
  final FirebaseFunctions? _functions;

  CollectionReference<EventSuccessPlan> get _plansRef => _db
      .collection(_plansPath)
      .withDocumentIdConverter<EventSuccessPlan>(
        idField: 'id',
        fromJson: EventSuccessPlan.fromJson,
        toJson: _eventSuccessPlanToClientJson,
      );

  @override
  CollectionReference<EventSuccessFeedback> get _feedbackRef => _db
      .collection(_feedbackPath)
      .withDocumentIdConverter<EventSuccessFeedback>(
        idField: 'id',
        fromJson: EventSuccessFeedback.fromJson,
        toJson: (feedback) => feedback.toJson(),
      );

  @override
  CollectionReference<EventSuccessAssignment> get _assignmentsRef => _db
      .collection(_assignmentsPath)
      .withDocumentIdConverter<EventSuccessAssignment>(
        idField: 'id',
        fromJson: EventSuccessAssignment.fromJson,
        toJson: (assignment) => assignment.toJson(),
      );

  @override
  CollectionReference<EventSuccessAssignmentDraft> get _assignmentDraftsRef =>
      _db
          .collection(_assignmentDraftsPath)
          .withDocumentIdConverter<EventSuccessAssignmentDraft>(
            idField: 'id',
            fromJson: EventSuccessAssignmentDraft.fromJson,
            toJson: (_) =>
                throw UnsupportedError('Assignment drafts are server-owned.'),
          );

  @override
  CollectionReference<EventSuccessStandings> get _standingsRef => _db
      .collection(_standingsPath)
      .withDocumentIdConverter<EventSuccessStandings>(
        idField: 'id',
        fromJson: EventSuccessStandings.fromJson,
        toJson: (standings) => standings.toJson(),
      );

  @override
  CollectionReference<EventSuccessPreference> get _preferencesRef => _db
      .collection(_preferencesPath)
      .withDocumentIdConverter<EventSuccessPreference>(
        idField: 'id',
        fromJson: EventSuccessPreference.fromJson,
        toJson: (preference) => preference.toJson(),
      );

  @override
  CollectionReference<EventSuccessWingmanRequest> get _wingmanRequestsRef => _db
      .collection(_wingmanRequestsPath)
      .withDocumentIdConverter<EventSuccessWingmanRequest>(
        idField: 'id',
        fromJson: EventSuccessWingmanRequest.fromJson,
        toJson: (request) => request.toJson(),
      );

  CollectionReference<EventSuccessArrivalMission> get _arrivalMissionsRef => _db
      .collection(_arrivalMissionsPath)
      .withDocumentIdConverter<EventSuccessArrivalMission>(
        idField: 'id',
        fromJson: EventSuccessArrivalMission.fromJson,
        toJson: (mission) => mission.toJson(),
      );

  CollectionReference<EventSuccessCompatibilityResponse>
  get _compatibilityResponsesRef => _db
      .collection(_compatibilityResponsesPath)
      .withDocumentIdConverter<EventSuccessCompatibilityResponse>(
        idField: 'id',
        fromJson: EventSuccessCompatibilityResponse.fromJson,
        toJson: (response) => response.toJson(),
      );

  @override
  CollectionReference<EventSuccessLayout> get _layoutsRef => _db
      .collection(_layoutsPath)
      .withDocumentIdConverter<EventSuccessLayout>(
        idField: '_documentId',
        fromJson: EventSuccessLayout.fromJson,
        toJson: (_) => throw UnsupportedError('Layouts are callable-owned.'),
      );

  @override
  DocumentReference<EventSuccessPlan> _planRef(String eventId) =>
      _plansRef.doc(eventId);

  @override
  DocumentReference<EventSuccessFeedback> _feedbackDoc({
    required String eventId,
    required String uid,
  }) => _feedbackRef.doc(eventSuccessFeedbackId(eventId: eventId, uid: uid));

  @override
  DocumentReference<EventSuccessAssignment> _assignmentDoc({
    required String eventId,
    required String moduleId,
    required String uid,
  }) => _assignmentsRef.doc(
    eventSuccessAssignmentId(eventId: eventId, moduleId: moduleId, uid: uid),
  );

  @override
  DocumentReference<EventSuccessPreference> _preferenceDoc({
    required String eventId,
    required String uid,
  }) =>
      _preferencesRef.doc(eventSuccessPreferenceId(eventId: eventId, uid: uid));

  @override
  DocumentReference<EventSuccessWingmanRequest> _wingmanRequestDoc({
    required String eventId,
    required String uid,
  }) => _wingmanRequestsRef.doc(
    eventSuccessWingmanRequestId(eventId: eventId, uid: uid),
  );

  @override
  DocumentReference<EventSuccessArrivalMission> _arrivalMissionDoc({
    required String eventId,
    required String uid,
  }) => _arrivalMissionsRef.doc(
    eventSuccessArrivalMissionId(eventId: eventId, uid: uid),
  );

  @override
  DocumentReference<EventSuccessCompatibilityResponse>
  _compatibilityResponseDoc({required String eventId, required String uid}) =>
      _compatibilityResponsesRef.doc(
        eventSuccessCompatibilityResponseId(eventId: eventId, uid: uid),
      );
}
