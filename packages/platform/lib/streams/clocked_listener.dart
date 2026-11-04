import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';

/// Rebuilds the latest [source] value against the app clock: once per
/// delivery, and again at the instant [nextRebuildAt] names for the built
/// value, so time-bound fields lapse on screen without a new snapshot. The
/// listener itself is never restarted. Source errors and errors from [build]
/// pass through without ending the stream; pause, resume and cancel reach
/// the source, and cancelling stops the pending rebuild.
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
