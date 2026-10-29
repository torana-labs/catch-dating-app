import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_delivery_queue_fixtures.dart';

void main() {
  test(
    'native clients consume actual live and practice delivery projections',
    () {
      for (final stage in ['initial', 'uncertain', 'delivered', 'replaced']) {
        final page = deliveryQueuePage(stage);
        expect(page.deliveries, hasLength(2));
        expect(page.deliveries.map((r) => r.evidence.displayName).toSet(), {
          stage == 'replaced' ? null : 'Alex Morgan',
        });
      }
      final raw = deliveryQueueFixture('command');
      final id = ((raw['command'] as Map)['payload'] as Map)['deliveryId'];
      final change = EventAssistanceDeliveryChange(
        snapshot:
            deliveryQueuePage(
                  'uncertain',
                ).deliveries.singleWhere((r) => r.scope.messageId == id)
                as AssistanceActionableDelivery,
        actorUid: 'host-1',
        operationId: 'native-handoff',
      );
      final result = EventAssistanceDeliveryResult.fromCallableData(
        deliveryQueueFixture('handedOff'),
        expectedChange: change,
      );
      expect(result.view.status, AssistanceDeliveryStatus.unknown);
      expect(result.view.handling, isA<AssistanceManualDeliveryHandling>());
      for (final stage in ['uncertain', 'handedOff', 'delivered']) {
        final sample = practiceDeliveryQueue(stage);
        expect(
          sample.deliveryReviews!.deliveries.single.evidence.displayName,
          sample.actors.first.displayName,
        );
      }
    },
  );
  test(
    'older omissions remain unknown and stale guests cannot expose names',
    () {
      final raw = deliveryQueueFixture('replaced');
      for (final row in raw['deliveries'] as List) {
        (row as Map).remove('displayName');
      }
      expect(
        EventAssistanceDeliveriesPage.fromCallableData(
          raw,
          expectedQuery: deliveryQueueQuery(),
        ).deliveries.first.evidence.displayName,
        isNull,
      );
      ((raw['deliveries'] as List).first as Map)['displayName'] = 'Old guest';
      expect(
        () => EventAssistanceDeliveriesPage.fromCallableData(
          raw,
          expectedQuery: deliveryQueueQuery(),
        ),
        throwsFormatException,
      );
      final practice = deliveryQueueFixture('uncertain', practice: true);
      (((practice['deliveryReviews'] as Map)['deliveries'] as List).first
              as Map)['displayName'] =
          'Wrong actor';
      expect(
        () => EventRehearsalBootstrap.fromCallableData(practice),
        throwsFormatException,
      );
    },
  );
}
