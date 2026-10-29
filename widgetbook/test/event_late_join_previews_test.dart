import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_destination_field.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_rules_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_settings_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_late_join_preview_repository.dart';
import 'package:widgetbook_workspace/event_success/event_late_join_use_cases.dart';

void main() {
  testWidgets(
    'late arrival previews mount actual controls with a local transport',
    (tester) async {
      await tester.runAsync(loadLateJoinPreviewFixture);
      for (final preview in [
        assistanceLateJoinEntry,
        assistanceLateJoinSheet,
        assistanceLateJoinForm,
        assistanceLateJoinRules,
        assistanceLateJoinDestinations,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(loadLateJoinPreviewFixture);
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), isNull);
        expect(
          preview == assistanceLateJoinEntry
              ? find.byType(EventAssistanceLiveSettingsSection)
              : preview == assistanceLateJoinRules
              ? find.byType(EventAssistanceLateJoinRulesSection)
              : preview == assistanceLateJoinDestinations
              ? find.byType(EventAssistanceLateJoinDestinationField)
              : find.byType(EventAssistanceLateJoinSection),
          findsOneWidget,
        );
      }
    },
  );
}
