part of '../event_success_repository.dart';

mixin _EventSuccessPlanRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessPlan?> watchPlan(String eventId) => withBackendErrorStream(
    () => _planRef(
      eventId,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'open live event guide',
      resource: _plansPath,
    ),
  );

  Future<EventSuccessPlan?> fetchPlan(String eventId) =>
      withBackendErrorContext(
        () async {
          final doc = await _planRef(eventId).get();
          return doc.exists ? doc.data() : null;
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'open live event guide',
          resource: _plansPath,
        ),
      );

  Future<EventSuccessPlan> ensurePlanForEvent(Event event) =>
      withBackendErrorContext(
        () async {
          final ref = _planRef(event.id);
          final now = DateTime.now();
          return _db.runTransaction((tx) async {
            final snapshot = await tx.get(ref);
            final existing = snapshot.data();
            if (snapshot.exists && existing != null) return existing;
            final plan = EventSuccessPlan.defaultForEvent(event, now: now);
            tx.set(ref, plan);
            return plan;
          });
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'create live event guide',
          resource: _plansPath,
        ),
      );

  Future<void> savePlan(
    EventSuccessPlan plan, {
    required DateTime expectedUpdatedAt,
  }) => withBackendErrorContext(
    () async {
      final ref = _planRef(plan.eventId);
      await _db.runTransaction((tx) async {
        final snapshot = await tx.get(ref);
        final current = snapshot.data();
        if (!snapshot.exists || current == null) {
          throw StateError('The live event guide no longer exists.');
        }
        if (current.status != EventSuccessPlanStatus.setup ||
            current.frozenAt != null) {
          throw StateError('The live event guide is already locked.');
        }
        if (!current.updatedAt.isAtSameMomentAs(expectedUpdatedAt)) {
          throw StateError('The live event guide changed on another device.');
        }
        tx.update(ref, {
          'playbookId': plan.playbookId,
          'selectedModuleIds': plan.selectedModuleIds,
          'targetAttendeeCount': plan.targetAttendeeCount,
          'structureConfig': plan.structureConfig.toJson(),
          'hostGoal': plan.hostGoal,
          'wingmanRequestsEnabled': plan.wingmanRequestsEnabled,
          'contextualOpenersEnabled': plan.contextualOpenersEnabled,
          'compatibilityAffectsRanking': plan.compatibilityAffectsRanking,
          'questionnaireConfig': plan.questionnaireConfig.toJson(),
          'conversationGraphConsentMode':
              plan.conversationGraphConsentMode.name,
          'attendeePrompt': plan.attendeePrompt,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      });
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save live event guide',
      resource: _plansPath,
    ),
  );

  Future<void> updateActiveStep({
    required String eventId,
    required int activeStepIndex,
    required int expectedRevision,
  }) => withBackendErrorContext(
    () => _callLiveAction(
      EventSuccessLiveActionCallableRequest(
        eventId: eventId,
        expectedRevision: expectedRevision,
        action: 'setActiveStep',
        activeStepIndex: activeStepIndex,
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'update live event step',
      resource: _plansPath,
    ),
  );

  Future<void> startLiveRevealCountdown({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) => withBackendErrorContext(
    () => _callLiveAction(
      EventSuccessLiveActionCallableRequest(
        eventId: eventId,
        expectedRevision: expectedRevision,
        action: 'startRevealCountdown',
        roundIndex: roundIndex,
        confirmed: confirmed,
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'start reveal countdown',
      resource: _plansPath,
    ),
  );

  Future<void> revealLiveRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) => withBackendErrorContext(
    () => _callLiveAction(
      EventSuccessLiveActionCallableRequest(
        eventId: eventId,
        expectedRevision: expectedRevision,
        action: 'publishReveal',
        roundIndex: roundIndex,
        confirmed: confirmed,
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'reveal event round',
      resource: _plansPath,
    ),
  );

  Future<void> cancelLiveRevealCountdown({
    required String eventId,
    required int expectedRevision,
  }) => withBackendErrorContext(
    () => _callLiveAction(
      EventSuccessLiveActionCallableRequest(
        eventId: eventId,
        expectedRevision: expectedRevision,
        action: 'cancelRevealCountdown',
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'cancel event reveal countdown',
      resource: _plansPath,
    ),
  );

  Future<void> completePlan({
    required String eventId,
    required int expectedRevision,
    required bool accountabilityAcknowledged,
  }) => withBackendErrorContext(
    () => _callLiveAction(
      EventSuccessLiveActionCallableRequest(
        eventId: eventId,
        expectedRevision: expectedRevision,
        action: 'complete',
        accountabilityAcknowledged: accountabilityAcknowledged,
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'complete live event guide',
      resource: _plansPath,
    ),
  );

  Future<void> _callLiveAction(
    EventSuccessLiveActionCallableRequest request,
  ) async {
    final functions = _functions;
    if (functions == null) {
      throw StateError('FirebaseFunctions is not configured.');
    }
    await functions
        .httpsCallable('controlEventSuccessLive')
        .call(request.toJson());
  }
}
