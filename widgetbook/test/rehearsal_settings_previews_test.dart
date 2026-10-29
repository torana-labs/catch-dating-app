import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_preview_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_sheet.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_rehearsal/rehearsal_settings_use_cases.dart';

void main() {
  testWidgets('practice previews mount actual controls', (tester) async {
    await tester.runAsync(loadRehearsalSettingsPreviewFixture);
    for (final item in [
      (rehearsalSettingsEntry, EventRehearsalSettingsSection),
      (rehearsalSettingsSheet, EventRehearsalSettingsSheet),
      (rehearsalRuntimeSection, EventRehearsalRuntimeSection),
      (rehearsalRuntimeFields, EventRehearsalRuntimePreviewSection),
    ]) {
      await tester.pumpWidget(
        MaterialApp(
          key: UniqueKey(),
          theme: AppTheme.light,
          home: Builder(builder: item.$1),
        ),
      );
      await tester.runAsync(loadRehearsalSettingsPreviewFixture);
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(tester.takeException(), isNull);
      expect(find.byType(item.$2), findsOneWidget);
    }
  });
}
