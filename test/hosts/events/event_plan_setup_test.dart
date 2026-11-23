import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_fixtures.dart';

void main() {
  test('the plan carries its setup for before the night', () async {
    final plan = eventsPlan().copyWith(
      targetAttendeeCount: 24,
      layoutId: 'harbour-room',
    );
    final container = ProviderContainer.test(
      overrides: [
        watchEventProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(tonightEvent)),
        watchEventSuccessPlanProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(plan)),
      ],
    );
    container.listen(hostEventPlanControllerProvider(eventsRequest), (_, _) {});
    await flushTestEventQueue();
    final state = container.read(
      hostEventPlanControllerProvider(eventsRequest),
    );

    expect(state.targetAttendees, 24);
    expect(state.layoutId, 'harbour-room');
    expect(state.organizerId, tonightEvent.organizerId);
    final capacity = plan.hostDraft
        .normalizeForFormat(tonightEvent.eventFormat)
        .playbook
        .capacity;
    expect(state.capacityMin, capacity.min);
    expect(state.capacityMax, capacity.max);
    expect(
      state.readinessIssues,
      plan.hostDraft
          .normalizeForFormat(tonightEvent.eventFormat)
          .readinessIssues,
    );
  });

  testWidgets('the setup shows under the night options', (tester) async {
    tester.view.physicalSize = const Size(390, 3000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchScreen(
            bodyScrolls: false,
            body: HostEventPlanBody(
              state: planReady(),
              options: const {},
              onOption: (_, _) {},
              onRetry: () {},
              setup: const [SizedBox(key: ValueKey('setup'), height: 40)],
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      tester.getTopLeft(find.byKey(const ValueKey('setup'))).dy,
      greaterThan(tester.getTopLeft(find.text('On the night')).dy),
    );
  });
}
