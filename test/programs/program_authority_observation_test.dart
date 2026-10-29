import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';

const _manager = {
  'programId': 'p',
  'organizerId': 'org',
  'title': 'Program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'manager',
  'duties': [],
  'grantExpiresAtMillis': null,
  'capabilities': ['arrivalsTransport'],
  'pickupPoints': [],
  'functions': [],
  'hotels': [],
  'vehicleClasses': [],
};
ProgramArrivalsRoster _roster(String identity) => ProgramArrivalsRoster(
  programId: 'p',
  pickupPointId: identity,
  accessExpiresAt: null,
  generatedAt: DateTime(2026),
  rows: const [],
  vehicleClasses: const [],
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SharedPreferencesProgramReadSnapshotStore store;
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    store = SharedPreferencesProgramReadSnapshotStore();
  });

  testWidgets(
    'a learned authority change removes a displayed roster until a fresh projection arrives',
    (tester) async {
      final fresh = Completer<ProgramArrivalsRoster>();
      var calls = 0;
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(store),
          programArrivalsRosterProvider('p', 'station').overrideWith((
            ref,
          ) async {
            calls++;
            return calls == 1 ? _roster('Broad private roster') : fresh.future;
          }),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Consumer(
              builder: (context, ref, _) => CatchAsyncBoundary(
                value: ref.watch(
                  programArrivalsRosterViewProvider('p', 'station'),
                ),
                retainDataOn: const {},
                loadingBuilder: (_) => const Text('Refreshing'),
                errorBuilder: (_, _, _, _) => const Text('Unavailable'),
                builder: (_, view) => Text(view.value.pickupPointId!),
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Broad private roster'), findsOneWidget);
      await tester.runAsync(() => store.clearProgram('other', 'p'));
      await tester.runAsync(() => store.clearProgram('account', 'other'));
      await tester.pump();
      expect(calls, 1);
      await tester.runAsync(() => store.save('account', 'work:p', _manager));
      await pumpFeatureUi(tester);
      expect(find.text('Broad private roster'), findsNothing);
      expect(find.text('Refreshing'), findsOneWidget);
      expect(calls, 2);
      fresh.complete(_roster('Current private roster'));
      await pumpFeatureUi(tester);
      expect(find.text('Current private roster'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'pending successful projections restart after authority changes',
    () async {
      var calls = 0;
      final pending = Completer<String>();
      final provider = FutureProvider<String>(
        (ref) => readWithProgramAuthority(ref, 'account', 'p', () {
          calls++;
          return calls == 1 ? pending.future : Future.value('current');
        }),
      );
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [programReadSnapshotStoreProvider.overrideWithValue(store)],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final reading = container.read(provider.future);
      await store.clearProgram('account', 'p');
      pending.complete('stale');
      // Riverpod redirects the disposed in-flight future to the new computation.
      expect(await reading, 'current');
      expect(calls, 2);
    },
  );

  test(
    'a denial-triggered invalidation does not produce a reload loop',
    () async {
      var calls = 0;
      final provider = FutureProvider<String>(
        (ref) => readWithProgramAuthority(ref, 'account', 'p', () async {
          calls++;
          if (calls == 1) return 'private';
          await store.clearProgram('account', 'p');
          throw const PermissionException('Revoked');
        }),
      );
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [programReadSnapshotStoreProvider.overrideWithValue(store)],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      expect(await container.read(provider.future), 'private');
      await store.clearProgram('account', 'p');
      await expectLater(
        container.read(provider.future),
        throwsA(isA<PermissionException>()),
      );
      await container.pump();
      expect(calls, 2);
    },
  );

  test(
    'fresh work bootstrap settles after its own authority publication',
    () async {
      final repository = _WorkRepository(store);
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(store),
          programWorkRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = programWorkEntryProvider('p', null);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      expect((await container.read(provider.future)).value.programId, 'p');
      await container.pump();
      expect(repository.calls, 2);
      expect(await store.load('account', 'work:p'), isNotNull);
    },
  );

  test(
    'disposing a pending view does not erase another current view cache',
    () async {
      await store.save('account', 'work:p', _manager);
      var current = true;
      final pending = Completer<String>();
      final reading = readProgramWithSnapshot(
        accountId: 'account',
        programId: 'p',
        scope: 'work:p',
        store: store,
        isCurrentAccount: () => true,
        isCurrentRead: () => current,
        live: () => pending.future,
        parse: (_) => 'cached',
      );
      final rejected = expectLater(
        reading,
        throwsA(same(programReadSuperseded)),
      );
      current = false;
      pending.complete('stale');
      await rejected;
      expect(await store.load('account', 'work:p'), isNotNull);
    },
  );

  test(
    'listener removal is idempotent and cannot remove later subscriptions',
    () async {
      var firstCalls = 0;
      final cancel = store.listenToGeneration(
        'account',
        'p',
        () => firstCalls++,
      );
      cancel();
      var secondCalls = 0;
      final second = store.listenToGeneration(
        'account',
        'p',
        () => secondCalls++,
      );
      cancel();
      await store.clearAccount('account');
      expect(firstCalls, 0);
      expect(secondCalls, 1);
      second();
    },
  );
}

class _WorkRepository extends Fake implements ProgramWorkRepository {
  _WorkRepository(this.store);
  final ProgramReadSnapshotStore store;
  var calls = 0;
  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async {
    calls++;
    await store.save(snapshotAccountId!, 'work:p', _manager);
    return ProgramWorkAccess.fromCallableData(_manager);
  }
}
