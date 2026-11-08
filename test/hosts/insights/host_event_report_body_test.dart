import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_body.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../today/host_today_fixtures.dart';

final _event = todayEvent('trivia', start: DateTime(2026, 10, 27, 19, 30));
final _next = todayEvent(
  'next',
  start: DateTime(2026, 11, 3, 19, 30),
  capacity: 30,
);

Review _review(String id, String name, int rating, String comment) => Review(
  id: id,
  organizerId: 'org-1',
  eventId: 'trivia',
  reviewerName: name,
  rating: rating,
  comment: comment,
  createdAt: DateTime(2026, 10, 28),
);

HostEventReportState _content({
  int? stayInTouch = 11,
  bool next = true,
  int reviewCount = 14,
}) => HostEventReportState(
  status: HostEventReportStatus.content,
  event: _event,
  format: CatchFormat.games,
  booked: 24,
  came: 26,
  newFaces: 9,
  ticketSalesMinor: 1297400,
  currencyCode: 'INR',
  payments: 24,
  rating: 4.8,
  ratingCount: 14,
  stayInTouch: stayInTouch,
  people: const ['Rhea Kapoor', 'Kabir Rao', 'Ana Dsouza'],
  reviews: [
    _review('r1', 'Rhea K.', 5, 'Came alone, left with a team.'),
    _review('r2', 'Sameer S.', 4, 'Great host and a good crowd.'),
  ],
  reviewCount: reviewCount,
  nextEvent: next ? _next : null,
  tonight: true,
);

class _Calls {
  int allReviews = 0;
  int inviteAll = 0;
  int choose = 0;
  final downloads = <HostEventReportDownload>[];
}

Future<_Calls> _pump(WidgetTester tester, HostEventReportState state) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = _Calls();
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(
          body: HostEventReportBody(
            state: state,
            onAllReviews: () => calls.allReviews++,
            onInviteAll: () => calls.inviteAll++,
            onChoose: () => calls.choose++,
            onDownload: calls.downloads.add,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  testWidgets('the report shows how it went, the stay-in-touch count, what '
      'guests said, the spotlight and downloads in board order', (
    tester,
  ) async {
    final calls = await _pump(tester, _content());

    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.text('How it went'), findsOneWidget);
    expect(find.text('26'), findsOneWidget);
    expect(find.text('2 more than booked'), findsOneWidget);
    expect(find.text('₹12,974'), findsOneWidget);
    expect(find.text('from 24 payments'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('first time with you'), findsOneWidget);
    expect(find.text('4.8'), findsOneWidget);
    expect(find.text('from 14 guests'), findsOneWidget);
    expect(find.text('11 pairs want to stay in touch'), findsOneWidget);
    expect(find.text('Booked on Catch'), findsNWidgets(2));
    expect(find.text('★★★★☆'), findsOneWidget);
    expect(find.text('Bring tonight’s 26 back'), findsOneWidget);
    expect(find.text('Next Tuesday · 30 places'), findsOneWidget);

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    expect(top('How it went'), lessThan(top('Came')));
    expect(top('Came'), lessThan(top('11 pairs want to stay in touch')));
    expect(
      top('11 pairs want to stay in touch'),
      lessThan(top('What guests said')),
    );
    expect(top('What guests said'), lessThan(top('Bring tonight’s 26 back')));
    expect(top('Bring tonight’s 26 back'), lessThan(top('Downloads')));

    await tester.tap(find.text('All 14'));
    await tester.tap(find.text('Invite all 26'));
    await tester.tap(find.text('Choose'));
    await tester.tap(find.text('Guest list and check-ins'));
    await tester.tap(find.text('Bookings and payments'));
    expect(calls.allReviews, 1);
    expect(calls.inviteAll, 1);
    expect(calls.choose, 1);
    expect(calls.downloads, [
      HostEventReportDownload.guestList,
      HostEventReportDownload.payments,
    ]);
  });

  testWidgets('without matches, a next event or more reviews those parts '
      'are left out', (tester) async {
    await _pump(
      tester,
      _content(stayInTouch: null, next: false, reviewCount: 2),
    );

    expect(
      find.byKey(const ValueKey<String>('host-event-report-stay-in-touch')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey<String>('host-event-report-bring-back')),
      findsNothing,
    );
    expect(find.text('All 2'), findsNothing);
    expect(find.text('Downloads'), findsOneWidget);
  });

  testWidgets('figures the report does not carry show a dash', (tester) async {
    await _pump(
      tester,
      HostEventReportState(
        status: HostEventReportStatus.content,
        event: _event,
        booked: 24,
        came: 20,
      ),
    );

    expect(find.text('of 24 booked'), findsOneWidget);
    expect(find.text('—'), findsNWidgets(3));
    expect(find.text('No ratings yet'), findsOneWidget);
    expect(find.text('No reviews yet.'), findsOneWidget);
  });

  testWidgets('loading keeps the heading over a skeleton', (tester) async {
    await _pump(
      tester,
      HostEventReportState(
        status: HostEventReportStatus.loading,
        event: _event,
      ),
    );

    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsOneWidget);
    expect(find.text('Downloads'), findsNothing);
  });
}
