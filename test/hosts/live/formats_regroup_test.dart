import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'formats/formats_fixtures.dart';

Future<void> _pump(WidgetTester tester, Widget body) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(body: body),
      ),
    ),
  );
  await tester.pump();
}

EventSuccessPreference _optOut(String uid) => EventSuccessPreference(
  id: 'pref-$uid',
  eventId: mixEvent.id,
  organizerId: mixEvent.organizerId,
  uid: uid,
  microPodsOptedOut: true,
  guidedRotationsOptedOut: false,
  createdAt: formatsQuizNight,
  updatedAt: formatsQuizNight,
);

void main() {
  setUpAll(loadCatchTestFonts);

  test('guests who opted out of tables cannot be moved', () {
    final state = hostFormatsMixState(
      event: mixEvent,
      plan: mixPlan(),
      assignments: mixAssignments(),
      attendees: formatsAttendees(mixEvent, names: mixNames),
      preferences: [_optOut(formatsUid(0))],
    );

    expect(state.editable, hasLength(mixNames.length - 1));
    expect(
      state.editable.map((assignment) => assignment.uid),
      isNot(contains(formatsUid(0))),
    );
  });

  testWidgets('the mix board edits tables and shows the compatibility pack', (
    tester,
  ) async {
    var edits = 0;
    final running = hostFormatsMixState(
      event: mixEvent,
      plan: mixPlan(),
      assignments: mixAssignments(),
      attendees: formatsAttendees(mixEvent, names: mixNames),
    );
    await _pump(
      tester,
      HostFormatsMixBody(
        state: HostFormatsMixState(
          status: running.status,
          plan: running.plan,
          tables: running.tables,
          editable: running.editable,
          compatibility: true,
        ),
        onShuffle: () {},
        onOpeners: (_) {},
        onRetry: () {},
        onEditTables: () => edits++,
      ),
    );

    await tester.tap(find.text('Edit groups'));
    expect(edits, 1);
    expect(find.byType(EventSuccessCompatibilitySection), findsOneWidget);
  });

  testWidgets('without tables there is nothing to edit', (tester) async {
    await _pump(
      tester,
      HostFormatsMixBody(
        state: const HostFormatsMixState(status: HostFormatsMixStatus.running),
        onShuffle: () {},
        onOpeners: (_) {},
        onRetry: () {},
        onEditTables: () {},
      ),
    );

    expect(find.byKey(const ValueKey('formats-mix-edit-tables')), findsNothing);
    expect(find.byType(EventSuccessCompatibilitySection), findsNothing);
  });

  testWidgets('the courts board edits rotations', (tester) async {
    var edits = 0;
    await _pump(
      tester,
      HostFormatsCourtsBody(
        state: hostFormatsCourtsState(
          plan: courtsPlan(),
          assignments: courtsAssignments(),
          drafts: const [],
          attendees: formatsAttendees(courtsEvent),
        ),
        now: hostFormatsCourtsNowForTest,
        onRotate: () {},
        onSetUp: () {},
        onRetry: () {},
        onEditRotations: () => edits++,
      ),
    );

    await tester.tap(find.text('Edit rotations'));
    expect(edits, 1);
  });
}

/// Partway into round four.
DateTime get hostFormatsCourtsNowForTest =>
    formatsMorning.add(const Duration(minutes: 38, seconds: 20));
