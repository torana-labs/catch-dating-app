import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/provider_retry_policy.dart';

/// The code of a write whose outcome is unknown after a timeout.
const writeOutcomeUnknownCode = 'write-outcome-unknown';

/// The failure a write surface shows for [error]. A timed-out write may still
/// finish on the server, so it is not reported as failed (which invites a
/// repeat) but as unconfirmed; the screen's listener or a read-back confirms
/// it. Any other error is returned unchanged.
Object writeFailure(Object error) {
  if (!isTimeoutFailure(error)) return error;
  return BackendOperationException(
    code: writeOutcomeUnknownCode,
    message:
        "We couldn't confirm this change. It may still go through, so check "
        'before you try again.',
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save this change',
    ),
    cause: error,
  );
}

/// Whether [error] is a write whose outcome is unknown. Surfaces offer no
/// retry for it: repeating a write that may already have landed can apply it
/// twice, so the screen's listener confirms it and the person repeats it from
/// the original control only if it did not go through.
bool isUnconfirmedWrite(Object error) =>
    error is AppException && error.code == writeOutcomeUnknownCode;
