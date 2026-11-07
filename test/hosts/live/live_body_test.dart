import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'live_fixtures.dart';

class _Calls {
  final views = <HostLiveView>[];
  final needs = <HostLiveNeed>[];
  int next = 0;
  int back = 0;
  int finish = 0;
  int allNeeds = 0;
  int scores = 0;
  int message = 0;
  int retry = 0;
}

Future<_Calls> _pump(
  WidgetTester tester,
  HostLiveState state, {
  required DateTime now,
  Size size = const Size(390, 2200),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = _Calls();
  final expanded = size.width >= 1024;
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(
          bodyScrolls: !expanded,
          body: HostLiveBody(
            state: state,
            now: now,
            onView: calls.views.add,
            onNext: () => calls.next++,
            onBack: () => calls.back++,
            onFinish: () => calls.finish++,
            onOpenNeed: calls.needs.add,
            onAllNeeds: () => calls.allNeeds++,
            onEnterScores: () => calls.scores++,
            onMessage: () => calls.message++,
            onRetry: () => calls.retry++,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  final steps = liveRunOfShow();

  testWidgets('running shows the step, its actions, the room, the needs and '
      'the plan in board order', (tester) async {
    final second = livePlanSteps(1)[1];
    final now = second.startsAt.add(const Duration(minutes: 3, seconds: 20));
    final calls = await _pump(tester, liveState(), now: now);
    final left = second.endsAt.difference(now);

    expect(find.text('Step 2 of ${steps.length} · now'), findsOneWidget);
    expect(
      find.text(
        '${left.inMinutes}:${(left.inSeconds % 60).toString().padLeft(2, '0')}'
        ' left',
      ),
      findsOneWidget,
    );
    expect(find.text(steps[1].hostInstruction), findsOneWidget);
    expect(find.text(steps[1].attendeeExperience), findsOneWidget);
    expect(find.text('In the room'), findsOneWidget);
    expect(find.text('26'), findsOneWidget);
    expect(find.text('of 30 places'), findsOneWidget);
    expect(find.text('Teams'), findsOneWidget);
    expect(find.text('Quizzy Rascals lead'), findsOneWidget);
    expect(find.text('Aanya asked for help'), findsOneWidget);
    expect(find.text('Rhea arrived late'), findsOneWidget);
    expect(find.text('Done'), findsOneWidget);
    expect(find.text('Now'), findsWidgets);
    expect(find.text('Next'), findsWidgets);

    double top(Finder finder) => tester.getTopLeft(finder).dy;
    expect(
      top(find.text('Step 2 of ${steps.length} · now')),
      lessThan(top(find.text('Back a step'))),
    );
    expect(
      top(find.text('Back a step')),
      lessThan(top(find.text('In the room'))),
    );
    expect(
      top(find.text('In the room')),
      lessThan(top(find.text('Needs you now'))),
    );
    expect(
      top(find.text('Needs you now')),
      lessThan(top(find.text("Tonight's plan"))),
    );

    await tester.tap(find.text('Next: ${steps[2].title}'));
    await tester.tap(find.text('Back a step'));
    await tester.tap(find.text('Help'));
    await tester.tap(find.text('Place'));
    await tester.ensureVisible(find.text('Message everyone in the room'));
    await tester.tap(find.text('Message everyone in the room'));
    await tester.tap(find.text('Guests'));
    await tester.tap(find.text('Scores'));
    expect(calls.next, 1);
    expect(calls.back, 1);
    expect(calls.needs.map((need) => need.id), [
      'help-case:one',
      'arrival-guest-rhea',
    ]);
    expect(calls.message, 1);
    expect(calls.views, [HostLiveView.guests, HostLiveView.scores]);
  });

  testWidgets('before doors the first step waits for its start time', (
    tester,
  ) async {
    await _pump(
      tester,
      liveState(activeIndex: 0),
      now: liveDoors.subtract(const Duration(minutes: 20)),
    );

    expect(find.text('Step 1 of ${steps.length} · up first'), findsOneWidget);
    expect(find.text('Starts 7:30 PM'), findsOneWidget);
    expect(find.text('Back a step'), findsNothing);
    expect(find.text('Next: ${steps[1].title}'), findsOneWidget);
  });

  testWidgets('the last step finishes the night', (tester) async {
    final last = steps.length - 1;
    final calls = await _pump(
      tester,
      liveState(activeIndex: last),
      now: livePlanSteps(last)[last].endsAt.add(const Duration(minutes: 2)),
    );

    expect(find.text('2:00 over'), findsOneWidget);
    await tester.tap(find.text('Finish the night'));
    expect(calls.finish, 1);
    expect(calls.next, 0);
  });

  testWidgets('a finished night has no step actions and every step done', (
    tester,
  ) async {
    await _pump(
      tester,
      liveState(activeIndex: steps.length - 1, status: HostLiveStatus.finished),
      now: liveDoors.add(const Duration(hours: 3)),
    );

    expect(find.text('The night is done'), findsOneWidget);
    expect(find.text('All ${steps.length} steps done'), findsOneWidget);
    expect(find.text('Finish the night'), findsNothing);
    expect(find.text('Done'), findsNWidgets(steps.length));
  });

  testWidgets('more needs than fit open the full list', (tester) async {
    final calls = await _pump(
      tester,
      liveState(
        needs: [
          HostLiveHelpNeed(liveHelpRequest()),
          HostLiveArrivalNeed(liveArrival),
          HostLiveDeliveryNeed(liveDelivery()),
        ],
      ),
      now: liveDoors.add(const Duration(minutes: 40)),
    );

    expect(find.text('Dev did not get a message'), findsNothing);
    await tester.tap(find.text('All 3'));
    expect(calls.allNeeds, 1);
  });

  testWidgets('no saved plan offers messages and no step', (tester) async {
    final calls = await _pump(
      tester,
      const HostLiveState(status: HostLiveStatus.noPlan),
      now: liveDoors,
    );

    expect(find.text('No plan for tonight'), findsOneWidget);
    expect(find.text('Back a step'), findsNothing);
    await tester.tap(find.text('Message everyone in the room'));
    expect(calls.message, 1);
  });

  testWidgets('a failed read offers a retry', (tester) async {
    final calls = await _pump(
      tester,
      const HostLiveState(status: HostLiveStatus.error),
      now: liveDoors,
    );

    await tester.tap(find.text('Try again'));
    expect(calls.retry, 1);
  });

  testWidgets('a landscape tablet splits the stage from the side pane', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      liveState(units: const [HostLiveUnit(label: 'Table 1', seated: 4)]),
      now: liveDoors.add(const Duration(minutes: 40)),
      size: const Size(1194, 834),
    );

    expect(find.byType(CatchPaneLayout), findsOneWidget);
    expect(find.text('Scores after round 1'), findsOneWidget);
    expect(find.text('Quizzy Rascals'), findsOneWidget);
    expect(find.text('Room'), findsOneWidget);
    expect(find.text('Scores'), findsNothing);
    expect(
      tester.getTopLeft(find.text('Scores after round 1')).dx,
      lessThan(tester.getTopLeft(find.text('Needs you now')).dx),
    );

    await tester.ensureVisible(find.text('Enter round 2'));
    await tester.pump();
    await tester.tap(find.text('Enter round 2'));
    await tester.tap(find.text('Room'));
    expect(calls.scores, 1);
    expect(calls.views, [HostLiveView.room]);
  });
}
