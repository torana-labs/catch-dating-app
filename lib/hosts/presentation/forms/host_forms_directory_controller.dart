part of 'host_forms_controller.dart';

/// The request's forms, a page at a time, every row shown live. Each page is
/// its own listener, so asking for more reads only the new page. A title
/// search is one bounded listener with no further page.
@riverpod
class HostFormsDirectoryPages extends _$HostFormsDirectoryPages {
  late LivePager<HostFormSummary> _pager;

  @override
  Stream<LivePages<HostFormSummary>> build(HostFormListRequest request) {
    _pager = ref
        .watch(hostFormsRepositoryProvider)
        .watchFormPages(request, pageSize: request.limit);
    return _pager.pages;
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. A page
/// that fails to open keeps the rows already shown and reports the failure
/// under them.
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
    final pages = await ref.watch(
      hostFormsDirectoryPagesProvider(request).future,
    );
    if (!ref.mounted || !_matchesAccount(request)) {
      throw StateError('The Host account changed while loading forms.');
    }
    return HostFormsDirectoryState(
      forms: pages.items,
      hasMore: pages.hasMore,
      loadingMore: pages.loadingMore,
      loadMoreError: pages.nextPageError,
    );
  }

  /// Opens the directory again after a failure, its listeners too, so a
  /// failed listener is not handed back as it was.
  void retry() {
    ref
      ..invalidate(hostFormsDirectoryPagesProvider(request))
      ..invalidateSelf();
  }

  /// Opens one more page, or retries a failed one; the list keeps its rows
  /// meanwhile.
  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore || !_matchesAccount(request)) {
      return;
    }
    ref.read(hostFormsDirectoryPagesProvider(request).notifier).loadMore();
  }
}
