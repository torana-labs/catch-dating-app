import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';

String deliveryId([int number = 1]) =>
    'outbox:${number.toRadixString(16).padLeft(64, '0')}';
EventAssistanceDeliveryQuery deliveryQuery({
  String organizerId = 'organizer-1',
  String eventId = 'event-1',
  String? cursor,
}) => EventAssistanceDeliveryQuery(
  organizerId: organizerId,
  eventId: eventId,
  cursor: cursor,
);
Map<String, Object?> deliveryRow({
  String? messageId,
  Map<String, Object?>? patch,
}) => {
  'messageId': messageId ?? deliveryId(),
  'revision': 0,
  'reviewHash': 'a' * 64,
  'createdAt': 1000,
  'expiresAt': 10000,
  'lifecycle': 'active',
  'deliveryStatus': 'notSubmitted',
  'purpose': 'joiningUpdate',
  'attempts': [],
  'coordination': {
    'kind': 'tracked',
    'phase': 'queued',
    'reason': null,
    'dueAt': 1000,
  },
  'handling': {'kind': 'automatic'},
  'availability': 'current',
  'attendeeId': 'attendee-1',
  'actions': ['manualHandoff'],
  ...?patch,
};

/// One `hostEventDeliveryViews` document holding [row], as the data layer
/// hands it to the page. A row offering a handoff keeps it until its expiry
/// unless [relevantUntil] says otherwise.
AssistanceDeliveryViewDocument deliveryView(
  Map<String, Object?> row, {
  EventAssistanceDeliveryQuery? query,
  int evaluatedAt = 2000,
  int? relevantUntil,
  String sourceCoverage = 'complete',
}) {
  final scope = query ?? deliveryQuery();
  final actions = row['actions'];
  return (
    id: row['messageId']! as String,
    data: {
      'schemaVersion': 1,
      'messageId': row['messageId'],
      'eventId': scope.eventId,
      'organizerId': scope.organizerId,
      'createdAt': row['createdAt'],
      'lifecycle': row['lifecycle'],
      'revision': 1,
      'sourceCoverage': sourceCoverage,
      'incompleteSource': sourceCoverage == 'complete'
          ? null
          : 'eventAssistanceMessages',
      'relevantUntilMillis': actions is List && actions.isNotEmpty
          ? relevantUntil ?? row['expiresAt']
          : null,
      'view': row,
    },
    evaluatedAtMillis: evaluatedAt,
  );
}

EventAssistanceDeliveriesPage deliveryPage({
  EventAssistanceDeliveryQuery? query,
  List<Map<String, Object?>>? rows,
  bool hasMore = false,
  int nowMillis = 2000,
}) => EventAssistanceDeliveriesPage.fromViews(
  query: query ?? deliveryQuery(),
  views: [
    for (final row in rows ?? [deliveryRow()]) deliveryView(row, query: query),
  ],
  hasMore: hasMore,
  nowMillis: nowMillis,
);
EventAssistanceDeliveryChange deliveryChange({Map<String, Object?>? patch}) =>
    EventAssistanceDeliveryChange(
      snapshot:
          deliveryPage(rows: [deliveryRow(patch: patch)]).deliveries.single
              as AssistanceActionableDelivery,
      actorUid: 'host-1',
      operationId: 'handoff:fixture',
    );

Map<String, Object?> deliveryResultResponse(
  EventAssistanceDeliveryChange change, {
  String outcome = 'applied',
  Map<String, Object?>? rowPatch,
  int serverTime = 3000,
}) {
  final snapshot = change.snapshot;
  final coordination = switch (snapshot.coordination) {
    AssistanceDeliveryUntracked() => {'kind': 'untracked'},
    AssistanceDeliveryQueued(:final dueAt) => {
      'kind': 'tracked',
      'phase': 'queued',
      'reason': null,
      'dueAt': dueAt,
    },
    AssistanceDeliveryAwaitingReceipt(:final dueAt) => {
      'kind': 'tracked',
      'phase': 'receipt',
      'reason': 'providerPending',
      'dueAt': dueAt,
    },
    AssistanceDeliveryRetrying(:final reason, :final dueAt) => {
      'kind': 'tracked',
      'phase': 'retry',
      'reason': reason.name,
      'dueAt': dueAt,
    },
    AssistanceDeliveryNeedsReview(:final reason, :final dueAt) => {
      'kind': 'tracked',
      'phase': 'review',
      'reason': reason.name,
      'dueAt': dueAt,
    },
    AssistanceDeliveryComplete(:final reason) => {
      'kind': 'tracked',
      'phase': 'complete',
      'reason': reason.name,
      'dueAt': null,
    },
  };
  return {
    'context': snapshot.scope.context,
    'serverTime': serverTime,
    'outcome': outcome,
    'operationRevision': snapshot.revision + 1,
    'view': deliveryRow(
      messageId: snapshot.scope.messageId,
      patch: {
        'revision': snapshot.revision + 1,
        'reviewHash': 'b' * 64,
        'createdAt': snapshot.createdAt,
        'expiresAt': snapshot.expiresAt,
        'purpose': snapshot.purpose.name,
        'lifecycle': snapshot.lifecycle.name,
        'deliveryStatus': snapshot.status.name,
        'actions': [],
        'attendeeId': snapshot.guestScope.attendeeId,
        'attempts': snapshot.attempts
            .map(
              (a) => {
                'channel': a.channel.name,
                'state': a.state.name,
                'at': a.at,
              },
            )
            .toList(),
        'coordination': coordination,
        'handling': {
          'kind': 'manual',
          'actorUid': change.actorUid,
          'at': serverTime,
          'authority': 'current',
        },
        ...?rowPatch,
      },
    ),
  };
}

EventAssistanceDeliveryResult deliveryResult(
  EventAssistanceDeliveryChange change, {
  String outcome = 'applied',
  Map<String, Object?>? rowPatch,
}) => EventAssistanceDeliveryResult.fromCallableData(
  deliveryResultResponse(change, outcome: outcome, rowPatch: rowPatch),
  expectedChange: change,
);
