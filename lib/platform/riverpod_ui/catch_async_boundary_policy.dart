import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The single visible branch, after applying retention and retry policy.
enum CatchAsyncBoundaryStatus { data, loading, error }

/// Conditions in which a boundary may retain credible, previously loaded data.
///
/// These conditions are independent. The default retains data during refresh;
/// reload and terminal failure replace it unless explicitly selected as well.
enum CatchAsyncBoundaryMode { refresh, reload, error }

const defaultCatchAsyncRetainedData = {CatchAsyncBoundaryMode.refresh};

CatchAsyncBoundaryStatus catchAsyncBoundaryStatus<T>(
  AsyncValue<T> value, {
  Set<CatchAsyncBoundaryMode> retainDataOn = defaultCatchAsyncRetainedData,
}) {
  if (value.retrying && !value.hasValue) {
    return CatchAsyncBoundaryStatus.loading;
  }
  if (value.isLoading) {
    // A retry without credible data never replays its preceding error.
    if (!value.hasValue) return CatchAsyncBoundaryStatus.loading;
    final retain = value.isRefreshing
        ? retainDataOn.contains(CatchAsyncBoundaryMode.refresh)
        : value.isReloading
        ? retainDataOn.contains(CatchAsyncBoundaryMode.reload)
        : false;
    return retain
        ? CatchAsyncBoundaryStatus.data
        : CatchAsyncBoundaryStatus.loading;
  }
  if (value.hasError &&
      (!value.hasValue ||
          !retainDataOn.contains(CatchAsyncBoundaryMode.error))) {
    return CatchAsyncBoundaryStatus.error;
  }
  if (value.hasValue) return CatchAsyncBoundaryStatus.data;
  return CatchAsyncBoundaryStatus.loading;
}

bool isCatchAsyncBlockingLoading(AsyncValue<Object?> value) =>
    value.isLoading && !value.hasValue;

const catchAsyncInitialLoadTimeoutException = NetworkException(
  'timeout',
  'This is taking longer than expected. Please try again.',
);
