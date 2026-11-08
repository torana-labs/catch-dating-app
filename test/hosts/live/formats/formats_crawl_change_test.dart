import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_crawl_change_sheet.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_crawl_move_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'formats_fixtures.dart';

HostFormatsCrawlState _changed() => hostFormatsCrawlState(
  event: crawlEvent,
  host: 'Night Shift Socials',
  attendees: crawlAttendees(),
  plan: EventSuccessPlan.defaultForEvent(crawlEvent, now: crawlNow).copyWith(
    liveControlRevision: 6,
    crawlStopChanges: const [
      EventSuccessCrawlStopChange(
        stopId: 'bonobo',
        title: 'The Daily',
        address: 'Bandra West',
        changedAtMs: 1,
      ),
    ],
  ),
);

Future<void> _pump(WidgetTester tester, Widget overlay) async {
  tester.view.physicalSize = const Size(390, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(body: const SizedBox.shrink(), overlay: overlay),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  test('a stop changed tonight replaces the published one', () {
    final state = _changed();
    final stop = state.stops.singleWhere((stop) => stop.changed);
    expect(stop.stop.id, 'bonobo');
    expect(stop.stop.title, 'The Daily');
    expect(stop.address, 'Bandra West');
    expect(stop.stop.location, isNull);
    expect(state.canChangeStops, isTrue);
    expect(
      hostFormatsCrawlState(
        event: crawlEvent,
        host: 'Host',
        attendees: crawlAttendees(),
      ).canChangeStops,
      isFalse,
    );
  });

  testWidgets('the move sheet says a stop changed and offers Change', (
    tester,
  ) async {
    final state = _changed();
    final stop = state.stops.singleWhere((stop) => stop.changed);
    var changes = 0;
    await _pump(
      tester,
      HostFormatsCrawlMoveSheet(
        from: state.stops[1],
        to: stop,
        host: 'Night Shift Socials',
        leave: HostFormatsLeave.now,
        onLeave: (_) {},
        onSend: (_) {},
        stopNumber: 3,
        onChange: () => changes++,
      ),
    );
    expect(find.text('Stop 3 changed: The Daily'), findsOneWidget);
    expect(
      find.text('Next stop: The Daily, Bandra West. We leave now.'),
      findsOneWidget,
    );
    await tester.tap(
      find.byKey(const ValueKey<String>('formats-crawl-change')),
    );
    expect(changes, 1);
  });

  testWidgets('the stop editor sends the new stop and its message', (
    tester,
  ) async {
    final state = _changed();
    final sent = <List<Object?>>[];
    await _pump(
      tester,
      HostFormatsCrawlChangeSheet(
        stop: state.stops[3],
        number: 4,
        onChange: (title, address, message) =>
            sent.add([title, address, message]),
      ),
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey<String>('formats-crawl-change-title')),
        matching: find.byType(EditableText),
      ),
      'Bastian',
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey<String>('formats-crawl-change-send')),
    );
    expect(sent.single[0], 'Bastian');
    expect(sent.single[2], 'Change of plan: stop 4 is now Bastian.');
  });
}
