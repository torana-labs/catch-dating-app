// Marketing capture `host_door_in`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/hosts/door/door_state.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/door_capture.dart';

final hostDoorInCapture = ScreenCaptureEntry(
  id: 'host_door_in',
  routeIds: const <String>['hostEventRosterScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostMarketingIndia.host.doorCheckedIn'],
  providerOverrides: doorCaptureOverrides(),
  builder: (context) => doorCapture(filter: DoorFilter.checkedIn),
);
