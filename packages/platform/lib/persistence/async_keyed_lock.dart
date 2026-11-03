import 'dart:async';

/// Serializes read/modify/write work for one key within this app process.
/// Different accounts can proceed independently. Failures never poison a key.
class AsyncKeyedLock {
  final _pending = <String, Future<void>>{};

  Future<T> run<T>(String key, Future<T> Function() action) async {
    final previous = _pending[key] ?? Future<void>.value();
    final completed = Completer<void>();
    _pending[key] = completed.future;
    await previous;
    try {
      return await action();
    } finally {
      completed.complete();
      if (identical(_pending[key], completed.future)) {
        unawaited(_pending.remove(key));
      }
    }
  }
}
