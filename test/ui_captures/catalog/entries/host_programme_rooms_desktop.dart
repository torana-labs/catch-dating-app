// Marketing capture `host_programme_rooms_desktop`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/planner/planner_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostProgrammeRoomsDesktopCapture = ScreenCaptureEntry(
  id: 'host_programme_rooms_desktop',
  routeIds: const <String>['hostProgramLodgingScreen'],
  device: CaptureDevice.auditDesktop,
  marketingFixtureKeys: const <String>['weddingsPilot.planner.roomsDesktop'],
  providerOverrides: plannerCaptureOverrides(),
  builder: (context) => plannerRoomsCapture(),
);
