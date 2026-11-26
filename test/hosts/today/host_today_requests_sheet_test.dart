import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/today/host_today_requests_sheet.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_today_fixtures.dart';

final _zoya = todayRequest(
  'zoya',
  HostRequestKind.request,
  name: 'Zoya Merchant',
  attended: 3,
);
final _ishaan = todayRequest(
  'ishaan',
  HostRequestKind.request,
  name: 'Ishaan Bose',
);
final _nikhil = todayRequest(
  'nikhil',
  HostRequestKind.waitlist,
  name: 'Nikhil Rao',
  position: 1,
);

Future<void> _pump(
  WidgetTester tester,
  List<HostRequest> rows, {
  bool complete = true,
  HostTodayRequestFocus? focus,
  Set<String> pending = const {},
  ValueChanged<HostRequest>? onLetIn,
  ValueChanged<HostRequest>? onDecline,
  ValueChanged<HostRequest>? onOffer,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: Scaffold(
          body: HostTodayRequestsQueue(
            requests: HostRequests(rows: rows, complete: complete),
            now: todayNow,
            initialFocus: focus,
            pending: pending,
            onLetIn: onLetIn ?? (_) {},
            onDecline: onDecline ?? (_) {},
            onOffer: onOffer ?? (_) {},
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _open(WidgetTester tester, HostRequest row) async {
  await tester.tap(find.byKey(ValueKey<String>('host-request-${row.key}')));
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('the list counts everyone, the asks and the waitlist', (
    tester,
  ) async {
    await _pump(tester, [_zoya, _ishaan, _nikhil]);

    expect(find.text('All 3'), findsOneWidget);
    expect(find.text('Asked to join 2'), findsOneWidget);
    expect(find.text('Waitlist 1'), findsOneWidget);
    expect(find.text('3 events with you · asked Oct 26'), findsOneWidget);
    expect(find.text('Number 1 on the waitlist'), findsOneWidget);
  });

  testWidgets('a request is let in or declined, never offered', (tester) async {
    HostRequest? letIn;
    HostRequest? declined;
    await _pump(
      tester,
      [_zoya, _ishaan, _nikhil],
      onLetIn: (row) => letIn = row,
      onDecline: (row) => declined = row,
    );
    await _open(tester, _zoya);

    expect(find.text('Offer a spot'), findsNothing);
    expect(
      find.text('Zoya Merchant gets a notification · then Ishaan Bose'),
      findsOneWidget,
    );
    expect(find.text('Came to 3 events with you'), findsOneWidget);
    expect(find.text('2 of 32'), findsOneWidget);

    await tester.tap(find.widgetWithText(CatchButton, 'Let them in'));
    expect(letIn, _zoya);
    await tester.tap(find.widgetWithText(CatchButton, 'Decline'));
    expect(declined, _zoya);
  });

  testWidgets('a waitlisted person is offered a spot, not decided', (
    tester,
  ) async {
    HostRequest? offered;
    await _pump(tester, [_nikhil], onOffer: (row) => offered = row);
    await _open(tester, _nikhil);

    expect(find.widgetWithText(CatchButton, 'Let them in'), findsNothing);
    expect(find.widgetWithText(CatchButton, 'Decline'), findsNothing);
    await tester.tap(find.widgetWithText(CatchButton, 'Offer a spot'));
    expect(offered, _nikhil);
  });

  testWidgets('a live offer cannot be offered again; a lapsed one can', (
    tester,
  ) async {
    final live = todayRequest(
      'nikhil',
      HostRequestKind.waitlist,
      position: 1,
      offerExpiresAt: todayNow.add(const Duration(hours: 2)),
    );
    await _pump(tester, [
      live,
    ], onOffer: (_) => fail('The offer is still live'));
    await _open(tester, live);
    final offered = find.ancestor(
      of: find.textContaining('Offered until Oct 27'),
      matching: find.byType(CatchButton),
    );
    expect(offered, findsOneWidget);
    await tester.tap(offered);

    HostRequest? again;
    final lapsed = todayRequest(
      'nikhil',
      HostRequestKind.waitlist,
      position: 1,
      offerExpiresAt: todayNow.subtract(const Duration(hours: 2)),
    );
    await _pump(tester, [lapsed], onOffer: (row) => again = row);
    // The same person stays open as their offer lapses.
    await tester.tap(find.widgetWithText(CatchButton, 'Offer a spot'));
    expect(again, lapsed);
  });

  testWidgets('a decision on its way locks the dock', (tester) async {
    await _pump(
      tester,
      [_zoya],
      pending: {_zoya.key},
      onLetIn: (_) => fail('Already deciding'),
      onDecline: (_) => fail('Already deciding'),
    );
    await _open(tester, _zoya);
    await tester.tap(find.widgetWithText(CatchButton, 'Decline'));
  });

  testWidgets('filters narrow the list', (tester) async {
    await _pump(tester, [_zoya, _ishaan, _nikhil]);
    await tester.tap(
      find.byKey(const ValueKey<String>('host-requests-filter-waitlist')),
    );
    await pumpFeatureUi(tester);

    expect(
      find.byKey(ValueKey<String>('host-request-${_nikhil.key}')),
      findsOneWidget,
    );
    expect(
      find.byKey(ValueKey<String>('host-request-${_zoya.key}')),
      findsNothing,
    );
  });

  testWidgets('a focus opens on the first person of that kind at that event', (
    tester,
  ) async {
    final runner = todayRequest(
      'meher',
      HostRequestKind.request,
      eventId: 'run',
      name: 'Meher Kapoor',
    );
    await _pump(
      tester,
      [_zoya, runner, _nikhil],
      focus: const HostTodayRequestFocus(
        eventId: 'run',
        kind: HostRequestKind.request,
      ),
    );

    expect(
      find.byKey(ValueKey<String>('host-request-detail-${runner.key}')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey<String>('host-request-back')));
    await pumpFeatureUi(tester);
    expect(find.text('Asked to join 2'), findsOneWidget);
  });

  testWidgets('when a decision removes someone, the next person takes over', (
    tester,
  ) async {
    await _pump(tester, [_zoya, _ishaan]);
    await _open(tester, _zoya);
    await _pump(tester, [_ishaan]);

    expect(
      find.byKey(ValueKey<String>('host-request-detail-${_ishaan.key}')),
      findsOneWidget,
    );
    expect(find.text('Ishaan Bose gets a notification'), findsOneWidget);
  });

  testWidgets('someone with no public name still reads as a person', (
    tester,
  ) async {
    await _pump(tester, [todayRequest('x', HostRequestKind.request)]);
    expect(find.text('A guest'), findsWidgets);
  });

  testWidgets('no one waiting says so', (tester) async {
    await _pump(tester, const []);
    expect(find.text('No one is waiting'), findsOneWidget);
  });

  testWidgets('a cut-off list says so', (tester) async {
    await _pump(tester, [_zoya], complete: false);
    expect(find.textContaining('Showing the first people'), findsOneWidget);
  });
}
