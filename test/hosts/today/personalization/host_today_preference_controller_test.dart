import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final scope = HostTodayPreferenceScope(
    accountId: 'host-1',
    organizerId: 'org-1',
  );
  late _PreferenceRepository repository;
  late ProviderContainer container;

  setUp(() {
    repository = _PreferenceRepository();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host-1')),
        hostTodayPreferenceRepositoryProvider.overrideWithValue(repository),
      ],
    );
    container.listen(hostTodayPreferenceControllerProvider(scope), (_, _) {});
    container.listen(hostTodayPreferenceProvider(scope), (_, _) {});
  });
  tearDown(() => container.dispose());

  test('selection and skip persist and refresh the read model', () async {
    expect(
      await container.read(hostTodayPreferenceProvider(scope).future),
      const HostTodayPreference.unanswered(),
    );
    final controller = container.read(
      hostTodayPreferenceControllerProvider(scope).notifier,
    );
    await controller.select(HostTodayFocus.audience);
    expect(
      await container.read(hostTodayPreferenceProvider(scope).future),
      const HostTodayPreference.selected(HostTodayFocus.audience),
    );
    await controller.skip();
    expect(
      await container.read(hostTodayPreferenceProvider(scope).future),
      const HostTodayPreference.skipped(),
    );
    expect(repository.values.keys.single, scope);
  });

  test(
    'double submit freezes one captured choice until persistence completes',
    () async {
      repository.pending = Completer<void>();
      final controller = container.read(
        hostTodayPreferenceControllerProvider(scope).notifier,
      );
      final first = controller.select(HostTodayFocus.audience);
      final duplicate = controller.select(HostTodayFocus.rehearsal);
      expect(repository.writes, 1);
      expect(repository.values, isEmpty);
      repository.pending!.complete();
      await Future.wait([first, duplicate]);
      expect(
        repository.values[scope],
        const HostTodayPreference.selected(HostTodayFocus.audience),
      );
      await controller.select(HostTodayFocus.rehearsal);
      expect(
        repository.values[scope],
        const HostTodayPreference.selected(HostTodayFocus.rehearsal),
      );
    },
  );

  test(
    'failed persistence retains the old preference and allows retry',
    () async {
      final controller = container.read(
        hostTodayPreferenceControllerProvider(scope).notifier,
      );
      await controller.skip();
      repository.failWrite = true;
      await expectLater(
        controller.select(HostTodayFocus.audience),
        throwsStateError,
      );
      expect(
        await container.read(hostTodayPreferenceProvider(scope).future),
        const HostTodayPreference.skipped(),
      );
      repository.failWrite = false;
      await controller.select(HostTodayFocus.audience);
      expect(
        await container.read(hostTodayPreferenceProvider(scope).future),
        const HostTodayPreference.selected(HostTodayFocus.audience),
      );
    },
  );

  test('a stale account scope cannot persist a preference', () async {
    final stale = HostTodayPreferenceScope(
      accountId: 'other-host',
      organizerId: 'org-1',
    );
    final controller = container.read(
      hostTodayPreferenceControllerProvider(stale).notifier,
    );
    await expectLater(
      controller.skip(),
      throwsA(isA<SignInRequiredException>()),
    );
    expect(repository.writes, 0);
  });
}

class _PreferenceRepository implements HostTodayPreferenceRepository {
  final values = <HostTodayPreferenceScope, HostTodayPreference>{};
  int writes = 0;
  Completer<void>? pending;
  bool failWrite = false;

  @override
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope) async =>
      values[scope] ?? const HostTodayPreference.unanswered();

  @override
  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  ) async {
    writes++;
    await pending?.future;
    if (failWrite) throw StateError('Write failed');
    values[scope] = preference;
  }
}
