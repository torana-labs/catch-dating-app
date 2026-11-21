import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

bool _isPermissionDenied(Object error) =>
    error is FirebaseException && error.code == 'permission-denied';

/// Listens to [primary]; if rules deny it, switches to [fallback] once.
///
/// A canonical document readable only by its owner's team (organizers,
/// events) pairs with a public copy anyone may read; the fallback reads the
/// copy, so call sites never need to know whether the reader is on the team.
/// Any other error, or an error from the fallback, is forwarded.
Stream<T> watchWithPermissionFallback<T>({
  required Stream<T> Function() primary,
  required Stream<T> Function() fallback,
}) {
  StreamSubscription<T>? subscription;
  late final StreamController<T> controller;
  void listen(Stream<T> source, {required bool canFallBack}) {
    subscription = source.listen(
      controller.add,
      onError: (Object error, StackTrace stackTrace) {
        if (canFallBack && _isPermissionDenied(error)) {
          unawaited(subscription?.cancel());
          listen(fallback(), canFallBack: false);
          return;
        }
        controller.addError(error, stackTrace);
      },
      onDone: () {
        if (!controller.isClosed) unawaited(controller.close());
      },
    );
  }

  controller = StreamController<T>(
    onListen: () => listen(primary(), canFallBack: true),
    onPause: () => subscription?.pause(),
    onResume: () => subscription?.resume(),
    onCancel: () => subscription?.cancel(),
  );
  return controller.stream;
}

/// Reads [primary]; if rules deny it, reads [fallback] instead.
Future<T> fetchWithPermissionFallback<T>({
  required Future<T> Function() primary,
  required Future<T> Function() fallback,
}) async {
  try {
    return await primary();
  } on FirebaseException catch (error) {
    if (!_isPermissionDenied(error)) rethrow;
    return fallback();
  }
}
