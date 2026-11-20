// Marketing capture `host_person_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/people/people_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostPersonPhoneCapture = ScreenCaptureEntry(
  id: 'host_person_phone',
  routeIds: const <String>['hostCustomerDetailScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostAudience.people.person'],
  providerOverrides: hostPeopleCaptureOverrides(),
  builder: (context) => hostPersonCapture(),
);
