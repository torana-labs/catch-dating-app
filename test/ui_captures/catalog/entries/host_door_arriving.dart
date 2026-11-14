// Marketing capture `host_door_arriving`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/door_capture.dart';

final hostDoorArrivingCapture = ScreenCaptureEntry(
  id: 'host_door_arriving',
  routeIds: const <String>['hostEventRosterScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostMarketingIndia.host.doorArriving'],
  providerOverrides: doorCaptureOverrides(),
  builder: (context) => doorCapture(),
);
