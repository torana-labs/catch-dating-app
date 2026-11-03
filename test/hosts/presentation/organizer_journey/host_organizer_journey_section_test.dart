import 'package:catch_dating_app/contexts/organizers/data/organizer_journey_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_journey/host_organizer_journey_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';

final _waiting = OrganizerJourney(
  organizerId: 'afterfly',
  organizerName: 'Afterfly',
  waitingClaim: true,
  steps: [
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.nominated,
      at: DateTime(2026, 10, 28),
      detail: 'https://luma.com/afterfly',
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.listed,
      at: DateTime(2026, 10, 31),
      detail: null,
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.claimRequested,
      at: DateTime(2026, 11, 2),
      detail: null,
    ),
  ],
  next: OrganizerJourneyNext.runYourPage,
);

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  List<Object> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides.cast(),
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(body: SingleChildScrollView(child: child)),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('a waiting claim says so and shows the steps so far', (
    tester,
  ) async {
    await _pump(tester, HostOrganizerJourneySection(journey: _waiting));
    expect(find.text('Your claim is being checked'), findsOneWidget);
    expect(find.text('Someone nominated Afterfly'), findsOneWidget);
    expect(
      find.text('Catch built a page from luma.com/afterfly'),
      findsOneWidget,
    );
    expect(find.text('You asked to claim it'), findsOneWidget);
    expect(find.text('Run your page'), findsOneWidget);
  });

  testWidgets('a claimed page has no notice', (tester) async {
    await _pump(
      tester,
      const HostOrganizerJourneySection(
        journey: OrganizerJourney(
          organizerId: 'afterfly',
          organizerName: 'Afterfly',
          waitingClaim: false,
          steps: [
            OrganizerJourneyStep(
              kind: OrganizerJourneyStepKind.claimed,
              at: null,
              detail: null,
            ),
            OrganizerJourneyStep(
              kind: OrganizerJourneyStepKind.firstEvent,
              at: null,
              detail: 'Tuesday Trivia',
            ),
          ],
          next: null,
        ),
      ),
    );
    expect(find.text('Your claim is being checked'), findsNothing);
    expect(find.text('You claimed your page'), findsOneWidget);
    expect(find.text('Tuesday Trivia'), findsOneWidget);
    expect(find.text('Run your page'), findsNothing);
  });

  testWidgets('Today shows a page waiting to be claimed', (tester) async {
    await _pump(
      tester,
      const HostWaitingClaimsSection(),
      overrides: [
        organizerJourneysProvider(null).overrideWith((ref) async => [_waiting]),
      ],
    );
    expect(find.text('Your claim is being checked'), findsOneWidget);
  });

  testWidgets('Today shows nothing when there is no claim or the read fails', (
    tester,
  ) async {
    await _pump(
      tester,
      const HostWaitingClaimsSection(),
      overrides: [
        organizerJourneysProvider(
          null,
        ).overrideWith((ref) async => throw StateError('offline')),
      ],
    );
    expect(find.text('Your claim is being checked'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the sheet reads the organizer it was opened for', (
    tester,
  ) async {
    await _pump(
      tester,
      const HostOrganizerJourneySheet(organizerId: 'afterfly'),
      overrides: [
        organizerJourneysProvider(
          'afterfly',
        ).overrideWith((ref) async => [_waiting]),
      ],
    );
    expect(find.text('Someone nominated Afterfly'), findsOneWidget);
  });
}
