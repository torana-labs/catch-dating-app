// Marketing capture `host_insights_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_screen.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/door_capture.dart';
import '../shared/host_insights_capture.dart';
import '../shared/host_routed_shell_capture.dart';
import '../shared/host_shell_capture_overrides.dart';

// Thirty days of the organiser's page in Catch Host: bookings each week, the
// best nights, and where visitors came from.
final hostInsightsPhoneCapture = ScreenCaptureEntry(
  id: 'host_insights_phone',
  routeIds: const <String>['hostOrganizersScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostOrganizer.insights'],
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ...hostOperationsProviderOverrides(
      hostedOrganizers: [hostTodayOrganizer],
      ownedOrganizers: [hostTodayOrganizer],
      analyticsRepository: HostFixtureAnalyticsRepository(
        report: hostInsightsReport(),
      ),
    ),
  ],
  builder: (context) => HostRoutedShellCapture(
    initialLocation: '/host/organizer',
    activeIndex: 4,
    child: HostInsightsScreen(initialOrganizerId: hostTodayOrganizer.id),
  ),
);
