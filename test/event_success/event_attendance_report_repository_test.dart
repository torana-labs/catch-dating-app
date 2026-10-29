import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';
import 'event_attendance_report_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAttendanceReportRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventAttendanceReportRepository(functions);
  });

  test(
    'reads only through the canonical callable with the generated live scope',
    () async {
      functions.response = reportResponse();
      final report = await repository.fetch(reportScope());
      expect(report.coverage, AttendanceReportCoverage.completeRoster);
      expect(report.counts.unresolvedTotal, 1);
      expect(functions.calls.single.name, 'getEventAttendanceReport');
      expect(functions.calls.single.input, {'context': reportScope().context});
    },
  );

  test(
    'transport, authority and deployment failures are never empty reports',
    () async {
      for (final entry in [
        (
          FirebaseFunctionsException(code: 'not-found', message: 'NOT_FOUND'),
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        (
          FirebaseFunctionsException(
            code: 'permission-denied',
            message: 'Denied',
          ),
          isA<PermissionException>(),
        ),
        (
          FirebaseFunctionsException(code: 'unavailable', message: 'Offline'),
          isA<NetworkException>(),
        ),
        (
          FirebaseFunctionsException(
            code: 'resource-exhausted',
            message: 'Too large',
          ),
          isA<AppException>(),
        ),
      ]) {
        functions.error = entry.$1;
        await expectLater(repository.fetch(reportScope()), throwsA(entry.$2));
      }
      expect(functions.calls, hasLength(4));
    },
  );

  test(
    'invalid counts and foreign reports remain visible errors without fallback',
    () async {
      for (final raw in [
        null,
        {},
        reportResponse(scope: reportScope(eventId: 'other')),
        reportResponse(viewPatch: {'counts': reportCounts(unreviewed: 0)}),
        reportResponse(viewPatch: {'source': 'eventParticipations'}),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.fetch(reportScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
      expect(functions.calls, hasLength(5));
      expect(
        functions.calls.every((c) => c.name == 'getEventAttendanceReport'),
        isTrue,
      );
    },
  );
}
