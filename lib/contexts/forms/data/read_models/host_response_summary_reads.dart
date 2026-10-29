import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/platform/firebase/host_summary_reader.dart';

/// Ordinary inbox pages contain metadata only. Answer filters and detail reads
/// retain their source-authorized callable path.
class HostResponseSummaryReads {
  const HostResponseSummaryReads(this.reader);
  final HostSummaryReader reader;

  Future<HostFormResponsePage?> list(
    HostFormResponseListRequest request,
  ) async {
    if (request.formId != null ||
        request.contactId != null ||
        request.versionId != null ||
        request.reviewStatus != null ||
        request.statuses.isNotEmpty ||
        request.identityKinds.isNotEmpty ||
        request.sourceLinkId != null ||
        request.answerFilters.isNotEmpty ||
        (request.query?.trim().isNotEmpty ?? false) ||
        request.from != null ||
        request.to != null) {
      return null;
    }
    final directory = await reader.directory(request.organizerId);
    if (directory?['responseSummaryVersion'] != 1) {
      if (request.cursor?.startsWith(HostSummaryCursor.prefix) ?? false) {
        throw StateError('The response inbox changed; refresh this list.');
      }
      return null;
    }
    final page = await reader.page(
      collection: 'hostResponseSummaries',
      organizerId: request.organizerId,
      orderField: 'submittedAtMillis',
      descending: !request.oldestFirst,
      queryKey: '${request.includeApplications}/${request.oldestFirst}',
      limit: request.limit,
      equalities: request.includeApplications
          ? const {}
          : const {'kind': 'response'},
      cursor: request.cursor,
    );
    final entries = page.documents
        .map((doc) => HostFormInboxEntry.fromMap(doc['row'] as Map))
        .toList(growable: false);
    return HostFormResponsePage(
      organizerId: request.organizerId,
      items: entries.map((entry) => entry.response).nonNulls.toList(),
      entries: request.includeApplications ? entries : null,
      nextCursor: page.nextCursor,
    );
  }
}
