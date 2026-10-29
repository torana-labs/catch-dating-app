import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';

EventAssistanceCaseQuery caseQuery({
  String organizerId = 'organizer-1',
  String eventId = 'event-1',
  AssistanceCaseStatus status = AssistanceCaseStatus.open,
  String? cursor,
}) => EventAssistanceCaseQuery(
  organizerId: organizerId,
  eventId: eventId,
  status: status,
  cursor: cursor,
);

Map<String, Object?> caseRow({
  String caseId = 'case:one',
  int revision = 0,
  String availability = 'current',
  String status = 'open',
}) => {
  'caseId': caseId,
  'revision': availability == 'legacy' ? null : revision,
  'sourceHash': 'a' * 64,
  'availability': availability,
  'attendeeId': availability == 'current' ? 'attendee-1' : null,
  'category': 'eventLogistics',
  'receivedAt': 1000,
  'status': status,
  'resolution': null,
  'canChange': availability == 'current' && status == 'open',
  'assignment': {
    'kind': availability == 'current' ? 'unassigned' : 'unavailable',
  },
};

Map<String, Object?> casesPageResponse({
  EventAssistanceCaseQuery? query,
  List<Object?>? rows,
  String? nextCursor,
  int serverTime = 2000,
  String? managerActor,
}) {
  final scope = query ?? caseQuery();
  return {
    'context': scope.context,
    'serverTime': serverTime,
    'coverage': 'page',
    'status': scope.status.name,
    'cases': rows ?? [caseRow()],
    'nextCursor': nextCursor,
    if (managerActor != null)
      'managerOptions': {
        'actorUid': managerActor,
        'managers': [
          {'uid': 'host-1', 'displayName': 'Sam'},
          {'uid': 'host-2', 'displayName': 'Priya'},
        ],
      },
  };
}

EventAssistanceCasesPage casesPage({
  String? managerActor,
  EventAssistanceCaseQuery? query,
  List<Object?>? rows,
}) => EventAssistanceCasesPage.fromCallableData(
  casesPageResponse(query: query, rows: rows, managerActor: managerActor),
  expectedQuery: query ?? caseQuery(),
);

EventAssistanceCaseChange caseChange({
  AssistanceCaseDecision decision = const AssistanceCaseDecision.resolve(),
  String actorUid = 'host-1',
}) => EventAssistanceCaseChange(
  snapshot: casesPage().cases.single as AssistanceOpenHostCase,
  actorUid: actorUid,
  operationId: 'case-action:fixture',
  decision: decision,
);

Map<String, Object?> caseResultResponse(
  EventAssistanceCaseChange change, {
  String outcome = 'applied',
  Map<String, Object?>? rowPatch,
  int serverTime = 3000,
}) {
  final transfer = change.decision is AssistanceCaseTransfer;
  final target = transfer
      ? (change.decision as AssistanceCaseTransfer).managerUid
      : null;
  final revision = change.snapshot.revision + 1;
  final row = {
    ...caseRow(caseId: change.snapshot.scope.caseId, revision: revision),
    'sourceHash': 'b' * 64,
    'status': transfer ? 'open' : 'resolved',
    'canChange': transfer,
    'resolution': transfer
        ? null
        : {
            'outcome': change.decision is AssistanceCaseDecline
                ? 'declined'
                : 'resolved',
            'actorUid': change.actorUid,
            'at': serverTime,
          },
    'assignment': transfer
        ? {'kind': 'assigned', 'uid': target, 'authority': 'current'}
        : {'kind': 'unassigned'},
    ...?rowPatch,
  };
  return {
    'context': change.snapshot.scope.context,
    'serverTime': serverTime,
    'outcome': outcome,
    'operationRevision': revision,
    'view': row,
  };
}

EventAssistanceCaseResult caseResult(
  EventAssistanceCaseChange change, {
  String outcome = 'applied',
  Map<String, Object?>? rowPatch,
}) => EventAssistanceCaseResult.fromCallableData(
  caseResultResponse(change, outcome: outcome, rowPatch: rowPatch),
  expectedChange: change,
);
