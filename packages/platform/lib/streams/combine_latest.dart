import 'dart:async';

/// Emits [combine] of the latest value of each listener once both have
/// delivered, and again whenever either delivers. Errors pass through and
/// neither listener is cancelled by the other's error; pause, resume and
/// cancel reach both. The result closes when both listeners have closed.
Stream<R> combineLatest<A, B, R>(
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
