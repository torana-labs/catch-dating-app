import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, offer.status:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, row.response.versionId:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, row.response.versionId:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, row.response.versionId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, row.response.versionId:ASCENDING, reviewStatus:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)

/// Ordinary inbox pages contain metadata only. Answer filters and detail reads
/// retain their source-authorized callable path. Offered entries are read
/// only here: the derived offer lives on the summary, not the source. The
/// inbox also filters by an application's review status (only with
/// applications included, as the callable requires) and by submission date.
///
/// A form-scoped page (applications included) reads its entries here too,
/// optionally for one native form version. Its version scope comes from the
/// form's `hostFormSummaries` row and its answer filter options from
/// `hostFormVersionFilters`, as the callable returns them.
class HostResponseSummaryReads {
  const HostResponseSummaryReads(this.reader);
  final HostSummaryReader reader;

  /// Whether the inbox read model can serve [request]: the plain inbox,
  /// offered entries, a form-scoped page with applications (optionally for
  /// one version), a review status (applications included) and a
  /// submission date range, without answer, identity, status, contact or
  /// text filters.
  static bool supports(HostFormResponseListRequest request) {
    final offered = request.offeredOnly;
    final formScoped = request.formId != null && !offered;
    return !((formScoped && !request.includeApplications) ||
        (offered && !request.includeApplications) ||
        (request.reviewStatus != null &&
            (offered || !request.includeApplications)) ||
        (request.versionId != null && !formScoped) ||
        request.contactId != null ||
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
    final formId = offered ? null : request.formId;
    await reader.activatedDirectory(
      request.organizerId,
      'responseSummaryVersion',
    );
    final scope = formId == null
        ? null
        : await _formScope(request.organizerId, formId, request.versionId);
    final page = await reader.page(
      collection: 'hostResponseSummaries',
      organizerId: request.organizerId,
      orderField: 'submittedAtMillis',
      descending: !request.oldestFirst,
      queryKey:
          '${request.includeApplications}/${request.oldestFirst}/'
          '${switch ((offered, formId)) {
            (true, _) => 'offered/${request.formId}',
            (false, final form?) => 'form/$form/${request.versionId}',
            (false, null) => 'all',
          }}/'
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
              'formId': ?formId,
              // Every entry of a native form carries its response, whose
              // version the callable filters by.
              'row.response.versionId': ?request.versionId,
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
      versionScope: scope?.versionScope,
      answerFilterOptions: scope?.answerFilterOptions ?? const [],
    );
  }

  /// A native form's version scope and the answer filter options of the
  /// selected (or else active) version. An imported application form has
  /// no form summary, so neither, as the callable returns.
  Future<_FormScope?> _formScope(
    String organizerId,
    String formId,
    String? versionId,
  ) async {
    await reader.activatedDirectory(organizerId, 'formSummaryVersion');
    final form = await reader.document(
      collection: 'hostFormSummaries',
      organizerId: organizerId,
      id: formId,
    );
    final row = form?['row'];
    if (row is! Map) return null;
    final versionScope = HostFormResponseVersionScope.fromMap(row);
    final filterVersionId = versionId ?? versionScope.activeVersionId;
    final filters = filterVersionId == null
        ? null
        : await reader.document(
            collection: 'hostFormVersionFilters',
            organizerId: organizerId,
            id: filterVersionId,
          );
    if (filters != null && filters['formId'] != formId) {
      throw const FormatException('Form version filters belong elsewhere.');
    }
    return _FormScope(
      versionScope,
      formOperationMapList(
        filters?['answerFilterOptions'] ?? const [],
        'answer filter options',
      ).map(HostFormResponseFilterOption.fromMap).toList(growable: false),
    );
  }
}

class _FormScope {
  const _FormScope(this.versionScope, this.answerFilterOptions);
  final HostFormResponseVersionScope versionScope;
  final List<HostFormResponseFilterOption> answerFilterOptions;
}
