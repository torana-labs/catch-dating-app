import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_delivery_queue_fixtures.dart';
import 'event_assistance_delivery_widget_fixtures.dart';

void main() {
  testWidgets(
    'new source redaction and access loss override a frozen delivery review',
    (tester) async {
      final repository = DeliveryUiLive();
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
              body: EventAssistanceDeliverySheet(
                scope: deliveryQueuePage('uncertain').deliveries
                    .firstWhere((r) => r.status.name == 'unknown')
                    .scope,
                query: query,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(EventAssistanceDeliverySheet)),
        listen: false,
      );
      Future<void> tap(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.tap(finder);
        await pumpFeatureUi(tester);
      }

      await tap(find.byKey(const ValueKey('delivery.takeOver')));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Alex Morgan'), findsOneWidget);
      repository.stage = 'replaced';
      container
          .read(eventAssistanceDeliveriesProvider(query).notifier)
          .reload();
      await pumpFeatureUi(tester);
      expect(find.text('Alex Morgan'), findsNothing);
      expect(find.text('Guest details unavailable'), findsOneWidget);
      expect(find.text('Confirm this handoff'), findsOneWidget);
      repository.readError = const PermissionException('Access removed.');
      container
          .read(eventAssistanceDeliveriesProvider(query).notifier)
          .reload();
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceDeliveryDecisionSection), findsNothing);
      expect(find.text('Alex Morgan'), findsNothing);
      expect(repository.writes.length, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
