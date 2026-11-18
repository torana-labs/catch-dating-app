import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_tools_screen.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import '../../support/catch_test_fonts.dart';
import 'formats/formats_fixtures.dart';
import 'live_fixtures.dart';

Future<void> _pump(WidgetTester tester, Widget body) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(body: body),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  setUpAll(loadCatchTestFonts);

  test('every night gets settings and the queues; moving nights get more', () {
    expect(hostLiveTools(liveEvent), [
      HostLiveTool.settings,
      HostLiveTool.help,
      HostLiveTool.deliveries,
    ]);
    // Located stops bring departures and checkpoints.
    expect(hostLiveTools(crawlEvent), contains(HostLiveTool.movement));

    final paced = buildEvent(
      eventFormat: EventFormatSnapshot.fromActivityKind(
        ActivityKind.socialRun,
        activityDetails: {
          'routePlan': RouteEventPlan.socialRun
              .copyWith(
                paceGroups: const [
                  RoutePaceGroup(
                    id: 'steady',
                    label: 'Steady',
                    sortOrder: 0,
                    targetPaceSecondsPerKm: 390,
                  ),
                ],
              )
              .toJson(),
        },
      ),
    );
    expect(hostLiveTools(paced), contains(HostLiveTool.groups));
    expect(hostLiveTools(paced), isNot(contains(HostLiveTool.movement)));
  });

  testWidgets('the live console opens night tools', (tester) async {
    var opened = 0;
    await _pump(
      tester,
      HostLiveBody(
        state: liveState(),
        now: liveEvent.startTime,
        onView: (_) {},
        onNext: () {},
        onBack: () {},
        onFinish: () {},
        onOpenNeed: (_) {},
        onAllNeeds: () {},
        onEnterScores: () {},
        onMessage: () {},
        onRetry: () {},
        onTools: () => opened++,
      ),
    );

    await tester.ensureVisible(find.byKey(const ValueKey('host-live-tools')));
    await tester.tap(find.byKey(const ValueKey('host-live-tools')));
    expect(opened, 1);
  });

  testWidgets('the run console opens night tools', (tester) async {
    var opened = 0;
    await _pump(
      tester,
      HostFormatsRunBody(
        state: const HostFormatsRunState(status: HostFormatsRunStatus.running),
        now: DateTime(2026, 11, 8, 7),
        onAccounted: (_) {},
        onCall: (_) {},
        onClose: () {},
        onRetry: () {},
        onTools: () => opened++,
      ),
    );

    await tester.ensureVisible(find.byKey(const ValueKey('formats-run-tools')));
    await tester.tap(find.byKey(const ValueKey('formats-run-tools')));
    expect(opened, 1);
  });
}
