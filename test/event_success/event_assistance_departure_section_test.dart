import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_draft.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_departure_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final record in [false, true]) {
    testWidgets(
      'omitted and explicitly empty rosters stay different: record=$record',
      (tester) async {
        EventAssistanceDepartureDraft? saved;
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: CatchSheet(
                title: 'Departure',
                mode: CatchSheetMode.scrollable,
                child: EventAssistanceDepartureSection(
                  reviewIdentity: Object(),
                  destinations: const [
                    (target: departureStop, label: 'Next stop', detail: ''),
                    (
                      target: departureMeeting,
                      label: 'Meeting point',
                      detail: '',
                    ),
                  ],
                  guests: const [],
                  canConfirm: true,
                  actorUid: 'host-1',
                  serverTime: departureNow,
                  checkpointUntil: departureNow + 7200000,
                  phase: EventAssistanceDeparturePhase.ready,
                  onConfirm: (draft) => saved = draft,
                  onRetry: () {},
                  onReload: () {},
                  onDone: () {},
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        Future<void> tap(Finder finder) async {
          await tester.ensureVisible(finder);
          await tester.tap(finder);
          await pumpFeatureUi(tester);
        }

        expect(find.text('Request a checkpoint report'), findsNothing);
        await tap(find.text('Where are you heading?'));
        await tap(find.text('Next stop'));
        if (record) {
          await tap(find.byKey(const ValueKey('departure.recordRoster')));
          expect(
            find.text('An empty selection records that nobody left with you.'),
            findsOneWidget,
          );
          await tap(find.byKey(const ValueKey('departure.requestCheckpoint')));
        }
        expect(saved, isNull);
        await tap(find.text('Confirm departure'));
        expect(saved!.roster?.attendeeIds, record ? isEmpty : isNull);
        expect(saved!.checkpoint != null, record);
        // Moving back to a fixed location clears the dependent checkpoint choice.
        await tap(find.text('Where are you heading?'));
        await tap(find.text('Meeting point'));
        expect(find.text('Request a checkpoint report'), findsNothing);
        await tap(find.text('Confirm departure'));
        expect(saved!.destination, departureMeeting);
        expect(saved!.checkpoint, isNull);
        expect(saved!.roster?.attendeeIds, record ? isEmpty : isNull);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
