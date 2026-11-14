import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';

Map<String, Object?> deliveryQueueFixture(
  String stage, {
  bool practice = false,
}) =>
    (jsonDecode(
              File(
                practice
                    ? 'test/event_rehearsal/fixtures/delivery_queue.json'
                    : 'test/event_success/fixtures/delivery_queue.json',
              ).readAsStringSync(),
            )
            as Map)[stage]
        as Map<String, Object?>;
EventAssistanceDeliveryQuery deliveryQueueQuery({String? cursor}) {
  final context = deliveryQueueFixture('initial')['context']! as Map;
  return EventAssistanceDeliveryQuery(
    organizerId: context['organizerId'] as String,
    eventId: context['eventId'] as String,
    cursor: cursor,
  );
}

/// A fixture stage's views as the data layer hands them over.
List<AssistanceDeliveryViewDocument> deliveryQueueViews(
  Map<String, Object?> stage,
) => [
  for (final raw in stage['views']! as List)
    (
      id: (raw as Map)['id'] as String,
      data: Map<String, Object?>.from(raw['data'] as Map),
      evaluatedAtMillis: (raw['data'] as Map)['evaluatedAt'] as int,
    ),
];

/// The stage read at the moment its newest view was evaluated.
EventAssistanceDeliveriesPage deliveryQueuePage(String stage) =>
    deliveryQueuePageFor(deliveryQueueFixture(stage), deliveryQueueQuery());

/// A fixture stage as the listener for [query] would deliver it, read at the
/// moment its newest view was evaluated.
EventAssistanceDeliveriesPage deliveryQueuePageFor(
  Map<String, Object?> stage,
  EventAssistanceDeliveryQuery query,
) {
  final views = deliveryQueueViews(stage);
  return EventAssistanceDeliveriesPage.fromViews(
    query: query,
    views: views,
    hasMore: false,
    nowMillis: views
        .map((view) => view.evaluatedAtMillis)
        .reduce((a, b) => a > b ? a : b),
  );
}

EventRehearsalBootstrap practiceDeliveryQueue(String stage) =>
    EventRehearsalBootstrap.fromCallableData(
      deliveryQueueFixture(stage, practice: true),
    );

/// Unit transport receipt around the real practice read projection.
Map<String, Object?> practiceDeliveryQueueResult(
  RehearsalAssistanceChange change,
) {
  final raw = deliveryQueueFixture('handedOff', practice: true);
  final session = raw['session']! as Map;
  session['runtimeRevision'] = change.session.runtimeRevision + 1;
  session['actionCount'] = change.session.actionCount + 1;
  raw['actions'] = [
    {
      'clientActionId': change.clientActionId,
      'actorId': change.command.actorId,
      'kind': 'control',
      'name': 'assistance:repairDelivery',
      'runtimeRevision': change.session.runtimeRevision + 1,
      'virtualNowMillis': change.session.virtualNow.millisecondsSinceEpoch,
    },
  ];
  return raw;
}
