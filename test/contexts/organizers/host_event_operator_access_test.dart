import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Local time: Timestamp.toDate() returns local DateTimes.
final _now = DateTime(2026, 11, 16, 18);

HostOperatorEvent _event() => HostOperatorEvent(
  eventId: 'event-1',
  organizerId: 'organizer-1',
  title: 'Sunday run',
  startAt: _now.add(const Duration(hours: 1)),
  endAt: _now.add(const Duration(hours: 3)),
  status: 'active',
);

Map<String, dynamic> _grantData({
  String role = 'eventOperator',
  String status = 'active',
  List<String> permissions = const ['viewRoster', 'setAttendance'],
  Duration expiresIn = const Duration(hours: 6),
  Object? operatorExpiresAt = _useExpiresAt,
}) => {
  'eventId': 'event-1',
  'organizerId': 'organizer-1',
  'uid': 'staff-1',
  'role': role,
  'status': status,
  'permissions': permissions,
  'expiresAt': Timestamp.fromDate(_now.add(expiresIn)),
  if (identical(operatorExpiresAt, _useExpiresAt))
    'operatorExpiresAt': Timestamp.fromDate(_now.add(expiresIn))
  else if (operatorExpiresAt != _omit)
    'operatorExpiresAt': operatorExpiresAt,
};

const _useExpiresAt = _Sentinel('useExpiresAt');
const _omit = _Sentinel('omit');

HostEventOperatorAccess _resolve({
  Set<String>? managers,
  Map<String, dynamic>? grant,
  String uid = 'staff-1',
}) => resolveHostEventOperatorAccess(
  event: _event(),
  uid: uid,
  managerUserIds: managers,
  grant: grant == null ? null : HostOwnEventStaffGrant.fromData(grant),
  now: _now,
);

