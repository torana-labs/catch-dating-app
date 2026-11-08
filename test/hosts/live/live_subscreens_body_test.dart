import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_needs_body.dart';
import 'package:catch_dating_app/hosts/live/live_room_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'live_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget body, {
  Size size = const Size(390, 1600),
}) async {
  tester.view.physicalSize = size;
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

const _scores = HostLiveScoresState(
  status: HostLiveScoresStatus.ready,
  units: [
    HostLiveScoreUnit(id: 'qr', label: 'Quizzy Rascals', total: 41),
    HostLiveScoreUnit(id: 'hl', label: 'Harbour Lights', total: 38),
  ],
  roundIndex: 1,
  revealRoundIndex: 0,
  countdownSeconds: 10,
);

void main() {
  testWidgets('needs group help, late arrivals and messages', (tester) async {
    final opened = <HostLiveNeed>[];
    await _pump(
      tester,
      HostLiveNeedsBody(
        needs: [
          HostLiveHelpNeed(liveHelpRequest()),
          HostLiveArrivalNeed(liveArrival),
          HostLiveDeliveryNeed(liveDelivery()),
        ],
        now: liveDoors,
        onOpenNeed: opened.add,
      ),
    );

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('Guests asked'), lessThan(top('Arrived late')));
    expect(top('Arrived late'), lessThan(top('Messages')));
    expect(find.text('Dev did not get a message'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    expect(opened.single, isA<HostLiveDeliveryNeed>());
  });

  testWidgets('an empty needs list says so unless a source is checking', (
    tester,
  ) async {
    await _pump(
      tester,
      HostLiveNeedsBody(needs: const [], now: liveDoors, onOpenNeed: (_) {}),
    );
    expect(find.text('Nothing needs you right now.'), findsOneWidget);
  });

  testWidgets('scores enter the next round, preview it and reveal the saved '
      'one', (tester) async {
    final entered = <(String, int)>[];
    var saved = 0;
    var revealed = 0;
    await _pump(
      tester,
      HostLiveScoresBody(
        state: _scores,
        points: const {'hl': 6},
        onPoints: (id, points) => entered.add((id, points)),
        onSave: () => saved++,
        onReveal: () => revealed++,
        onView: (_) {},
        onRetry: () {},
      ),
    );

    expect(find.text('Round 2'), findsOneWidget);
    expect(find.text('Enter round 2'), findsOneWidget);
    expect(find.text('41 so far'), findsOneWidget);
    expect(find.text('44'), findsOneWidget);
    expect(
      find.text(
        "A 10-second countdown runs on every guest's phone, then the "
        'scores appear together.',
      ),
      findsOneWidget,
    );
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey<String>('host-live-scores-qr')),
        matching: find.byTooltip('More points for Quizzy Rascals'),
      ),
    );
    await tester.tap(find.text('Save round 2'));
    await tester.tap(find.text('Reveal to everyone'));
    expect(entered, [('qr', 1)]);
    expect(saved, 1);
    expect(revealed, 1);
  });

  testWidgets('the room shows seats against places in two columns', (
    tester,
  ) async {
    await _pump(
      tester,
      HostLiveRoomBody(
        state: liveState(
          units: const [
            HostLiveUnit(label: 'Table 1', seated: 4, size: 4),
            HostLiveUnit(label: 'Table 2', seated: 3, size: 4),
          ],
        ),
        onView: (_) {},
      ),
      size: const Size(1194, 834),
    );

    expect(find.text('Teams and tables'), findsOneWidget);
    expect(find.text('3 of 4'), findsOneWidget);
    expect(find.text('7'), findsOneWidget);
    expect(find.text('Room'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Table 1')).dy,
      tester.getTopLeft(find.text('Table 2')).dy,
    );
    expect(find.byType(HostLiveViewTabBar), findsOneWidget);
  });
}
