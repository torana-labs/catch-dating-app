import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: HostClubsScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostClubsRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubsScreen',
    contractId: 'screen.host.clubs',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(uid: null, child: HostClubsScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubsStream:
                HostOperationsFixtures.loadingStream<List<Club>>(),
            ownedClubsStream:
                HostOperationsFixtures.loadingStream<List<Club>>(),
            child: const HostClubsScreen(),
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
            child: const HostClubsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty organizer account',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [],
            ownedClubs: [],
            child: HostClubsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'consolidated edit workspace',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(child: HostClubsScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'payout account loading',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            paymentAccountValue: AsyncLoading<HostPaymentAccount?>(),
            child: HostClubsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'co-host read-only team workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [HostOperationsFixtures.coHostedClub],
            ownedClubs: const [],
            child: const HostClubsScreen(
              initialClubId: 'design-host-cohost-club',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'insights report',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostClubsScreen(
              initialClubId: HostOperationsFixtures.primaryClub.id,
              initialTab: HostClubTab.insights,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'consumer club preview',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostClubsScreen(initialTab: HostClubTab.preview),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: HostClubsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'co-host read-only team workspace / dark',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubs: [HostOperationsFixtures.coHostedClub],
            ownedClubs: const [],
            themeMode: ThemeMode.dark,
            child: const HostClubsScreen(
              initialClubId: 'design-host-cohost-club',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Loading, auth, error, and empty',
  type: HostOrganizerStateScaffold,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostOrganizerStateScaffoldStates(BuildContext context) {
  return hostClubsRouteStates(context);
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostClubsScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostClubsScreenCatalogStates(BuildContext context) =>
    hostClubsRouteStates(context);
