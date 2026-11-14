// Marketing capture `host_programme_reconcile_desktop`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/programmes/planner/planner_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostProgrammeReconcileDesktopCapture = ScreenCaptureEntry(
  id: 'host_programme_reconcile_desktop',
  routeIds: const <String>['hostProgramWorkspaceScreen'],
  device: CaptureDevice.auditDesktop,
  marketingFixtureKeys: const <String>[
    'weddingsPilot.planner.reconcileDesktop',
  ],
  providerOverrides: plannerCaptureOverrides(),
  builder: (context) => plannerReconcileCapture(),
);
