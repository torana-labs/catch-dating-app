import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_departure_session_fixtures.dart';

void main() {
  late DepartureSessionHarness h;
  setUp(() => h = DepartureSessionHarness());
  tearDown(() => h.dispose());

  test('loading and auth failures never expose departure controls', () async {
    expect(h.current.isLoading, isTrue);
    expect(h.repository.reads, isEmpty);
    await h.signIn(null);
    expect(h.current.hasValue, isFalse);
    expect(h.current.error, isA<SignInRequiredException>());
    h.auth.addError(StateError('Auth unavailable'));
    await h.container.pump();
    expect(h.current.hasValue, isFalse);
    expect(h.current.error, isA<StateError>());
    h.container
        .read(eventAssistanceDepartureProvider(departureScope()).notifier)
        .reload();
    await h.container.pump();
    expect(h.repository.reads, isEmpty);
  });

  test(
    'switching accounts hides loaded progress before the next response',
    () async {
      await h.load();
      final previous = h.session;
      await h.signIn('second-manager');
      expect(h.current.isLoading, isTrue);
      expect(h.current.hasValue, isFalse);
      h.repository.completeRead(1);
      await h.container.pump();
      expect(h.session.account.uid, 'second-manager');
      expect(identical(h.session.account, previous.account), isFalse);
      await h.signIn(null);
      expect(h.current.hasValue, isFalse);
    },
  );

  test('an old account read cannot complete into the new account', () async {
    await h.signIn();
    await h.signIn('second-manager');
    h.repository.completeRead(0);
    await h.container.pump();
    expect(h.current.isLoading, isTrue);
    expect(h.current.hasValue, isFalse);
    h.repository.completeRead(1);
    await h.container.pump();
    expect(h.session.account.uid, 'second-manager');
  });

  test('switching away and back produces a new review identity', () async {
    await h.load();
    final before = h.session.account;
    await h.signIn('second-manager');
    await h.signIn();
    h.repository.completeRead(2);
    await h.container.pump();
    expect(h.session.account.uid, departureActor);
    expect(identical(h.session.account, before), isFalse);
    h.repository.completeRead(1);
    await h.container.pump();
    expect(h.session.account.uid, departureActor);
    expect(identical(h.session.account, before), isFalse);
  });

  test('a sign-out during read cannot later publish the response', () async {
    await h.signIn();
    await h.signIn(null);
    h.repository.completeRead(0);
    await h.container.pump();
    expect(h.current.hasValue, isFalse);
    expect(h.current.error, isA<SignInRequiredException>());
  });

  test(
    'equal scopes share a read; other groups have independent snapshots',
    () async {
      await h.signIn();
      h.container.listen(
        eventAssistanceDepartureProvider(departureScope()),
        (_, _) {},
      );
      await h.container.pump();
      expect(h.repository.reads, hasLength(1));
      final second = eventAssistanceDepartureProvider(
        departureScope(groupId: 'pace-two'),
      );
      h.container.listen(second, (_, _) {});
      await h.repository.waitForReads(2);
      h.repository.completeRead(1);
      await h.container.pump();
      expect(
        h.container.read(second).requireValue.view.scope.groupId,
        'pace-two',
      );
      expect(h.current.isLoading, isTrue);
      h.repository.completeRead(0);
      await h.container.pump();
      expect(h.session.view.scope.groupId, 'event:whole');
    },
  );

  test(
    'explicit reload wins over an older completion without automatic retry',
    () async {
      await h.signIn();
      h.container
          .read(eventAssistanceDepartureProvider(departureScope()).notifier)
          .reload();
      await h.container.pump();
      await h.repository.waitForReads(2);
      h.repository.completeRead(
        1,
        response: departureResponse(revision: 3, freshness: 'current'),
      );
      await h.container.pump();
      final latest = h.session;
      h.repository.completeRead(0);
      await h.container.pump();
      expect(identical(h.session, latest), isTrue);
      expect(h.session.view.revision, 3);
    },
  );

  test('failed reads remain errors until an explicit reload', () async {
    await h.signIn();
    h.repository.reads.single.pending.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await h.container.pump();
    expect(h.current.error, isA<NetworkException>());
    expect(h.repository.reads, hasLength(1));
    expect(
      h.automaticRetries,
      isEmpty,
      reason: 'this read disables retries independently of the container',
    );
    h.container
        .read(eventAssistanceDepartureProvider(departureScope()).notifier)
        .reload();
    await h.container.pump();
    await h.repository.waitForReads(2);
    h.repository.completeRead(1);
    await h.container.pump();
    expect(h.session.view.canConfirm, isTrue);
  });
}
