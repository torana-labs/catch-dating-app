import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_delivery_queue_fixtures.dart';

void main() {
  testWidgets(
    'delivery cursor history ignores repeated and stale navigation taps',
    (tester) async {
      final repository = _Pages();
      final query = deliveryQueueQuery();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventAssistanceDeliveriesRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventAssistanceDeliveryQueueSheet(
                organizerId: query.organizerId,
                eventId: query.eventId,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      EventAssistanceDeliveryQueueSection controls() =>
          tester.widget(find.byType(EventAssistanceDeliveryQueueSection));
      final first = controls();
      expect(first.items.length, 50);
      expect(first.onPrevious, isNull);
      first.onNext!();
      first.onNext!();
      await pumpFeatureUi(tester);
      final second = controls();
      expect(second.items.single.displayName, 'Guest 051');
      expect(second.onNext, isNull);
      second.onPrevious!();
      second.onPrevious!();
      await pumpFeatureUi(tester);
      final back = controls();
      expect(back.items.length, 50);
      expect(back.onPrevious, isNull);
      expect(tester.takeException(), isNull);
    },
  );
}

class _Pages extends Fake implements EventAssistanceDeliveriesRepository {
  final reads = <EventAssistanceDeliveryQuery>[];
  @override
  Future<EventAssistanceDeliveriesPage> fetch(
    EventAssistanceDeliveryQuery query,
  ) async {
    reads.add(query);
    final raw = deliveryQueueFixture('initial');
    final row = (raw['deliveries'] as List).first as Map;
    final first = query.cursor == null;
    raw['deliveries'] = [
      for (var i = first ? 1 : 51; i <= (first ? 50 : 51); i++)
        {
          ...row,
          'messageId': 'outbox:${i.toRadixString(16).padLeft(64, '0')}',
          'displayName': 'Guest ${i.toString().padLeft(3, '0')}',
        },
    ];
    raw['nextCursor'] = first
        ? 'outbox:${50.toRadixString(16).padLeft(64, '0')}'
        : null;
    return EventAssistanceDeliveriesPage.fromCallableData(
      raw,
      expectedQuery: query,
    );
  }
}
