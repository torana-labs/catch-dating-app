// Marketing capture `host_automations_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/people/people_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostAutomationsPhoneCapture = ScreenCaptureEntry(
  id: 'host_automations_phone',
  routeIds: const <String>['hostAudienceAutomationsScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostAudience.people.automations'],
  providerOverrides: hostPeopleCaptureOverrides(),
  builder: (context) => hostAutomationsCapture(),
);
