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
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, row.response.status:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)

/// The first rows of one live response request, and whether more follow.
class HostFormResponseWindow {
  const HostFormResponseWindow({required this.page, required this.hasMore});

  /// The rows listened to, with the form page's version scope and answer
  /// filter options. Its cursor is always null: more rows mean a larger
  /// window.
  final HostFormResponsePage page;
  final bool hasMore;
}

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
///
/// One form's answers in one response status, newest first (responses
/// only), read here as well, by the entry's `row.response.status`: the form
/// builder's latest submitted answer.
class HostResponseSummaryReads {
  const HostResponseSummaryReads(this.reader);
  final HostSummaryReader reader;
  static const marker = 'responseSummaryVersion';

  /// Whether the inbox read model can serve [request]: the plain inbox,
  /// offered entries, a form-scoped page with applications (optionally for
  /// one version), a review status (applications included), one form's
  /// answers in one response status (responses only, newest first) and a
  /// submission date range, without answer, identity, contact or text
  /// filters.
  static bool supports(HostFormResponseListRequest request) {
    final offered = request.offeredOnly;
    final formScoped = request.formId != null && !offered;
    if (request.statuses.isNotEmpty) {
      if (request.statuses.length != 1 ||
          !formScoped ||
          request.includeApplications ||
          request.versionId != null ||
          request.reviewStatus != null ||
          request.oldestFirst) {
        return false;
      }
    } else if (formScoped && !request.includeApplications) {
      return false;
    }
    return !((offered && !request.includeApplications) ||
        (request.reviewStatus != null &&
            (offered || !request.includeApplications)) ||
        (request.versionId != null && !formScoped) ||
        request.contactId != null ||
        request.identityKinds.isNotEmpty ||
        request.sourceLinkId != null ||
        request.answerFilters.isNotEmpty ||
        (request.query?.trim().isNotEmpty ?? false));
  }

  /// One page of a request [supports] accepts.
  Future<HostFormResponsePage> list(HostFormResponseListRequest request) async {
    final spec = _ResponseQuerySpec(request);
    await reader.activatedDirectory(request.organizerId, marker);
    final scope = await _scopeFor(request, spec);
    final page = await reader.page(
      collection: 'hostResponseSummaries',
      organizerId: request.organizerId,
      orderField: 'submittedAtMillis',
      descending: !request.oldestFirst,
      queryKey: spec.queryKey,
      limit: request.limit,
      equalities: spec.equalities,
      lowerInclusive: spec.lowerInclusive,
      upperExclusive: spec.upperExclusive,
      cursor: request.cursor,
    );
    return _page(request, page.documents, page.nextCursor, scope);
  }

  /// The first [limit] rows of a request [supports] accepts while it is
  /// listened to: an answer submitted, reviewed or offered elsewhere shows
  /// at once. The form page's version scope and filter options are read
  /// once, when the window opens.
  Stream<HostFormResponseWindow> watchWindow(
    HostFormResponseListRequest request, {
    required int limit,
  }) {
    final spec = _ResponseQuerySpec(request);
    return Stream.fromFuture(_scopeFor(request, spec)).asyncExpand(
      (scope) => reader
          .watchWindow(
            collection: 'hostResponseSummaries',
            organizerId: request.organizerId,
            orderField: 'submittedAtMillis',
            descending: !request.oldestFirst,
            limit: limit,
            marker: marker,
            equalities: spec.equalities,
            lowerInclusive: spec.lowerInclusive,
            upperExclusive: spec.upperExclusive,
          )
          .map(
            (window) => HostFormResponseWindow(
              page: _page(request, window.documents, null, scope),
              hasMore: window.hasMore,
            ),
          ),
    );
  }

  Future<_FormScope?> _scopeFor(
    HostFormResponseListRequest request,
    _ResponseQuerySpec spec,
  ) async {
    final formId = spec.formPageId;
    return formId == null
        ? null
        : _formScope(request.organizerId, formId, request.versionId);
  }

  static HostFormResponsePage _page(
    HostFormResponseListRequest request,
    List<Map<String, dynamic>> documents,
    String? nextCursor,
    _FormScope? scope,
  ) {
    final entries = documents
        .map(HostFormInboxEntry.fromSummary)
        .toList(growable: false);
    return HostFormResponsePage(
      organizerId: request.organizerId,
      items: entries.map((entry) => entry.response).nonNulls.toList(),
      entries: request.includeApplications ? entries : null,
      nextCursor: nextCursor,
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

/// How one supported request reads `hostResponseSummaries`.
class _ResponseQuerySpec {
  factory _ResponseQuerySpec(HostFormResponseListRequest request) {
    if (!HostResponseSummaryReads.supports(request)) {
      throw ArgumentError('The response inbox cannot serve these filters.');
    }
    final offered = request.offeredOnly;
    final formId = offered ? null : request.formId;
    final status = request.statuses.firstOrNull;
    return _ResponseQuerySpec._(
      formPageId: request.includeApplications ? formId : null,
      queryKey:
          '${request.includeApplications}/${request.oldestFirst}/'
          '${switch ((offered, formId)) {
            (true, _) => 'offered/${request.formId}',
            (false, final form?) => 'form/$form/${request.versionId}',
            (false, null) => 'all',
          }}/'
          '${request.reviewStatus?.name}/${status?.name}/'
          '${request.from?.millisecondsSinceEpoch}/'
          '${request.to?.millisecondsSinceEpoch}',
      equalities: offered
          ? {
              'formId': ?request.formId,
              'offer.status': HostFormEntryOfferStatus.offered.name,
            }
          : status != null
          // Only a response entry has a response status, so this reads
          // responses only, as the callable does without applications.
          ? {'formId': ?formId, 'row.response.status': status.name}
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
    );
  }

  const _ResponseQuerySpec._({
    required this.formPageId,
    required this.queryKey,
    required this.equalities,
    required this.lowerInclusive,
    required this.upperExclusive,
  });

  /// The form whose page this is (applications included), which carries a
  /// version scope and answer filter options; null otherwise.
  final String? formPageId;
  final String queryKey;
  final Map<String, Object> equalities;
  final int? lowerInclusive;
  final int? upperExclusive;
}
