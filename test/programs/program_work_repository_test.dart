import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SharedPreferencesProgramReadSnapshotStore store;
  late _Functions functions;
  late ProgramWorkRepository repository;
  final expiry = DateTime(2030).millisecondsSinceEpoch;
  Map<String, Object?> access({String hotel = 'all'}) => {
    'programId': 'p1',
    'organizerId': 'org',
    'title': 'Program',
    'kind': 'wedding',
    'status': 'active',
    'timezone': 'Asia/Kolkata',
    'actorRole': 'staff',
    'grantExpiresAtMillis': expiry,
    'duties': [
      {
        'duty': 'airportGreeter',
        'pickupPointIds': ['t3'],
        'hotelIds': hotel == 'all' ? [] : [hotel],
        'expiresAtMillis': expiry,
      },
    ],
    'capabilities': ['arrivalsTransport'],
    'pickupPoints': [],
    'functions': [],
    'hotels': [],
    'vehicleClasses': [],
  };
  final roster = {
    'programId': 'p1',
    'accessExpiresAtMillis': expiry,
    'generatedAtMillis': DateTime(2026).millisecondsSinceEpoch,
    'pickupPointId': 't3',
    'rows': [],
    'vehicleClasses': [],
  };
  final staleRead = isA<BackendOperationException>().having(
    (error) => error.code,
    'code',
    'program-access-changed',
  );
  Future<void> seed() => store.save('account', 'work:p1', access());

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    store = SharedPreferencesProgramReadSnapshotStore();
    functions = _Functions();
    repository = ProgramWorkRepository(functions, store, () => 'account');
  });

  test(
    'ledger sends the continuation cursor and retains the returned cursor',
    () async {
      functions.respond = (_) async => {
        'programId': 'p1',
        'accessExpiresAtMillis': null,
        'trips': [],
        'nextCursor': 'following-trip',
      };
      final page = await repository.listTrips('p1', cursor: 'prior-trip');
      expect(functions.lastPayload, {
        'programId': 'p1',
        'cursor': 'prior-trip',
      });
      expect(page.nextCursor, 'following-trip');
    },
  );

  test(
    'hotel sends independent cursors and retains both continuations',
    () async {
      functions.respond = (_) async => {
        'programId': 'p1',
        'hotelId': 'hotel',
        'hotelName': 'Hotel',
        'generatedAtMillis': DateTime(2026).millisecondsSinceEpoch,
        'accessExpiresAtMillis': null,
        'trips': [],
        'expectedLegs': [],
        'nextTripCursor': 'next-trip',
        'nextExpectedCursor': 'next-leg',
      };
      final page = await repository.getHotelInbound(
        programId: 'p1',
        hotelId: 'hotel',
        tripCursor: 'prior-trip',
        expectedCursor: 'prior-leg',
      );
      expect(functions.lastPayload, {
        'programId': 'p1',
        'hotelId': 'hotel',
        'tripCursor': 'prior-trip',
        'expectedCursor': 'prior-leg',
      });
      expect(page.nextTripCursor, 'next-trip');
      expect(page.nextExpectedCursor, 'next-leg');
    },
  );

  test('fresh work bootstrap accepts its own generation change', () async {
    functions.respond = (_) async => access();
    final result = await repository.getWorkAccess(
      'p1',
      snapshotAccountId: 'account',
    );
    expect(result.programId, 'p1');
    expect(store.generation('account', 'p1'), 1);
    expect(await store.load('account', 'work:p1'), isNotNull);
  });

  test('late live roster cannot outlive narrower work authority', () async {
    await seed();
    final response = Completer<Object?>();
    functions.respond = (_) => response.future;
    final reading = repository.getArrivalsRoster(
      programId: 'p1',
      pickupPointId: 't3',
      snapshotAccountId: 'account',
    );
    final rejected = expectLater(reading, throwsA(staleRead));
    await store.save('account', 'work:p1', access(hotel: 'hotel'));
    response.complete(roster);
    await rejected;
    expect(await store.load('account', 'arrivals:p1:t3'), isNull);
    expect(
      (await store.load('account', 'work:p1'))!.data,
      access(hotel: 'hotel'),
    );
  });

  test(
    'late work bootstrap cannot restore authority after revocation',
    () async {
      await seed();
      final response = Completer<Object?>();
      functions.respond = (_) => response.future;
      final reading = repository.getWorkAccess(
        'p1',
        snapshotAccountId: 'account',
      );
      final rejected = expectLater(reading, throwsA(staleRead));
      await store.clearProgram('account', 'p1');
      response.complete(access());
      await rejected;
      expect(await store.load('account', 'work:p1'), isNull);
    },
  );

  test('uncached ledger read is fenced by concurrent revocation', () async {
    final response = Completer<Object?>();
    functions.respond = (_) => response.future;
    final reading = repository.listTrips('p1');
    final rejected = expectLater(reading, throwsA(staleRead));
    await store.clearProgram('account', 'p1');
    response.complete({
      'programId': 'p1',
      'accessExpiresAtMillis': expiry,
      'trips': [],
      'nextCursor': null,
    });
    await rejected;
  });

  test(
    'revocation during cache persistence still fences the live result',
    () async {
      final paused = _PausedStore();
      repository = ProgramWorkRepository(functions, paused, () => 'account');
      functions.respond = (_) async => access();
      final reading = repository.getWorkAccess(
        'p1',
        snapshotAccountId: 'account',
      );
      final rejected = expectLater(reading, throwsA(staleRead));
      await paused.saved.future;
      await paused.clearProgram('account', 'p1');
      paused.resume.complete();
      await rejected;
      expect(await paused.load('account', 'work:p1'), isNull);
    },
  );

  test('cache failure preserves a successful current server read', () async {
    repository = ProgramWorkRepository(
      functions,
      _FailingStore(),
      () => 'account',
    );
    functions.respond = (_) async => roster;
    final result = await repository.getArrivalsRoster(
      programId: 'p1',
      pickupPointId: 't3',
      snapshotAccountId: 'account',
    );
    expect(result.programId, 'p1');
  });

  test(
    'completed mutations retain their receipt across authority changes',
    () async {
      final response = Completer<Object?>();
      functions.respond = (_) => response.future;
      final writing = repository.markTripArrived(
        programId: 'p1',
        tripId: 'trip',
        expectedRevision: 1,
        clientOperationId: 'operation',
      );
      await store.clearProgram('account', 'p1');
      response.complete({
        'entityId': 'trip',
        'revision': 2,
        'alreadyApplied': false,
      });
      expect((await writing).revision, 2);
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {
  late Future<Object?> Function(String) respond;
  Object? lastPayload;
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable((payload) {
        lastPayload = payload;
        return respond(name);
      });
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Future<Object?> Function(Object?) respond;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(await respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

class _PausedStore extends SharedPreferencesProgramReadSnapshotStore {
  final saved = Completer<void>();
  final resume = Completer<void>();
  @override
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  }) async {
    final receipt = await super.save(
      accountId,
      scope,
      data,
      expectedGeneration: expectedGeneration,
    );
    saved.complete();
    await resume.future;
    return receipt;
  }
}

class _FailingStore extends SharedPreferencesProgramReadSnapshotStore {
  @override
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  }) async => throw StateError('Persistence unavailable');
}
