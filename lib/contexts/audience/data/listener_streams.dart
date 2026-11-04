import 'dart:async';

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
