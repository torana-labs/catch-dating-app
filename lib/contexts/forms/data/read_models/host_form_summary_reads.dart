import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

/// The form list from `hostFormSummaries`. Only a title search still needs
/// the server's evaluation.
class HostFormSummaryReads {
  const HostFormSummaryReads(this.reader);
  final HostSummaryReader reader;

  static bool supports(HostFormListRequest request) =>
      request.query?.trim().isEmpty ?? true;

  /// One page of a request [supports] accepts.
  Future<HostFormPage> list(HostFormListRequest request) async {
    if (!supports(request)) {
      throw ArgumentError('The form directory cannot serve a title search.');
    }
    await reader.activatedDirectory(request.organizerId, 'formSummaryVersion');
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
