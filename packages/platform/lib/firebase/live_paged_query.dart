import 'dart:async';

import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Live pages over one ordered Firestore query: each page is its own
/// listener, bounded by the page before it, so asking for more opens only
/// the new page.
///
/// Why not one listener whose limit grows: Firestore bills a listener for
/// every document in its initial result set and then for each change. A
/// listener with a larger limit is a new query, so it reads the earlier rows
/// from the server again; the device cache only spares a listener resumed on
/// the same query within 30 minutes. Growing one window by a page of `p`
/// rows costs `p + 2p + ... + np` reads for `n` pages; these pages cost
/// `np`, and every row shown stays live.
///
/// Page `k` listens to `startAfter(anchor[k-1]).limit(pageSize + 1)`, the
/// extra row saying whether a next page exists. Asking for more freezes the
/// last page at its last shown row, `anchor[k]`, and opens page `k + 1`
/// after it. A frozen page shows its rows up to its anchor. When rows move
/// into a frozen page and push its anchor past its limit, that one page
/// listens again bounded by `endAtDocument(anchor[k])` instead of a limit,
/// so no row falls between two pages. The query must order by a unique
/// tiebreaker (for example the document id) so anchors are exact.
class LivePagedQuery<T, R> implements LivePager<R> {
  LivePagedQuery({
    required Query<T> query,
    required int pageSize,
    required int maxRows,
    required R Function(QueryDocumentSnapshot<T> doc) convert,
    required BackendErrorContext errorContext,
    Future<void> Function()? beforeOpen,
  }) : assert(pageSize > 0),
       assert(maxRows >= pageSize),
       _query = query,
       _pageSize = pageSize,
       _maxRows = maxRows,
       _convert = convert,
       _errorContext = errorContext,
       _beforeOpen = beforeOpen;

  final Query<T> _query;
  final int _pageSize;
  final int _maxRows;
  final R Function(QueryDocumentSnapshot<T> doc) _convert;
  final BackendErrorContext _errorContext;
  final Future<void> Function()? _beforeOpen;

  final _pages = <_LivePage<T, R>>[];
  var _closed = false;
  var _shownRows = 0;
  late final StreamController<LivePages<R>> _controller = StreamController(
    onListen: _start,
    onCancel: _close,
  );

  /// One subscription: listening opens the first page, cancelling closes
  /// every page.
  @override
  Stream<LivePages<R>> get pages => _controller.stream;

  /// How many page listeners are open, for tests.
  int get openPageCount => _pages.length;

  @override
  void loadMore() {
    if (_closed || _pages.isEmpty) return;
    final last = _pages.last;
    if (last.error != null) {
      _open(last);
      _emit();
      return;
    }
    final docs = last.docs;
    if (docs == null || docs.length <= _pageSize || _shownRows >= _maxRows) {
      return;
    }
    final anchor = docs[_pageSize - 1];
    last.anchor = anchor;
    final next = _LivePage<T, R>(anchor);
    _pages.add(next);
    _open(next);
    _emit();
  }

  void _start() {
    final first = _LivePage<T, R>(null);
    _pages.add(first);
    final beforeOpen = _beforeOpen;
    if (beforeOpen == null) {
      _open(first);
      return;
    }
    unawaited(() async {
      try {
        await beforeOpen();
      } on Object catch (error, stackTrace) {
        if (_closed) return;
        first
          ..error = error
          ..stackTrace = stackTrace;
        _emit();
        return;
      }
      if (!_closed) _open(first);
    }());
  }

  void _open(_LivePage<T, R> page) {
    unawaited(page.subscription?.cancel());
    page
      ..error = null
      ..stackTrace = null;
    var query = _query;
    final start = page.start;
    if (start != null) query = query.startAfterDocument(start);
    final anchor = page.anchor;
    query = page.bounded && anchor != null
        ? query.endAtDocument(anchor).limit(_maxRows + 1)
        : query.limit(_pageSize + 1);
    page.subscription =
        withBackendErrorStream(
          () => query.snapshots(),
          context: _errorContext,
        ).listen(
          (snapshot) => _onSnapshot(page, snapshot.docs),
          onError: (Object error, StackTrace stackTrace) =>
              _onError(page, error, stackTrace),
        );
  }

