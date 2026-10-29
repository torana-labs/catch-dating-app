import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:flutter_test/flutter_test.dart';

Map<Object?, Object?> assignmentMap({
  String kind = 'program',
  String scopeId = 'program_1',
  String? subtitle = 'Feb 13–15 · Delhi',
  Object? duties,
  Object? destinations = const ['arrivals', 'dispatch'],
  Object? overflowDestinations = const [],
  String shellMode = 'tabs',
  Object? grantExpiresAtMillis,
}) => {
  'kind': kind,
  'scopeId': scopeId,
  'organizerId': 'org_1',
  'title': 'Kapoor–Shah Wedding',
  'subtitle': subtitle,
  'organizerName': 'Catch Events Co.',
  'duties':
      duties ??
      [
        {
          'duty': 'airportGreeter',
          'pickupPointIds': ['del_t3'],
        },
      ],
  'destinations': destinations,
  'overflowDestinations': overflowDestinations,
  'shellMode': shellMode,
  'grantExpiresAtMillis': grantExpiresAtMillis,
};

void main() {
  group('HostWorkAssignment', () {
    test('parses exact expiring administration as a Team task', () {
      final assignment = HostWorkAssignment.fromMap(
        assignmentMap(
          duties: const [
            {'duty': 'programAdmin'},
          ],
          destinations: const ['team'],
          shellMode: 'task',
          grantExpiresAtMillis: 1771882200000,
        ),
      );
      expect(assignment.duties.single.duty, HostWorkDuty.programAdmin);
      expect(assignment.destinations, [HostWorkDestination.team]);
      expect(assignment.grantExpiresAt, isNotNull);
    });

    test('parses a scoped program assignment', () {
      final assignment = HostWorkAssignment.fromMap(
        assignmentMap(grantExpiresAtMillis: 1771882200000),
      );
      expect(assignment.kind, HostWorkScopeKind.program);
      expect(assignment.isProgram, isTrue);
      expect(assignment.scopeId, 'program_1');
      expect(assignment.title, 'Kapoor–Shah Wedding');
      expect(assignment.subtitle, 'Feb 13–15 · Delhi');
      expect(assignment.organizerName, 'Catch Events Co.');
      expect(assignment.duties.single.duty, HostWorkDuty.airportGreeter);
      expect(assignment.duties.single.pickupPointIds, {'del_t3'});
      expect(assignment.destinations, [
        HostWorkDestination.arrivals,
        HostWorkDestination.dispatch,
      ]);
      expect(assignment.shellMode, HostWorkShellMode.tabs);
      expect(assignment.grantExpiresAt, isNotNull);
    });

    test('parses an event assignment with role-mapped duties', () {
      final assignment = HostWorkAssignment.fromMap(
        assignmentMap(
          kind: 'event',
          scopeId: 'event_1',
          duties: const [
            {'duty': 'eventLead'},
          ],
          destinations: const ['nowNext', 'door', 'attention'],
        ),
      );
      expect(assignment.isProgram, isFalse);
      expect(assignment.duties.single.duty, HostWorkDuty.eventLead);
      expect(assignment.destinations.last, HostWorkDestination.attention);
    });

    test('drops unknown destinations instead of failing the list', () {
      final assignment = HostWorkAssignment.fromMap(
        assignmentMap(destinations: const ['arrivals', 'futureDestination']),
      );
      expect(assignment.destinations, [HostWorkDestination.arrivals]);
    });

    test('rejects an unknown duty name', () {
      expect(
        () => HostWorkAssignment.fromMap(
          assignmentMap(
            duties: const [
              {'duty': 'futureDuty'},
            ],
          ),
        ),
        throwsFormatException,
      );
    });
  });

  group('HostWorkAssignments', () {
    test('parses the shell entry and assignment list', () {
      final result = HostWorkAssignments.fromCallableData({
        'assignments': [assignmentMap()],
        'shellEntry': 'workShell',
      });
      expect(result.shellEntry, HostWorkShellEntry.workShell);
      expect(result.assignments, hasLength(1));
      expect(result.isEmpty, isFalse);
    });

    test('parses the manager shell entry with no assignments', () {
      final result = HostWorkAssignments.fromCallableData(const {
        'assignments': [],
        'shellEntry': 'managerShell',
      });
      expect(result.shellEntry, HostWorkShellEntry.managerShell);
      expect(result.isEmpty, isTrue);
    });
  });
}
