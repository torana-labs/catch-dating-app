import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';

const _offline = NetworkException('connection-failed', 'Offline');
const _scope = 'arrivals:p:station';
const _manager = {
  'programId': 'p',
  'organizerId': 'org',
  'title': 'Program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'manager',
  'grantExpiresAtMillis': null,
  'duties': [],
  'capabilities': ['arrivalsTransport'],
  'pickupPoints': [],
  'functions': [],
  'hotels': [],
  'vehicleClasses': [],
};

void _seed(DateTime workAt, DateTime rosterAt) {
  SharedPreferences.setMockInitialValues({
    'program_read_snapshots_v2_account': jsonEncode({
      'work:p': {
        'data': _manager,
        'savedAtMillis': workAt.millisecondsSinceEpoch,
      },
      _scope: {
        'savedAtMillis': rosterAt.millisecondsSinceEpoch,
        'data': {
          'programId': 'p',
          'accessExpiresAtMillis': null,
          'generatedAtMillis': rosterAt.millisecondsSinceEpoch,
          'pickupPointId': 'station',
          'rows': [],
          'vehicleClasses': [],
        },
      },
    }),
  });
}

Future<ProgramReadView<ProgramArrivalsRoster>> _read(
  ProgramReadSnapshotStore store,
  DateTime Function() now,
) => readProgramWithSnapshot(
  accountId: 'account',
  programId: 'p',
  scope: _scope,
  store: store,
  isCurrentAccount: () => true,
  live: () async => throw _offline,
  parse: ProgramArrivalsRoster.fromCallableData,
  now: now,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('offline lifetime uses the older authority or roster capture', () async {
    final now = DateTime.fromMillisecondsSinceEpoch(
      DateTime.now().millisecondsSinceEpoch,
    );
    for (final olderWork in [true, false]) {
      final old = now.subtract(const Duration(hours: 23));
      _seed(olderWork ? old : now, olderWork ? now : old);
      final result = await _read(
        SharedPreferencesProgramReadSnapshotStore(),
        () => now,
      );
      expect(result.value.accessExpiresAt, isNull);
      expect(result.snapshotExpiresAt, old.add(const Duration(hours: 24)));
      expect(result.snapshotAt, olderWork ? now : old);
    }
  });

  test(
    'snapshot expiry during loading withholds an otherwise current manager view',
    () async {
      var now = DateTime.fromMillisecondsSinceEpoch(
        DateTime.now().millisecondsSinceEpoch,
      );
      _seed(now.subtract(const Duration(hours: 23)), now);
      final store = _PausedStore();
      final reading = _read(store, () => now);
      final rejected = expectLater(reading, throwsA(same(_offline)));
      await store.loaded.future;
      now = now.add(const Duration(hours: 1));
      store.resume.complete();
      await rejected;
    },
  );

  testWidgets(
    'an open manager roster disappears when its offline authority ages out',
    (tester) async {
      var now = DateTime.fromMillisecondsSinceEpoch(
        DateTime.now().millisecondsSinceEpoch,
      );
      final expiry = now.add(const Duration(minutes: 1));
      _seed(expiry.subtract(const Duration(hours: 24)), now);
      final store = SharedPreferencesProgramReadSnapshotStore();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(store),
          programProjectionClockProvider.overrideWithValue(() => now),
          programArrivalsRosterProvider(
            'p',
            'station',
          ).overrideWith((ref) async => throw _offline),
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
                loadingBuilder: (_) => const Text('Loading'),
                errorBuilder: (_, _, _, _) => const Text('Unavailable'),
                builder: (_, _) => const Text('Private saved roster'),
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Private saved roster'), findsOneWidget);
      now = expiry;
      await pumpFeatureUiFor(tester, const Duration(minutes: 1));
      await pumpFeatureUi(tester);
      expect(find.text('Private saved roster'), findsNothing);
      expect(find.text('Unavailable'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

class _PausedStore extends SharedPreferencesProgramReadSnapshotStore {
  final loaded = Completer<void>();
  final resume = Completer<void>();
  @override
  Future<ProgramReadSnapshot?> load(String accountId, String scope) async {
    final value = await super.load(accountId, scope);
    if (scope == _scope) {
      loaded.complete();
      await resume.future;
    }
    return value;
  }
}
