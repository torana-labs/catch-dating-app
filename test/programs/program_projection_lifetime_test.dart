import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  ProgramArrivalsRoster roster(DateTime expiry) => ProgramArrivalsRoster(
    programId: 'p',
    pickupPointId: 'station',
    generatedAt: DateTime(2026),
    accessExpiresAt: expiry,
    rows: const [],
    vehicleClasses: const [],
  );

  testWidgets('expiry clears visible data during a narrower server refresh', (
    tester,
  ) async {
    var now = DateTime(2026);
    final initialExpiry = now.add(const Duration(seconds: 1));
    final fresh = Completer<ProgramArrivalsRoster>();
    var calls = 0;
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programProjectionClockProvider.overrideWithValue(() => now),
        programArrivalsRosterProvider('p', 'station').overrideWith((ref) async {
          calls++;
          return calls == 1 ? roster(initialExpiry) : fresh.future;
        }),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: Consumer(
            builder: (context, ref, _) {
              return CatchAsyncBoundary(
                value: ref.watch(
                  programArrivalsRosterViewProvider('p', 'station'),
                ),
                retainDataOn: const {},
                loadingBuilder: (_) => const Text('Refreshing access'),
                errorBuilder: (_, _, _, _) => const Text('Access unavailable'),
                builder: (_, view) => Text(
                  view.value.accessExpiresAt == initialExpiry
                      ? 'Broad private roster'
                      : 'Narrow private roster',
                ),
              );
            },
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Broad private roster'), findsOneWidget);
    now = initialExpiry;
    await pumpFeatureUiFor(tester, const Duration(seconds: 1));
    await tester.pump();
    expect(calls, 2);
    expect(find.text('Broad private roster'), findsNothing);
    expect(find.text('Refreshing access'), findsOneWidget);
    fresh.complete(roster(now.add(const Duration(hours: 1))));
    await pumpFeatureUi(tester);
    expect(find.text('Narrow private roster'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    container.dispose();
  });

  testWidgets('a response arriving after its authority deadline is withheld', (
    tester,
  ) async {
    var now = DateTime(2026);
    final expiry = now.add(const Duration(seconds: 1));
    final pending = Completer<ProgramArrivalsRoster>();
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programProjectionClockProvider.overrideWithValue(() => now),
        programArrivalsRosterProvider(
          'p',
          'station',
        ).overrideWith((ref) => pending.future),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      programArrivalsRosterViewProvider('p', 'station'),
      (_, _) {},
    );
    addTearDown(subscription.close);
    final read = container.read(
      programArrivalsRosterViewProvider('p', 'station').future,
    );
    final rejected = expectLater(read, throwsA(isA<PermissionException>()));
    now = expiry;
    pending.complete(roster(expiry));
    await tester.pump();
    await rejected;
  });

  testWidgets('independent deadlines preserve longer hotel access', (
    tester,
  ) async {
    var now = DateTime(2026);
    final airport = programProjectionActiveProvider(
      now.add(const Duration(seconds: 1)),
    );
    final hotel = programProjectionActiveProvider(
      now.add(const Duration(hours: 1)),
    );
    final container = ProviderContainer(
      overrides: [programProjectionClockProvider.overrideWithValue(() => now)],
    );
    final a = container.listen(airport, (_, _) {});
    final h = container.listen(hotel, (_, _) {});
    expect(container.read(airport), isTrue);
    expect(container.read(hotel), isTrue);
    now = now.add(const Duration(seconds: 1));
    await pumpFeatureUiFor(tester, const Duration(seconds: 1));
    expect(container.read(airport), isFalse);
    expect(container.read(hotel), isTrue);
    a.close();
    h.close();
    container.dispose();
  });
  testWidgets('resuming after expiry rechecks before a suspended timer fires', (
    tester,
  ) async {
    var now = DateTime(2026);
    final expiry = now.add(const Duration(hours: 1));
    final provider = programProjectionActiveProvider(expiry);
    final container = ProviderContainer(
      overrides: [programProjectionClockProvider.overrideWithValue(() => now)],
    );
    final subscription = container.listen(provider, (_, _) {});
    expect(container.read(provider), isTrue);
    for (final state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    now = expiry;
    for (final state in [
      AppLifecycleState.hidden,
      AppLifecycleState.inactive,
      AppLifecycleState.resumed,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    await tester.pump();
    expect(container.read(provider), isFalse);
    subscription.close();
    container.dispose();
  });
}
