import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/listener_first_value.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _deadline = Duration(seconds: 10);

void main() {
  test('nothing cached: the deadline shows the offline state, the listener '
      'stays open, and a late snapshot still fills the screen', () {
    fakeAsync((async) {
      final source = StreamController<int>();
      addTearDown(source.close);
      final listener = StreamProvider.autoDispose<int>(
        (ref) =>
            source.stream.firstValueWithin(_deadline, clock: const AppClock()),
      );
      final container = ProviderContainer.test(retry: (_, _) => null);
      container.listen(listener, (_, _) {});

      async.elapse(_deadline - const Duration(milliseconds: 1));
      expect(container.read(listener).isLoading, isTrue);
      async.elapse(const Duration(milliseconds: 1));
      expect(container.read(listener).error, same(listenerNothingSaved));
      expect(source.hasListener, isTrue);

      source.add(7);
      async.flushMicrotasks();
      expect(container.read(listener).value, 7);
      expect(container.read(listener).hasError, isFalse);
    });
  });

  test('a first value in time (from the cache) cancels the deadline; once '
      'data shows, silence never times out', () {
    fakeAsync((async) {
      final source = StreamController<int>();
      addTearDown(source.close);
      final events = <Object>[];
      source.stream
          .firstValueWithin(_deadline, clock: const AppClock())
          .listen(events.add, onError: (Object error) => events.add(error));

      source.add(1);
      async.elapse(const Duration(minutes: 5));
      expect(events, [1]);
    });
  });

  test('an error before the deadline passes through and ends the deadline', () {
    fakeAsync((async) {
      final source = StreamController<int>();
      addTearDown(source.close);
      final errors = <Object>[];
      source.stream
          .firstValueWithin(_deadline, clock: const AppClock())
          .listen((_) {}, onError: errors.add);

      final denied = StateError('permission-denied');
      source.addError(denied);
      async.elapse(const Duration(minutes: 1));
      expect(errors, [denied]);
    });
  });

  test('cancelling the listener cancels the deadline and the source', () {
    fakeAsync((async) {
      final source = StreamController<int>();
      addTearDown(source.close);
      final subscription = source.stream
          .firstValueWithin(_deadline, clock: const AppClock())
          .listen((_) => fail('no event expected'));
      unawaited(subscription.cancel());
      async.elapse(const Duration(minutes: 1));
      expect(source.hasListener, isFalse);
      expect(async.pendingTimers, isEmpty);
    });
  });
}
