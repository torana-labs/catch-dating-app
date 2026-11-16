import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, offer.status:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)

/// Ordinary inbox pages contain metadata only. Answer filters and detail reads
/// retain their source-authorized callable path. Offered entries are read
/// only here: the derived offer lives on the summary, not the source.
class HostResponseSummaryReads {
  const HostResponseSummaryReads(this.reader);
  final HostSummaryReader reader;

  /// Whether the inbox read model can serve [request]: the plain inbox and
  /// offered entries, without answer, identity, date or text filters.
  static bool supports(HostFormResponseListRequest request) {
    final offered = request.offeredOnly;
    return !((request.formId != null && !offered) ||
        (offered && !request.includeApplications) ||
        request.contactId != null ||
        request.versionId != null ||
        request.reviewStatus != null ||
        request.statuses.isNotEmpty ||
        request.identityKinds.isNotEmpty ||
        request.sourceLinkId != null ||
        request.answerFilters.isNotEmpty ||
        (request.query?.trim().isNotEmpty ?? false) ||
        request.from != null ||
        request.to != null);
  }

  /// One page of a request [supports] accepts.
  Future<HostFormResponsePage> list(HostFormResponseListRequest request) async {
    if (!supports(request)) {
      throw ArgumentError('The response inbox cannot serve these filters.');
    }
    final offered = request.offeredOnly;
    await reader.activatedDirectory(
      request.organizerId,
      'responseSummaryVersion',
    );
    final page = await reader.page(
      collection: 'hostResponseSummaries',
      organizerId: request.organizerId,
      orderField: 'submittedAtMillis',
      descending: !request.oldestFirst,
      queryKey:
          '${request.includeApplications}/${request.oldestFirst}/'
          '${offered ? 'offered/${request.formId}' : 'all'}',
      limit: request.limit,
      equalities: offered
          ? {
              'formId': ?request.formId,
              'offer.status': HostFormEntryOfferStatus.offered.name,
            }
          : request.includeApplications
          ? const {}
          : const {'kind': 'response'},
      cursor: request.cursor,
    );
    final entries = page.documents
        .map(HostFormInboxEntry.fromSummary)
        .toList(growable: false);
    return HostFormResponsePage(
      organizerId: request.organizerId,
      items: entries.map((entry) => entry.response).nonNulls.toList(),
      entries: request.includeApplications ? entries : null,
      nextCursor: page.nextCursor,
    );
  }
}
