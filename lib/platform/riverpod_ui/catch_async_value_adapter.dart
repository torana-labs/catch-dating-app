import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

CatchAsyncState<T> catchAsyncStateFromAsyncValue<T>(AsyncValue<T> value) {
  if (value.hasValue) {
    final data = value.value as T;
    if (value.hasError) {
      return CatchAsyncState<T>.staleData(
        data,
        value.error!,
        value.stackTrace,
        value.isLoading,
      );
    }
    if (value.isLoading) return CatchAsyncState<T>.refreshing(data);
    return CatchAsyncState<T>.data(data);
  }
  if (value.isLoading && value.hasError) {
    return CatchAsyncState<T>.retrying(value.error!, value.stackTrace);
  }
  if (value.isLoading) return const CatchAsyncState.loading();
  if (value.hasError) {
    return CatchAsyncState<T>.error(value.error!, value.stackTrace);
  }
  return CatchAsyncState<T>.loading();
}
