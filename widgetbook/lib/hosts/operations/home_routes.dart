import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_screen.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_body.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_overview.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

final _longNameOwnerClub = HostOperationsFixtures.primaryClub.copyWith(
  id: 'design-host-long-owner-club',
  name: 'Bandra Sea Face Morning Run Club for New Members',
  area: 'Bandra West Promenade',
);

final _longNameCoHostedClub = HostOperationsFixtures.coHostedClub.copyWith(
  id: 'design-host-long-cohost-club',
  name: 'South Mumbai Rooftop Dinner Collective With Guest Hosts',
  area: 'Fort and Kala Ghoda',
);

final _longNameEvent = HostOperationsFixtures.upcomingEvent.copyWith(
  id: 'design-host-long-name-event',
  clubId: _longNameOwnerClub.id,
  meetingPoint: 'Bandra West Promenade amphitheatre',
  meetingLocation: HostOperationsFixtures.upcomingEvent.meetingLocation!
      .copyWith(name: 'Bandra West Promenade amphitheatre'),
);

@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostEventsScreen,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostTodayOverview,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostOrganizerAvatar,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostTodayEventSection,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostTodayEventMetricTile,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: CatchEmptyState,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host home route states',
  type: HostLoadingScreen,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostHomeRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostTodayScreen',
    contractId: 'screen.host.home',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(uid: null, child: HostTodayScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubsStream:
                HostOperationsFixtures.loadingStream<List<Club>>(),
            child: const HostTodayScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubsStream: HostOperationsFixtures.errorStream<List<Club>>(
              'Hosted clubs failed',
            ),
            child: const HostTodayScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs offline',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubsStream: Stream<List<Club>>.error(
              obviousOfflineException(),
              StackTrace.empty,
            ),
            child: const HostTodayScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events offline',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            clubEventStreams: {
              HostOperationsFixtures.dinnerClub.id: Stream<List<Event>>.error(
                obviousOfflineException(),
                StackTrace.empty,
              ),
            },
            child: HostTodayScreen(
              initialOrganizerId: HostOperationsFixtures.dinnerClub.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty host account',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [],
            ownedClubs: [],
            child: HostTodayScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'populated host dashboard',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(child: HostTodayScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'owner and co-host switcher',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: HostOperationsFixtures.clubs,
            ownedClubs: [
              HostOperationsFixtures.primaryClub,
              HostOperationsFixtures.dinnerClub,
            ],
            child: const HostTodayScreen(
              initialOrganizerId: 'design-host-cohost-club',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long club names',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [_longNameOwnerClub, _longNameCoHostedClub],
            ownedClubs: [_longNameOwnerClub],
            clubEventStreams: {
              _longNameOwnerClub.id: Stream<List<Event>>.value([
                _longNameEvent,
              ]),
              _longNameCoHostedClub.id: Stream<List<Event>>.value(const []),
            },
            child: HostTodayScreen(initialOrganizerId: _longNameOwnerClub.id),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'co-host empty events',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [HostOperationsFixtures.coHostedClub],
            ownedClubs: const [],
            child: const HostTodayScreen(
              initialOrganizerId: 'design-host-cohost-club',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookHostShellScope(child: HostTodayScreen()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookHostShellScope(child: HostTodayScreen()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: HostTodayScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route states',
  type: HostTodayScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostTodayScreenStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Covered by Today route states',
  type: HostTodayLoadedRoute,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayLoadedRouteStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Covered by Today route states',
  type: HostTodayBody,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayBodyStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Covered by Today route states',
  type: HostTodayHeader,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayHeaderStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Covered by Today route states',
  type: HostTodayOrganizerEmptyState,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayOrganizerEmptyStateStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Covered by Today route states',
  type: HostTodayEventMetadataRow,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayEventMetadataStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Navigation identity states',
  type: HostOrganizerAvatar,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostOrganizerIdentityPillStates(BuildContext context) {
  final club = HostOperationsFixtures.primaryClub.copyWith(
    profileImageUrl: 'assets/fixtures/club_hero_portrait.jpg',
  );
  return WidgetbookPageCatalogFrame(
    title: 'HostOrganizerAvatar',
    contractId: 'component.host.navigation.organizer-avatar',
    children: [
      WidgetbookPageStateCard(
        label: 'navigation avatar',
        child: WidgetbookHostHomeSectionFrame(
          child: Align(
            alignment: Alignment.centerLeft,
            child: HostOrganizerAvatar(
              club: club,
              size: CatchLayout.appShellNavigationIdentityExtent,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long-press switcher sheet',
        child: WidgetbookHostHomeSectionFrame(
          child: HostOrganizerSwitcherSheet(
            clubs: HostOperationsFixtures.clubs,
            selectedOrganizerId: club.id,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Long-press switcher states',
  type: HostOrganizerSwitcherSheet,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostOrganizerSwitcherSheetStates(BuildContext context) =>
    hostOrganizerIdentityPillStates(context);

@widgetbook.UseCase(
  name: 'Overview route states',
  type: HostTodayOverview,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayOverviewStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Operational spotlight states',
  type: HostTodayEventSection,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayEventSpotlightStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Operational metric states',
  type: HostTodayEventMetricTile,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostTodayEventMetricStates(BuildContext context) =>
    hostHomeRouteStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostLoadingScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostLoadingScreenCatalogStates(BuildContext context) =>
    hostHomeRouteStates(context);
