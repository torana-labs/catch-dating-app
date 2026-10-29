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
                'test/${practice ? 'event_rehearsal' : 'event_success'}/fixtures/delivery_queue.json',
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

EventAssistanceDeliveriesPage deliveryQueuePage(String stage) =>
    EventAssistanceDeliveriesPage.fromCallableData(
      deliveryQueueFixture(stage),
      expectedQuery: deliveryQueueQuery(),
    );
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
