import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/presentation/requests/host_requests_screen.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';

HostRequest _row(
  String uid,
  HostRequestKind kind, {
  String? name,
  int? attended,
  int? position,
  DateTime? offerExpiresAt,
}) => HostRequest(
  uid: uid,
  kind: kind,
  eventId: 'trivia',
  eventName: 'Tuesday Trivia',
  eventStart: DateTime(2026, 11, 3, 19),
  placesLeft: 2,
  capacityLimit: 32,
  name: name,
  askedAt: DateTime(2026, 11, 2, 19, 28),
  waitlistPosition: position,
  attendedEventCount: attended,
  offerExpiresAt: offerExpiresAt,
);

final _zoya = _row(
  'zoya',
  HostRequestKind.request,
  name: 'Zoya Merchant',
  attended: 3,
);
final _ishaan = _row('ishaan', HostRequestKind.request, name: 'Ishaan Bose');
final _nikhil = _row(
  'nikhil',
  HostRequestKind.waitlist,
  name: 'Nikhil Rao',
  position: 1,
);

Future<void> _pump(
  WidgetTester tester,
  List<HostRequest> rows, {
  bool complete = true,
  ValueChanged<HostRequest>? onLetIn,
  ValueChanged<HostRequest>? onDecline,
  ValueChanged<HostRequest>? onOffer,
  double width = 1200,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 900);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: HostRequestsWorkspace(
            requests: HostRequests(rows: rows, complete: complete),
            deciding: false,
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

void main() {
  testWidgets('a request is let in or declined, never offered', (tester) async {
    HostRequest? letIn;
    HostRequest? declined;
    await _pump(
      tester,
      [_zoya, _ishaan, _nikhil],
      onLetIn: (row) => letIn = row,
      onDecline: (row) => declined = row,
    );
    expect(find.text('All 3'), findsOneWidget);
    expect(find.text('Asked to join 2'), findsOneWidget);
    expect(find.text('Waitlist 1'), findsOneWidget);
    expect(find.byKey(const ValueKey('host-request-offer')), findsNothing);
    expect(
      find.text('Zoya Merchant gets a notification · then Ishaan Bose'),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('host-request-let-in')));
    expect(letIn, _zoya);
    await tester.tap(find.byKey(const ValueKey('host-request-decline')));
    expect(declined, _zoya);
  });

  testWidgets('a waitlisted person is offered a spot, not decided', (
    tester,
  ) async {
    HostRequest? offered;
    await _pump(tester, [_nikhil], onOffer: (row) => offered = row);
    expect(find.byKey(const ValueKey('host-request-let-in')), findsNothing);
    expect(find.byKey(const ValueKey('host-request-decline')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('host-request-offer')));
    expect(offered, _nikhil);
  });

  testWidgets('a live offer cannot be offered again', (tester) async {
    await _pump(tester, [
      _row(
        'nikhil',
        HostRequestKind.waitlist,
        position: 1,
        offerExpiresAt: DateTime(2026, 11, 3, 12),
      ),
    ], onOffer: (_) => fail('The offer is still live'));
    await tester.tap(find.byKey(const ValueKey('host-request-offer')));
  });

  testWidgets('filters narrow the queue and the selection follows', (
    tester,
  ) async {
    await _pump(tester, [_zoya, _ishaan, _nikhil]);
    await tester.tap(
      find.byKey(const ValueKey('host-requests-filter-waitlist')),
    );
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('host-request-offer')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-request-trivia_zoya')),
      findsNothing,
    );
  });

  testWidgets('when a decision removes someone, the next person takes over', (
    tester,
  ) async {
    await _pump(tester, [_zoya, _ishaan]);
    await tester.tap(find.byKey(const ValueKey('host-request-trivia_ishaan')));
    await pumpFeatureUi(tester);
    await _pump(tester, [_zoya]);
    expect(
      find.byKey(const ValueKey('host-request-detail-trivia_zoya')),
      findsOneWidget,
    );
  });

  testWidgets('on a phone the detail opens over the list and comes back', (
    tester,
  ) async {
    await _pump(tester, [_zoya, _ishaan], width: 390);
    expect(find.byKey(const ValueKey('host-request-let-in')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('host-request-trivia_ishaan')));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('host-request-let-in')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-request-back')));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('host-request-let-in')), findsNothing);
  });

  testWidgets('someone with no public name still reads as a person', (
    tester,
  ) async {
    await _pump(tester, [_row('x', HostRequestKind.request)]);
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
