import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

/// The first rows of one live form list, and whether more follow.
class HostFormWindow {
  const HostFormWindow({required this.forms, required this.hasMore});

  final List<HostFormSummary> forms;
  final bool hasMore;
}

/// The form list from `hostFormSummaries`, title searches included, as a
/// listener: a form the server adds, changes or removes shows at once.
class HostFormSummaryReads {
  const HostFormSummaryReads(this.reader);
  final HostSummaryReader reader;
  static const marker = 'formSummaryVersion';

  /// The most forms a search reads before it asks for narrower filters.
  static const maxSearchedForms = 500;

  /// The first [limit] forms of the list, newest change first, or every
  /// form whose title or description contains the search (as the callable
  /// matched, case-insensitive) while it is listened to.
  Stream<HostFormWindow> watchWindow(
    HostFormListRequest request, {
    required int limit,
  }) {
    final statuses =
        request.statuses.isEmpty
              ? ['draft', 'published', 'paused']
              : request.statuses.map((item) => item.name).toList()
          ..sort();
    final purposes = request.purposes.map((item) => item.name).toList()..sort();
    final search = request.query?.trim().toLowerCase() ?? '';
    // A contains-match cannot be indexed; forms are few, so read them all.
    final windows = reader.watchWindow(
      collection: 'hostFormSummaries',
      organizerId: request.organizerId,
      orderField: 'updatedAtMillis',
      descending: true,
      limit: search.isEmpty ? limit : maxSearchedForms,
      marker: marker,
      inFilters: {
        'status': statuses,
        if (purposes.isNotEmpty) 'purpose': purposes,
      },
    );
    return windows.map((window) {
      if (search.isEmpty) {
        return HostFormWindow(
          forms: [
            for (final doc in window.documents)
              HostFormSummary.fromMap(doc['row'] as Map),
          ],
          hasMore: window.hasMore,
        );
      }
      if (window.hasMore) {
        throw StateError('Too many forms to search. Narrow the filters.');
      }
      return HostFormWindow(
        forms: [
          for (final doc in window.documents)
            if ('${(doc['row'] as Map)['title']} '
                    '${(doc['row'] as Map)['description'] ?? ''}'
                .toLowerCase()
                .contains(search))
              HostFormSummary.fromMap(doc['row'] as Map),
        ],
        hasMore: false,
      );
    });
  }
}
