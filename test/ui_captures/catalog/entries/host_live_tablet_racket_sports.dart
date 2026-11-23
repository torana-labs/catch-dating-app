// Marketing capture `host_live_tablet_racket_sports`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_platform/app_config.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';

import '../screen_capture_entry.dart';
import '../shared/app_role_capture.dart';
import '../shared/host_live_capture.dart';
import '../shared/host_shell_capture_overrides.dart';
import '../shared/marketing_vertical_live.dart';

final _night = marketingVerticalNights['racket-sports']!;

/// The live console on a tablet mid-way through a padel mixer.
final hostLiveTabletRacketSportsCapture = ScreenCaptureEntry(
  id: 'host_live_tablet_racket_sports',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: hostLiveTablet,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.liveTabletRacketSports',
  ],
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ..._night.overrides,
  ],
  builder: (context) =>
      AppRoleCapture(role: AppRole.host, child: _night.capture()),
);
