// Marketing capture `host_programme_inbox_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/planner/planner_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostProgrammeInboxPhoneCapture = ScreenCaptureEntry(
  id: 'host_programme_inbox_phone',
  routeIds: const <String>['hostProgramWorkspaceScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['weddingsPilot.planner.inbox'],
  providerOverrides: plannerCaptureOverrides(),
  builder: (context) => plannerInboxListCapture(),
);
