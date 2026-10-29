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
Map<String, Object?> deliveryPageResponse({
  EventAssistanceDeliveryQuery? query,
  List<Object?>? rows,
  String? nextCursor,
  int serverTime = 2000,
}) => {
  'context': (query ?? deliveryQuery()).context,
  'serverTime': serverTime,
  'coverage': 'page',
  'deliveries': rows ?? [deliveryRow()],
  'nextCursor': nextCursor,
};
EventAssistanceDeliveriesPage deliveryPage({
  EventAssistanceDeliveryQuery? query,
  List<Object?>? rows,
}) => EventAssistanceDeliveriesPage.fromCallableData(
  deliveryPageResponse(query: query, rows: rows),
  expectedQuery: query ?? deliveryQuery(),
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
