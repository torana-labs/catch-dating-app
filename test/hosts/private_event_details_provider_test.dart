import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('state notifies subscribers and is isolated by event scope', () {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host')),
        privateEventDetailsDependenciesProvider.overrideWithValue(
          _unusedDependencies,
        ),
      ],
    );
    addTearDown(container.dispose);
    final first = privateEventDetailsControllerProvider((
      userId: 'host',
      organizerId: 'organizer',
      eventId: 'first',
    ));
    final second = privateEventDetailsControllerProvider((
      userId: 'host',
      organizerId: 'organizer',
      eventId: 'second',
    ));
    final seen = <PrivateEventDetailsState>[];
    container.listen(first, (_, next) => seen.add(next));
    container.listen(second, (_, _) {});
    final error = StateError('Invalid input');
    container.read(first.notifier).reportValidationError(error);
    expect(seen.single.error, same(error));
    expect(container.read(second).error, isNull);
  });

  test(
    'account change fences the old scope even when the account returns',
    () async {
      final auth = StreamController<String?>();
      addTearDown(auth.close);
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => auth.stream),
          privateEventDetailsDependenciesProvider.overrideWithValue(
            _unusedDependencies,
          ),
        ],
      );
      addTearDown(container.dispose);
      final provider = privateEventDetailsControllerProvider((
        userId: 'host',
        organizerId: 'organizer',
        eventId: 'event',
      ));
      container.listen(provider, (_, _) {});
      auth.add('host');
      await container.pump();
      expect(container.read(provider).actorAvailable, isTrue);
      auth.add('someone-else');
      await container.pump();
      expect(container.read(provider).actorAvailable, isFalse);
      auth.add('host');
      await container.pump();
      expect(container.read(provider).actorAvailable, isFalse);
    },
  );

  test(
    'disposing during an awaited load does not write into dead state',
    () async {
      final response = Completer<Never>();
      final started = Completer<void>();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host')),
          privateEventDetailsDependenciesProvider.overrideWithValue(
            PrivateEventDetailsDependencies(
              readEvent: ({required organizerId, required eventId}) {
                started.complete();
                return response.future;
              },
              readDefaults: (_) => response.future,
              write: (_) async => throw StateError('Unexpected write'),
            ),
          ),
        ],
      );
      final provider = privateEventDetailsControllerProvider((
        userId: 'host',
        organizerId: 'organizer',
        eventId: 'event',
      ));
      final subscription = container.listen(provider, (_, _) {});
      final notifier = container.read(provider.notifier);
      final loading = notifier.load();
      await started.future;
      subscription.close();
      await container.pump();
      response.completeError(StateError('Late network failure'));
      await expectLater(loading, completes);
      container.dispose();
    },
  );
}

final _unusedDependencies = PrivateEventDetailsDependencies(
  readEvent: ({required organizerId, required eventId}) async =>
      throw StateError('Unexpected read'),
  readDefaults: (_) async => throw StateError('Unexpected read'),
  write: (_) async => throw StateError('Unexpected write'),
);
