import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_mix_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_state.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_rule_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'formats_captures.dart';
import 'formats_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget body, {
  Size size = const Size(390, 2400),
  CatchThemeMode theme = CatchThemeMode.night,
  Widget? overlay,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: theme,
        child: CatchScreen(
          bodyScrolls: size.width < 1024,
          body: body,
          overlay: overlay,
        ),
      ),
    ),
  );
  await tester.pump();
}

HostFormatsCourtsState _courts({int round = 3}) => hostFormatsCourtsState(
  plan: courtsPlan(round: round),
  assignments: courtsAssignments(),
  drafts: const [],
  attendees: formatsAttendees(courtsEvent),
);

void main() {
  group('court board', () {
    testWidgets('shows the round, the courts, who sits out and Rotate now', (
      tester,
    ) async {
      var rotated = 0;
      await _pump(
        tester,
        HostFormatsCourtsBody(
          state: _courts(),
          now: hostFormatsCourtsNow,
          onRotate: () => rotated++,
          onSetUp: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('Round 4 of 8'), findsOneWidget);
      expect(find.text('Rotate in 9:40'), findsOneWidget);
      expect(find.text('Court 1'), findsOneWidget);
      expect(find.text('Court 4'), findsOneWidget);
      expect(find.text('Sitting out'), findsOneWidget);
      expect(find.text('2 this round'), findsOneWidget);
      expect(find.text('Fair so far'), findsOneWidget);
      expect(find.text('Pause'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('formats-courts-rotate')));
      expect(rotated, 1);
    });

    testWidgets('doubles courts read one partnership against the other', (
      tester,
    ) async {
      await _pump(
        tester,
        HostFormatsCourtsBody(
          state: hostFormatsCourtsState(
            plan: courtsPlan(round: 1),
            assignments: doublesCourtsAssignments(),
            drafts: const [],
            attendees: formatsAttendees(courtsEvent),
          ),
          now: hostFormatsCourtsNow,
          onRotate: () {},
          onSetUp: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('against'), findsNWidgets(2));
      expect(find.textContaining('min on court ·'), findsNWidgets(2));
      expect(find.text('most court time apart'), findsOneWidget);
    });

    testWidgets('on a tablet the courts sit two by two beside Coming up', (
      tester,
    ) async {
      await _pump(
        tester,
        HostFormatsCourtsBody(
          state: _courts(),
          now: hostFormatsCourtsNow,
          onRotate: () {},
          onSetUp: () {},
          onRetry: () {},
        ),
        size: hostFormatsTabletSize,
      );
      expect(find.text('Round 4 of 8 · rotate in 9:40'), findsOneWidget);
      expect(find.text('Coming up'), findsOneWidget);
      expect(find.text('Court 3'), findsOneWidget);
    });

    testWidgets('on the last round Rotate now is off', (tester) async {
      var rotated = 0;
      await _pump(
        tester,
        HostFormatsCourtsBody(
          state: _courts(round: 7),
          now: formatsMorning.add(const Duration(minutes: 90)),
          onRotate: () => rotated++,
          onSetUp: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('Last round'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('formats-courts-rotate')));
      expect(rotated, 0);
    });

    testWidgets('with no rotations it offers the setup', (tester) async {
      var setUp = 0;
      await _pump(
        tester,
        HostFormatsCourtsBody(
          state: const HostFormatsCourtsState(
            status: HostFormatsCourtsStatus.noRotations,
          ),
          now: formatsMorning,
          onRotate: () {},
          onSetUp: () => setUp++,
          onRetry: () {},
        ),
      );
      await tester.tap(find.text('Set up'));
      expect(setUp, 1);
    });
  });

  testWidgets('court setup steps the courts and picks the aim', (tester) async {
    final state = hostFormatsCourtsSetupState(
      plan: courtsPlan(),
      eventMinutes: 120,
      players: 22,
      assignments: courtsAssignments(),
    );
    final drafts = <HostFormatsCourtsDraft>[];
    var rules = 0;
    await _pump(
      tester,
      HostFormatsCourtsSetupBody(
        state: state,
        draft: state.saved,
        onDraft: drafts.add,
        onRules: () => rules++,
        onRetry: () {},
      ),
      theme: CatchThemeMode.day,
    );
    expect(find.text('Keep pairs together'), findsNothing);
    await tester.tap(
      find
          .descendant(
            of: find.byKey(const ValueKey('formats-setup-courts')),
            matching: find.byType(CatchStepperRepeatButton),
          )
          .last,
    );
    await tester.pump();
    expect(drafts.last.courts, 5);
    await tester.tap(
      find.byKey(const ValueKey('formats-setup-aim-closeGames')),
    );
    expect(drafts.last.aim, HostFormatsCourtsAim.closeGames);
    await tester.tap(find.byKey(const ValueKey('formats-setup-rules')));
    expect(rules, 1);
  });

  testWidgets('court setup previews court time before rotations are made', (
    tester,
  ) async {
    final state = hostFormatsCourtsSetupState(
      plan: courtsPlan(),
      eventMinutes: 120,
      players: 40,
      assignments: const [],
    );
    await _pump(
      tester,
      HostFormatsCourtsSetupBody(
        state: state,
        draft: state.saved.copyWith(courts: 3, minutes: 15),
        onDraft: (_) {},
        onRules: () {},
        onRetry: () {},
      ),
      theme: CatchThemeMode.day,
    );
    final notice = find.byKey(const ValueKey('formats-setup-court-time'));
    expect(notice, findsOneWidget);
    // Singles: 6 play each round, 34 sit out; 48 games over 40 players.
    expect(
      find.descendant(
        of: notice,
        matching: find.text(
          'About 18 min on court each · 34 on the bench per round',
        ),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: notice,
        matching: find.text('Everyone plays 15 to 30 minutes over 8 rounds.'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('team mixing shows the tables, shuffles and switches openers', (
    tester,
  ) async {
    var shuffled = 0;
    final openers = <bool>[];
    await _pump(
      tester,
      HostFormatsMixBody(
        state: hostFormatsMixState(
          event: mixEvent,
          plan: mixPlan(),
          assignments: mixAssignments(),
          attendees: formatsAttendees(mixEvent, names: mixNames),
        ),
        onShuffle: () => shuffled++,
        onOpeners: openers.add,
        onRetry: () {},
      ),
    );
    expect(find.text('Mix the teams'), findsOneWidget);
    expect(find.text('Table 2 · Harbour Lights'), findsOneWidget);
    expect(find.text('Keep the team names'), findsNothing);
    await tester.tap(find.text('Shuffle again'));
    expect(shuffled, 1);
    await tester.tap(find.byKey(const ValueKey('formats-mix-openers')));
    expect(openers, [false]);
  });

  testWidgets('the crawl board moves everyone and messages who is missing', (
    tester,
  ) async {
    var moved = 0;
    var messaged = 0;
    await _pump(
      tester,
      HostFormatsCrawlBody(
        state: hostFormatsCrawlState(
          event: crawlEvent,
          host: 'Night Shift Socials',
          attendees: crawlAttendees(),
        ),
        now: crawlNow,
        onMove: () => moved++,
        onMessage: () => messaged++,
        onRetry: () {},
      ),
    );
    expect(find.text('Stop 2 of 4 · here since 8:52 PM'), findsOneWidget);
    expect(find.text('With the crawl: 10 of 12'), findsOneWidget);
    expect(find.text('Group A · Meher'), findsWidgets);
    expect(find.text('Ritu Kapoor'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('formats-crawl-move')));
    expect(moved, 1);
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('formats-missing-Ritu Kapoor')),
        matching: find.text('Message'),
      ),
    );
    expect(messaged, 1);
  });

  testWidgets('pace pods put a runner in the smallest pod', (tester) async {
    final placed = <(String, String)>[];
    await _pump(
      tester,
      HostFormatsPodsBody(
        state: podsState,
        onPlace: (runner, pod) => placed.add((runner.name, pod.label)),
        onRules: () {},
        onRetry: () {},
      ),
      theme: CatchThemeMode.day,
    );
    expect(find.text('Around 6:30 a km'), findsOneWidget);
    expect(find.text('Send pods to runners'), findsNothing);
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('formats-unplaced-attendee-anika')),
        matching: find.text('Steady'),
      ),
    );
    expect(placed, [('Anika Rao', 'Steady')]);
    expect(
      const HostFormatsPodsState(status: HostFormatsPodsStatus.ready).smallest,
      isNull,
    );
  });

  testWidgets('grouping lists the rules, adds and opens them', (tester) async {
    var added = 0;
    final opened = <HostFormatsRule>[];
    await _pump(
      tester,
      HostFormatsRulesBody(
        state: hostFormatsRulesState(rulesPreview()),
        onAdd: () => added++,
        onOpen: opened.add,
        onRetry: () {},
      ),
      theme: CatchThemeMode.day,
    );
    expect(find.text('Your level'), findsOneWidget);
    expect(find.text('41 of 48 agreed'), findsOneWidget);
    expect(find.text('Consent'), findsOneWidget);
    await tester.tap(find.text('Add'));
    expect(added, 1);
    await tester.tap(find.text('Your level'));
    expect(opened.single.question, 'Your level');
  });

  testWidgets('the rule sheet saves the use and how much it matters', (
    tester,
  ) async {
    final saved = <EventSuccessAssignmentFeatureRule>[];
    await _pump(
      tester,
      const SizedBox.shrink(),
      theme: CatchThemeMode.day,
      overlay: HostFormatsRuleSheet(
        sources: [rulesSource],
        onSave: saved.add,
        onRemove: () {},
      ),
    );
    await tester.tap(
      find.byKey(const ValueKey('formats-rule-mode-preferDifferent')),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('formats-rule-save')));
    expect(saved.single.mode, 'preferDifferent');
    expect(saved.single.weight, 3);
    expect(saved.single.questionId, 'level');
  });
}
