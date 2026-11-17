part of 'host_forms_controller.dart';

@immutable
class HostFormsDirectoryState {
  const HostFormsDirectoryState({
    required this.forms,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostFormSummary> forms;

  /// Whether more forms follow the rows listened to.
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => hasMore && !loadingMore;

  HostFormsDirectoryState copyWith({
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostFormsDirectoryState(
    forms: forms,
    hasMore: hasMore,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}

/// Opens the forms directory again after a failure: its listeners too, so a
/// failed listener is not handed back as it was.
void retryHostFormsDirectory(WidgetRef ref, HostFormListRequest request) => ref
  ..invalidate(hostFormsListenerProvider)
  ..invalidate(hostFormsDirectoryControllerProvider(request));

/// How many forms the directory listens to for one request; it grows by
/// the request's page size each time the list asks for more.
@riverpod
class HostFormsWindow extends _$HostFormsWindow {
  @override
  int build(HostFormListRequest request) => request.limit;

  void grow() => state += request.limit;
}

/// The first rows of the request's form list, as a listener.
@riverpod
Stream<HostFormWindow> hostFormsListener(
  Ref ref,
  HostFormListRequest request,
  int limit,
) => ref.watch(hostFormsRepositoryProvider).watchForms(request, limit: limit);

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. More
/// rows mean a larger listener; a larger listener that fails keeps the rows
/// already shown and reports the failure under them.
@riverpod
class HostFormsDirectoryController extends _$HostFormsDirectoryController {
  bool _matchesAccount(HostFormListRequest request) =>
      request.accountUid == null ||
      ref.read(firebaseAuthProvider).currentUser?.uid == request.accountUid;

  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async {
    if (!_matchesAccount(request)) {
      throw StateError('The Host account changed while loading forms.');
    }
    final limit = ref.watch(hostFormsWindowProvider(request));
    final previous = state.value;
    final HostFormWindow window;
    try {
      window = await ref.watch(
        hostFormsListenerProvider(request, limit).future,
      );
    } on Object catch (error) {
      if (limit == request.limit || previous == null) rethrow;
      return previous.copyWith(loadingMore: false, loadMoreError: error);
    }
    if (!ref.mounted || !_matchesAccount(request)) {
      throw StateError('The Host account changed while loading forms.');
    }
    return HostFormsDirectoryState(
      forms: List.unmodifiable(window.forms),
      hasMore: window.hasMore,
    );
  }

  /// Listens to one more page; the list keeps its rows meanwhile.
  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore || !_matchesAccount(request)) {
      return;
    }
    state = AsyncData(
      current.copyWith(loadingMore: true, clearLoadMoreError: true),
    );
    ref.read(hostFormsWindowProvider(request).notifier).grow();
  }
}
