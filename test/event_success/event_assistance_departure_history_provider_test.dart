import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_history_fixtures.dart';

void main() {
  late StreamController<String?> auth;
  late HistorySessionRepository repository;
  late ProviderContainer container;
  final query = historyQuery();
  final provider = eventAssistanceDepartureHistoryProvider(query);
  final retries = <Object>[];
  setUp(() {
    auth = StreamController<String?>.broadcast();
    repository = HistorySessionRepository();
    retries.clear();
    container = ProviderContainer(
      retry: (_, error) {
        retries.add(error);
        return null;
      },
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceDepartureHistoryRepositoryProvider.overrideWith(
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
  }

  test('auth loading, failures and sign-out hide all history', () async {
    expect(container.read(provider).hasValue, isFalse);
    expect(repository.reads, isEmpty);
    await signIn(null);
    expect(container.read(provider).error, isA<SignInRequiredException>());
    auth.addError(StateError('Auth unavailable'));
    await container.pump();
    expect(container.read(provider).hasValue, isFalse);
    container.read(provider.notifier).reload();
    await container.pump();
    expect(repository.reads, isEmpty);
  });

  test(
    'late old-account and same-UID sign-in completions cannot restore history',
    () async {
      await signIn(historyActor);
      repository.completeRead(0);
      await container.pump();
      final old = container.read(provider).requireValue.account;
      await signIn('second-host');
      expect(container.read(provider).hasValue, isFalse);
      await signIn(null);
      repository.completeRead(1);
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
      await signIn(historyActor);
      repository.completeRead(2);
      await container.pump();
      expect(
        identical(container.read(provider).requireValue.account, old),
        isFalse,
      );
    },
  );

  test(
    'reload wins over delayed reads and failures require explicit retry',
    () async {
      await signIn(historyActor);
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(2);
      repository.reads[1].pending.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await container.pump();
      repository.completeRead(0);
      await container.pump();
      expect(container.read(provider).error, isA<NetworkException>());
      expect(retries, isEmpty);
      expect(repository.reads.length, 2);
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForReads(3);
      repository.completeRead(2);
      await container.pump();
      expect(container.read(provider).requireValue.page.rosters.length, 2);
    },
  );

  test('equal queries share a read and older pages remain separate', () async {
    await signIn(historyActor);
    container.listen(
      eventAssistanceDepartureHistoryProvider(historyQuery()),
      (_, _) {},
    );
    await container.pump();
    expect(repository.reads.length, 1);
    final older = eventAssistanceDepartureHistoryProvider(
      historyQuery(beforeRevision: 3),
    );
    container.listen(older, (_, _) {});
    await repository.waitForReads(2);
    repository.completeRead(1);
    await container.pump();
    expect(
      container.read(older).requireValue.page.rosters.single.progressRevision,
      2,
    );
    expect(container.read(provider).hasValue, isFalse);
    repository.completeRead(0);
    await container.pump();
    await signIn(null);
    expect(container.read(provider).hasValue, isFalse);
    expect(container.read(older).hasValue, isFalse);
  });

  test(
    'foreign account results are rejected even from a repository override',
    () async {
      await signIn(historyActor);
      repository.completeRead(0, foreignActor: true);
      await container.pump();
      expect(container.read(provider).error, isA<FormatException>());
    },
  );
}
