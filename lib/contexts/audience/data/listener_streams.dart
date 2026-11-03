import 'dart:async';

/// Emits [combine] of the latest value of each listener once both have
/// delivered, and again whenever either delivers. Errors pass through and
/// neither listener is cancelled by them.
Stream<R> combineLatestListeners<A, B, R>(
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

/// Follows [primary], and the secondary listener [secondaryFor] keyed by
/// [keyOf] of its latest value. While the key is null the secondary is not
/// read and [combine] receives `null` for it; when the key changes the
/// secondary restarts, and nothing is emitted until it first delivers.
Stream<R> dependentListeners<A, B, R>(
  Stream<A> primary, {
  required String? Function(A value) keyOf,
  required Stream<B> Function(String key) secondaryFor,
  required R Function(A primary, B? secondary) combine,
}) {
  late final StreamController<R> controller;
  StreamSubscription<A>? primarySubscription;
  StreamSubscription<B>? secondarySubscription;
  (A,)? latestPrimary;
  (B,)? latestSecondary;
  String? secondaryKey;
  var primaryDone = false;

  void emit() {
    final a = latestPrimary;
    if (a == null) return;
    final key = keyOf(a.$1);
    if (key != null && latestSecondary == null) return;
    try {
      controller.add(combine(a.$1, key == null ? null : latestSecondary!.$1));
    } on Object catch (error, stackTrace) {
      controller.addError(error, stackTrace);
    }
  }

  void follow(String? key) {
    if (key == secondaryKey) return;
    final previous = secondarySubscription;
    secondarySubscription = null;
    latestSecondary = null;
    secondaryKey = key;
    if (previous != null) unawaited(previous.cancel());
    if (key == null) return;
    secondarySubscription = secondaryFor(key).listen((value) {
      latestSecondary = (value,);
      emit();
    }, onError: controller.addError);
  }

  controller = StreamController<R>(
    onListen: () {
      primarySubscription = primary.listen(
        (value) {
          latestPrimary = (value,);
          follow(keyOf(value));
          emit();
        },
        onError: controller.addError,
        onDone: () {
          primaryDone = true;
          unawaited(secondarySubscription?.cancel());
          unawaited(controller.close());
        },
      );
    },
    onPause: () {
      primarySubscription?.pause();
      secondarySubscription?.pause();
    },
    onResume: () {
      primarySubscription?.resume();
      secondarySubscription?.resume();
    },
    onCancel: () => Future.wait([
      ?primarySubscription?.cancel(),
      if (!primaryDone) ?secondarySubscription?.cancel(),
    ]),
  );
  return controller.stream;
}
