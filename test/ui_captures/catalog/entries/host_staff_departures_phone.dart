// Marketing capture `host_staff_departures_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/staff/staff_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostStaffDeparturesPhoneCapture = ScreenCaptureEntry(
  id: 'host_staff_departures_phone',
  routeIds: const <String>['hostWorkHotelScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['weddingsPilot.staff.departures'],
  providerOverrides: hostStaffCaptureOverrides(),
  builder: (context) => hostStaffDeparturesCapture(),
);
