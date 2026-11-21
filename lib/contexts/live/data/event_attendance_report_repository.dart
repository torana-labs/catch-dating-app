import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_report_repository.g.dart';

/// The attendance report and no-shows: a manager listener on
/// `hostEventAttendanceReports/{eventId}` (rules let the event's current
/// managers get it; only the server writes it) and the closeout commands
/// `getEventAttendanceDisposition` and `recordEventNoShow`.
class EventAttendanceReportRepository {
  const EventAttendanceReportRepository(this._db, this._functions);

  static const collection = 'hostEventAttendanceReports';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  Stream<EventAttendanceReport?> watch(String eventId) =>
      withBackendErrorStream(
        () => _db
            .collection(collection)
            .doc(eventId)
            .snapshots()
            .map(
              (snapshot) =>
                  EventAttendanceReport.fromFirestore(snapshot.data()),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch attendance report',
          resource: collection,
        ),
      );

  /// Records that a booked guest did not come, as the host confirmed. It
  /// reads the guest's closeout state first and sends the decision fenced
  /// on it; a retry with the same [operationId] replays.
  Future<EventNoShowOutcome> recordNoShow({
    required String organizerId,
    required String eventId,
    required String attendeeId,
    required String operationId,
  }) => withBackendErrorContext(
    () async {
      final context = {
        'mode': 'live',
        'eventId': eventId,
        'organizerId': organizerId,
      };
      final read = await _functions
          .httpsCallable('getEventAttendanceDisposition')
          .call<Object?>({'context': context, 'attendeeId': attendeeId});
      final view = _map(_map(read.data)['view']);
      final disposition = _map(view['disposition']);
      if (disposition['kind'] == 'recorded') {
        return EventNoShowOutcome.alreadyRecorded;
      }
      final recordability = _map(view['recordability']);
      if (recordability['kind'] != 'allowed') {
        return switch (recordability['reason']) {
          'eventNotFinished' => EventNoShowOutcome.notFinished,
          'alreadyAttended' => EventNoShowOutcome.attended,
          _ => EventNoShowOutcome.notExpected,
        };
      }
      await _functions.httpsCallable('recordEventNoShow').call<Object?>({
        'expectedSourceHash': view['sourceHash'],
        'command': {
          'kind': 'recordNoShow',
          'context': context,
          'eventId': eventId,
          'operationId': operationId,
          'payload': {
            'attendeeId': attendeeId,
            'expectedAttendanceRevision': _map(view['attendance'])['revision'],
            'expectedDispositionRevision': disposition['revision'],
            'decision': {
              'kind': 'record',
              'evidence': {'kind': 'hostConfirmed'},
            },
          },
        },
      });
      return EventNoShowOutcome.recorded;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record a no-show',
      resource: collection,
    ),
  );

  static Map<Object?, Object?> _map(Object? value) {
    if (value is Map) return value;
    throw const FormatException('The closeout reply is not an object.');
  }
}

@riverpod
EventAttendanceReportRepository eventAttendanceReportRepository(Ref ref) =>
    EventAttendanceReportRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

/// The event's attendance report, by listener; null until the server has
/// written one.
@riverpod
Stream<EventAttendanceReport?> watchEventAttendanceReport(
  Ref ref,
  String eventId,
) => ref.watch(eventAttendanceReportRepositoryProvider).watch(eventId);
