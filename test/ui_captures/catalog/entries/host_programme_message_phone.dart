// Marketing capture `host_programme_message_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/planner/planner_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostProgrammeMessagePhoneCapture = ScreenCaptureEntry(
  id: 'host_programme_message_phone',
  routeIds: const <String>['hostProgramWorkspaceScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['weddingsPilot.planner.message'],
  providerOverrides: plannerCaptureOverrides(),
  builder: (context) => plannerMessageCapture(),
);
