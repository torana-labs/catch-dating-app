import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_success_screen.dart';
import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  testWidgets('dispatches the event-created celebration effect once', (
    tester,
  ) async {
    final effects = _FakeCelebrationEffectsController();

    await pumpEventsTestApp(
      tester,
      CreateEventSuccessScreen(
        club: buildClub(),
        event: buildEvent(id: 'event-created'),
        onManageEvent: () {},
        onDone: () {},
      ),
      overrides: [
        celebrationEffectsControllerProvider.overrideWithValue(effects),
      ],
    );

    expect(effects.playedKinds, [CelebrationMomentKind.eventCreated]);
  });
}

class _FakeCelebrationEffectsController extends CelebrationEffectsController {
  final List<CelebrationMomentKind> playedKinds = [];

  @override
  Future<void> play(CelebrationMomentKind kind) async {
    playedKinds.add(kind);
  }
}
