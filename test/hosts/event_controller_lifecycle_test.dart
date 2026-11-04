import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_defaults_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'event_publication_test.dart' show publicationEvent;

enum _Kind { privatePreferences, offerPreferences, publication, defaults }

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  for (final kind in _Kind.values) {
    test(
      '${kind.name}: duplicate loads do not race and scopes stay isolated',
      () async {
        final probe = _probe(kind);
        addTearDown(probe.container.dispose);
        final loading = probe.load();
        await probe.started.future;
        await probe.load();
        expect(probe.readCount(), 1);
        expect(probe.otherLoading(), isFalse);
        probe.gate.complete();
        await loading;
        // The listener delivers after the gate opens.
        await pumpEventQueue();
        expect(probe.loaded(), isTrue);
      },
    );
    test(
      '${kind.name}: account change permanently fences late reads',
      () async {
        final accounts = StreamController<String?>();
        addTearDown(accounts.close);
        final probe = _probe(kind, accounts: accounts.stream);
        addTearDown(probe.container.dispose);
        accounts.add('host');
        await probe.container.pump();
        final loading = probe.load();
        await probe.started.future;
        accounts.add('different-host');
        await probe.container.pump();
        accounts.add('host');
        await probe.container.pump();
        expect(probe.actorAvailable(), isFalse);
        probe.gate.complete();
        await loading;
        await pumpEventQueue();
        expect(probe.loaded(), isFalse);
        await probe.load();
        expect(probe.readCount(), 1);
      },
    );
    test(
      '${kind.name}: disposal during a load ignores late completion',
      () async {
        final probe = _probe(kind);
        final loading = probe.load();
        await probe.started.future;
        probe.container.dispose();
        probe.gate.complete();
        await expectLater(loading, completes);
      },
    );
  }
}

class _Probe {
  _Probe({
    required this.container,
    required this.load,
    required this.loaded,
    required this.actorAvailable,
    required this.otherLoading,
    required this.gate,
    required this.started,
    required this.readCount,
  });
  final ProviderContainer container;
  final Future<void> Function() load;
  final bool Function() loaded;
  final bool Function() actorAvailable;
  final bool Function() otherLoading;
  final Completer<void> gate;
  final Completer<void> started;
  final int Function() readCount;
}

_Probe _probe(_Kind kind, {Stream<String?>? accounts}) {
  final gate = Completer<void>();
  final started = Completer<void>();
  var reads = 0;
  Future<void> read() async {
    reads++;
    if (!started.isCompleted) started.complete();
    await gate.future;
  }

  const scope = (userId: 'host', organizerId: 'org1', eventId: 'event1');
  final hash = List.filled(64, 'a').join();
  final defaults = ManagerEventSetupDefaults(
    organizerId: 'org1',
    cityId: null,
    marketId: null,
    timezone: null,
    organizerDefaultsRevision: null,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: const ManagerEventSetupPreferences(),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
  // Each editor's own read is gated; the others it listens to answer at once.
  Stream<T> gated<T>(bool isGated, T value) async* {
    if (isGated) await read();
    yield value;
  }

  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => accounts ?? Stream.value('host')),
      privateEventSetupViewProvider(
        organizerId: 'org1',
        eventId: 'event1',
      ).overrideWith(
        (ref) => gated(
          kind == _Kind.privatePreferences || kind == _Kind.publication,
          PrivateEventSetupView.complete(publicationEvent()),
        ),
      ),
      managerEventSetupDefaultsViewProvider('org1').overrideWith(
        (ref) => gated(
          kind == _Kind.defaults,
          ManagerEventSetupDefaultsView.complete(defaults),
        ),
      ),
      privateEventPreferencesDependenciesProvider.overrideWithValue(
        PrivateEventPreferencesDependencies(
          write: (_) async => throw StateError('Unexpected write'),
        ),
      ),
      eventOfferPreferencesDependenciesProvider.overrideWithValue(
        EventOfferPreferencesDependencies(
          readConfiguration: ({required organizerId, required eventId}) async {
            await read();
            return const EventOfferConfiguration(
              organizerId: 'org1',
              eventId: 'event1',
              eventSourceRevision: 1,
              startsAtMillis: 1900000000000,
              nowMillis: 1800000000000,
              suggestedExpiresAtMillis: null,
              preferencesRevision: 0,
              preferences: null,
            );
          },
          write: (_) async => throw StateError('Unexpected write'),
        ),
      ),
      eventPublicationDependenciesProvider.overrideWithValue(
        EventPublicationDependencies(
          write: (_) async => throw StateError('Unexpected write'),
        ),
      ),
      hostManagerEventSetupDefaultsDependenciesProvider.overrideWithValue(
        HostManagerEventSetupDefaultsDependencies(
          write: (_) async => throw StateError('Unexpected write'),
        ),
      ),
    ],
  );
  if (kind == _Kind.privatePreferences) {
    final provider = privateEventPreferencesControllerProvider(scope);
    container.listen(provider, (_, _) {});
    final other = privateEventPreferencesControllerProvider((
      userId: 'host',
      organizerId: 'org1',
      eventId: 'event2',
    ));
    container.listen(other, (_, _) {});
    return _Probe(
      container: container,
      load: container.read(provider.notifier).load,
      loaded: () => container.read(provider).event != null,
      actorAvailable: () => container.read(provider).actorAvailable,
      otherLoading: () => container.read(other).loading,
      gate: gate,
      started: started,
      readCount: () => reads,
    );
  }
  if (kind == _Kind.offerPreferences) {
    final provider = eventOfferPreferencesControllerProvider(scope);
    container.listen(provider, (_, _) {});
    final other = eventOfferPreferencesControllerProvider((
      userId: 'host',
      organizerId: 'org1',
      eventId: 'event2',
    ));
    container.listen(other, (_, _) {});
    return _Probe(
      container: container,
      load: container.read(provider.notifier).load,
      loaded: () => container.read(provider).configuration != null,
      actorAvailable: () => container.read(provider).actorAvailable,
      otherLoading: () => container.read(other).loading,
      gate: gate,
      started: started,
      readCount: () => reads,
    );
  }
  if (kind == _Kind.publication) {
    final provider = eventPublicationControllerProvider(scope);
    container.listen(provider, (_, _) {});
    final other = eventPublicationControllerProvider((
      userId: 'host',
      organizerId: 'org1',
      eventId: 'event2',
    ));
    container.listen(other, (_, _) {});
    return _Probe(
      container: container,
      load: container.read(provider.notifier).load,
      loaded: () => container.read(provider).event != null,
      actorAvailable: () => container.read(provider).actorAvailable,
      otherLoading: () => container.read(other).loading,
      gate: gate,
      started: started,
      readCount: () => reads,
    );
  }
  if (kind == _Kind.defaults) {
    final provider = hostManagerEventSetupDefaultsControllerProvider((
      userId: 'host',
      organizerId: 'org1',
    ));
    container.listen(provider, (_, _) {});
    final other = hostManagerEventSetupDefaultsControllerProvider((
      userId: 'host',
      organizerId: 'org2',
    ));
    container.listen(other, (_, _) {});
    return _Probe(
      container: container,
      load: container.read(provider.notifier).load,
      loaded: () => container.read(provider).current != null,
      actorAvailable: () => container.read(provider).actorAvailable,
      otherLoading: () => container.read(other).loading,
      gate: gate,
      started: started,
      readCount: () => reads,
    );
  }
  throw StateError('Unknown editor');
}
