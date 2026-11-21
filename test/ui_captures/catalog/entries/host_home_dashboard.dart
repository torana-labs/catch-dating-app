// Marketing capture `host_home_dashboard`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
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
          ..._marketingHostWeekEvents,
        ]),
      },
      attentionByOrganizer: {
        marketingHostOrganizer.id: _marketingHostTodayAttention,
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

/// The rest of the host's week, so Today shows more than tonight: a quiz
/// brunch tomorrow and a trivia night on Tuesday.
final _marketingHostWeekEvents = [
  for (final (id, name, days, hours) in const [
    ('host-marketing-india-sunday-brunch', 'Sunday Quiz Brunch', 1, -7),
    ('host-marketing-india-tuesday-trivia', 'Tuesday Trivia Night', 3, 0),
  ])
    _marketingHostTodayEvent.copyWith(
      id: id,
      name: name,
      startTime: _marketingHostTodayEvent.startTime.add(
        Duration(days: days, hours: hours),
      ),
      endTime: _marketingHostTodayEvent.endTime.add(
        Duration(days: days, hours: hours),
      ),
    ),
];

/// What needs the host before doors: two people waiting on a decision about
/// their application to the organiser's members' list.
final _marketingHostTodayAttention = [
  for (final (index, name) in const ['Tara Menon', 'Ishaan Bose'].indexed)
    HostAttentionItem(
      id: 'marketing-today-application-$index',
      kind: HostAttentionKind.applicationReview,
      scope: HostAttentionScope.application,
      sourceOwner: HostAttentionSourceOwner.organizerApplications,
      sourceId: 'marketing-today-application-$index',
      sourceRevision: 'capture-1',
      eventId: null,
      status: HostAttentionStatus.open,
      consequence: HostAttentionConsequence.delaysResponse,
      blocking: false,
      urgency: HostAttentionUrgency.soon,
      destination: HostAttentionDestination(
        route: HostAttentionDestinationRoute.hostApplications,
        applicationId: 'marketing-today-application-$index',
      ),
      context: HostAttentionContext(subjectLabel: name),
      dedupeKey: 'applicationReview:marketing-today-application-$index',
      policyVersion: 1,
      resolutionVersion: 1,
      assignedHostUid: null,
      openedAt: hostMarketingIndiaScenario
          .clock('today')
          .subtract(Duration(hours: 3 + index * 2)),
      dueAt: _marketingHostTodayEvent.startTime,
      expiresAt: null,
    ),
];
