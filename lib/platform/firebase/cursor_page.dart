import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
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

/// Shared Firestore `startAfterDocument` window fetch.
///
/// Fetching `limit + 1` makes [CursorPage.hasMore] truthful without an extra
/// count query. The cursor points at the final *returned* document so the
/// look-ahead document appears at the start of the next page rather than being
/// skipped.
extension FirestoreCursorQuery<T> on Query<T> {
  Future<CursorPage<QueryDocumentSnapshot<T>, DocumentSnapshot<T>>>
  fetchDocumentCursorPage({
    required int limit,
    DocumentSnapshot<T>? startAfter,
    required BackendErrorContext errorContext,
  }) async {
    if (limit <= 0) {
      throw ArgumentError.value(limit, 'limit', 'Must be greater than zero.');
    }

    return withBackendErrorContext(() async {
      final windowed = startAfter == null
          ? this
          : startAfterDocument(startAfter);
      final snapshot = await windowed.limit(limit + 1).get();
      final hasMore = snapshot.docs.length > limit;
      final visibleDocs = snapshot.docs.take(limit).toList();
      return CursorPage(
        items: List.unmodifiable(visibleDocs),
        nextCursor: hasMore && visibleDocs.isNotEmpty ? visibleDocs.last : null,
        hasMore: hasMore,
      );
    }, context: errorContext);
  }
}
