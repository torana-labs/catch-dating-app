import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/hosts/door/door_body.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'door_fixtures.dart';

class _Calls {
  final filters = <DoorFilter>[];
  final searches = <String>[];
  final actions = <HostDoorGuest>[];
  int scans = 0;
  int retries = 0;
  int discards = 0;
}

Future<_Calls> _pump(
  WidgetTester tester,
  DoorState state, {
  Size size = const Size(390, 1400),
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
        theme: CatchThemeMode.night,
        child: CatchScreen(
          bodyScrolls: false,
          body: DoorBody(
            state: state,
            onFilter: calls.filters.add,
            onSearch: calls.searches.add,
            onGuestAction: calls.actions.add,
            onScan: () => calls.scans++,
            onRetrySync: () => calls.retries++,
            onDiscardRefused: () => calls.discards++,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  testWidgets('arriving shows the headline, the sentence, the filters with '
      'counts and the guests still to come', (tester) async {
    final calls = await _pump(tester, doorBoardState());

    expect(find.text('2 of 6 in'), findsOneWidget);
    expect(
      find.text('4 still to come · 2 asked to join · 1 waiting'),
      findsOneWidget,
    );
    expect(find.text('Dev Patel'), findsOneWidget);
    expect(find.text('paid ₹998 · first time'), findsOneWidget);
    expect(find.text('5 nights with you'), findsOneWidget);
    expect(find.text('New'), findsNWidgets(2));
    expect(find.text('Check in'), findsNWidgets(4));
    expect(find.text('Aanya Sharma'), findsNothing);

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey<String>('door-guest-dp')),
        matching: find.text('Check in'),
      ),
    );
    expect(calls.actions.single.attendeeId, 'dp');
    await tester.tap(find.byKey(const ValueKey<String>('door-scan')));
    expect(calls.scans, 1);
    await tester.ensureVisible(find.text('Asked'));
    await tester.pump();
    await tester.tap(find.text('Asked'));
    expect(calls.filters, [DoorFilter.asked]);
  });

  testWidgets('the door names who else is on it, and nothing when alone', (
    tester,
  ) async {
    await _pump(tester, doorBoardState(team: const ['Kabir', 'Priya']));
    expect(find.text('On the door with you: Kabir, Priya'), findsOneWidget);

    await _pump(tester, doorBoardState());
    expect(find.byKey(const ValueKey<String>('door-team')), findsNothing);
  });

  testWidgets('in shows who came in, with Undo', (tester) async {
    await _pump(tester, doorBoardState(filter: DoorFilter.checkedIn));

    expect(find.text('Kabir Rao'), findsOneWidget);
    expect(find.text('Aanya Sharma'), findsOneWidget);
    expect(find.text('Undo'), findsNWidgets(2));
    expect(find.text('Dev Patel'), findsNothing);
  });

  testWidgets('asked shows Let in and waitlist shows Offer', (tester) async {
    final calls = await _pump(tester, doorBoardState(filter: DoorFilter.asked));

    expect(find.text('Zoya Merchant'), findsOneWidget);
    expect(find.text('Let in'), findsNWidgets(2));
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey<String>('door-guest-zm')),
        matching: find.text('Let in'),
      ),
    );
    expect(calls.actions.single.userId, 'u-zm');

    await _pump(tester, doorBoardState(filter: DoorFilter.waitlist));
    expect(find.text('Nikhil Rao'), findsOneWidget);
    expect(find.text('First on the waitlist'), findsOneWidget);
    expect(find.text('Offer'), findsOneWidget);
  });

  testWidgets('a filter with nobody, or a search with no match, says so', (
    tester,
  ) async {
    await _pump(tester, doorBoardState(query: 'zzz'));

    expect(find.text('Nobody here right now.'), findsOneWidget);
    expect(find.text('Dev Patel'), findsNothing);
  });

  testWidgets('refused changes show the notice with retry and drop', (
    tester,
  ) async {
    final calls = await _pump(tester, doorBoardState(needsReview: 2));

    expect(find.text('2 changes did not save'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.tap(find.text('Drop them'));
    expect(calls.retries, 1);
    expect(calls.discards, 1);
  });

  testWidgets('a landscape tablet puts the guests beside the scanner tile, '
      'the latest arrival and the counts', (tester) async {
    final calls = await _pump(
      tester,
      doorBoardState(),
      size: const Size(1194, 834),
    );

    expect(find.byType(CatchPaneLayout), findsOneWidget);
    expect(find.text('Scanner'), findsOneWidget);
    expect(find.text('Kabir Rao is in'), findsOneWidget);
    expect(find.text('still to come'), findsOneWidget);
    expect(find.text('Dev Patel'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('door-scan')));
    expect(calls.scans, 1);
  });

  testWidgets('loading draws the door shape', (tester) async {
    await _pump(tester, const DoorState.loading());

    expect(find.byType(CatchSkeleton), findsOneWidget);
  });
}