void main() {
  group('resolveHostEventOperatorAccess', () {
    test('organizer managers get every permission and no expiry', () {
      final access = _resolve(managers: {'host-1', 'staff-1'});

      expect(access.actorRole, HostEventOperatorRole.manager);
      expect(access.permissions, HostEventOperatorPermission.values.toSet());
      expect(access.grantExpiresAt, isNull);
      expect(access.title, 'Sunday run');
    });

    test('active staff get exactly their granted permissions', () {
      final access = _resolve(grant: _grantData());

      expect(access.actorRole, HostEventOperatorRole.operator);
      expect(access.permissions, {
        HostEventOperatorPermission.viewRoster,
        HostEventOperatorPermission.setAttendance,
      });
      expect(access.grantExpiresAt, _now.add(const Duration(hours: 6)));
    });

    test('a denied organizer read still allows a valid grant', () {
      final access = _resolve(grant: _grantData());

      expect(access.actorRole, HostEventOperatorRole.operator);
    });

    test('event-wide permissions never outlast the grant', () {
      final access = _resolve(
        grant: _grantData(
          operatorExpiresAt: Timestamp.fromDate(
            _now.add(const Duration(days: 2)),
          ),
        ),
      );

      expect(access.grantExpiresAt, _now.add(const Duration(hours: 6)));
    });

    test('legacy check-in operators fall back to expiresAt', () {
      final access = _resolve(
        grant: _grantData(role: 'checkInOperator', operatorExpiresAt: _omit),
      );

      expect(access.grantExpiresAt, _now.add(const Duration(hours: 6)));
    });

    for (final (label, grant) in [
      ('no grant', null),
      ('a revoked grant', _grantData(status: 'revoked')),
      ('an expired grant', _grantData(expiresIn: const Duration(minutes: -1))),
      (
        'a grant without viewRoster',
        _grantData(permissions: ['setAttendance']),
      ),
      ('group duties only', _grantData(operatorExpiresAt: null)),
      (
        'a legacy event operator without operatorExpiresAt',
        _grantData(operatorExpiresAt: _omit),
      ),
      ('another organizer', {..._grantData(), 'organizerId': 'organizer-2'}),
      ('another account', {..._grantData(), 'uid': 'staff-2'}),
    ]) {
      test('$label is denied', () {
        expect(
          () => _resolve(managers: {'host-1'}, grant: grant),
          throwsA(isA<PermissionException>()),
        );
      });
    }
  });

  group('HostOperatorEvent', () {
    Map<String, dynamic> data({Object? name}) => {
      'organizerId': 'organizer-1',
      'startTime': Timestamp.fromDate(_now),
      'endTime': Timestamp.fromDate(_now.add(const Duration(hours: 2))),
      'status': 'active',
      'name': name,
      'eventFormat': {
        'version': 1,
        'activityKind': 'pickleball',
        'interactionModel': 'pickupGame',
      },
    };

    test('uses the authored name', () {
      expect(
        HostOperatorEvent.fromData(
          'event-1',
          data(name: ' Pickle night '),
        ).title,
        'Pickle night',
      );
    });

    test('falls back to the event format label', () {
      expect(
        HostOperatorEvent.fromData('event-1', data(name: '  ')).title,
        'Pickleball',
      );
    });

    test('rejects an event without a valid time range', () {
      expect(
        () => HostOperatorEvent.fromData('event-1', {
          ...data(),
          'endTime': Timestamp.fromDate(_now),
        }),
        throwsFormatException,
      );
    });
  });

  test('manager ids match the rules fields', () {
    expect(
      organizerManagerUserIds({
        'hostUserId': 'host-1',
        'ownerUserId': 'owner-1',
        'hostUserIds': ['host-1', 'host-2', ''],
        'hostProfiles': [
          {'uid': 'display-only'},
        ],
      }),
      {'host-1', 'owner-1', 'host-2'},
    );
  });

  group('hostEventOperatorAccessProvider', () {
    late FakeFirebaseFirestore db;

    setUp(() async {
      db = FakeFirebaseFirestore();
      await db.collection('events').doc('event-1').set({
        'organizerId': 'organizer-1',
        'name': 'Sunday run',
        'startTime': Timestamp.fromDate(_now.add(const Duration(hours: 1))),
        'endTime': Timestamp.fromDate(_now.add(const Duration(hours: 3))),
        'status': 'active',
      });
      await db.collection('organizers').doc('organizer-1').set({
        'hostUserId': 'host-1',
        'hostUserIds': ['host-1'],
      });
      await db
          .collection('eventStaffGrants')
          .doc(eventStaffGrantId('event-1', 'staff-1'))
          .set(_grantData());
    });

    ProviderContainer container(String uid) {
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(uid)),
          appClockProvider.overrideWithValue(AppClock.custom(() => _now)),
          hostEventStaffRepositoryProvider.overrideWith(
            (ref) => HostEventStaffRepository(_UnusedFunctions(), db),
          ),
        ],
      );
      addTearDown(container.dispose);
      return container;
    }

    Future<HostEventOperatorAccess> access(ProviderContainer container) {
      final provider = hostEventOperatorAccessProvider('event-1');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      return container.read(provider.future);
    }

    test('reads a manager from the organizer document', () async {
      final result = await access(container('host-1'));

      expect(result.actorRole, HostEventOperatorRole.manager);
      expect(result.organizerId, 'organizer-1');
    });

    test('reads staff from their own grant', () async {
      final result = await access(container('staff-1'));

      expect(result.actorRole, HostEventOperatorRole.operator);
      expect(result.has(HostEventOperatorPermission.setAttendance), isTrue);
      expect(
        result.has(HostEventOperatorPermission.publishLiveLocation),
        isFalse,
      );
    });

    test('follows a revocation live', () async {
      final target = container('staff-1');
      await access(target);

      await db
          .collection('eventStaffGrants')
          .doc(eventStaffGrantId('event-1', 'staff-1'))
          .update({'status': 'revoked'});
      await pumpEventQueue();

      expect(
        target.read(hostEventOperatorAccessProvider('event-1')).error,
        isA<PermissionException>(),
      );
    });
  });
}

/// Operator access never calls a Function; any call fails the test.
class _UnusedFunctions extends Fake implements FirebaseFunctions {}

/// Distinct markers for "copy expiresAt" and "leave the field out".
class _Sentinel {
  const _Sentinel(this.name);

  final String name;
}
