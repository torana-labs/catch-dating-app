// Marketing capture `event_success_companion_micro_pod_assignment`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/event_success_companion_capture.dart';

final eventSuccessCompanionMicroPodAssignmentCapture = ScreenCaptureEntry(
  id: 'event_success_companion_micro_pod_assignment',
  routeIds: const <String>['eventSuccessCompanionScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.checkedIn'],
  providerOverrides: eventSuccessCompanionProviderOverrides(),
  builder: (context) => eventSuccessCompanionCapture(
    participation: EventSuccessCompanionFixtures.attendedParticipation(),
    assignment: EventSuccessCompanionFixtures.microPodAssignment,
    assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
    now: EventSuccessCompanionFixtures.socialStart.subtract(
      const Duration(hours: 1),
    ),
  ),
);
