import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

/// The form list from `hostFormSummaries`, title searches included.
class HostFormSummaryReads {
  const HostFormSummaryReads(this.reader);
  final HostSummaryReader reader;

  /// The most forms a search reads before it asks for narrower filters.
  static const maxSearchedForms = 500;

  /// One page of the list, or every form whose title or description
  /// contains the search (as the callable matched, case-insensitive).
  Future<HostFormPage> list(HostFormListRequest request) async {
    await reader.activatedDirectory(request.organizerId, 'formSummaryVersion');
    final statuses =
        request.statuses.isEmpty
              ? ['draft', 'published', 'paused']
              : request.statuses.map((item) => item.name).toList()
          ..sort();
    final purposes = request.purposes.map((item) => item.name).toList()..sort();
    Future<HostSummaryPage> page({required int limit, String? cursor}) =>
        reader.page(
          collection: 'hostFormSummaries',
          organizerId: request.organizerId,
          orderField: 'updatedAtMillis',
          descending: true,
          queryKey: jsonEncode([statuses, purposes]),
          limit: limit,
          inFilters: {
            'status': statuses,
            if (purposes.isNotEmpty) 'purpose': purposes,
          },
          cursor: cursor,
        );
    final search = request.query?.trim().toLowerCase() ?? '';
    if (search.isEmpty) {
      final first = await page(limit: request.limit, cursor: request.cursor);
      return HostFormPage.fromCallableData({
        'organizerId': request.organizerId,
        'items': first.documents.map((doc) => doc['row']).toList(),
        'nextCursor': first.nextCursor,
      });
    }
    // A contains-match cannot be indexed; forms are few, so read them all.
    final rows = <Object?>[];
    var read = 0;
    String? cursor;
    do {
      final next = await page(limit: 100, cursor: cursor);
      read += next.documents.length;
      for (final doc in next.documents) {
        final row = doc['row'] as Map;
        final text = '${row['title']} ${row['description'] ?? ''}'
            .toLowerCase();
        if (text.contains(search)) rows.add(row);
      }
      cursor = next.nextCursor;
      if (cursor != null && read >= maxSearchedForms) {
        throw StateError('Too many forms to search. Narrow the filters.');
      }
    } while (cursor != null);
    return HostFormPage.fromCallableData({
      'organizerId': request.organizerId,
      'items': rows,
      'nextCursor': null,
    });
  }
}
