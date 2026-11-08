import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
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
}
