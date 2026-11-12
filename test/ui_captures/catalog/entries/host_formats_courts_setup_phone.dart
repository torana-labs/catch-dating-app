// Marketing capture `host_formats_courts_setup_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_platform/app_config.dart';
import '../../../hosts/live/formats/formats_captures.dart';
import '../screen_capture_entry.dart';
import '../shared/app_role_capture.dart';
import '../shared/host_live_capture.dart';
import '../shared/host_shell_capture_overrides.dart';

final hostFormatsCourtsSetupPhoneCapture = ScreenCaptureEntry(
  id: 'host_formats_courts_setup_phone',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: hostLivePhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCourtsSetup',
  ],
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ...hostFormatsCaptureOverrides(),
  ],
  builder: (context) => AppRoleCapture(
    role: AppRole.host,
    child: hostFormatsCourtsSetupCapture(),
  ),
);
