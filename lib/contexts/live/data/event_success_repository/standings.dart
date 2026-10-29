part of '../event_success_repository.dart';

mixin _EventSuccessStandingsRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessStandings?> watchStandingsForEvent(String eventId) =>
      withBackendErrorStream(
        () => _standingsRef
            .doc(eventId)
            .snapshots()
            .map((doc) => doc.exists ? doc.data() : null),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load event standings',
          resource: _standingsPath,
        ),
      );

  Future<void> recordUnitOutcomes({
    required String eventId,
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions.httpsCallable('recordEventSuccessUnitOutcomes').call({
        'eventId': eventId,
        'expectedRevision': expectedRevision,
        'roundIndex': roundIndex,
        'entries': entries.map((entry) => entry.toJson()).toList(),
      });
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record event outcomes',
      resource: _standingsPath,
    ),
  );
}
