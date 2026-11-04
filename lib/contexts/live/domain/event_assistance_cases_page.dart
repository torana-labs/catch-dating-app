import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';

/// Rows a help-request page holds at most; the listener reads one more to
/// know whether a next page exists.
const eventAssistanceCasePageSize = ReadLimitPolicy.hostLiveReviewPage;

/// One `hostEventCaseViews` document as the data layer hands it over: its id
/// and fields, with `evaluatedAt` already converted to milliseconds.
typedef AssistanceCaseViewDocument = ({
  String id,
  Map<String, Object?> data,
  int evaluatedAtMillis,
});

final class EventAssistanceCasesPage {
  const EventAssistanceCasesPage._({
    required this.query,
    required this.serverTime,
    required this.cases,
    required this.nextCursor,
    required this.managerOptions,
  });

  final EventAssistanceCaseQuery query;

  /// When the newest row on the page was evaluated; zero for an empty page.
  final int serverTime;
  final List<AssistanceHostCase> cases;
  final String? nextCursor;
  final AssistanceCaseManagerOptions? managerOptions;

  /// One listener snapshot of an event's case views for one status. Every
  /// row must be complete: a view the server could not evaluate fails the
  /// page rather than hiding a request, as the retired callable did.
  factory EventAssistanceCasesPage.fromViews({
    required EventAssistanceCaseQuery query,
    required List<AssistanceCaseViewDocument> views,
    required bool hasMore,
    required AssistanceCaseManagerOptions? managerOptions,
  }) {
    if (views.length > eventAssistanceCasePageSize) {
      throw const FormatException('Invalid help request page size.');
    }
    var previousId = query.cursor;
    var serverTime = 0;
    final cases = <AssistanceHostCase>[];
    for (final view in views) {
      final data = view.data;
      final id = assistanceId(view.id);
      if (data['caseId'] != id ||
          data['organizerId'] != query.organizerId ||
          data['eventId'] != query.eventId ||
          data['status'] != query.status.name) {
        throw const FormatException('Help request view scope mismatch.');
      }
      if (data['sourceCoverage'] != 'complete' || data['view'] == null) {
        throw const FormatException('A help request could not be read.');
      }
      if (previousId != null && id.compareTo(previousId) <= 0) {
        throw const FormatException('Help request page order is invalid.');
      }
      final row = AssistanceHostCase.fromJson(
        data['view'],
        scope: query.scopeFor(id),
        serverTime: view.evaluatedAtMillis,
      );
      if (row.status != query.status) {
        throw const FormatException(
          'Help request has a different queue status.',
        );
      }
      cases.add(row);
      previousId = id;
      if (view.evaluatedAtMillis > serverTime) {
        serverTime = view.evaluatedAtMillis;
      }
    }
    if (hasMore && cases.length != eventAssistanceCasePageSize) {
      throw const FormatException('Invalid help request continuation.');
    }
    return EventAssistanceCasesPage._(
      query: query,
      serverTime: serverTime,
      cases: List.unmodifiable(cases),
      nextCursor: hasMore ? cases.last.scope.caseId : null,
      managerOptions: managerOptions,
    );
  }

  EventAssistanceCaseQuery? get nextQuery => nextCursor == null
      ? null
      : EventAssistanceCaseQuery(
          organizerId: query.organizerId,
          eventId: query.eventId,
          status: query.status,
          cursor: nextCursor,
        );
}
