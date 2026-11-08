import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:catch_dating_app/hosts/door/door_scan_body.dart';
import 'package:catch_dating_app/hosts/door/door_scan_screen.dart';
import 'package:catch_dating_app/hosts/door/door_scan_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _dev = HostDoorGuest(
  attendeeId: 'dp',
  name: 'Dev Patel',
  status: HostDoorGuestStatus.checkedIn,
  firstTime: true,
  paidMinor: 99800,
  paidCurrency: 'INR',
);

Future<void> _pump(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('the scanner shows the tool bar, the count, the finder and the '
      'line under it', (tester) async {
    var closed = 0;
    await _pump(
      tester,
      DoorScanScreen(
        eventId: 'tonight',
        checkedIn: 19,
        expected: 26,
        camera: const SizedBox.expand(key: ValueKey<String>('camera')),
        onClose: () => closed++,
      ),
    );

    expect(find.text('Scan tickets'), findsOneWidget);
    expect(find.text('19 of 26 in'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('camera')), findsOneWidget);
    expect(find.text('Point at the ticket on their phone'), findsOneWidget);
    expect(find.byType(CatchSheet), findsNothing);

    await tester.tap(find.byTooltip('Close the scanner'));
    expect(closed, 1);
  });

  testWidgets('a scan result shows the success sheet with the stats, Next '
      'ticket and Undo', (tester) async {
    var next = 0;
    var undo = 0;
    await _pump(
      tester,
      DoorScanScreen(
        eventId: 'tonight',
        checkedIn: 20,
        expected: 26,
        camera: const SizedBox.expand(),
        onClose: () {},
        result: _dev,
        onNext: () => next++,
        onUndo: () => undo++,
      ),
    );

    expect(find.byType(DoorScanResultSheet), findsOneWidget);
    expect(find.text('Checked in'), findsOneWidget);
    expect(find.text('Dev Patel'), findsOneWidget);
    expect(find.text('₹998'), findsOneWidget);
    expect(find.text('New'), findsOneWidget);

    await tester.tap(find.text('Next ticket'));
    await tester.tap(find.text('Undo'));
    expect(next, 1);
    expect(undo, 1);
    // One place: the sheet does not count places.
    expect(find.text('places'), findsNothing);
  });

  testWidgets('a ticket that holds several places says how many', (
    tester,
  ) async {
    await _pump(
      tester,
      DoorScanScreen(
        eventId: 'tonight',
        checkedIn: 20,
        expected: 26,
        camera: const SizedBox.expand(),
        onClose: () {},
        result: const HostDoorGuest(
          attendeeId: 'dp',
          name: 'Dev Patel',
          status: HostDoorGuestStatus.checkedIn,
          partySize: 3,
        ),
      ),
    );

    expect(find.text('places'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('a code that checks nobody in says why', (tester) async {
    await _pump(
      tester,
      const CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(
          bodyScrolls: false,
          body: DoorScanBody(
            state: DoorScanState(
              checkedIn: 19,
              expected: 26,
              notice: DoorScanNotice.otherEvent,
            ),
            camera: SizedBox.expand(),
          ),
        ),
      ),
    );

    expect(find.text('That ticket is for another event.'), findsOneWidget);
  });

  test('scanner results map to what the door says', () {
    expect(doorScanNoticeFor(EventCheckInQrScanResult.ignored), isNull);
    expect(
      doorScanNoticeFor(EventCheckInQrScanResult.invalid),
      DoorScanNotice.notATicket,
    );
    expect(
      doorScanNoticeFor(EventCheckInQrScanResult.wrongEvent),
      DoorScanNotice.otherEvent,
    );
    expect(
      doorScanNoticeFor(EventCheckInQrScanResult.matchedVenueSession),
      DoorScanNotice.eventCode,
    );
    // A ticket is resolved by the door, not answered by the scanner.
    expect(doorScanNoticeFor(EventCheckInQrScanResult.matchedTicket), isNull);
  });
}
