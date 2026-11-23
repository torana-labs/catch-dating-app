import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_room_body.dart';
import 'package:catch_dating_app/hosts/live/live_room_map_controller.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'live_fixtures.dart';

const _tables = EventSuccessStructureConfig(
  unitKind: EventSuccessUnitKind.tables,
  unitSize: 6,
  topology: EventSuccessTopology.sequence,
  resourceCapacity: EventSuccessResourceCapacity(
    concurrentUnits: 4,
    resourceLabelId: EventSuccessResourceLabelId.table,
    seatsPerUnit: 6,
  ),
);

EventSuccessPlan _plan({
  String? layoutId,
  EventSuccessStructureConfig? config,
}) {
  final plan = EventSuccessPlan.defaultForEvent(
    liveEvent,
    now: liveEvent.startTime,
  );
  return plan.copyWith(
    layoutId: layoutId,
    structureConfig: config ?? plan.structureConfig,
  );
}

EventRunOfShowStep _step(List<String> modules) => EventRunOfShowStep(
  stage: EventSuccessStage.opening,
  title: 'Tables',
  hostInstruction: 'Seat everyone',
  attendeeExperience: 'Find your table',
  durationMinutes: 20,
  moduleIds: modules,
);

EventSuccessAssignment _seat(String uid, String moduleId) =>
    EventSuccessAssignment(
      id: '$moduleId-$uid',
      eventId: liveEvent.id,
      organizerId: liveEvent.organizerId,
      uid: uid,
      moduleId: moduleId,
      label: 'Table 1',
      displayTitle: 'Table 1',
      peerUids: const [],
      source: 'generated',
      createdAt: liveEvent.startTime,
      updatedAt: liveEvent.startTime,
    );

void main() {
  setUpAll(loadCatchTestFonts);

  test('a saved layout seats guests unless the whole group is one unit', () {
    expect(
      hostLiveSeatsByLayout(_plan(layoutId: 'room-1', config: _tables)),
      isTrue,
    );
    expect(hostLiveSeatsByLayout(_plan(config: _tables)), isFalse);
    expect(hostLiveSeatsByLayout(null), isFalse);
  });

  test('a seated night runs on the live console', () {
    expect(
      hostLiveConsoleFits(
        liveEvent,
        plan: _plan(layoutId: 'room-1', config: _tables),
      ),
      isTrue,
    );
  });

  test('the map shows rotation seats while a rotation step is on', () {
    final groups = [_seat('u-asha', 'micro_pods')];
    final rotations = [
      _seat('u-asha', EventSuccessModuleCatalog.guidedRotations.id),
    ];
    final rotating = [
      _step(const ['micro_pods']),
      _step([EventSuccessModuleCatalog.guidedRotations.id]),
    ];

    expect(
      hostLiveRoomSeats(
        steps: rotating,
        activeStepIndex: 1,
        groups: groups,
        rotations: rotations,
      ),
      rotations,
    );
    expect(
      hostLiveRoomSeats(
        steps: rotating,
        activeStepIndex: 0,
        groups: groups,
        rotations: rotations,
      ),
      groups,
    );
    // No rotation seats yet: the tables stay on the map.
    expect(
      hostLiveRoomSeats(
        steps: rotating,
        activeStepIndex: 1,
        groups: groups,
        rotations: const [],
      ),
      groups,
    );
  });

  testWidgets('the room shows its seat map under the tables', (tester) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          theme: CatchThemeMode.night,
          child: CatchScreen(
            body: HostLiveRoomBody(
              state: liveState(
                units: const [
                  HostLiveUnit(label: 'Table 1', seated: 4, size: 6),
                ],
              ),
              onView: (_) {},
              seatMap: const SizedBox(
                key: ValueKey<String>('seat-map'),
                height: 120,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byKey(const ValueKey('seat-map')), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Table 1')).dy,
      lessThan(tester.getTopLeft(find.byKey(const ValueKey('seat-map'))).dy),
    );
  });

  testWidgets('a phone offers Room when the night is seated', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          theme: CatchThemeMode.night,
          child: CatchScreen(
            body: HostLiveBody(
              state: liveState(
                units: const [
                  HostLiveUnit(label: 'Table 1', seated: 4, size: 6),
                ],
              ),
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
              seats: true,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Room'), findsOneWidget);
  });
}
