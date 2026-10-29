import 'package:catch_dating_app/event_success/presentation/event_assistance_help_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_help_preview_repositories.dart';
import 'package:widgetbook_workspace/event_success/event_help_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  testWidgets(
    'help previews mount the actual live and practice controls without Firebase',
    (tester) async {
      await tester.runAsync(loadHelpPreviewFixtures);
      for (final preview in [
        assistanceLiveHelpEntry,
        assistancePracticeHelpEntry,
        assistanceLiveHelpQueue,
        assistancePracticeHelpQueue,
        assistanceLiveHelpRequest,
        assistancePracticeHelpRequest,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(loadHelpPreviewFixtures);
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);
        expect(
          preview == assistanceLiveHelpEntry ||
                  preview == assistancePracticeHelpEntry
              ? find.byType(EventAssistanceHelpEntrySection)
              : preview == assistanceLiveHelpQueue ||
                    preview == assistancePracticeHelpQueue
              ? find.byType(EventAssistanceHelpQueueSection)
              : find.byType(EventAssistanceHelpDecisionSection),
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
