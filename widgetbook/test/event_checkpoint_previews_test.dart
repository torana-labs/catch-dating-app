import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/event_checkpoint_preview_repositories.dart';
import 'package:widgetbook_workspace/event_success/event_checkpoint_use_cases.dart';
import 'package:widgetbook_workspace/event_success/event_departure_preview_repositories.dart';

void main() {
  testWidgets(
    'checkpoint previews mount the shared real controls without Firebase',
    (tester) async {
      await tester.runAsync(
        () => Future.wait([
          loadCheckpointPreviewFixtures(),
          loadDeparturePreviewFixtures(),
          loadCheckpointRequestPreviewFixtures(),
        ]),
      );
      for (final preview in [
        assistanceLiveCheckpoint,
        assistancePracticeCheckpoint,
        assistanceLiveCheckpointHistory,
        assistancePracticeCheckpointHistory,
        assistanceLiveCheckpointRequest,
        assistancePracticeCheckpointRequest,
        assistancePracticeCheckpointVisit,
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: AppTheme.light,
            home: Builder(builder: preview),
          ),
        );
        await tester.runAsync(
          () => Future.wait([
            loadCheckpointPreviewFixtures(),
            loadDeparturePreviewFixtures(),
            loadCheckpointRequestPreviewFixtures(),
          ]),
        );
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), isNull);
        expect(
          preview == assistancePracticeCheckpointVisit
              ? find.byType(EventAssistanceVisitSection)
              : preview == assistanceLiveCheckpoint ||
                    preview == assistancePracticeCheckpoint
              ? find.byType(EventAssistanceCheckpointSection)
              : preview == assistanceLiveCheckpointRequest ||
                    preview == assistancePracticeCheckpointRequest
              ? find.byType(EventAssistanceCheckpointRequestSection)
              : find.byType(EventAssistanceDepartureHistorySection),
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
