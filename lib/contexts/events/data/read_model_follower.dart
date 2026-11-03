import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderBase;

/// Follows one listener read owner for a controller that is not itself a
/// stream: every delivery reaches [onValue] or [onError], and a command can
/// wait until the listener delivers a value that reflects its write, so the
/// controller never rereads after a write. A healthy listener is never
/// invalidated; [follow] recreates only one that ended in an error.
class ReadModelFollower<V> {
  ReadModelFollower({required this.onValue, required this.onError});

  final void Function(V value) onValue;
  final void Function(Object error) onError;

  ProviderSubscription<AsyncValue<V>>? _subscription;
  V? _latest;
  final _waiters = <({bool Function(V) test, Completer<V> done})>[];

  /// The last delivered value, or null before the first one.
  V? get latest => _latest;

  /// Starts (or restarts) following [provider].
  void follow(Ref ref, ProviderBase<AsyncValue<V>> provider) {
    close();
    if (ref.exists(provider) && ref.read(provider).hasError) {
      ref.invalidate(provider);
    }
    _subscription = ref.listen<AsyncValue<V>>(
      provider,
      (_, next) => _deliver(next),
      fireImmediately: true,
    );
  }

  /// Completes with the first delivered value that passes [test], the latest
  /// one included. Fails when the listener fails or stops.
  Future<V> until(bool Function(V value) test) {
    final latest = _latest;
    if (latest != null && test(latest)) return Future.value(latest);
    final done = Completer<V>();
    _waiters.add((test: test, done: done));
    return done.future;
  }

  /// Stops following; pending waits fail with a [StateError].
  void close() {
    _subscription?.close();
    _subscription = null;
    _latest = null;
    fail(StateError('The listener stopped.'));
  }

  /// Fails every pending wait with [error].
  void fail(Object error) {
    final waiters = [..._waiters];
    _waiters.clear();
    for (final waiter in waiters) {
      waiter.done.completeError(error);
    }
  }

  void _deliver(AsyncValue<V> value) {
    switch (value) {
      case AsyncValue(:final error?):
        fail(error);
        onError(error);
      case AsyncValue(hasValue: true, :final value?):
        _latest = value;
        for (final waiter in [..._waiters]) {
          if (waiter.test(value)) {
            _waiters.remove(waiter);
            waiter.done.complete(value);
          }
        }
        onValue(value);
      default:
        break;
    }
  }
}
