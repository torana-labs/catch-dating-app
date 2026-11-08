import 'package:catch_dating_app/hosts/organizer/organizer_body.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

OrganizerState _state({
  bool live = true,
  String? link = 'catchdates.com/lanternlane',
  bool statsPending = false,
  bool isOwner = true,
}) => OrganizerState(
  organizer: lanternLane(),
  isOwner: isOwner,
  pageLink: link,
  pageLive: live,
  statsPending: statsPending,
  stats: const [
    OrganizerStat(
      kind: OrganizerStatKind.bookings,
      value: 312,
      previousValue: 264,
    ),
    OrganizerStat(
      kind: OrganizerStatKind.ticketSales,
      value: 14800000,
      previousValue: 13300000,
      currencyCode: 'INR',
    ),
    OrganizerStat(kind: OrganizerStatKind.followers, value: 1284),
    OrganizerStat(kind: OrganizerStatKind.pageVisits, value: 940),
  ],
  billMinor: isOwner ? 740000 : null,
  billCurrencyCode: 'INR',
  accountName: 'Meher',
  helpAvailable: true,
);

Future<List<OrganizerAction>> _pump(
  WidgetTester tester,
  OrganizerState state,
) async {
  final actions = <OrganizerAction>[];
  await pumpOrganizerBody(
    tester,
    OrganizerBody(state: state, onAction: actions.add),
  );
  return actions;
}

void main() {
  testWidgets('content shows the page, thirty days, running and you in '
      'board order', (tester) async {
    final actions = await _pump(tester, _state());

    expect(find.text('Live'), findsOneWidget);
    expect(find.text('catchdates.com/lanternlane'), findsOneWidget);
    expect(find.text('The link in your Instagram bio.'), findsOneWidget);
    expect(find.text('312'), findsOneWidget);
    expect(find.text('Up 18%'), findsOneWidget);
    expect(find.text('1,284'), findsOneWidget);
    expect(find.text('Page visits'), findsOneWidget);
    expect(find.text('Running Lantern Lane Social'), findsOneWidget);
    expect(find.text('₹7,400'), findsOneWidget);
    expect(find.text('2 people'), findsOneWidget);
    expect(find.text('Meher'), findsOneWidget);

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('Your page'), lessThan(top('Last 30 days')));
    expect(top('Last 30 days'), lessThan(top('Running Lantern Lane Social')));
    expect(top('Running Lantern Lane Social'), lessThan(top('You')));

    await tester.tap(find.text('Edit page'));
    await tester.tap(find.text('View page'));
    await tester.tap(find.byKey(const ValueKey('organizer-page-share')));
    await tester.tap(find.text('All insights'));
    await tester.tap(find.text('Payments and billing'));
    await tester.tap(find.text('Team'));
    await tester.tap(find.text('Memberships'));
    await tester.tap(find.text('Event defaults'));
    await tester.tap(find.text('Rehearse a night'));
    await tester.tap(find.text('Settings'));
    await tester.tap(find.text('Help'));
    expect(actions, [
      OrganizerAction.editPage,
      OrganizerAction.viewPage,
      OrganizerAction.sharePage,
      OrganizerAction.insights,
      OrganizerAction.payments,
      OrganizerAction.team,
      OrganizerAction.memberships,
      OrganizerAction.eventDefaults,
      OrganizerAction.rehearse,
      OrganizerAction.settings,
      OrganizerAction.help,
    ]);
  });

  testWidgets('an unpublished page has no share and says so', (tester) async {
    await _pump(tester, _state(live: false, link: null));

    expect(find.text('Not live'), findsOneWidget);
    expect(find.text('No link yet'), findsOneWidget);
    expect(find.byKey(const ValueKey('organizer-page-share')), findsNothing);
  });

  testWidgets('a host who is not the owner sees no bill', (tester) async {
    await _pump(tester, _state(isOwner: false));

    expect(find.text('₹7,400'), findsNothing);
    expect(find.text('Payments and billing'), findsOneWidget);
  });

  testWidgets('the stats show their loading shape while the report is read', (
    tester,
  ) async {
    await _pump(tester, _state(statsPending: true));

    expect(find.text('Last 30 days'), findsOneWidget);
    expect(find.text('312'), findsNothing);
  });

  test('the page address drops its scheme and trailing slash', () {
    expect(
      organizerPageLink(Uri.parse('https://catchdates.com/lanternlane/')),
      'catchdates.com/lanternlane',
    );
  });
}
