import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policy.dart';
import 'package:catch_platform/cache/cache_tags.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';

/// A counting backend a read owner under test fetches from.
final class FakeCacheBackend {
  final requests = <({String uid, String id})>[];
  Object? _nextFailure;

  /// Makes the next fetch fail with [error].
  void failNext([Object error = const _BackendDown()]) => _nextFailure = error;

  Future<String> fetch({required String uid, required String id}) async {
    requests.add((uid: uid, id: id));
    final failure = _nextFailure;
    if (failure != null) {
      _nextFailure = null;
      throw failure;
    }
    return '$uid/$id#${requests.length}';
  }

  /// A Firestore-style listener: records one request per subscription and
  /// stays open.
  Stream<String> watch({required String uid, required String id}) {
    requests.add((uid: uid, id: id));
    final value = '$uid/$id#${requests.length}';
    return Stream.multi((controller) => controller.add(value));
  }

  int requestsFor(String id) => requests.where((r) => r.id == id).length;
}

final class _BackendDown implements Exception {
  const _BackendDown();
}

/// A read owner the shared harness can drive.
final class CacheHarnessSubject {
  const CacheHarnessSubject({
    required this.description,
    required this.policy,
    required this.readOwner,
    required this.overrides,
    required this.tagFor,
    required this.dataOf,
  });

  final String description;

  /// The policy the read owner declares.
  final CachePolicy policy;

  /// The read owner for one signed-in period and record id.
  final ProviderBase<AsyncValue<Object?>> Function(
    AuthenticatedSession session,
    String id,
  )
  readOwner;

  /// Overrides that route the read owner's backend to the fake.
  final List<Override> Function(FakeCacheBackend backend) overrides;

  /// The tag the read owner provides for [id]; null for a Firestore
  /// listener, which declares no tags for its own documents.
  final CacheTag Function(String id)? tagFor;

  /// The backend response a read owner's value holds.
  final String Function(Object? value) dataOf;
}

/// One fake-time run against a fresh container.
final class CacheHarnessRun {
  CacheHarnessRun._(this.subject, this.async) {
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        appClockProvider.overrideWithValue(
          AppClock.custom(() => start.add(async.elapsed)),
        ),
        uidProvider.overrideWith((ref) => _uids.stream),
        ...subject.overrides(backend),
      ],
    );
    // The app listens to the session for its whole life; an unlistened
    // stream provider is paused and would never see a sign-in.
    container.listen(authenticatedSessionProvider, (_, _) {});
  }

  static final start = DateTime(2026, 11, 3, 9);

  final CacheHarnessSubject subject;
  final FakeAsync async;
  final backend = FakeCacheBackend();
  final _uids = StreamController<String?>();
  late final ProviderContainer container;

  /// Signs [uid] in and returns the new signed-in period.
  AuthenticatedSession signIn(String uid) {
    _uids.add(uid);
    settle();
    return container.read(authenticatedSessionProvider).requireValue;
  }

  /// Runs every microtask and zero-delay timer that is due.
  void settle() {
    async
      ..flushMicrotasks()
      ..elapse(Duration.zero)
      ..flushMicrotasks();
  }

  ProviderSubscription<AsyncValue<Object?>> listen(
    ProviderBase<AsyncValue<Object?>> provider,
  ) => container.listen(provider, (_, _) {});

  void dispose() {
    container.dispose();
    unawaited(_uids.close());
  }
}

/// Runs [body] in fake time against a fresh container for [subject].
void runCacheHarness(
  CacheHarnessSubject subject,
  void Function(CacheHarnessRun run) body,
) {
  fakeAsync((async) {
    final run = CacheHarnessRun._(subject, async);
    try {
      body(run);
    } finally {
      run.dispose();
    }
  });
}

