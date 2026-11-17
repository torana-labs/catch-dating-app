import 'dart:async';

import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';

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
/// surfaces at once with its Retry action.
///
/// A timeout is never retried, although it maps to a retryable
/// [NetworkException]: the read already spent its whole deadline, so three
/// more attempts would keep the screen loading for several deadlines and
/// send several requests while the screen already says it timed out. The
/// screen offers Retry instead.
///
/// One rule decides who opts out with `@Riverpod(retry:)`: a Firestore
/// listener read owner keeps its opt-out, [noAutomaticRetry], because
/// restarting a listener is the user's reload and never an automatic retry; a
/// Cloud Function or one-shot read owner takes this policy, unless a comment
/// on it names a reason review accepted.
Duration? catchProviderRetry(int retryCount, Object error) {
  if (retryCount >= _maxAutomaticRetries) return null;
  if (isTimeoutFailure(error)) return null;
  final retryable = appExceptionFor(error)?.retryable ?? false;
  return retryable ? _firstRetryDelay * (1 << retryCount) : null;
}

/// The `@Riverpod(retry:)` opt-out of a Firestore listener read owner: a
/// listener restarts only on the user's reload, never on an automatic retry.
Duration? noAutomaticRetry(int retryCount, Object error) => null;

/// Whether [error] is a deadline running out: a [TimeoutException], or a
/// backend `deadline-exceeded` or timeout mapped to [NetworkException].
bool isTimeoutFailure(Object error) {
  if (error is TimeoutException) return true;
  final mapped = appExceptionFor(error);
  return mapped is NetworkException && mapped.code == 'timeout';
}
