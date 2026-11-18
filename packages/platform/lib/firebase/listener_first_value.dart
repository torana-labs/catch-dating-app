import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';

/// The code of [listenerNothingSaved]: a Firestore listener gave no first
/// value within its deadline.
const listenerNothingSavedCode = 'listener-nothing-saved';

/// No snapshot arrived within the first-value deadline. With anything saved
/// on the device, Firestore answers from that cache at once, so this means
/// the device is offline (or the server unreachable) and has nothing saved
/// for this screen yet. The screen offers Retry; the listener stays open, so
/// a late server snapshot still fills it.
const listenerNothingSaved = BackendOperationException(
  code: listenerNothingSavedCode,
  message: "You're offline and nothing is saved on this device yet.",
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'open this screen',
  ),
);

/// A first-value deadline for a Firestore listener.
///
/// It never times the stream out: events pass through unchanged and the
/// listener stays open. If no event (value or error) arrives within
/// [deadline], one [listenerNothingSaved] error is emitted, so a provider
/// over the stream shows the offline state with Retry instead of loading
/// forever, and the next snapshot replaces that error with data. Once any
/// event has arrived there is no deadline.
///
/// Repositories that drop a cache-sourced missing-document snapshot (so an
/// offline device does not read an uncached document as deleted) never emit
/// offline; this deadline is what ends their loading state.
extension ListenerFirstValueDeadline<T> on Stream<T> {
  Stream<T> firstValueWithin(Duration deadline, {required AppClock clock}) {
    late final StreamController<T> controller;
    StreamSubscription<T>? subscription;
    Timer? timer;
    void stopDeadline() {
      timer?.cancel();
      timer = null;
    }

    controller = StreamController<T>(
      onListen: () {
        timer = clock.timer(deadline, () {
          timer = null;
          controller.addError(listenerNothingSaved, StackTrace.current);
        });
        subscription = listen(
          (value) {
            stopDeadline();
            controller.add(value);
          },
          onError: (Object error, StackTrace stackTrace) {
            stopDeadline();
            controller.addError(error, stackTrace);
          },
          onDone: () {
            stopDeadline();
            unawaited(controller.close());
          },
        );
      },
      onPause: () => subscription?.pause(),
      onResume: () => subscription?.resume(),
      onCancel: () async {
        stopDeadline();
        await subscription?.cancel();
      },
    );
    return controller.stream;
  }
}
