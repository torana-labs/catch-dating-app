import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

/// One bounded page plus the opaque cursor required to fetch its successor.
@immutable
class CursorPage<T, C> {
  const CursorPage({
    required this.items,
    required this.hasMore,
    this.nextCursor,
  }) : assert(hasMore == false || nextCursor != null);

  final List<T> items;
  final C? nextCursor;
  final bool hasMore;

  static CursorPage<T, C> empty<T, C>() =>
      CursorPage(items: List<T>.empty(), hasMore: false);
}

/// Where the next page of a Firestore query starts: the last document the
/// previous page returned.
///
/// The snapshot stays private, so controllers and view models can keep and
/// hand back a cursor without touching Firestore types
/// (`catch_arch_firestore_outside_data`). Only data-layer code, which may hold
/// a `DocumentSnapshot`, can create one or resume a query from one.
@immutable
final class PageCursor<T> {
  /// The cursor that resumes after [document].
  const PageCursor.after(DocumentSnapshot<T> document) : _document = document;

  final DocumentSnapshot<T> _document;
}

/// Resumes a Firestore query from an opaque [PageCursor].
extension PageCursorQuery<T> on Query<T> {
  /// This query starting after [cursor], or unchanged when there is none. The
  /// cursor may come from the same collection read through another converter.
  Query<T> startAfterCursor(PageCursor<Object?>? cursor) =>
      cursor == null ? this : startAfterDocument(cursor._document);
}

/// Shared Firestore `startAfterDocument` window fetch.
///
/// Fetching `limit + 1` makes [CursorPage.hasMore] truthful without an extra
/// count query. The cursor points at the final *returned* document so the
/// look-ahead document appears at the start of the next page rather than being
/// skipped.
extension FirestoreCursorQuery<T> on Query<T> {
  Future<CursorPage<QueryDocumentSnapshot<T>, PageCursor<T>>>
  fetchDocumentCursorPage({
    required int limit,
    PageCursor<T>? startAfter,
    required BackendErrorContext errorContext,
  }) async {
    if (limit <= 0) {
      throw ArgumentError.value(limit, 'limit', 'Must be greater than zero.');
    }

    return withBackendErrorContext(() async {
      final snapshot = await startAfterCursor(
        startAfter,
      ).limit(limit + 1).get();
      final hasMore = snapshot.docs.length > limit;
      final visibleDocs = snapshot.docs.take(limit).toList();
      return CursorPage(
        items: List.unmodifiable(visibleDocs),
        nextCursor: hasMore && visibleDocs.isNotEmpty
            ? PageCursor.after(visibleDocs.last)
            : null,
        hasMore: hasMore,
      );
    }, context: errorContext);
  }
}
