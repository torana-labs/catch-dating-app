import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';

/// Emits [combine] of the latest value of each listener once both have
/// delivered, and again whenever either delivers. Errors pass through and
/// neither listener is cancelled by them.
Stream<R> combineLatestPair<A, B, R>(
  Stream<A> first,
  Stream<B> second,
  R Function(A first, B second) combine,
) {
  late final StreamController<R> controller;
  StreamSubscription<A>? firstSubscription;
  StreamSubscription<B>? secondSubscription;
  (A,)? latestFirst;
  (B,)? latestSecond;
  var openStreams = 2;

  void emit() {
    final a = latestFirst;
    final b = latestSecond;
    if (a == null || b == null) return;
    try {
      controller.add(combine(a.$1, b.$1));
    } on Object catch (error, stackTrace) {
      controller.addError(error, stackTrace);
    }
  }

  void done() {
    openStreams -= 1;
    if (openStreams == 0) unawaited(controller.close());
  }

  controller = StreamController<R>(
    onListen: () {
      firstSubscription = first.listen(
        (value) {
          latestFirst = (value,);
          emit();
        },
        onError: controller.addError,
        onDone: done,
      );
      secondSubscription = second.listen(
        (value) {
          latestSecond = (value,);
          emit();
        },
        onError: controller.addError,
        onDone: done,
      );
    },
    onPause: () {
      firstSubscription?.pause();
      secondSubscription?.pause();
    },
    onResume: () {
      firstSubscription?.resume();
      secondSubscription?.resume();
    },
    onCancel: () => Future.wait([
      ?firstSubscription?.cancel(),
      ?secondSubscription?.cancel(),
    ]),
  );
  return controller.stream;
}

/// Rebuilds the latest [source] value against the app clock: once per
/// delivery, and again at the instant [nextRebuildAt] names for the built
/// value, so time-bound fields lapse on screen without a new snapshot. The
/// listener itself is never restarted.
Stream<R> clockedListener<S, R>(
  Stream<S> source, {
  required AppClock clock,
  required R Function(S value, DateTime now) build,
  required DateTime? Function(R built) nextRebuildAt,
}) {
  late final StreamController<R> controller;
  StreamSubscription<S>? subscription;
  Timer? timer;
  (S,)? latest;

  void rebuild() {
    timer?.cancel();
    timer = null;
    final value = latest;
    if (value == null) return;
    final now = clock.now();
    final R built;
    try {
      built = build(value.$1, now);
    } on Object catch (error, stackTrace) {
      controller.addError(error, stackTrace);
      return;
    }
    controller.add(built);
    final next = nextRebuildAt(built);
    if (next != null) {
      final wait = next.difference(now);
      timer = clock.timer(wait.isNegative ? Duration.zero : wait, rebuild);
    }
  }

  controller = StreamController<R>(
    onListen: () {
      subscription = source.listen(
        (value) {
          latest = (value,);
          rebuild();
        },
        onError: controller.addError,
        onDone: () {
          timer?.cancel();
          unawaited(controller.close());
        },
      );
    },
    onPause: () => subscription?.pause(),
    onResume: () => subscription?.resume(),
    onCancel: () {
      timer?.cancel();
      return subscription?.cancel();
    },
  );
  return controller.stream;
}
