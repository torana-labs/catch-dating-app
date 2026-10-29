import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_delivery_preview_repositories.dart';
import 'package:widgetbook_workspace/event_success/event_delivery_use_cases.dart';

void main() {
  testWidgets(
    'delivery previews mount the actual live and practice controls without Firebase',
    (tester) async {
      await tester.runAsync(loadDeliveryPreviewFixtures);
      for (final preview in [
        assistanceLiveDeliveryEntry,
        assistancePracticeDeliveryEntry,
        assistanceLiveDeliveryQueue,
        assistancePracticeDeliveryQueue,
        assistanceLiveDeliveryRequest,
        assistancePracticeDeliveryRequest,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(loadDeliveryPreviewFixtures);
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), isNull);
        expect(
          preview == assistanceLiveDeliveryEntry ||
                  preview == assistancePracticeDeliveryEntry
              ? find.byType(EventAssistanceDeliveryEntrySection)
              : preview == assistanceLiveDeliveryQueue ||
                    preview == assistancePracticeDeliveryQueue
              ? find.byType(EventAssistanceDeliveryQueueSection)
              : find.byType(EventAssistanceDeliveryDecisionSection),
          findsOneWidget,
          reason: tester
              .widgetList<Text>(find.byType(Text))
              .map((t) => t.data)
              .join(' | '),
        );
      }
    },
  );
}
