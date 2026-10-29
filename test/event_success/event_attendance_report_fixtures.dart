import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:flutter_test/flutter_test.dart';

EventAssistanceRuntimeScope reportScope({String eventId = 'event-1'}) =>
    EventAssistanceRuntimeScope(organizerId: 'organizer-1', eventId: eventId);

Map<String, Object?> reportCounts({int unreviewed = 1, int recorded = 0}) => {
  'attended': 0,
  'recordedNoShow': {'hostConfirmed': recorded, 'guestDeclined': 0},
  'unresolved': {
    'unreviewed': unreviewed,
    'cleared': 0,
    'sourceChanged': 0,
    'superseded': 0,
  },
  'notExpected': {
    'invited': 0,
    'waitlisted': 0,
    'cancelled': 0,
    'eventCancelled': 0,
  },
};

Map<String, Object?> reportMember({
  String id = 'attendee-1',
  Map<String, Object?> classification = const {
    'kind': 'unresolved',
    'reason': 'unreviewed',
  },
}) => {'attendeeId': id, 'classification': classification};

Map<String, Object?> reportResponse({
  EventAssistanceRuntimeScope? scope,
  Map<String, Object?> viewPatch = const {},
}) => {
  'view': {
    'context': (scope ?? reportScope()).context,
    'serverTime': 2000,
    'sourceHash': 'a' * 64,
    'closure': {'kind': 'runtimeComplete', 'completedAt': 1000},
    'source': 'eventAttendees',
    'coverage': 'completeRoster',
    'rosterCount': 1,
    'counts': reportCounts(),
    'members': [reportMember()],
    ...viewPatch,
  },
};

EventAttendanceReportView reportView({
  EventAssistanceRuntimeScope? scope,
  Map<String, Object?> viewPatch = const {},
}) => EventAttendanceReportView.fromCallableData(
  reportResponse(scope: scope, viewPatch: viewPatch),
  expectedScope: scope ?? reportScope(),
);

class AttendanceReportTestRepository extends Fake
    implements EventAttendanceReportRepository {
  Completer<void> _changed = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceRuntimeScope scope,
          Completer<EventAttendanceReportView> result,
        })
      >[];

  @override
  Future<EventAttendanceReportView> fetch(EventAssistanceRuntimeScope scope) {
    final result = Completer<EventAttendanceReportView>();
    reads.add((scope: scope, result: result));
    final old = _changed;
    _changed = Completer<void>();
    old.complete();
    return result.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }
}
