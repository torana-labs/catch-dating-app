import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'live_fixtures.dart';

HostLiveState _timed({DateTime? startedAt, DateTime? pausedAt}) {
  final base = liveState();
  return HostLiveState(
    status: base.status,
    steps: base.steps,
    activeIndex: base.activeIndex,
    liveControlRevision: base.liveControlRevision,
    checkedIn: base.checkedIn,
    booked: base.booked,
    places: base.places,
    stepStartedAt: startedAt,
    pausedAt: pausedAt,
  );
}

Future<({List<String> calls})> _pump(
  WidgetTester tester,
  HostLiveState state, {
  required DateTime now,
}) async {
  tester.view.physicalSize = const Size(390, 2200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = <String>[];
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(
          body: HostLiveBody(
            state: state,
            now: now,
            onView: (_) {},
            onNext: () => calls.add('next'),
            onBack: () => calls.add('back'),
            onFinish: () => calls.add('finish'),
            onOpenNeed: (_) {},
            onAllNeeds: () {},
            onEnterScores: () {},
            onMessage: () {},
            onRetry: () {},
            onPause: () => calls.add('pause'),
            onResume: () => calls.add('resume'),
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return (calls: calls);
}

void main() {
  final steps = liveRunOfShow();

  testWidgets('a running step offers Pause and counts down from its start', (
    tester,
  ) async {
    final second = livePlanSteps(1)[1];
    // The step started five minutes late; time left follows that start.
    final startedAt = second.startsAt.add(const Duration(minutes: 5));
    final now = startedAt.add(const Duration(minutes: 2));
    final left = Duration(minutes: second.step.durationMinutes - 2);
    final result = await _pump(tester, _timed(startedAt: startedAt), now: now);
    expect(find.text('${left.inMinutes}:00 left'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('host-live-pause')));
    await tester.tap(find.text('Next: ${steps[2].title}'));
    expect(result.calls, ['pause', 'next']);
  });

  testWidgets('a paused step stands still and offers Resume', (tester) async {
    final second = livePlanSteps(1)[1];
    final startedAt = second.startsAt;
    final pausedAt = startedAt.add(const Duration(minutes: 4));
    final left = Duration(minutes: second.step.durationMinutes - 4);
    final result = await _pump(
      tester,
      _timed(startedAt: startedAt, pausedAt: pausedAt),
      now: pausedAt.add(const Duration(minutes: 9)),
    );
    expect(find.text('Paused · step 2 of ${steps.length}'), findsOneWidget);
    expect(find.text('${left.inMinutes}:00 left'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('host-live-pause')), findsNothing);
    await tester.tap(find.byKey(const ValueKey<String>('host-live-resume')));
    await tester.tap(find.text('Back a step'));
    expect(result.calls, ['resume', 'back']);
  });

  testWidgets('a plan with no step start keeps Back a step', (tester) async {
    final second = livePlanSteps(1)[1];
    await _pump(tester, _timed(), now: second.startsAt);
    expect(find.byKey(const ValueKey<String>('host-live-pause')), findsNothing);
    expect(find.text('Back a step'), findsOneWidget);
  });
}
