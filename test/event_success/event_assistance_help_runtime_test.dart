import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  testWidgets(
    'help and delivery review survive every report availability state after the event',
    (tester) async {
      final event = buildEvent(id: 'help-after-event');
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [EventSuccessModuleCatalog.hostAnalytics.id],
          );
      const scorecard = EventSuccessScorecard(
        bookedCount: 0,
        checkedInCount: 0,
        attendeesWhoMetTwoPlusPeople: 0,
        mutualMatchCount: 0,
        chatStartedCount: 0,
        averageWelcomeRating: 0,
        averageStructureRating: 0,
        safetyIncidentCount: 0,
      );
      for (final state in ['unsaved', 'disabled', 'waiting', 'ready']) {
        await tester.pumpWidget(
          MaterialApp(
            key: ValueKey(state),
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: EventSuccessHostReportPageBody(
                event: event,
                plan: state == 'disabled'
                    ? plan.copyWith(selectedModuleIds: const [])
                    : plan,
                planIsPersisted: state != 'unsaved',
                scorecard: state == 'ready' ? scorecard : null,
                helpSection: const Text('Pending guest help entry'),
                deliverySection: const Text('Message delivery entry'),
                resourceFailures: const [],
                onRetryResource: null,
                embedded: false,
              ),
            ),
          ),
        );
        await tester.pump();
        expect(
          find.text('Pending guest help entry'),
          findsOneWidget,
          reason: state,
        );
        expect(
          find.text('Message delivery entry'),
          findsOneWidget,
          reason: state,
        );
        expect(tester.takeException(), isNull, reason: state);
      }
    },
  );
}
