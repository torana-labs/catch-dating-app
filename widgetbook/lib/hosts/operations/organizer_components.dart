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

Widget _hostOrganizerExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId: 'component.host.club.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostComponentFrame(child: _hostOrganizerPreviewFor(focus)),
      ),
    ],
  );
}

Widget _hostOrganizerPreviewFor(String focus) {
  final organizer = HostOperationsFixtures.primaryOrganizer;
  final events =
      HostOperationsFixtures.eventsByOrganizer[organizer.id] ?? const <Event>[];
  final metricItems = [
    const HostOrganizerMetricItem(value: '188', label: 'Members'),
    const HostOrganizerMetricItem(value: '4.6', label: 'Rating'),
  ];
  final team = organizer.displayHostProfiles;
  final payment = HostOperationsFixtures.readyPaymentAccount;
  return switch (focus) {
    'HostClubInsightsSection' => HostOrganizerInsightsSection(organizer: organizer),
    'HostClubOrganizerSectionList' => HostOrganizerSectionList(organizer: organizer),
    'HostClubEditBody' => HostOrganizerEditBody(
      organizer: organizer,
      currentUid: widgetbookHostUid,
      isOwner: true,
    ),
    'HostEventsClubCard' => HostEventsOrganizerCard(
      organizer: organizer,
      onEventEntrySelected: (_, _, _) {},
      onManageEvent: (_, _) {},
      now: HostOperationsFixtures.now,
      sessionBoundary: HostOperationsFixtures.now,
    ),
    'HostOrganizerMetricGrid' => HostOrganizerMetricGrid(
      organizer: organizer,
      eventsLoaded: true,
      eventCount: events.length,
      activeEventCount: events.where((event) => !event.isCancelled).length,
    ),
    'HostOrganizerMetricRow' => HostOrganizerMetricRow(items: metricItems),
    'HostPaymentAccountCard' => HostPaymentAccountCard(
      organizer: organizer,
      account: payment,
    ),
    'HostPaymentAccountControllerCard' => HostPaymentAccountControllerCard(
      organizer: organizer,
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
      organizer: organizer,
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
  type: HostOrganizerInsightsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerInsightsSectionCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostClubInsightsSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerSectionList,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerSectionListCatalogStates(
  BuildContext context,
) => _hostOrganizerExactCatalog(context, 'HostClubOrganizerSectionList');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerEditBody,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerEditBodyCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostClubEditBody');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPaymentAccountSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPaymentAccountSectionCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostPaymentAccountSection');

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostOrganizerEventDefaultsScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerEventDefaultsScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostOrganizerEventDefaultsScreen(
        clubId: HostOperationsFixtures.primaryOrganizer.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostOrganizerLiveGuideScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerLiveGuideScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostOrganizerLiveGuideScreen(
        clubId: HostOperationsFixtures.primaryOrganizer.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostOrganizerTeamScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerTeamScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostOrganizerTeamScreen(clubId: HostOperationsFixtures.primaryOrganizer.id),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostOrganizerPaymentsScreen,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerPaymentsScreenLoaded(BuildContext context) =>
    WidgetbookHostShellScope(
      child: HostOrganizerPaymentsScreen(
        clubId: HostOperationsFixtures.primaryOrganizer.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Resolver states',
  type: HostOrganizerSpokeAsyncBoundary,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerSpokeResolverStates(BuildContext context) =>
    hostOrganizerEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Canonical scaffold',
  type: HostOrganizerSpokeScaffold,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerSpokeScaffoldStates(BuildContext context) =>
    hostOrganizerEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Optimistic editor',
  type: HostOrganizerDefaultsEditor,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerDefaultsEditorStates(BuildContext context) =>
    hostOrganizerEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Co-host read only',
  type: HostOrganizerReadOnlyDefaultsSection,
  path: '[P1 product surfaces]/Host operations/Club settings spokes',
)
Widget hostOrganizerReadOnlyEventDefaultsStates(BuildContext context) =>
    hostOrganizerEventDefaultsScreenLoaded(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventsOrganizerCard,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventsOrganizerCardCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostEventsClubCard');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerMetricGrid,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerMetricGridCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostOrganizerMetricGrid');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostOrganizerMetricRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostOrganizerMetricRowCatalogStates(BuildContext context) =>
    _hostOrganizerExactCatalog(context, 'HostOrganizerMetricRow');

@widgetbook.UseCase(
  name: 'Audience rollup states',
  type: HostCrmAudienceCard,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostCrmAudienceCardStates(BuildContext context) {
  final summary = widgetbookHostCrmSummary(
    HostOperationsFixtures.primaryOrganizer.id,
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
  type: HostOrganizerPublicationChannelRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostOrganizerPublicationChannelRowStates(BuildContext context) =>
    widgetbookHostComponentStates('HostClubPublicationChannelRow', [
      (
        'visible',
        const HostOrganizerPublicationChannelRow(
          label: 'Catch app',
          status: 'Visible',
          visible: true,
        ),
      ),
      (
        'hidden',
        const HostOrganizerPublicationChannelRow(
          label: 'Public web page',
          status: 'Hidden',
          visible: false,
        ),
      ),
    ]);
