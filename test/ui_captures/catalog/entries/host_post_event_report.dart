// Marketing capture `host_post_event_report`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
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
  builder: (context) => HostEventManageScreen(
    organizer: marketingHostOrganizer,
    event: marketingHostReportEvent,
    onBackToSuccess: () {},
    initialSection: HostEventManageSection.report,
    referenceNow: hostMarketingIndiaScenario.clock('followUp'),
  ),
);