  void _onSnapshot(_LivePage<T, R> page, List<QueryDocumentSnapshot<T>> docs) {
    if (_closed || !_pages.contains(page)) return;
    final anchor = page.anchor;
    if (anchor != null &&
        !page.bounded &&
        docs.length > _pageSize &&
        !docs.any((doc) => doc.id == anchor.id)) {
      // Rows moved in and pushed the anchor past this page's limit: listen
      // to exactly this page's range instead, showing these rows meanwhile.
      page.bounded = true;
      _open(page);
    }
    // Only shown rows are converted: the look-ahead row belongs to the next
    // page and must not fail this one.
    final List<R> rows;
    try {
      rows = [
        for (final doc in docs.take(_shownCount(page, docs))) _convert(doc),
      ];
    } on Object catch (error, stackTrace) {
      _onError(page, error, stackTrace);
      return;
    }
    page
      ..docs = docs
      ..rows = rows
      ..error = null
      ..stackTrace = null;
    _emit();
  }

  void _onError(_LivePage<T, R> page, Object error, StackTrace stackTrace) {
    if (_closed || !_pages.contains(page)) return;
    page
      ..error = error
      ..stackTrace = stackTrace;
    // Later pages start after this one; retrying it reopens them on demand.
    final index = _pages.indexOf(page);
    for (final later in _pages.sublist(index + 1)) {
      unawaited(later.subscription?.cancel());
    }
    _pages.removeRange(index + 1, _pages.length);
    page.anchor = null;
    page.bounded = false;
    _emit();
  }

  void _emit() {
    if (_closed || _controller.isClosed || _pages.isEmpty) return;
    final first = _pages.first;
    final firstError = first.error;
    if (firstError != null) {
      _controller.addError(firstError, first.stackTrace);
      return;
    }
    if (first.docs == null) return;

    final seen = <String>{};
    final items = <R>[];
    var loadingMore = false;
    Object? nextPageError;
    StackTrace? nextPageStackTrace;
    for (final page in _pages) {
      if (page.error != null) {
        nextPageError = page.error;
        nextPageStackTrace = page.stackTrace;
        break;
      }
      final docs = page.docs;
      final rows = page.rows;
      if (docs == null || rows == null) {
        loadingMore = true;
        break;
      }
      for (var index = 0; index < rows.length; index++) {
        if (seen.add(docs[index].id)) items.add(rows[index]);
      }
    }
    _shownRows = items.length;
    final last = _pages.last;
    final hasMore =
        nextPageError != null ||
        loadingMore ||
        ((last.docs?.length ?? 0) > _pageSize && items.length < _maxRows);
    _controller.add(
      LivePages<R>(
        items: List.unmodifiable(items),
        hasMore: hasMore,
        loadingMore: loadingMore,
        nextPageError: nextPageError,
        nextPageStackTrace: nextPageStackTrace,
      ),
    );
  }

  int _shownCount(_LivePage<T, R> page, List<QueryDocumentSnapshot<T>> docs) {
    final anchor = page.anchor;
    if (anchor == null) {
      return docs.length < _pageSize ? docs.length : _pageSize;
    }
    if (page.bounded) return docs.length;
    final index = docs.indexWhere((doc) => doc.id == anchor.id);
    return index < 0 ? docs.length : index + 1;
  }

  Future<void> _close() async {
    _closed = true;
    final subscriptions = [for (final page in _pages) ?page.subscription];
    _pages.clear();
    await Future.wait(subscriptions.map((sub) => sub.cancel()));
  }
}

class _LivePage<T, R> {
  _LivePage(this.start);

  /// The anchor of the page before; null for the first page.
  final DocumentSnapshot<T>? start;

  /// This page's last shown row once a page follows it.
  DocumentSnapshot<T>? anchor;

  /// Whether the listener is bounded by [anchor] instead of a limit.
  bool bounded = false;

  List<QueryDocumentSnapshot<T>>? docs;
  List<R>? rows;
  Object? error;
  StackTrace? stackTrace;
  StreamSubscription<QuerySnapshot<T>>? subscription;
}
