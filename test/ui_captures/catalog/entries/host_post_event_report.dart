// Marketing capture `host_post_event_report`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/hosts/insights/host_event_report_screen.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_host_live.dart';
import '../shared/marketing_host_organizer.dart';
import '../shared/marketing_host_report_event.dart';

final hostPostEventReportCapture = ScreenCaptureEntry(
  id: 'host_post_event_report',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.postEventReport',
  ],
  providerOverrides: marketingHostManageOverrides(
    marketingHostReportEvent,
    complete: true,
  ),
  builder: (context) => HostEventReportScreen(
    organizer: marketingHostOrganizer,
    event: marketingHostReportEvent,
    now: hostMarketingIndiaScenario.clock('followUp'),
  ),
);
