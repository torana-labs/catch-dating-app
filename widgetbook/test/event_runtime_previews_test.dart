import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_channels_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_limits_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_runtime_use_cases.dart';

void main() {
  testWidgets(
    'automation previews mount the actual reviewed configuration controls',
    (tester) async {
      await tester.runAsync(loadRuntimePreviewFixture);
      for (final preview in [
        assistanceRuntimeSheet,
        assistanceRuntimeForm,
        assistanceRuntimeChannels,
        assistanceRuntimeLimits,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(loadRuntimePreviewFixture);
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), isNull);
        expect(
          preview == assistanceRuntimeChannels
              ? find.byType(EventAssistanceRuntimeChannelsSection)
              : preview == assistanceRuntimeLimits
              ? find.byType(EventAssistanceRuntimeLimitsSection)
              : find.byType(EventAssistanceRuntimeSection),
          findsOneWidget,
        );
      }
    },
  );
}
