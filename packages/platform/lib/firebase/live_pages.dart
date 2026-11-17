import 'package:flutter/foundation.dart';

/// The rows a live paged list shows so far, and the state of its next page.
///
/// Controllers read this instead of Firestore types: the data layer owns the
/// cursors (see `live_paged_query.dart`).
@immutable
class LivePages<T> {
  const LivePages({
    required this.items,
    required this.hasMore,
    this.loadingMore = false,
    this.nextPageError,
    this.nextPageStackTrace,
  });

  /// Every row of the pages opened so far, in query order, each once.
  final List<T> items;

  /// Whether a further page exists. Stays true while the next page has
  /// failed, so asking for more again retries it.
  final bool hasMore;

  /// Whether the next page is opening.
  final bool loadingMore;

  /// Why the next page failed; the rows above it stay.
  final Object? nextPageError;
  final StackTrace? nextPageStackTrace;

  LivePages<R> map<R>(R Function(T item) convert) => LivePages<R>(
    items: List.unmodifiable(items.map(convert)),
    hasMore: hasMore,
    loadingMore: loadingMore,
    nextPageError: nextPageError,
    nextPageStackTrace: nextPageStackTrace,
  );
}

/// A live list read one page at a time.
///
/// Listening to [pages] opens the first page; [loadMore] opens the next one
/// (or retries a failed one). Cancelling the subscription closes every
/// page's listener.
abstract interface class LivePager<T> {
  Stream<LivePages<T>> get pages;

  /// Opens the next page, or retries the one that failed. Does nothing while
  /// a page is opening or when no page follows.
  void loadMore();
}

extension LivePagerMap<T> on LivePager<T> {
  /// The same pager with each row converted.
  LivePager<R> map<R>(R Function(T item) convert) =>
      _MappedLivePager(this, convert);
}

class _MappedLivePager<T, R> implements LivePager<R> {
  _MappedLivePager(this._source, this._convert);

  final LivePager<T> _source;
  final R Function(T item) _convert;

  @override
  Stream<LivePages<R>> get pages =>
      _source.pages.map((pages) => pages.map(_convert));

  @override
  void loadMore() => _source.loadMore();
}
