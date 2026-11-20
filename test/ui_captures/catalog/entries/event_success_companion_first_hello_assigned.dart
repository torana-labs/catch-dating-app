// Marketing capture `event_success_companion_first_hello_assigned`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/event_success_companion_capture.dart';

final eventSuccessCompanionFirstHelloAssignedCapture = ScreenCaptureEntry(
  id: 'event_success_companion_first_hello_assigned',
  routeIds: const <String>['eventSuccessCompanionScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>['eventCompanion.guest.firstHello'],
  providerOverrides: eventSuccessCompanionProviderOverrides(),
  builder: (context) => eventSuccessCompanionCapture(
    plan: EventSuccessCompanionFixtures.firstHelloPlan,
    arrivalMission: EventSuccessCompanionFixtures.arrivalMission,
    now: EventSuccessCompanionFixtures.socialStart.subtract(
      const Duration(minutes: 5),
    ),
    onCompleteArrivalMission: (_, _) async {},
  ),
);
