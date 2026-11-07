import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/host_today_body.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_today_fixtures.dart';

final _tonight = todayEvent('tonight', start: DateTime(2026, 10, 27, 19, 30));
final _run = todayEvent(
  'run',
  name: 'Carter Road Social Run',
  start: DateTime(2026, 11, 1, 6, 30),
  booked: 32,
  capacity: 40,
);
final _supper = todayEvent(
  'supper',
  name: 'Long Table Supper',
  start: DateTime(2026, 10, 29, 20),
  booked: 14,
  capacity: 14,
);

HostTodayState _content({
  bool live = false,
  HostTodayNeedsYou? needsYou,
  bool statsPending = false,
}) => HostTodayState(
  status: HostTodayStatus.content,
  tonight: HostTodayTonight(
    event: _tonight,
    isLive: live,
    newFaces: 9,
    people: const ['Aanya Mehta', 'Kabir Rao', 'Ishaan Sen'],
  ),
  needsYou:
      needsYou ??
      HostTodayNeedsYou(
        items: [
          todayAttention('join', dueAt: DateTime(2026, 10, 27, 18)),
          todayAttention(
            'waitlist',
            kind: HostAttentionKind.eventWaitlistReview,
            urgency: HostAttentionUrgency.soon,
            dueAt: DateTime(2026, 10, 27, 18, 30),
          ),
        ],
        dueBeforeDoors: 2,
      ),
  thisWeek: [_supper, _run],
  lastThirtyDays: const [
    HostTodayStat(
      kind: HostTodayStatKind.bookings,
      value: 312,
      previousValue: 264,
    ),
    HostTodayStat(
      kind: HostTodayStatKind.ticketSales,
      value: 14800000,
      previousValue: 13300000,
      currencyCode: 'INR',
    ),
  ],
  statsPending: statsPending,
);

class _Calls {
  final events = <Event>[];
  final attention = <HostAttentionItem>[];
  final actions = <HostTodayAction>[];
  int viewEvents = 0;
  int insights = 0;
  int retries = 0;
}

Future<_Calls> _pump(
  WidgetTester tester,
  HostTodayState state, {
  Size size = const Size(390, 1800),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = _Calls();
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(
          body: HostTodayBody(
            state: state,
            now: todayNow,
            onOpenEvent: calls.events.add,
            onOpenAttention: calls.attention.add,
            onAction: calls.actions.add,
            onViewEvents: () => calls.viewEvents++,
            onOpenInsights: () => calls.insights++,
            onRetry: () => calls.retries++,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  testWidgets('content shows tonight, its actions, the work, the week and '
      'the stats in board order', (tester) async {
    final calls = await _pump(tester, _content());

    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.text('Tonight · doors at 7:30 PM'), findsOneWidget);
    expect(find.text('Booked'), findsWidgets);
    expect(find.text('Waitlist'), findsOneWidget);
    expect(find.text('New faces'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('Live console'), findsNothing);
    expect(find.text('2 before doors'), findsOneWidget);
    expect(find.text('Long Table Supper'), findsOneWidget);
    expect(find.text('Full'), findsOneWidget);
    expect(find.text('8 left'), findsOneWidget);
    expect(find.text('312'), findsOneWidget);
    expect(find.text('Up 18%'), findsOneWidget);

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('Tuesday Trivia Night'), lessThan(top('Open the door')));
    expect(top('Open the door'), lessThan(top('Needs you')));
    expect(top('Needs you'), lessThan(top('This week')));
    expect(top('This week'), lessThan(top('Last 30 days')));

    await tester.tap(find.text('Open the door'));
    await tester.tap(find.text('Message guests'));
    expect(calls.actions, [
      HostTodayAction.openDoor,
      HostTodayAction.messageGuests,
    ]);

    await tester.tap(find.text('Tuesday Trivia Night'));
    await tester.tap(find.text('Carter Road Social Run'));
    expect(calls.events.map((event) => event.id), ['tonight', 'run']);

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey<String>('host-today-attention-join')),
        matching: find.widgetWithText(CatchButton, 'Review'),
      ),
    );
    expect(calls.attention.single.id, 'join');

    await tester.tap(find.text('All events'));
    await tester.tap(find.text('Insights'));
    expect(calls.viewEvents, 1);
    expect(calls.insights, 1);
  });

  testWidgets('a live event adds the live console', (tester) async {
    final calls = await _pump(tester, _content(live: true));

    await tester.tap(find.text('Live console'));
    expect(calls.actions, [HostTodayAction.liveConsole]);
  });

  testWidgets('with nothing to feature the actions become New event and the '
      'sections say they are empty', (tester) async {
    final calls = await _pump(
      tester,
      const HostTodayState(status: HostTodayStatus.empty),
    );

    expect(find.byType(CatchEventCard), findsNothing);
    expect(find.text('Open the door'), findsNothing);
    expect(find.text('Nothing needs you right now.'), findsOneWidget);
    expect(find.text('Nothing else on this week.'), findsOneWidget);
    expect(find.text('These numbers are not ready yet.'), findsOneWidget);
    await tester.tap(find.text('New event'));
    expect(calls.actions, [HostTodayAction.newEvent]);
  });

  testWidgets('an attention source still loading is not an all-clear', (
    tester,
  ) async {
    await _pump(
      tester,
      _content(needsYou: const HostTodayNeedsYou(checking: true)),
    );

    expect(find.text('Still checking'), findsOneWidget);
    expect(find.text('Nothing needs you right now.'), findsNothing);
  });

  testWidgets('a failed attention read offers a retry', (tester) async {
    final calls = await _pump(
      tester,
      _content(needsYou: const HostTodayNeedsYou(failed: true)),
    );

    expect(find.text('Nothing needs you right now.'), findsNothing);
    await tester.tap(find.text('Try again'));
    expect(calls.retries, 1);
  });

  testWidgets('the report still loading shows the stat shape', (tester) async {
    await _pump(tester, _content(statsPending: true));

    expect(find.byType(CatchSkeleton), findsOneWidget);
    expect(find.text('These numbers are not ready yet.'), findsNothing);
  });

  testWidgets('loading draws the board shape from the real components', (
    tester,
  ) async {
    await _pump(tester, const HostTodayState.loading());

    expect(find.byType(CatchSkeleton), findsOneWidget);
    expect(find.byType(CatchEventCard), findsOneWidget);
  });

  testWidgets('a desktop lays the body out as a feed with the work beside '
      'the week', (tester) async {
    await _pump(tester, _content(), size: const Size(1440, 1200));

    expect(find.byType(CatchPaneLayout), findsOneWidget);
    final week = tester.getTopLeft(find.text('This week'));
    final needsYou = tester.getTopLeft(find.text('Needs you'));
    expect(needsYou.dx, greaterThan(week.dx));
  });
}
