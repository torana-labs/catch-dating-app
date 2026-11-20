// Marketing capture `host_live_console`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/hosts/live/live_screen.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_host_live.dart';
import '../shared/marketing_host_organizer.dart';

final hostLiveConsoleCapture = ScreenCaptureEntry(
  id: 'host_live_console',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>['hostMarketingIndia.host.liveConsole'],
  providerOverrides: marketingHostManageOverrides(marketingHostLiveEvent),
  builder: (context) => HostLiveScreen(
    organizer: marketingHostOrganizer,
    event: marketingHostLiveEvent,
    onBack: () {},
    onOpenGuests: () {},
    now: hostMarketingIndiaScenario.clock('live'),
  ),
);
