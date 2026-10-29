import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_help_queue_fixtures.dart';

void main() {
  test(
    'actual practice help projections retain named guest and host choices',
    () {
      final initial = EventRehearsalBootstrap.fromCallableData(
        practiceHelpQueueFixture('initial'),
      );
      final request = initial.helpRequests!.cases.single;
      expect(request.displayName, initial.actors.first.displayName);
      expect(initial.helpRequests!.managerOptions!.actorUid, 'host-1');
      expect(
        initial.helpRequests!.managerOptions!.managers.map(
          (r) => r.displayName,
        ),
        ['Sam', 'Priya'],
      );
      final assigned =
          EventRehearsalBootstrap.fromCallableData(
                practiceHelpQueueFixture('assigned'),
              ).helpRequests!.cases.single
              as RehearsalOpenHelpCase;
      expect(
        (assigned.assignment as AssistanceCaseAssigned).managerUid,
        'host-2',
      );
      final resolved =
          EventRehearsalBootstrap.fromCallableData(
                practiceHelpQueueFixture('resolved'),
              ).helpRequests!.cases.single
              as RehearsalClosedHelpCase;
      expect(
        resolved.resolution.outcome,
        AssistanceCaseResolutionOutcome.resolved,
      );
    },
  );

  test('practice queue cannot attach another guest name', () {
    final raw = practiceHelpQueueFixture('initial');
    final help = raw['helpRequests'] as Map;
    final row = (help['cases'] as List).single as Map;
    row['displayName'] = 'Someone else';
    expect(
      () => EventRehearsalBootstrap.fromCallableData(raw),
      throwsFormatException,
    );
    row.remove('displayName');
    help.remove('managerOptions');
    final older = EventRehearsalBootstrap.fromCallableData(raw).helpRequests!;
    expect(older.cases.single.displayName, isNull);
    expect(older.managerOptions, isNull);
  });
}
