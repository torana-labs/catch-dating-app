import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';

/// A value that lapses at [lapseAt] (milliseconds since epoch).
typedef _Offer = ({String id, int lapseAt});

void main() {
  final start = DateTime.fromMillisecondsSinceEpoch(10000);

  Stream<String> clocked(Stream<_Offer> source, AppClock clock) =>
      clockedListener<_Offer, String>(
        source,
        clock: clock,
        build: (offer, now) => now.millisecondsSinceEpoch < offer.lapseAt
            ? '${offer.id}:open'
            : '${offer.id}:lapsed',
        nextRebuildAt: (built) => null,
      );

  test('rebuilds at the instant the built value names, with no new value', () {
    fakeAsync((async) {
      final clock = AppClock.custom(() => start.add(async.elapsed));
      final source = StreamController<_Offer>();
      final values = <String>[];
      final subscription = clockedListener<_Offer, String>(
        source.stream,
        clock: clock,
        build: (offer, now) => now.millisecondsSinceEpoch < offer.lapseAt
            ? '${offer.id}:open'
            : '${offer.id}:lapsed',
        nextRebuildAt: (built) => built.endsWith(':open')
            ? DateTime.fromMillisecondsSinceEpoch(12000)
            : null,
      ).listen(values.add);
      source.add((id: 'a', lapseAt: 12000));
      async.flushMicrotasks();
      expect(values, ['a:open']);
      async.elapse(const Duration(milliseconds: 1999));
      expect(values, ['a:open']);
      async.elapse(const Duration(milliseconds: 1));
      expect(values, ['a:open', 'a:lapsed']);
      // Nothing more is scheduled once the value names no instant.
      async.elapse(const Duration(minutes: 5));
      expect(values, ['a:open', 'a:lapsed']);
      unawaited(subscription.cancel());
      unawaited(source.close());
    });
  });

  test('a new value replaces the pending rebuild', () {
    fakeAsync((async) {
      final clock = AppClock.custom(() => start.add(async.elapsed));
      final source = StreamController<_Offer>();
      final values = <String>[];
      final subscription = clockedListener<_Offer, String>(
        source.stream,
        clock: clock,
        build: (offer, now) => now.millisecondsSinceEpoch < offer.lapseAt
            ? '${offer.id}:open'
            : '${offer.id}:lapsed',
        nextRebuildAt: (built) => built == 'a:open'
            ? DateTime.fromMillisecondsSinceEpoch(11000)
            : null,
      ).listen(values.add);
      source.add((id: 'a', lapseAt: 11000));
      async.flushMicrotasks();
      source.add((id: 'b', lapseAt: 99999));
      async.flushMicrotasks();
      async.elapse(const Duration(seconds: 5));
      expect(values, ['a:open', 'b:open']);
      unawaited(subscription.cancel());
      unawaited(source.close());
    });
  });

  test('source and build errors pass through and the stream continues', () {
    fakeAsync((async) {
      final clock = AppClock.custom(() => start.add(async.elapsed));
      final source = StreamController<_Offer>();
      final values = <String>[];
      final errors = <Object>[];
      final subscription = clockedListener<_Offer, String>(
        source.stream,
        clock: clock,
        build: (offer, now) {
          if (offer.id.isEmpty) throw const FormatException('no id');
          return offer.id;
        },
        nextRebuildAt: (built) => null,
      ).listen(values.add, onError: errors.add);
      source.addError(StateError('listener failed'));
      source.add((id: '', lapseAt: 0));
      source.add((id: 'c', lapseAt: 0));
      async.flushMicrotasks();
      expect(errors.map((e) => e.runtimeType), [StateError, FormatException]);
      expect(values, ['c']);
      expect(source.hasListener, isTrue);
      unawaited(subscription.cancel());
      unawaited(source.close());
    });
  });

  test('pause, resume and cancel reach the source', () async {
    var paused = false;
    var cancelled = false;
    final source = StreamController<_Offer>(
      onPause: () => paused = true,
      onResume: () => paused = false,
      onCancel: () => cancelled = true,
    );
    final subscription = clocked(
      source.stream,
      const AppClock(),
    ).listen((_) {});
    subscription.pause();
    expect(paused, isTrue);
    subscription.resume();
    expect(paused, isFalse);
    await subscription.cancel();
    expect(cancelled, isTrue);
    await source.close();
  });
}
