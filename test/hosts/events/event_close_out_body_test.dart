import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('the after-closing switches show and flip', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final flipped = <String>[];
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          child: CatchScreen(
            bodyScrolls: false,
            body: HostEventCloseOutBody(
              state: closeOutReady(),
              marks: const {},
              onMark: (_, _) {},
              onRetry: () {},
              options: const {HostEventCloseOutOption.thankYou: true},
              onOption: (option, on) => flipped.add('${option.name} $on'),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('After closing'), findsOneWidget);
    expect(find.text('Send the thank-you at 10 AM'), findsOneWidget);
    expect(find.text('Open stay-in-touch picks'), findsOneWidget);
    expect(find.text('Tell no-shows about next week'), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.byKey(
          const ValueKey<String>('host-event-close-out-stayInTouchPicks'),
        ),
        matching: find.byType(CatchToggleInput),
      ),
    );
    expect(flipped, ['stayInTouchPicks true']);
  });

  test('a saved close-out reads back as its switches', () {
    final closeOut = EventCloseOut.fromFirestore(const {
      'revision': 2,
      'thankYou': {'sendAtLocal': '10:00', 'sendAtMs': 1, 'momentId': 'm'},
      'openStayInTouchPicks': true,
      'noShowNote': false,
    });
    expect(closeOut.revision, 2);
    final state = HostEventCloseOutState(
      status: HostEventCloseOutStatus.ready,
      closeOut: closeOut,
    );
    expect(state.options, {
      HostEventCloseOutOption.thankYou: true,
      HostEventCloseOutOption.stayInTouchPicks: true,
      HostEventCloseOutOption.noShowNote: false,
    });
    expect(EventCloseOut.fromFirestore(null).revision, 0);
  });

  testWidgets('a recorded no-show stays marked and the report counts it', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final ready = closeOutReady();
    final state = HostEventCloseOutState(
      status: ready.status,
      eventTitle: ready.eventTitle,
      came: ready.came,
      booked: ready.booked,
      unchecked: ready.unchecked,
      report: const EventAttendanceReport(
        attended: 26,
        recordedNoShows: 1,
        unreviewed: 1,
        notExpected: 3,
        noShowAttendeeIds: {'a-neel'},
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          child: CatchScreen(
            bodyScrolls: false,
            body: HostEventCloseOutBody(
              state: state,
              marks: const {},
              onMark: (_, _) {},
              onRetry: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.textContaining('Check the 1 people'), findsOneWidget);
    expect(find.text('Attendance report'), findsOneWidget);
    expect(find.text('Not marked yet'), findsOneWidget);
    expect(find.text('Waitlist or cancelled'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });

  test('a stored report reads its counts and who did not come', () {
    final report = EventAttendanceReport.fromFirestore(const {
      'organizerId': 'o1',
      'eventId': 'e1',
      'version': 1,
      'view': {
        'counts': {
          'attended': 4,
          'recordedNoShow': {'hostConfirmed': 1, 'guestDeclined': 1},
          'unresolved': {
            'unreviewed': 2,
            'cleared': 1,
            'sourceChanged': 0,
            'superseded': 0,
          },
          'notExpected': {
            'invited': 0,
            'waitlisted': 1,
            'cancelled': 0,
            'eventCancelled': 0,
          },
        },
        'members': [
          {
            'attendeeId': 'a1',
            'classification': {'kind': 'attended'},
          },
          {
            'attendeeId': 'a2',
            'classification': {
              'kind': 'recordedNoShow',
              'evidence': 'hostConfirmed',
            },
          },
        ],
      },
    })!;
    expect(report.attended, 4);
    expect(report.recordedNoShows, 2);
    expect(report.unreviewed, 3);
    expect(report.notExpected, 1);
    expect(report.noShowAttendeeIds, {'a2'});
    expect(EventAttendanceReport.fromFirestore(null), isNull);
    expect(EventAttendanceReport.fromFirestore(const {'view': 1}), isNull);
  });
}
