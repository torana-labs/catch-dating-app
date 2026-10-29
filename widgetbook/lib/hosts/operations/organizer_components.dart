import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_card.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_team_management_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'shell_fixture.dart';

Widget _hostClubExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId: 'component.host.club.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostComponentFrame(child: _hostClubPreviewFor(focus)),
      ),
    ],
  );
}

Widget _hostClubPreviewFor(String focus) {
  final club = HostOperationsFixtures.primaryClub;
  final events =
      HostOperationsFixtures.eventsByClub[club.id] ?? const <Event>[];
  final metricItems = [
    const HostOrganizerMetricItem(value: '188', label: 'Members'),
    const HostOrganizerMetricItem(value: '4.6', label: 'Rating'),
  ];
  final team = club.displayHostProfiles;
  final payment = HostOperationsFixtures.readyPaymentAccount;
  return switch (focus) {
    'HostClubInsightsSection' => HostClubInsightsSection(club: club),
    'HostClubOrganizerSectionList' => HostClubOrganizerSectionList(club: club),
    'HostClubEditBody' => HostClubEditBody(
      club: club,
      currentUid: widgetbookHostUid,
      isOwner: true,
    ),
    'HostEventsClubCard' => HostEventsClubCard(
      club: club,
      onEventEntrySelected: (_, _, _) {},
      onManageEvent: (_, _) {},
      now: HostOperationsFixtures.now,
      sessionBoundary: HostOperationsFixtures.now,
    ),
    'HostOrganizerMetricGrid' => HostOrganizerMetricGrid(
      club: club,
      eventsLoaded: true,
      eventCount: events.length,
      activeEventCount: events.where((event) => !event.isCancelled).length,
    ),
    'HostOrganizerMetricRow' => HostOrganizerMetricRow(items: metricItems),
    'HostPaymentAccountCard' => HostPaymentAccountCard(
      club: club,
      account: payment,
    ),
    'HostPaymentAccountControllerCard' => HostPaymentAccountControllerCard(
      club: club,
    ),
    'HostPaymentAccountSection' => HostPaymentAccountSection(
      accounts: [payment],
      recommendedProvider: HostPaymentProvider.razorpay,
      actionErrorMessage: null,
      onboardingPending: false,
      refreshPending: false,
      onShowPayoutsHandoff: (_, _, _) async {},
      onRefresh: (_) async {},
    ),
    'HostPaymentAccountErrorCard' => HostPaymentAccountErrorCard(
      error: StateError('Widgetbook payout status failed'),
      onRetry: () {},
    ),
    'HostPaymentAccountLoadingCard' => const HostPaymentAccountLoadingCard(),
    'HostTeamManagementSection' => HostTeamManagementSection(
      club: club,
      currentUid: widgetbookHostUid,
      canManage: true,
    ),
    'HostTeamOwnerHostRow' => HostTeamOwnerHostRow(
      host: team.first,
      canManage: true,
      onTransfer: () {},
      onRemove: () {},
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostClubInsightsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostClubInsightsSectionCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostClubInsightsSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostClubOrganizerSectionList,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostClubOrganizerSectionListCatalogStates(
  BuildContext context,
) => _hostClubExactCatalog(context, 'HostClubOrganizerSectionList');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostClubEditBody,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostClubEditBodyCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostClubEditBody');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPaymentAccountSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPaymentAccountSectionCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostPaymentAccountSection');

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostClubEventDefaultsScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubEventDefaultsScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostClubEventDefaultsScreen(
        clubId: HostOperationsFixtures.primaryClub.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostClubLiveGuideScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubLiveGuideScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostClubLiveGuideScreen(
        clubId: HostOperationsFixtures.primaryClub.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostClubTeamScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubTeamScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostClubTeamScreen(clubId: HostOperationsFixtures.primaryClub.id),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostClubPaymentsScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubPaymentsScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostClubPaymentsScreen(
        clubId: HostOperationsFixtures.primaryClub.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Resolver states',
  type: HostClubSpokeAsyncBoundary,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubSpokeResolverStates(BuildContext context) =>
    hostClubEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Canonical scaffold',
  type: HostClubSpokeScaffold,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubSpokeScaffoldStates(BuildContext context) =>
    hostClubEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Optimistic editor',
  type: HostClubDefaultsEditor,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubDefaultsEditorStates(BuildContext context) =>
    hostClubEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Co-host read only',
  type: HostClubReadOnlyDefaultsSection,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostClubReadOnlyEventDefaultsStates(BuildContext context) =>
    hostClubEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventsClubCard,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventsClubCardCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostEventsClubCard');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerMetricGrid,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerMetricGridCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostOrganizerMetricGrid');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerMetricRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerMetricRowCatalogStates(BuildContext context) =>
    _hostClubExactCatalog(context, 'HostOrganizerMetricRow');

@widgetbook.UseCase(
  name: 'Audience rollup states',
  type: HostCrmAudienceCard,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostCrmAudienceCardStates(BuildContext context) {
  final summary = widgetbookHostCrmSummary(
    HostOperationsFixtures.primaryClub.id,
  );
  return widgetbookHostComponentStates('HostCrmAudienceCard', [
    (
      'loaded',
      HostCrmAudienceCard(
        summary: summary,
        loading: false,
        hasError: false,
        onRetry: () {},
      ),
    ),
    (
      'loading',
      HostCrmAudienceCard(
        summary: null,
        loading: true,
        hasError: false,
        onRetry: () {},
      ),
    ),
    (
      'unavailable',
      HostCrmAudienceCard(
        summary: null,
        loading: false,
        hasError: true,
        onRetry: () {},
      ),
    ),
  ]);
}

@widgetbook.UseCase(
  name: 'Channel readiness',
  type: HostCrmChannelRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostCrmChannelRowStates(BuildContext context) =>
    widgetbookHostComponentStates('HostCrmChannelRow', [
      (
        'live channel',
        const HostCrmChannelRow(
          label: 'Catch app',
          value: '92 linked',
          status: 'Live for the current event',
        ),
      ),
      (
        'setup required',
        const HostCrmChannelRow(
          label: 'WhatsApp',
          value: '74 opted in',
          status: 'Connect a WhatsApp sender to message them',
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Publication status',
  type: HostClubPublicationChannelRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostClubPublicationChannelRowStates(BuildContext context) =>
    widgetbookHostComponentStates('HostClubPublicationChannelRow', [
      (
        'visible',
        const HostClubPublicationChannelRow(
          label: 'Catch app',
          status: 'Visible',
          visible: true,
        ),
      ),
      (
        'hidden',
        const HostClubPublicationChannelRow(
          label: 'Public web page',
          status: 'Hidden',
          visible: false,
        ),
      ),
    ]);
