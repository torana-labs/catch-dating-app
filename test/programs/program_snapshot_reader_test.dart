import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SharedPreferencesProgramReadSnapshotStore store;
  final scope = programSnapshotScope('arrivals', 'p1', 't3');
  Map<String, Object?> access({bool expired = false}) => {
    'programId': 'p1',
    'organizerId': 'org',
    'title': 'Private program',
    'kind': 'wedding',
    'timezone': 'Asia/Kolkata',
    'status': 'active',
    'actorRole': 'staff',
    'capabilities': ['arrivalsTransport'],
    'duties': <Map<String, Object?>>[
      {
        'duty': 'airportGreeter',
        'pickupPointIds': ['t3'],
        'hotelIds': [],
        'expiresAtMillis': DateTime.now()
            .add(Duration(hours: expired ? -1 : 1))
            .millisecondsSinceEpoch,
      },
    ],
    'grantExpiresAtMillis': DateTime.now()
        .add(Duration(hours: expired ? -1 : 1))
        .millisecondsSinceEpoch,
    'pickupPoints': [],
    'functions': [],
    'hotels': [],
    'vehicleClasses': [],
  };
  Future<void> seed({bool expired = false}) async {
    await store.save(
      'account',
      programSnapshotScope('work', 'p1'),
      access(expired: expired),
    );
    await store.save('account', scope, {'programId': 'p1', 'guest': 'Private'});
  }

  Future<ProgramReadView<Map<String, Object?>>> read(
    AppException error, {
    bool Function()? current,
    String station = 't3',
  }) => readProgramWithSnapshot(
    accountId: 'account',
    programId: 'p1',
    scope: scope,
    store: store,
    isCurrentAccount: current ?? () => true,
    live: () async => throw error,
    parse: (value) =>
        requiredMap(value, 'test snapshot').cast<String, Object?>(),
    allowsAccess: (a) => canReadProgramStation(
      a,
      station,
      dispatch: false,
      now: DateTime.now(),
      forSnapshot: true,
    ),
  );

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    store = SharedPreferencesProgramReadSnapshotStore();
  });

  test(
    'connectivity failure returns only an authorized account snapshot',
    () async {
      await seed();
      final result = await read(
        const NetworkException('connection-failed', 'Offline'),
      );
      expect(result.value['guest'], 'Private');
      expect(result.snapshotAt, isNotNull);
    },
  );

  test(
    'denied access purges snapshots and cannot be bypassed offline',
    () async {
      await seed();
      await expectLater(
        read(const PermissionException('Revoked')),
        throwsA(isA<PermissionException>()),
      );
      expect(await store.load('account', scope), isNull);
      await expectLater(
        read(const NetworkException('connection-failed', 'Offline')),
        throwsA(isA<NetworkException>()),
      );
    },
  );

  test('rate limits and validation errors never unlock offline data', () async {
    await seed();
    for (final error in <AppException>[
      const NetworkException('too-many-requests', 'Limit'),
      const ValidationException('Invalid'),
    ]) {
      await expectLater(read(error), throwsA(same(error)));
    }
  });

  test(
    'expired grants and stations outside the grant cannot load a snapshot',
    () async {
      await seed(expired: true);
      await expectLater(
        read(const NetworkException('connection-failed', 'Offline')),
        throwsA(isA<NetworkException>()),
      );
      await seed();
      await expectLater(
        read(
          const NetworkException('connection-failed', 'Offline'),
          station: 'other',
        ),
        throwsA(isA<NetworkException>()),
      );
    },
  );

  test('account changes during a read discard its result', () async {
    await seed();
    var current = true;
    await expectLater(
      readProgramWithSnapshot(
        accountId: 'account',
        programId: 'p1',
        scope: scope,
        store: store,
        isCurrentAccount: () => current,
        live: () async {
          current = false;
          return 'old account data';
        },
        parse: (_) => 'cached',
      ),
      throwsA(isA<SignInRequiredException>()),
    );
  });

  test(
    'late saves cannot restore a revoked or signed-out account snapshot',
    () async {
      await seed();
      final generation = store.generation('account', 'p1');
      await store.clearAccount('account');
      await store.save(
        'account',
        programSnapshotScope('work', 'p1'),
        access(),
        expectedGeneration: generation,
      );
      await store.save('account', scope, {
        'programId': 'p1',
      }, expectedGeneration: generation);
      expect(await store.load('account', scope), isNull);
      expect(
        await store.load('account', programSnapshotScope('work', 'p1')),
        isNull,
      );
    },
  );

  test('concurrent scope saves do not overwrite one another', () async {
    await Future.wait([
      for (var i = 0; i < 10; i++)
        store.save('account', programSnapshotScope('arrivals', 'p1', 't$i'), {
          'programId': 'p1',
          'station': i,
        }),
    ]);
    for (var i = 0; i < 10; i++) {
      expect(
        await store.load(
          'account',
          programSnapshotScope('arrivals', 'p1', 't$i'),
        ),
        isNotNull,
      );
    }
  });
  test('expired airport duty preserves longer hotel and work access', () async {
    final raw = access();
    final duties = raw['duties']! as List<Map<String, Object?>>;
    duties.first['expiresAtMillis'] = DateTime.now()
        .subtract(const Duration(seconds: 1))
        .millisecondsSinceEpoch;
    duties.add({
      'duty': 'hotelDesk',
      'pickupPointIds': [],
      'hotelIds': ['hotel'],
      'expiresAtMillis': raw['grantExpiresAtMillis'],
    });
    await store.save('account', programSnapshotScope('work', 'p1'), raw);
    await store.save('account', scope, {'programId': 'p1', 'guest': 'Private'});
    await expectLater(
      read(const NetworkException('connection-failed', 'Offline')),
      throwsA(isA<NetworkException>()),
    );
    final result = await readProgramWithSnapshot(
      accountId: 'account',
      programId: 'p1',
      scope: programSnapshotScope('work', 'p1'),
      store: store,
      isCurrentAccount: () => true,
      live: () async =>
          throw const NetworkException('connection-failed', 'Offline'),
      parse: ProgramWorkAccess.fromCallableData,
    );
    expect(
      result.value.hasDuty(
        ProgramStaffDuty.airportGreeter,
        now: DateTime.now(),
      ),
      isFalse,
    );
    expect(
      result.value.hasDuty(ProgramStaffDuty.hotelDesk, now: DateTime.now()),
      isTrue,
    );
    expect(
      result.value.hotelScope(ProgramStaffDuty.hotelDesk, now: DateTime.now()),
      {'hotel'},
    );
  });

  test('duty beyond parent expiry cannot authorize cached work', () async {
    final raw = access();
    final grantExpiresAtMillis = raw['grantExpiresAtMillis']! as int;
    final duties = raw['duties']! as List<Map<String, Object?>>;
    duties.first['expiresAtMillis'] = DateTime.fromMillisecondsSinceEpoch(
      grantExpiresAtMillis,
    ).subtract(const Duration(hours: 2)).millisecondsSinceEpoch;
    duties.add({
      'duty': 'hotelDesk',
      'pickupPointIds': [],
      'hotelIds': ['hotel'],
      'expiresAtMillis': grantExpiresAtMillis + 1,
    });
    final workScope = programSnapshotScope('work', 'p1');
    await store.save('account', workScope, raw);
    await store.save('account', scope, {'programId': 'p1', 'guest': 'Private'});
    expect(await store.load('account', workScope), isNotNull);
    expect(await store.load('account', scope), isNotNull);
    const offline = NetworkException('connection-failed', 'Offline');
    final now = DateTime.now();

    await expectLater(
      readProgramWithSnapshot(
        accountId: 'account',
        programId: 'p1',
        scope: workScope,
        store: store,
        isCurrentAccount: () => true,
        live: () async => throw offline,
        parse: ProgramWorkAccess.fromCallableData,
        now: () => now,
      ),
      throwsA(same(offline)),
    );
    expect(await store.load('account', workScope), isNull);
    expect(await store.load('account', scope), isNull);
  });

  test(
    'expired broad tuple cannot expose its rows via a remaining narrow tuple',
    () async {
      final raw = access();
      final duties = raw['duties']! as List<Map<String, Object?>>;
      duties.add({
        'duty': 'airportGreeter',
        'pickupPointIds': ['t3'],
        'hotelIds': [],
        'expiresAtMillis': DateTime.now()
            .subtract(const Duration(seconds: 1))
            .millisecondsSinceEpoch,
      });
      duties.first['hotelIds'] = ['hotel'];
      await store.save('account', programSnapshotScope('work', 'p1'), raw);
      await store.save('account', scope, {
        'programId': 'p1',
        'guest': 'Private',
      });
      await expectLater(
        read(const NetworkException('connection-failed', 'Offline')),
        throwsA(isA<NetworkException>()),
      );
    },
  );

  test('legacy snapshot without assignment expiry fails closed', () async {
    final raw = access();
    (raw['duties']! as List<Map<String, Object?>>).first.remove(
      'expiresAtMillis',
    );
    await store.save('account', programSnapshotScope('work', 'p1'), raw);
    await store.save('account', scope, {'programId': 'p1', 'guest': 'Private'});
    await expectLater(
      read(const NetworkException('connection-failed', 'Offline')),
      throwsA(isA<NetworkException>()),
    );
    expect(await store.load('account', scope), isNull);
  });
  test(
    'fresh narrower work access discards broad snapshots and late saves',
    () async {
      await seed();
      final generation = store.generation('account', 'p1');
      final narrowed = access();
      (narrowed['duties']! as List<Map<String, Object?>>).first['hotelIds'] = [
        'hotel',
      ];
      await store.save(
        'account',
        programSnapshotScope('work', 'p1'),
        narrowed,
        expectedGeneration: generation,
      );
      expect(await store.load('account', scope), isNull);
      await store.save('account', scope, {
        'programId': 'p1',
        'guest': 'Private',
      }, expectedGeneration: generation);
      expect(await store.load('account', scope), isNull);
    },
  );

  test(
    'initializing the new cache removes obsolete private snapshots',
    () async {
      SharedPreferences.setMockInitialValues({
        'program_read_snapshots_v1_account': '{"private":"old guest"}',
        'unrelatedPreference': 'keep',
      });
      await store.load('account', scope);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey('program_read_snapshots_v1_account'), isFalse);
      expect(prefs.getString('unrelatedPreference'), 'keep');
    },
  );
  test(
    'legacy hotel pickup restriction cannot authorize cached work',
    () async {
      final raw = access();
      (raw['duties']! as List<Map<String, Object?>>).first['duty'] =
          'hotelDesk';
      await store.save('account', programSnapshotScope('work', 'p1'), raw);
      await expectLater(
        readProgramWithSnapshot(
          accountId: 'account',
          programId: 'p1',
          scope: programSnapshotScope('work', 'p1'),
          store: store,
          isCurrentAccount: () => true,
          live: () async =>
              throw const NetworkException('connection-failed', 'Offline'),
          parse: ProgramWorkAccess.fromCallableData,
        ),
        throwsA(isA<NetworkException>()),
      );
      expect(
        await store.load('account', programSnapshotScope('work', 'p1')),
        isNull,
      );
    },
  );
  test(
    'a cached projection cannot outlive a concurrent authority change',
    () async {
      await seed();
      final paused = _PausedSnapshotStore(store, scope);
      const offline = NetworkException('connection-failed', 'Offline');
      final reading = readProgramWithSnapshot(
        accountId: 'account',
        programId: 'p1',
        scope: scope,
        store: paused,
        isCurrentAccount: () => true,
        live: () async => throw offline,
        parse: (value) => requiredMap(value, 'test snapshot'),
      );
      final rejected = expectLater(reading, throwsA(same(offline)));
      await paused.loaded.future;
      final narrowed = access();
      (narrowed['duties']! as List<Map<String, Object?>>).first['hotelIds'] = [
        'hotel',
      ];
      await store.save('account', programSnapshotScope('work', 'p1'), narrowed);
      paused.resume.complete();
      await rejected;
      // Rejecting the stale read must preserve the newly saved authority.
      expect(
        await store.load('account', programSnapshotScope('work', 'p1')),
        isNotNull,
      );
    },
  );

  test('grant expiry during snapshot loading withholds the result', () async {
    await seed();
    final paused = _PausedSnapshotStore(store, scope);
    var now = DateTime.now();
    const offline = NetworkException('connection-failed', 'Offline');
    final reading = readProgramWithSnapshot(
      accountId: 'account',
      programId: 'p1',
      scope: scope,
      store: paused,
      isCurrentAccount: () => true,
      live: () async => throw offline,
      parse: (value) => requiredMap(value, 'test snapshot'),
      now: () => now,
    );
    final rejected = expectLater(reading, throwsA(same(offline)));
    await paused.loaded.future;
    now = now.add(const Duration(hours: 2));
    paused.resume.complete();
    await rejected;
  });
}

class _PausedSnapshotStore implements ProgramReadSnapshotStore {
  _PausedSnapshotStore(this.delegate, this.pausedScope);
  final ProgramReadSnapshotStore delegate;
  final String pausedScope;
  final loaded = Completer<void>();
  final resume = Completer<void>();

  @override
  Future<ProgramReadSnapshot?> load(String accountId, String scope) async {
    final snapshot = await delegate.load(accountId, scope);
    if (scope == pausedScope) {
      loaded.complete();
      await resume.future;
    }
    return snapshot;
  }

  @override
  void Function() listenToGeneration(
    String accountId,
    String programId,
    void Function() onChange,
  ) => delegate.listenToGeneration(accountId, programId, onChange);
  @override
  int generation(String accountId, String programId) =>
      delegate.generation(accountId, programId);
  @override
  Future<void> clearAccount(String accountId) =>
      delegate.clearAccount(accountId);
  @override
  Future<void> clearProgram(String accountId, String programId) =>
      delegate.clearProgram(accountId, programId);
  @override
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  }) => delegate.save(
    accountId,
    scope,
    data,
    expectedGeneration: expectedGeneration,
  );
}
