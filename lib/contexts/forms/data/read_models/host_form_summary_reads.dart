import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';

/// The form list from `hostFormSummaries`, title searches included, as a
/// listener: a form the server adds, changes or removes shows at once.
class HostFormSummaryReads {
  const HostFormSummaryReads(this.reader);
  final ScopedReadModelReader reader;
  static const marker = 'formSummaryVersion';

  /// The most forms a search reads before it asks for narrower filters.
  static const maxSearchedForms = 500;

  /// The forms of [request], newest change first, [pageSize] at a time,
  /// every row shown kept live. Each page is its own listener, so asking for
  /// more reads only the new page.
  ///
  /// A title search is not paged: a contains-match cannot be indexed, and
  /// forms are few, so it listens once to up to [maxSearchedForms] forms
  /// and matches on the device. That is one fixed listener, not a growing
  /// window, and its pager has no further page.
  LivePager<HostFormSummary> watchPages(
    HostFormListRequest request, {
    required int pageSize,
  }) {
    final statuses =
        request.statuses.isEmpty
              ? ['draft', 'published', 'paused']
              : request.statuses.map((item) => item.name).toList()
          ..sort();
    final purposes = request.purposes.map((item) => item.name).toList()..sort();
    final search = request.query?.trim().toLowerCase() ?? '';
    final inFilters = {
      'status': statuses,
      if (purposes.isNotEmpty) 'purpose': purposes,
    };
    if (search.isEmpty) {
      return reader
          .watchPages(
            collection: 'hostFormSummaries',
            scopeId: request.organizerId,
            orderField: 'updatedAtMillis',
            descending: true,
            pageSize: pageSize,
            marker: marker,
            inFilters: inFilters,
          )
          .map((doc) => HostFormSummary.fromMap(doc['row'] as Map));
    }
    return _SearchedForms(
      reader.watchWindow(
        collection: 'hostFormSummaries',
        scopeId: request.organizerId,
        orderField: 'updatedAtMillis',
        descending: true,
        limit: maxSearchedForms,
        marker: marker,
        inFilters: inFilters,
      ),
      search,
    );
  }
}

/// The forms whose title or description contains the search (as the
/// callable matched, case-insensitive), from one bounded listener.
class _SearchedForms implements LivePager<HostFormSummary> {
  _SearchedForms(this._window, this._search);

  final Stream<ReadModelWindow> _window;
  final String _search;

  @override
  Stream<LivePages<HostFormSummary>> get pages => _window.map((window) {
    if (window.hasMore) {
      throw StateError('Too many forms to search. Narrow the filters.');
    }
    return LivePages(
      items: List.unmodifiable([
        for (final doc in window.documents)
          if ('${(doc['row'] as Map)['title']} '
                  '${(doc['row'] as Map)['description'] ?? ''}'
              .toLowerCase()
              .contains(_search))
            HostFormSummary.fromMap(doc['row'] as Map),
      ]),
      hasMore: false,
    );
  });

  @override
  void loadMore() {}
}
