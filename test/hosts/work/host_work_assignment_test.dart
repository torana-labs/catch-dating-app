import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:flutter_test/flutter_test.dart';

final _now = DateTime.utc(2026, 11, 20, 10);
int _ms(Duration after) => _now.add(after).millisecondsSinceEpoch;

Map<Object?, Object?> row({
  String kind = 'program',
  String scopeId = 'program_1',
  String status = 'active',
  int activeFromMillis = 0,
  int? grantExpiresAtMillis,
  List<Map<String, Object?>>? duties,
}) => {
  'uid': 'staff_1',
  'kind': kind,
  'scopeId': scopeId,
  'organizerId': 'org_1',
  'title': 'Kapoor-Shah Wedding',
  'organizerName': 'Catch Events Co.',
  'status': status,
  'activeFromMillis': activeFromMillis,
  'grantExpiresAtMillis': grantExpiresAtMillis ?? _ms(const Duration(days: 2)),
  'duties':
      duties ??
      [
        {
          'duty': 'airportGreeter',
          'pickupPointIds': ['del_t3'],
          'expiresAtMillis': _ms(const Duration(days: 1)),
        },
      ],
  'version': 1,
};

void main() {
  group('HostWorkAssignments.fromViews', () {
    test('lists a live programme row with its duties and soonest end', () {
      final result = HostWorkAssignments.fromViews([
        row(
          duties: [
            {
              'duty': 'airportGreeter',
              'pickupPointIds': ['del_t3'],
              'expiresAtMillis': _ms(const Duration(days: 1)),
            },
            {
              'duty': 'hotelDesk',
              'hotelIds': ['h1'],
              'expiresAtMillis': _ms(const Duration(hours: 3)),
            },
          ],
        ),
      ], _now);
      final assignment = result.assignments.single;
      expect(assignment.isProgram, isTrue);
      expect(assignment.title, 'Kapoor-Shah Wedding');
      expect(assignment.organizerName, 'Catch Events Co.');
      expect(assignment.duties.map((duty) => duty.duty), [
        HostWorkDuty.airportGreeter,
        HostWorkDuty.hotelDesk,
      ]);
      expect(assignment.duties.first.pickupPointIds, {'del_t3'});
      expect(
        assignment.grantExpiresAt,
        DateTime.fromMillisecondsSinceEpoch(
          _ms(const Duration(hours: 3)),
          isUtc: true,
        ),
      );
      expect(result.shellEntry, HostWorkShellEntry.workShell);
      expect(
        result.nextChangeAt!.millisecondsSinceEpoch,
        _ms(const Duration(hours: 3)),
      );
    });

    test('drops expired duties, expired grants, inactive and future rows', () {
      final result = HostWorkAssignments.fromViews([
        row(
          scopeId: 'expired_duties',
          duties: [
            {
              'duty': 'hotelDesk',
              'expiresAtMillis': _ms(-const Duration(minutes: 1)),
            },
          ],
        ),
        row(
          scopeId: 'expired_grant',
          grantExpiresAtMillis: _ms(-const Duration(minutes: 1)),
        ),
        row(scopeId: 'revoked', status: 'inactive'),
        row(
          scopeId: 'not_yet',
          activeFromMillis: _ms(const Duration(minutes: 5)),
        ),
      ], _now);
      expect(result.assignments, isEmpty);
      expect(result.shellEntry, HostWorkShellEntry.none);
      expect(
        result.nextChangeAt!.millisecondsSinceEpoch,
        _ms(const Duration(minutes: 5)),
      );
    });

    test('sorts events before programmes and skips unknown duties', () {
      final result = HostWorkAssignments.fromViews([
        row(scopeId: 'program_b'),
        row(
          kind: 'event',
          scopeId: 'event_a',
          duties: [
            {
              'duty': 'functionCheckIn',
              'expiresAtMillis': _ms(const Duration(days: 1)),
            },
            {
              'duty': 'futureDuty',
              'expiresAtMillis': _ms(const Duration(days: 1)),
            },
          ],
        ),
      ], _now);
      expect(result.assignments.map((a) => a.scopeId), [
        'event_a',
        'program_b',
      ]);
      expect(result.assignments.first.kind, HostWorkScopeKind.event);
      expect(
        result.assignments.first.duties.single.duty,
        HostWorkDuty.functionCheckIn,
      );
    });

    test('an active team membership lands in the manager shell', () {
      final result = HostWorkAssignments.fromViews([
        row(),
        row(kind: 'team', scopeId: 'org_1', duties: const []),
      ], _now);
      expect(result.shellEntry, HostWorkShellEntry.managerShell);
      expect(result.assignments, hasLength(1));
    });
  });
}
