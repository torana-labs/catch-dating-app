import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
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
  type: HostOrganizersScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOrganizersRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubsScreen',
    contractId: 'screen.host.clubs',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(uid: null, child: HostOrganizersScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedOrganizersStream:
                HostOperationsFixtures.loadingStream<List<Organizer>>(),
            ownedOrganizersStream:
                HostOperationsFixtures.loadingStream<List<Organizer>>(),
            child: const HostOrganizersScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedOrganizersStream: HostOperationsFixtures.errorStream<List<Organizer>>(
              'Hosted clubs failed',
            ),
            child: const HostOrganizersScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty organizer account',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedOrganizers: [],
            ownedOrganizers: [],
            child: HostOrganizersScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'consolidated edit workspace',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(child: HostOrganizersScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'payout account loading',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            paymentAccountValue: AsyncLoading<HostPaymentAccount?>(),
            child: HostOrganizersScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'co-host read-only team workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedOrganizers: [HostOperationsFixtures.coHostedOrganizer],
            ownedOrganizers: const [],
            child: const HostOrganizersScreen(
              initialOrganizerId: 'design-host-cohost-club',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'insights report',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostOrganizersScreen(
              initialOrganizerId: HostOperationsFixtures.primaryOrganizer.id,
              initialTab: HostOrganizerTab.insights,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'consumer club preview',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostOrganizersScreen(initialTab: HostOrganizerTab.preview),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: HostOrganizersScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'co-host read-only team workspace / dark',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedOrganizers: [HostOperationsFixtures.coHostedOrganizer],
            ownedOrganizers: const [],
            themeMode: ThemeMode.dark,
            child: const HostOrganizersScreen(
              initialOrganizerId: 'design-host-cohost-club',
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
  return hostOrganizersRouteStates(context);
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizersScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizersScreenCatalogStates(BuildContext context) =>
    hostOrganizersRouteStates(context);
