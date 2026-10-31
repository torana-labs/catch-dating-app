import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';

final _readsByError = Expando<List<ProviderBase<Object?>>>('failed reads');

/// Records which read each failure came from, so a Retry can re-run it. The
/// app container installs it.
///
/// A view model composed from several reads passes a failed read's error
/// through unchanged, but invalidating the view model does not re-run what it
/// watches: it rebuilds over the same cached failure. Riverpod reports the
/// provider that actually failed, with its family key, which a screen often
/// cannot name, such as the organizer read keyed by the event that loaded.
final class FailedReadRecorder extends ProviderObserver {
  const FailedReadRecorder();

  @override
  void providerDidFail(
    ProviderObserverContext context,
    Object error,
    StackTrace stackTrace,
  ) {
    if (!_canKey(error)) return;
    final reads = _readsByError[error] ??= [];
    if (!reads.contains(context.provider)) reads.add(context.provider);
  }
}

/// The reads that failed with [error], as [FailedReadRecorder] saw them.
List<ProviderBase<Object?>> readsThatFailedWith(Object error) =>
    _canKey(error) ? [...?_readsByError[error]] : const [];

extension RetryFailedReads on WidgetRef {
  /// Re-runs the reads that failed with [error] and rebuilds [composition]
  /// over them. Healthy reads keep their state, so session-wide ones such as
  /// the uid the router watches do not restart. Without a recorded read, such
  /// as a failure the composition raised itself or a load that timed out,
  /// only [composition] is rebuilt.
  void retryFailedReads(
    Object? error, {
    required ProviderOrFamily composition,
  }) {
    if (error != null) readsThatFailedWith(error).forEach(invalidate);
    invalidate(composition);
  }
}

// Expando cannot key strings, numbers, booleans or records.
bool _canKey(Object error) =>
    error is! String && error is! num && error is! bool && error is! Record;
