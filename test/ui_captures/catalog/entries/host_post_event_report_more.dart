// Marketing capture `host_post_event_report_more`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/hosts/insights/host_event_report_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import '../../../test_pump_helpers.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_host_live.dart';
import '../shared/marketing_host_organizer.dart';
import '../shared/marketing_host_report_data.dart';
import '../shared/marketing_host_report_event.dart';

/// The same report as `host_post_event_report`, scrolled to what guests said
/// and the offer to bring this crowd back to the next event, so a page that
/// shows the report twice shows two different parts of it.
final hostPostEventReportMoreCapture = ScreenCaptureEntry(
  id: 'host_post_event_report_more',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.postEventReportMore',
  ],
  providerOverrides: [
    ...marketingHostManageOverrides(
      marketingHostReportEvent,
      complete: true,
      reviews: marketingHostReportReviews,
    ),
    ...marketingHostReportOverrides(marketingHostReportEvent),
  ],
  builder: (context) => HostEventReportScreen(
    organizer: marketingHostOrganizer,
    event: marketingHostReportEvent,
    now: hostMarketingIndiaScenario.clock('followUp'),
  ),
  drive: (tester) async {
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey<String>('host-event-report-bring-back')),
      240,
      scrollable: findVerticalScrollable(
        within: find.byKey(
          const ValueKey<String>('host-event-report-scroll-view'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  },
);
