import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_deliveries_fixtures.dart';
import 'event_assistance_deliveries_test_repository.dart';

void main() {
  late DeliveriesTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final provider = eventAssistanceDeliveriesProvider(deliveryQuery());

  setUp(() {
    repository = DeliveriesTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceDeliveriesRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  Future<void> signIn(String? uid) async {
    final expected = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(expected);
    await container.pump();
  }

  Future<void> complete(int index) async {
    final read = repository.reads[index];
    read.result.complete(deliveryPage(query: read.query));
    await container.pump();
  }

  test(
    'loading, sign-out and auth errors never expose prior private data',
    () async {
      expect(container.read(provider).isLoading, isTrue);
      expect(repository.reads, isEmpty);
      await signIn(null);
      expect(container.read(provider).error, isA<SignInRequiredException>());
      expect(repository.reads, isEmpty);
      await signIn('host-1');
      await complete(0);
      expect(container.read(provider).requireValue.account.uid, 'host-1');
      await signIn(null);
      expect(container.read(provider).hasValue, isFalse);
      container.read(provider.notifier).reload();
      await container.pump();
      expect(repository.reads, hasLength(1));
      auth.addError(StateError('auth unavailable'));
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<StateError>());
    },
  );

  test('old-account reads cannot publish into a different account', () async {
    await signIn('host-1');
    await signIn('host-2');
    await complete(0);
    expect(container.read(provider).isLoading, isTrue);
    expect(container.read(provider).hasValue, isFalse);
    await complete(1);
    expect(container.read(provider).requireValue.account.uid, 'host-2');
  });

  test('same UID after sign-out starts a new review period and read', () async {
    await signIn('host-1');
    await complete(0);
    final original = container.read(provider).requireValue;
    await signIn(null);
    await signIn('host-1');
    expect(container.read(provider).hasValue, isFalse);
    await complete(1);
    expect(
      identical(
        original.account,
        container.read(provider).requireValue.account,
      ),
      isFalse,
    );
  });

  test(
    'equal queries share reads while cursors and event scopes stay separate',
    () async {
      await signIn('host-1');
      container.listen(
        eventAssistanceDeliveriesProvider(deliveryQuery()),
        (_, _) {},
      );
      await container.pump();
      expect(repository.reads, hasLength(1));
      for (final query in [
        deliveryQuery(cursor: deliveryId(50)),
        deliveryQuery(organizerId: 'another-organizer'),
        deliveryQuery(eventId: 'another'),
      ]) {
        container.listen(eventAssistanceDeliveriesProvider(query), (_, _) {});
      }
      await container.pump();
      await repository.waitForReads(4);
      expect(repository.reads, hasLength(4));
    },
  );

  test('explicit reload wins over an older completion', () async {
    await signIn('host-1');
    container.read(provider.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    await complete(1);
    final latest = container.read(provider).requireValue;
    await complete(0);
    expect(identical(container.read(provider).requireValue, latest), isTrue);
  });

  test(
    'read errors persist until explicit reload, without automatic retries',
    () async {
      await signIn('host-1');
      repository.reads.single.result.completeError(StateError('unavailable'));
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<StateError>());
      // Retry scheduling is intentionally disabled even with the default container.
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(repository.reads, hasLength(1));
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      await complete(1);
      final session = container.read(provider).requireValue;
      final open =
          session.page.deliveries.single as AssistanceActionableDelivery;
      expect(session.review(open).delivery, same(open));
      expect(
        () => session.review(
          deliveryPage().deliveries.single as AssistanceActionableDelivery,
        ),
        throwsArgumentError,
      );
    },
  );
}
