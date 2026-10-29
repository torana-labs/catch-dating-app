import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _expiry = DateTime(2030).millisecondsSinceEpoch;
Map<String, Object?> _access(String duty) => {
  'programId': 'p',
  'organizerId': 'org',
  'title': 'Program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'staff',
  'grantExpiresAtMillis': _expiry,
  'duties': [
    {
      'duty': duty,
      'pickupPointIds': [],
      'hotelIds': [],
      'expiresAtMillis': _expiry,
    },
  ],
  'capabilities': ['arrivalsTransport'],
  'pickupPoints': [],
  'functions': [],
  'hotels': [],
  'vehicleClasses': [],
};
const _denied = PermissionException('Station assignment ended');
const _offline = NetworkException('connection-failed', 'Offline');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SharedPreferencesProgramReadSnapshotStore store;
  late _Functions functions;
  late ProgramWorkRepository repository;
  String? account;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = SharedPreferencesProgramReadSnapshotStore();
    functions = _Functions();
    account = 'account';
    repository = ProgramWorkRepository(functions, store, () => account);
    await store.save('account', 'work:p', _access('airportGreeter'));
    await store.save('account', 'arrivals:p:station', {'programId': 'p'});
    await store.save('account', 'plan:p:other', {'programId': 'p'});
  });
  Future<ProgramArrivalsRoster> read() => repository.getArrivalsRoster(
    programId: 'p',
    pickupPointId: 'station',
    snapshotAccountId: 'account',
  );

  for (final denial in <AppException>[
    _denied,
    const DocumentNotFoundException('station'),
  ]) {
    test(
      '${denial.code} restores fresh duties but deletes old rosters',
      () async {
        functions.respond = (name) async {
          if (name == 'getProgramWorkAccess') return _access('hotelDesk');
          throw denial;
        };
        await expectLater(read(), throwsA(same(denial)));
        expect(functions.calls, [
          'getProgramArrivalsRoster',
          'getProgramWorkAccess',
        ]);
        expect(await store.load('account', 'arrivals:p:station'), isNull);
        expect(await store.load('account', 'plan:p:other'), isNull);
        final offline = await readProgramWithSnapshot(
          accountId: 'account',
          programId: 'p',
          scope: 'work:p',
          store: store,
          isCurrentAccount: () => true,
          live: () async => throw _offline,
          parse: ProgramWorkAccess.fromCallableData,
        );
        expect(
          offline.value.hasDuty(
            ProgramStaffDuty.hotelDesk,
            now: DateTime.now(),
          ),
          isTrue,
        );
        expect(
          offline.value.hasDuty(
            ProgramStaffDuty.airportGreeter,
            now: DateTime.now(),
          ),
          isFalse,
        );
      },
    );
  }

  for (final failure in <AppException>[
    _offline,
    _denied,
    const DocumentNotFoundException('program'),
    const ValidationException('Invalid access'),
  ]) {
    test('a ${failure.code} recheck leaves the cache closed', () async {
      functions.respond = (name) async =>
          throw name == 'getProgramWorkAccess' ? failure : _denied;
      await expectLater(read(), throwsA(same(_denied)));
      expect(functions.calls, hasLength(2));
      expect(await store.load('account', 'work:p'), isNull);
      expect(
        await SharedPreferencesProgramReadSnapshotStore().load(
          'account',
          'work:p',
        ),
        isNull,
      );
      expect(await store.load('account', 'plan:p:other'), isNull);
    });
  }

  test('canonical work denial never recursively rechecks itself', () async {
    functions.respond = (_) async => throw _denied;
    await expectLater(
      repository.getWorkAccess('p', snapshotAccountId: 'account'),
      throwsA(same(_denied)),
    );
    expect(functions.calls, ['getProgramWorkAccess']);
    expect(await store.load('account', 'work:p'), isNull);
  });

  test('account change during the initial denial skips revalidation', () async {
    functions.respond = (_) async {
      account = 'other';
      throw _denied;
    };
    await expectLater(read(), throwsA(same(_denied)));
    expect(functions.calls, ['getProgramArrivalsRoster']);
    expect(await store.load('account', 'work:p'), isNull);
  });

  test(
    'pending revalidation cannot survive sign-out or a cold restart',
    () async {
      final started = Completer<void>();
      final response = Completer<Object?>();
      functions.respond = (name) {
        if (name != 'getProgramWorkAccess') throw _denied;
        started.complete();
        return response.future;
      };
      final rejected = expectLater(read(), throwsA(same(_denied)));
      await started.future;
      final reopened = SharedPreferencesProgramReadSnapshotStore();
      expect(await reopened.load('account', 'work:p'), isNull);
      expect(await reopened.load('account', 'arrivals:p:station'), isNull);
      account = null;
      await store.clearAccount('account');
      response.complete(_access('hotelDesk'));
      await rejected;
      expect(await store.load('account', 'work:p'), isNull);
    },
  );

  test('an older recheck cannot overwrite later verified duties', () async {
    final started = Completer<void>();
    final response = Completer<Object?>();
    var checks = 0;
    functions.respond = (name) async {
      if (name != 'getProgramWorkAccess') throw _denied;
      if (++checks == 1) {
        started.complete();
        return response.future;
      }
      return _access('hotelDesk');
    };
    final rejected = expectLater(read(), throwsA(same(_denied)));
    await started.future;
    await expectLater(repository.listTrips('p'), throwsA(same(_denied)));
    response.complete(_access('airportGreeter'));
    await rejected;
    expect((await store.load('account', 'work:p'))!.data, _access('hotelDesk'));
    expect(functions.calls, hasLength(4));
  });

  test(
    'a late denial invalidates even an intervening fresh bootstrap',
    () async {
      final response = Completer<Object?>();
      functions.respond = (name) async {
        if (name == 'getProgramWorkAccess') return _access('hotelDesk');
        return await response.future;
      };
      final rejected = expectLater(read(), throwsA(same(_denied)));
      await store.save('account', 'work:p', _access('transportDispatcher'));
      response.completeError(_denied);
      await rejected;
      expect(
        (await store.load('account', 'work:p'))!.data,
        _access('hotelDesk'),
      );
      expect(functions.calls, [
        'getProgramArrivalsRoster',
        'getProgramWorkAccess',
      ]);
    },
  );

  test('a denied mutation also refreshes independent work access', () async {
    functions.respond = (name) async {
      if (name == 'getProgramWorkAccess') return _access('hotelDesk');
      throw _denied;
    };
    await expectLater(
      repository.markTripArrived(
        programId: 'p',
        tripId: 'trip',
        expectedRevision: 1,
        clientOperationId: 'op',
      ),
      throwsA(same(_denied)),
    );
    expect(functions.calls, ['markProgramTripArrived', 'getProgramWorkAccess']);
    expect((await store.load('account', 'work:p'))!.data, _access('hotelDesk'));
  });

  test(
    'the provider preserves rechecked authority without a denial reload loop',
    () async {
      functions.respond = (name) async {
        if (name == 'getProgramWorkAccess') return _access('hotelDesk');
        throw _denied;
      };
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(store),
          programWorkRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = programArrivalsRosterViewProvider('p', 'station');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await expectLater(
        container.read(provider.future),
        throwsA(same(_denied)),
      );
      await container.pump();
      expect(functions.calls, [
        'getProgramArrivalsRoster',
        'getProgramWorkAccess',
      ]);
      expect(
        (await store.load('account', 'work:p'))!.data,
        _access('hotelDesk'),
      );
      expect(await store.load('account', 'arrivals:p:station'), isNull);
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {
  late Future<Object?> Function(String) respond;
  final calls = <String>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(() {
        calls.add(name);
        return respond(name);
      });
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Future<Object?> Function() respond;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(await respond() as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