/// The six lifetime tests every cached read owner passes.
void cacheLifetimeHarness(CacheHarnessSubject subject) {
  final policy = subject.policy;
  // Inside the keep window and, where the policy has one, before staleness.
  final freshGap = _half(policy.staleAfter ?? policy.retain ?? _hour);
  // Inside the keep window, past staleness; null when the policy never goes
  // stale while the read is kept.
  final staleGap = switch ((policy.staleAfter, policy.retain)) {
    (null, _) => null,
    (final stale?, final retain?) when stale + _second >= retain => null,
    (final stale?, _) => stale + _second,
  };

  group('${subject.description} cache lifetime', () {
    test('leave and return within the keep window reuses the read', () {
      runCacheHarness(subject, (run) {
        final session = run.signIn('u1');
        final owner = subject.readOwner(session, 'a');
        final first = run.listen(owner);
        run.settle();
        expect(run.backend.requestsFor('a'), 1);
        final kept = subject.dataOf(run.container.read(owner).requireValue);
        first.close();
        run.async.elapse(freshGap);
        run.settle();
        expect(run.container.exists(owner), isTrue);

        final returning = run.listen(owner);
        final shown = run.container.read(owner);
        expect(shown.hasValue, isTrue, reason: 'renders the kept value');
        expect(subject.dataOf(shown.requireValue), kept);
        run.settle();
        final staleOnReturn =
            policy.staleAfter != null && policy.staleAfter! <= freshGap;
        expect(run.backend.requestsFor('a'), staleOnReturn ? 2 : 1);
        returning.close();
      });
    });

    test('a return after staleAfter renders at once and refetches once', () {
      if (staleGap == null) {
        markTestSkipped('${subject.description} never goes stale.');
        return;
      }
      runCacheHarness(subject, (run) {
        final session = run.signIn('u1');
        final owner = subject.readOwner(session, 'a');
        final first = run.listen(owner);
        run.settle();
        final kept = subject.dataOf(run.container.read(owner).requireValue);
        first.close();
        run.async.elapse(staleGap);
        run.settle();

        final returning = run.listen(owner);
        final shown = run.container.read(owner);
        expect(shown.hasValue, isTrue);
        expect(subject.dataOf(shown.requireValue), kept);
        run.settle();
        expect(run.backend.requestsFor('a'), 2);
        expect(
          subject.dataOf(run.container.read(owner).requireValue),
          isNot(kept),
        );
        run.settle();
        expect(run.backend.requestsFor('a'), 2, reason: 'exactly one refetch');
        returning.close();
      });
    });

    test('after the keep window the read is gone and the next one loads', () {
      runCacheHarness(subject, (run) {
        final session = run.signIn('u1');
        final owner = subject.readOwner(session, 'a');
        run.listen(owner).close();
        run.settle();
        if (policy.isSessionLifetime) {
          run.async.elapse(_hour * 3);
          run.settle();
          expect(run.container.exists(owner), isTrue);
          run.signIn('u2');
        } else {
          run.async.elapse(policy.retain! + _second);
        }
        run.settle();
        expect(run.container.exists(owner), isFalse);

        final next = run.listen(owner);
        expect(run.container.read(owner).hasValue, isFalse);
        run.settle();
        expect(run.backend.requestsFor('a'), 2);
        next.close();
      });
    });

    test('a paused listener outlives the keep window without disposal', () {
      runCacheHarness(subject, (run) {
        final session = run.signIn('u1');
        final owner = subject.readOwner(session, 'a');
        final hidden = run.listen(owner);
        run.settle();
        final kept = subject.dataOf(run.container.read(owner).requireValue);
        hidden.pause();
        run.async.elapse((policy.retain ?? _hour) * 3);
        run.settle();
        expect(run.container.exists(owner), isTrue);
        expect(run.backend.requestsFor('a'), 1);

        hidden.resume();
        final shown = run.container.read(owner);
        expect(subject.dataOf(shown.requireValue), kept);
        run.settle();
        expect(run.container.exists(owner), isTrue);
        final staleOnResume =
            policy.staleAfter != null &&
            policy.staleAfter! <= (policy.retain ?? _hour) * 3;
        expect(run.backend.requestsFor('a'), staleOnResume ? 2 : 1);

        // Leaving after a long pause still keeps the read for its window.
        hidden.close();
        run.settle();
        run.async.elapse(_half(policy.retain ?? _hour));
        run.settle();
        expect(run.container.exists(owner), isTrue);
      });
    });

    test('a new session never observes the previous session value', () {
      runCacheHarness(subject, (run) {
        final first = run.signIn('u1');
        final previous = run.listen(subject.readOwner(first, 'a'));
        run.settle();

        final second = run.signIn('u2');
        final owner = subject.readOwner(second, 'a');
        final values = <AsyncValue<Object?>>[];
        final sub = run.container.listen(
          owner,
          (_, next) => values.add(next),
          fireImmediately: true,
        );
        run.settle();
        expect(
          values.first.hasValue,
          isFalse,
          reason: 'loads, holding nothing',
        );
        for (final value in values.where((v) => v.hasValue)) {
          expect(subject.dataOf(value.requireValue), startsWith('u2/'));
        }
        expect(run.backend.requests.last.uid, 'u2');
        sub.close();
        previous.close();
      });
    });

    test('a write tag refetches the matching keys and no others', () {
      final tagFor = subject.tagFor;
      if (tagFor == null) {
        markTestSkipped('A listener declares no tags for its own documents.');
        return;
      }
      runCacheHarness(subject, (run) {
        final session = run.signIn('u1');
        final a = run.listen(subject.readOwner(session, 'a'));
        final b = run.listen(subject.readOwner(session, 'b'));
        run.settle();
        expect(run.backend.requestsFor('a'), 1);
        expect(run.backend.requestsFor('b'), 1);

        final write = Mutation<void>();
        unawaited(
          write.run(run.container, (tx) async {
            tx.get(cacheTagsProvider).invalidate({tagFor('a')});
          }),
        );
        run.settle();
        expect(run.backend.requestsFor('a'), 2);
        expect(run.backend.requestsFor('b'), 1);
        a.close();
        b.close();
      });
    });
  });
}

const _second = Duration(seconds: 1);
const _hour = Duration(hours: 1);

Duration _half(Duration duration) =>
    duration == Duration.zero ? _second : duration ~/ 2;
