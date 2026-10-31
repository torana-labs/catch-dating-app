import 'package:catch_dating_app/platform/errors/backend_error_util.dart';

const _maxAutomaticRetries = 3;
const _firstRetryDelay = Duration(milliseconds: 200);

/// The app container's automatic retry for a failed provider.
///
/// Riverpod's default retries every exception up to ten times over about
/// 38 seconds, so a permission, not-found or validation failure showed a
/// loader for half a minute before its error. Only failures the backend error
/// mapping marks `retryable` are retried here, three times within about
/// 1.4 seconds; a raw Firebase error is mapped first, so it gets the same
/// answer as one a repository already mapped. Everything else, bugs included,
/// surfaces at once with its Retry action. Providers that must never retry on
/// their own keep their `@Riverpod(retry:)` opt-out.
Duration? catchProviderRetry(int retryCount, Object error) {
  if (retryCount >= _maxAutomaticRetries) return null;
  final retryable = appExceptionFor(error)?.retryable ?? false;
  return retryable ? _firstRetryDelay * (1 << retryCount) : null;
}
