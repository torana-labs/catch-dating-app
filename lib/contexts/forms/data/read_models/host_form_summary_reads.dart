import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/platform/firebase/host_summary_reader.dart';

class HostFormSummaryReads {
  const HostFormSummaryReads(this.reader);
  final HostSummaryReader reader;

  Future<HostFormPage?> list(HostFormListRequest request) async {
    if (request.query?.trim().isNotEmpty ?? false) return null;
    final directory = await reader.directory(request.organizerId);
    if (directory?['formSummaryVersion'] != 1) {
      if (request.cursor?.startsWith(HostSummaryCursor.prefix) ?? false) {
        throw StateError('The form directory changed; refresh this list.');
      }
      return null;
    }
    final statuses =
        request.statuses.isEmpty
              ? ['draft', 'published', 'paused']
              : request.statuses.map((item) => item.name).toList()
          ..sort();
    final purposes = request.purposes.map((item) => item.name).toList()..sort();
    final page = await reader.page(
      collection: 'hostFormSummaries',
      organizerId: request.organizerId,
      orderField: 'updatedAtMillis',
      descending: true,
      queryKey: jsonEncode([statuses, purposes]),
      limit: request.limit,
      inFilters: {
        'status': statuses,
        if (purposes.isNotEmpty) 'purpose': purposes,
      },
      cursor: request.cursor,
    );
    return HostFormPage.fromCallableData({
      'organizerId': request.organizerId,
      'items': page.documents.map((doc) => doc['row']).toList(),
      'nextCursor': page.nextCursor,
    });
  }
}
