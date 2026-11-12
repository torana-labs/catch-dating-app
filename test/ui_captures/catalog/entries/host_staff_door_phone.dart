// Marketing capture `host_staff_door_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/staff/staff_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostStaffDoorPhoneCapture = ScreenCaptureEntry(
  id: 'host_staff_door_phone',
  routeIds: const <String>['hostWorkDoorScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['weddingsPilot.staff.door'],
  providerOverrides: hostStaffCaptureOverrides(
    outbox: staffOfflineOutbox(),
    offline: true,
  ),
  builder: (context) => hostStaffDoorCapture(),
);
