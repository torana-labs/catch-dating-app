import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_host_setup_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  testWidgets(
    'late arrival settings remain available when event format setup is locked',
    (tester) async {
      for (final state in ['editable', 'bookings', 'started']) {
        final now = DateTime(2026, 9, 15, 12);
        final event = buildEvent(
          id: 'settings-runtime',
          startTime: now.add(const Duration(days: 7)),
          bookedCount: state == 'bookings' ? 5 : 0,
        );
        final plan = EventSuccessPlan.defaultForEvent(event, now: now);
        await tester.pumpWidget(
          MaterialApp(
            key: ValueKey(state),
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: EventSuccessHostSetupPageBody(
                event: event,
                plan: plan,
                planIsPersisted: true,
                organizerLayoutsState: const CatchAsyncState.data([]),
                layoutSavePending: false,
                layoutSaveError: null,
                onSaveLayout: null,
                actionState: const EventSuccessSetupActionState(),
                onSaveSetup: null,
                embedded: false,
                referenceNow: state == 'started'
                    ? event.startTime.add(const Duration(minutes: 1))
                    : now,
                assistanceSettingsSection: const Text(
                  'Late arrival settings slot',
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.scrollUntilVisible(
          find.text('Late arrival settings slot'),
          500,
          scrollable: find.byWidgetPredicate(
            (widget) =>
                widget is Scrollable &&
                widget.physics is AlwaysScrollableScrollPhysics,
            description: 'the event success setup scrollable',
          ),
        );
        expect(
          find.text('Late arrival settings slot'),
          findsOneWidget,
          reason: state,
        );
        expect(tester.takeException(), isNull, reason: state);
      }
    },
  );
}
