import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

final class EventAssistanceCasesPage {
  const EventAssistanceCasesPage._({
    required this.query,
    required this.serverTime,
    required this.cases,
    required this.nextCursor,
    required this.managerOptions,
  });

  final EventAssistanceCaseQuery query;
  final int serverTime;
  final List<AssistanceHostCase> cases;
  final String? nextCursor;
  final AssistanceCaseManagerOptions? managerOptions;

  factory EventAssistanceCasesPage.fromCallableData(
    Object? value, {
    required EventAssistanceCaseQuery expectedQuery,
  }) {
    final map = assistanceObject(value, {
      'context',
      'serverTime',
      'coverage',
      'status',
      'cases',
      'nextCursor',
      if (assistanceObject(value).containsKey('managerOptions'))
        'managerOptions',
    });
    validateAssistanceCaseContext(
      map['context'],
      organizerId: expectedQuery.organizerId,
      eventId: expectedQuery.eventId,
    );
    if (map['coverage'] != 'page' ||
        map['status'] != expectedQuery.status.name) {
      throw const FormatException('Help request page scope mismatch.');
    }
    final serverTime = assistanceInteger(map['serverTime']);
    final rawRows = map['cases'];
    if (rawRows is! List || rawRows.length > 50) {
      throw const FormatException('Invalid help request page size.');
    }
    var previousId = expectedQuery.cursor;
    final cases = <AssistanceHostCase>[];
    for (final raw in rawRows) {
      final map = assistanceObject(raw);
      final id = assistanceId(map['caseId']);
      if (previousId != null && id.compareTo(previousId) <= 0) {
        throw const FormatException('Help request page order is invalid.');
      }
      final row = AssistanceHostCase.fromJson(
        map,
        scope: expectedQuery.scopeFor(id),
        serverTime: serverTime,
      );
      if (row.status != expectedQuery.status) {
        throw const FormatException(
          'Help request has a different queue status.',
        );
      }
      cases.add(row);
      previousId = id;
    }
    final nextCursor = map['nextCursor'] == null
        ? null
        : assistanceId(map['nextCursor']);
    if (nextCursor != null &&
        (cases.length != 50 || nextCursor != cases.last.scope.caseId)) {
      throw const FormatException('Invalid help request continuation.');
    }
    return EventAssistanceCasesPage._(
      query: expectedQuery,
      serverTime: serverTime,
      cases: List.unmodifiable(cases),
      nextCursor: nextCursor,
      managerOptions: map['managerOptions'] == null
          ? null
          : AssistanceCaseManagerOptions.fromJson(map['managerOptions']),
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
