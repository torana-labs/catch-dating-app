import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_roster_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_movement_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_departure_preview_repositories.dart';
import 'package:widgetbook_workspace/event_success/event_departure_use_cases.dart';

void main() {
  testWidgets(
    'departure previews mount actual shared controls without Firebase',
    (tester) async {
      final fixtures = await tester.runAsync(loadDeparturePreviewFixtures);
      expect(fixtures, contains('uiDeparted'));
      for (final preview in [
        assistanceLiveDeparture,
        assistancePracticeDeparture,
        assistanceLiveMovement,
        assistancePracticeMovement,
        assistanceDepartureRoster,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(loadDeparturePreviewFixtures);
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), isNull);
        expect(
          preview == assistanceDepartureRoster
              ? find.byType(EventAssistanceDepartureRosterSection)
              : preview == assistanceLiveDeparture ||
                    preview == assistancePracticeDeparture
              ? find.byType(EventAssistanceDepartureSection)
              : find.byType(EventAssistanceMovementSection),
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
