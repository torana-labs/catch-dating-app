part of '../event_success_repository.dart';

mixin _EventSuccessAssignmentRepository on _EventSuccessRepositoryCore {
  Future<EventSuccessAssignmentFeaturePreview> previewAssignmentFeatures({
    required String eventId,
    required List<EventSuccessAssignmentFeatureRule> rules,
    List<String> sourceFormIds = const [],
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final result = await functions
          .httpsCallable('previewEventAssignmentFeatures')
          .call<Object?>(
            PreviewEventAssignmentFeaturesCallableRequest(
              eventId: eventId,
              rules: rules.map((rule) => rule.toJson()).toList(),
              sourceFormIds: sourceFormIds.isEmpty ? null : sourceFormIds,
            ).toJson(),
          );
      return EventSuccessAssignmentFeaturePreview.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'preview event matching coverage',
      resource: _plansPath,
    ),
  );

  Future<EventSuccessAssignmentFeatureSaveResult> configureAssignmentFeatures({
    required String eventId,
    required int expectedRevision,
    required String requestId,
    required List<EventSuccessAssignmentFeatureRule> rules,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final result = await functions
          .httpsCallable('configureEventAssignmentFeatures')
          .call<Object?>(
            ConfigureEventAssignmentFeaturesCallableRequest(
              eventId: eventId,
              expectedRevision: expectedRevision,
              requestId: requestId,
              rules: rules.map((rule) => rule.toJson()).toList(),
            ).toJson(),
          );
      return EventSuccessAssignmentFeatureSaveResult.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save event matching preferences',
      resource: _plansPath,
    ),
  );

  Stream<EventSuccessAssignment?> watchAssignmentForUser({
    required String eventId,
    required String uid,
    String moduleId = 'micro_pods',
  }) => withBackendErrorStream(
    () => _assignmentDoc(
      eventId: eventId,
      moduleId: moduleId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your event assignment',
      resource: _assignmentsPath,
    ),
  );

  Stream<EventSuccessAssignment?> watchRotationAssignmentForUser({
    required String eventId,
    required String uid,
  }) => watchAssignmentForUser(
    eventId: eventId,
    uid: uid,
    moduleId: 'guided_rotations',
  );

  Stream<List<EventSuccessAssignment>> watchAssignmentsForEvent({
    required String eventId,
    String moduleId = 'micro_pods',
  }) => withBackendErrorStream(
    () => _assignmentsRef
        .where('eventId', isEqualTo: eventId)
        .where('moduleId', isEqualTo: moduleId)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load event assignments',
      resource: _assignmentsPath,
    ),
  );

  Stream<List<EventSuccessAssignment>> watchRotationAssignmentsForEvent({
    required String eventId,
  }) =>
      watchAssignmentsForEvent(eventId: eventId, moduleId: 'guided_rotations');

  Stream<List<EventSuccessAssignmentDraft>> watchRotationDraftsForEvent({
    required String eventId,
  }) => withBackendErrorStream(
    () => _assignmentDraftsRef
        .where('eventId', isEqualTo: eventId)
        .where('moduleId', isEqualTo: 'guided_rotations')
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load prepared event rotations',
      resource: _assignmentDraftsPath,
    ),
  );

  Future<void> generateMicroPodAssignments({required String eventId}) =>
      withBackendErrorContext(
        () {
          final functions = _functions;
          if (functions == null) {
            throw StateError('FirebaseFunctions is not configured.');
          }
          return functions
              .httpsCallable('generateEventSuccessPods')
              .call(EventIdCallableRequest(eventId: eventId).toJson());
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'generate event pods',
          resource: _assignmentsPath,
        ),
      );

  Future<void> generateGuidedRotations({
    required String eventId,
    required int expectedRevision,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('generateEventSuccessRotations')
          .call(
            PrepareEventSuccessRotationDraftCallableRequest(
              eventId: eventId,
              expectedRevision: expectedRevision,
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'generate event rotations',
      resource: _assignmentsPath,
    ),
  );

  Future<void> overrideGuidedRotations({
    required String eventId,
    required int expectedRevision,
    required List<EventSuccessRotationOverrideRound> rounds,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('overrideEventSuccessRotations')
          .call(
            OverrideEventSuccessRotationsCallableRequest(
              eventId: eventId,
              expectedRevision: expectedRevision,
              rounds: rounds.map((round) => round.toJson()).toList(),
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'adjust event rotations',
      resource: _assignmentsPath,
    ),
  );

  Future<void> overrideGroupAssignments({
    required String eventId,
    required List<EventSuccessGroupOverrideRound> rounds,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('overrideEventSuccessGroups')
          .call(
            OverrideEventSuccessGroupsCallableRequest(
              eventId: eventId,
              rounds: rounds.map((round) => round.toJson()).toList(),
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'adjust event groups',
      resource: _assignmentsPath,
    ),
  );

  Future<void> publishGuidedRotationRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('publishEventSuccessRotationRound')
          .call(
            PublishEventSuccessRotationRoundCallableRequest(
              eventId: eventId,
              expectedRevision: expectedRevision,
              roundIndex: roundIndex,
              confirmed: confirmed,
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'publish event rotation round',
      resource: _assignmentsPath,
    ),
  );
}
