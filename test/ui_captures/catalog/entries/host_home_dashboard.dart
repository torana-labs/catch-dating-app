// Marketi// Marketi// Marketing// Marketing // Marketing // Marketing capt// Marketing capture `// Marketing capture `host_home_dashboard`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/today/host_today_screen.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fixtures.dart';
import '../shared/host_routed_shell_capture.dart';
import '../shared/host_shell_capture_overrides.dart';
import '../shared/marketing_host_organizer.dart';

final hostHomeDashboardCapture = ScreenCaptureEntry(
  id: 'host_home_dashboard',
  routeIds: const <String>['hostHomeScreen', 'hostTodayScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.todayDashboard',
  ],
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ...hostOperationsProviderOverrides(
      hostedOrganizers: [marketingHostOrganizer],
      ownedOrganizers: [marketingHostOrganizer],
      organizerEvents: {
        marketingHostOrganizer.id: AsyncData<List<Event>>([
          _marketingHostTodayEvent,
        ]),
      },
    ),
  ],
  builder: (context) => HostRoutedShellCapture(
    initialLocation: '/host/today',
    activeIndex: 0,
    child: HostTodayScreen(
      initialOrganizerId: marketingHostOrganizer.id,
      now: hostMarketingIndiaScenario.clock('today'),
    ),
  ),
);
final _marketingHostTodayEvent = hostMarketingIndiaScenario.event(
  captureFixtures,
  'hostToday',
);
