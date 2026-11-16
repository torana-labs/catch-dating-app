import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, offer.status:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)

/// Ordinary inbox pages contain metadata only. Answer filters and detail reads
/// retain their source-authorized callable path. Offered entries are read
/// only here: the derived offer lives on the summary, not the source. The
/// all-form inbox also filters by an application's review status (only with
/// applications included, as the callable requires) and by submission date.
class HostResponseSummaryReads {
  const HostResponseSummaryReads(this.reader);
  final HostSummaryReader reader;

  /// Whether the inbox read model can serve [request]: the plain inbox and
  /// offered entries, a review status (all forms, applications included)
  /// and a submission date range, without form, answer, identity, status or
  /// text filters.
  static bool supports(HostFormResponseListRequest request) {
    final offered = request.offeredOnly;
    return !((request.formId != null && !offered) ||
        (offered && !request.includeApplications) ||
        (request.reviewStatus != null &&
            (offered || !request.includeApplications)) ||
        request.contactId != null ||
        request.versionId != null ||
        request.statuses.isNotEmpty ||
        request.identityKinds.isNotEmpty ||
        request.sourceLinkId != null ||
        request.answerFilters.isNotEmpty ||
        (request.query?.trim().isNotEmpty ?? false));
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
          '${offered ? 'offered/${request.formId}' : 'all'}/'
          '${request.reviewStatus?.name}/'
          '${request.from?.millisecondsSinceEpoch}/'
          '${request.to?.millisecondsSinceEpoch}',
      limit: request.limit,
      equalities: offered
          ? {
              'formId': ?request.formId,
              'offer.status': HostFormEntryOfferStatus.offered.name,
            }
          : {
              if (!request.includeApplications) 'kind': 'response',
              // Only an entry with an application has a review status.
              'reviewStatus': ?request.reviewStatus?.name,
            },
      // Both ends are inclusive, as the callable compares them.
      lowerInclusive: request.from?.millisecondsSinceEpoch,
      upperExclusive: switch (request.to) {
        final to? => to.millisecondsSinceEpoch + 1,
        null => null,
      },
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
