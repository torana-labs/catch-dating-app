// Marketing capture `host_people_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/people/people_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostPeoplePhoneCapture = ScreenCaptureEntry(
  id: 'host_people_phone',
  routeIds: const <String>['hostAudienceScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostAudience.people.list'],
  providerOverrides: hostPeopleCaptureOverrides(),
  builder: (context) => hostPeopleCapture(),
);
