import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderBase;

/// Follows one listener read owner for a controller that is not itself a
/// stream: every delivery reaches [onValue] or [onError], and a command can
/// wait until the listener delivers a value that reflects its write, so the
/// controller never rereads after a write. A healthy listener is never
/// invalidated; [follow] recreates only one that ended in an error.
class ReadModelFollower<V> {
  ReadModelFollower({
    required this.onValue,
    required this.onError,
    this.reject,
  });

  final void Function(V value) onValue;
  final void Function(Object error) onError;

  /// Turns a delivered value into an error when it does not belong to the
  /// follower (for example another event's document); null accepts it.
  final Object? Function(V value)? reject;

  ProviderSubscription<AsyncValue<V>>? _subscription;
  Completer<void> _first = Completer<void>()..complete();
  V? _latest;
  Object? _failure;
  final _waiters = <({bool Function(V) test, Completer<V> done})>[];

  /// The last delivered value, or null before the first one.
  V? get latest => _latest;

  /// Whether a listener is active.
  bool get following => _subscription != null;

  /// Completes when the listener first answers (a value or an error), or
  /// when following stops. It never fails.
  Future<void> get firstDelivery => _first.future;

  /// Starts (or restarts) following [provider].
  void follow(Ref ref, ProviderBase<AsyncValue<V>> provider) {
    close();
    _first = Completer<void>();
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
  /// one included. Fails when the listener has failed (and not recovered),
  /// fails, or stops.
  Future<V> until(bool Function(V value) test) {
    final failure = _failure;
    if (failure != null) return Future.error(failure);
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
    _failure = null;
    if (!_first.isCompleted) _first.complete();
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

  /// A failed delivery clears the latest value: nothing may be built on it.
  void _failWith(Object error) {
    _latest = null;
    _failure = error;
    fail(error);
    onError(error);
    if (!_first.isCompleted) _first.complete();
  }

  void _deliver(AsyncValue<V> next) {
    if (next case AsyncValue(:final error?)) {
      _failWith(error);
      return;
    }
    if (next case AsyncValue(hasValue: true, :final value?)) {
      final rejected = reject?.call(value);
      if (rejected != null) {
        _failWith(rejected);
        return;
      }
      _latest = value;
      _failure = null;
      for (final waiter in [..._waiters]) {
        if (waiter.test(value)) {
          _waiters.remove(waiter);
          waiter.done.complete(value);
        }
      }
      onValue(value);
      if (!_first.isCompleted) _first.complete();
    }
  }
}
