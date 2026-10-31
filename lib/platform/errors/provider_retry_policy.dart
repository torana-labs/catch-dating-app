import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:firebase_core/firebase_core.dart';

const _maxAutomaticRetries = 3;
const _firstRetryDelay = Duration(milliseconds: 200);
const _transientFirebaseCodes = {
  'aborted',
  'deadline-exceeded',
  'network-request-failed',
  'unavailable',
};

/// The app container's automatic retry for a failed provider.
///
/// Riverpod's default retries every exception up to ten times over about
/// 38 seconds, so a permission, not-found or validation failure showed a
/// loader for half a minute before its error. Only failures that a second
/// attempt can fix are retried here, three times within about 1.4 seconds;
/// everything else surfaces at once with its Retry action. Providers that must
/// never retry on their own keep their `@Riverpod(retry:)` opt-out.
Duration? catchProviderRetry(int retryCount, Object error) {
  if (retryCount >= _maxAutomaticRetries) return null;
  final transient = switch (error) {
    AppException(:final retryable) => retryable,
    FirebaseException(:final code) => _transientFirebaseCodes.contains(code),
    _ => false,
  };
  return transient ? _firstRetryDelay * (1 << retryCount) : null;
}
