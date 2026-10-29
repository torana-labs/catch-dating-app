enum CatchAsyncStatus { data, loading, error }

/// Exhaustive presentation phase for the valid multi-state combinations an
/// asynchronous source can expose.
enum CatchAsyncPhase {
  initialLoading,
  retrying,
  data,
  refreshing,
  staleDataWithError,
  terminalError,
}

class CatchAsyncState<T> {
  const CatchAsyncState.data(this.value)
    : status = CatchAsyncStatus.data,
      phase = CatchAsyncPhase.data,
      error = null,
      stackTrace = null,
      retrying = false;

  const CatchAsyncState.loading()
    : status = CatchAsyncStatus.loading,
      phase = CatchAsyncPhase.initialLoading,
      value = null,
      error = null,
      stackTrace = null,
      retrying = false;

  const CatchAsyncState.retrying(this.error, [this.stackTrace])
    : status = CatchAsyncStatus.loading,
      phase = CatchAsyncPhase.retrying,
      value = null,
      retrying = true;

  const CatchAsyncState.refreshing(this.value)
    : status = CatchAsyncStatus.data,
      phase = CatchAsyncPhase.refreshing,
      error = null,
      stackTrace = null,
      retrying = false;

  const CatchAsyncState.staleData(
    this.value,
    this.error, [
    this.stackTrace,
    this.retrying = false,
  ]) : status = CatchAsyncStatus.data,
       phase = CatchAsyncPhase.staleDataWithError;

  const CatchAsyncState.error(this.error, [this.stackTrace])
    : status = CatchAsyncStatus.error,
      phase = CatchAsyncPhase.terminalError,
      value = null,
      retrying = false;

  final CatchAsyncStatus status;
  final CatchAsyncPhase phase;
  final T? value;
  final Object? error;
  final StackTrace? stackTrace;
  final bool retrying;

  bool get hasData => status == CatchAsyncStatus.data;
  bool get isSettledData => phase == CatchAsyncPhase.data;
  bool get isLoading => status == CatchAsyncStatus.loading;
  bool get hasError => status == CatchAsyncStatus.error;
  bool get isRefreshing => phase == CatchAsyncPhase.refreshing;
  bool get hasStaleError => phase == CatchAsyncPhase.staleDataWithError;
  bool get isTerminalError => phase == CatchAsyncPhase.terminalError;
}
