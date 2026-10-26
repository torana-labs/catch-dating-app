import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/events/data/event_live_position_service.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/domain/event_participation_roster.dart';
import 'package:catch_dating_app/events/domain/event_private_access.dart';
import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_display_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_live_location_field.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_manage_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_private_access_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_roster_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'manage_fixture.dart';
import 'preview.dart';

Widget _hostEventManageExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId:
        'component.host.event_manage.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: _HostManageComponentFrame(
          child: _hostEventManagePreviewFor(context, focus),
        ),
      ),
    ],
  );
}

Widget _hostEventManagePreviewFor(BuildContext context, String focus) {
  final event = HostOperationsFixtures.privateEvent;
  final club = HostOperationsFixtures.primaryClub;
  final roster = EventParticipationRoster.fromParticipations(
    HostOperationsFixtures.participations,
  );
  final viewModel = _hostAttendanceViewModel();
  final profiles = _hostAttendeeProfiles();
  final inviteCode = HostOperationsFixtures.privateAccess.inviteCode;
  final inviteLink = AppDeepLinks.event(
    clubId: club.id,
    eventId: event.id,
    inviteCode: inviteCode,
  ).toString();
  final filters = const [
    HostRosterFilterSpec(
      filter: HostRosterFilter.all,
      label: 'All',
      value: 3,
      tone: CatchBadgeTone.neutral,
    ),
    HostRosterFilterSpec(
      filter: HostRosterFilter.booked,
      label: 'Booked',
      value: 2,
      tone: CatchBadgeTone.success,
    ),
    HostRosterFilterSpec(
      filter: HostRosterFilter.waitlist,
      label: 'Waitlist',
      value: 1,
      tone: CatchBadgeTone.warning,
    ),
  ];
  return switch (focus) {
    'HostActionRow' => HostActionRow(
      label: 'Edit event details',
      detail: 'Schedule / location',
      onTap: () {},
    ),
    'HostEventActionsSection' => HostEventActionsSection(
      club: club,
      event: event,
      actionState: HostEventActionDisplayState.resolve(
        event: event,
        roster: roster,
        l10n: context.l10n,
        cancelEventPending: false,
        deleteEventPending: false,
      ),
      actionError: null,
      privateLinkActionState: HostPrivateLinkActionState.resolve(
        l10n: context.l10n,
        accessState: CatchAsyncState<EventPrivateAccess?>.data(
          HostOperationsFixtures.privateAccess,
        ),
        inviteLinksState: CatchAsyncState<List<EventInviteLink>>.data(
          HostOperationsFixtures.inviteLinks,
        ),
        inviteLink: inviteLink,
        sharePending: false,
      ),
      onEditEvent: () {},
      onCancelEvent: () async {},
      onDeleteEvent: () async {},
      onSharePrivateLink: (_) {},
    ),
    'Live attendance participants' => HostEventParticipantsSection(
      mode: HostEventParticipantsMode.live,
      eventId: event.id,
    ),
    'HostEventParticipantsSectionList' => HostEventParticipantsSectionList(
      viewModel: viewModel,
      mode: HostEventParticipantsMode.live,
      scrollable: false,
      showSummaryHeader: true,
      initialSearchQuery: '',
      profileLookupState: HostParticipantProfilesLookupState(
        status: HostParticipantProfilesLookupStatus.ready,
        profileIds: viewModel.profileIds,
        profiles: profiles,
      ),
      mutationState: HostParticipantsMutationDisplayState.resolve(
        markAttendancePendingIds: const {},
        approveJoinRequestPendingIds: const {},
        declineJoinRequestPendingIds: const {},
        createWaitlistOfferPendingIds: const {},
        bulkWaitlistOfferPending: false,
        opsReportPending: false,
        revenueReportPending: false,
      ),
      actions: HostParticipantLifecycleActions(
        openProfile: (_) {},
        approveJoinRequest: (_) {},
        declineJoinRequest: (_) {},
        toggleAttendance: (_) {},
        createWaitlistOffers: (_) {},
        shareOpsReport: () async {},
        shareRevenueReport: () async {},
      ),
      onRetryProfiles: () {},
    ),
    'HostEventParticipantsSection' => HostEventParticipantsSection(
      eventId: event.id,
      mode: HostEventParticipantsMode.setup,
    ),
    'HostEventCheckInQrSection' => HostEventCheckInQrSection(event: event),
    'HostEventRosterSection' => SizedBox(
      width: 360,
      height: 520,
      child: HostEventRosterSection(
        bookedCount: roster.bookedCount,
        onClose: () {},
        child: const Center(child: Text('Guest roster content')),
      ),
    ),
    'HostEventSummarySection' => HostEventSummarySection(
      club: club,
      event: event,
    ),
    'HostEventSummaryRow' => HostEventSummaryRow(
      icon: CatchIcons.location,
      label: 'Meet',
      value: 'Carter Road Jetty',
    ),
    'HostCapacitySection' => HostCapacitySection(event: event, roster: roster),
    'HostFullCapacityBanner' => const HostFullCapacityBanner(),
    'HostInviteLinkRow' => HostInviteLinkRow(
      event: event,
      inviteCode: inviteCode,
      link: HostOperationsFixtures.inviteLinks.first,
      actionsDisabled: false,
      onCopyInviteLink: (_) {},
      onDisableInviteLink: (_) {},
    ),
    'HostInviteLinksSection' => HostInviteLinksSection(
      event: event,
      inviteCode: inviteCode,
      linksAsync: AsyncData<List<EventInviteLink>>(
        HostOperationsFixtures.inviteLinks,
      ),
      state: HostInviteLinksListDisplayState.resolve(
        createPending: false,
        copyPending: false,
        disablePending: false,
      ),
      mutationError: null,
      onRetry: () {},
      onCreateInviteLink: (_) async {},
      onCopyInviteLink: (_) {},
      onDisableInviteLink: (_) {},
    ),
    'HostParticipationLifecycleSection' => HostParticipationLifecycleSection(
      viewModel: viewModel,
      mode: HostEventParticipantsMode.live,
      profiles: profiles,
      scrollable: false,
      showHeader: true,
      usesRequestApproval: false,
      mutationState: HostParticipantsMutationDisplayState.resolve(
        markAttendancePendingIds: const {},
        approveJoinRequestPendingIds: const {},
        declineJoinRequestPendingIds: const {},
        createWaitlistOfferPendingIds: const {},
        bulkWaitlistOfferPending: false,
        opsReportPending: false,
        revenueReportPending: false,
      ),
      actions: HostParticipantLifecycleActions(
        openProfile: (_) {},
        approveJoinRequest: (_) {},
        declineJoinRequest: (_) {},
        toggleAttendance: (_) {},
        createWaitlistOffers: (_) {},
        shareOpsReport: () async {},
        shareRevenueReport: () async {},
      ),
      searchQuery: '',
      selectedFilter: HostRosterFilter.all,
      onSearchChanged: (_) {},
      onFilterChanged: (_) {},
    ),
    'HostPrivateAccessSection' => Consumer(
      builder: (context, ref, _) {
        final shareMutation = ref.watch(
          HostEventManageController.sharePrivateLinkMutation,
        );
        return HostPrivateAccessSection(
          event: event,
          state: HostPrivateAccessDisplayState.resolve(
            l10n: context.l10n,
            access: HostOperationsFixtures.privateAccess,
            inviteLinksState: CatchAsyncState<List<EventInviteLink>>.data(
              HostOperationsFixtures.inviteLinks,
            ),
            inviteLink: inviteLink,
            sharePending: shareMutation.isPending,
          ),
          inviteLinksAsync: AsyncData<List<EventInviteLink>>(
            HostOperationsFixtures.inviteLinks,
          ),
          shareMutation: shareMutation,
          inviteLinksListState: HostInviteLinksListDisplayState.resolve(
            createPending: false,
            copyPending: false,
            disablePending: false,
          ),
          inviteLinksMutationError: null,
          onRetryInviteLinks: () {},
          onSharePrivateLink: (_) {},
          onCreateInviteLink: (_) async {},
          onCopyInviteLink: (_) {},
          onDisableInviteLink: (_) {},
        );
      },
    ),
    'HostPrivateAccessAsyncBoundary' => Consumer(
      builder: (context, ref, _) => HostPrivateAccessAsyncBoundary(
        club: club,
        event: event,
        accessAsync: AsyncData<EventPrivateAccess?>(
          HostOperationsFixtures.privateAccess,
        ),
        inviteLinksAsync: AsyncData<List<EventInviteLink>>(
          HostOperationsFixtures.inviteLinks,
        ),
        shareMutation: ref.watch(
          HostEventManageController.sharePrivateLinkMutation,
        ),
        inviteLinksListState: HostInviteLinksListDisplayState.resolve(
          createPending: false,
          copyPending: false,
          disablePending: false,
        ),
        inviteLinksMutationError: null,
        onRetryPrivateAccess: () {},
        onRetryInviteLinks: () {},
        onSharePrivateLink: (_) {},
        onCreateInviteLink: (_) async {},
        onCopyInviteLink: (_) {},
        onDisableInviteLink: (_) {},
      ),
    ),
    'HostPrivateAccessSurface' => const HostPrivateAccessSurface(
      child: Text('Private access preview shell'),
    ),
    'HostPublicRegistrationField' => Consumer(
      builder: (context, ref, _) => HostPublicRegistrationField(
        club: club,
        event: event,
        mutation: ref.watch(
          HostEventBookingController.publicRegistrationMutation,
        ),
        onChanged: (_) {},
      ),
    ),
    'HostRosterFilterHeader' => HostRosterFilterHeader(
      title: 'Participation',
      subtitle: 'Review booking status before launch.',
      filters: filters,
      selectedFilter: HostRosterFilter.all,
      onFilterChanged: (_) {},
    ),
    'HostRosterSearchField' => HostRosterSearchField(
      value: '',
      label: 'Search roster',
      onChanged: (_) {},
    ),
    'HostWaitlistBulkOfferNotice' => HostWaitlistBulkOfferNotice(
      count: 1,
      candidateCount: 3,
      isPending: false,
      onOffer: () {},
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostParticipationLifecycleSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostParticipationLifecycleSectionCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostParticipationLifecycleSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostRosterFilterHeader,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostRosterFilterHeaderCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostRosterFilterHeader');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostRosterSearchField,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostRosterSearchFieldCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostRosterSearchField');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostWaitlistBulkOfferNotice,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostWaitlistBulkOfferNoticeCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostWaitlistBulkOfferNotice');

AttendanceSheetViewModel _hostAttendanceViewModel() {
  final value = buildAttendanceSheetViewModel(
    eventAsync: AsyncData<Event?>(HostOperationsFixtures.privateEvent),
    participationsAsync: AsyncData<List<EventParticipation>>(
      HostOperationsFixtures.participations,
    ),
  );
  return value.asData!.value!;
}

Map<String, (String, String?)> _hostAttendeeProfiles() {
  return const {
    HostOperationsFixtures.guestUid: ('Aarav Mehta', null),
    HostOperationsFixtures.secondGuestUid: ('Rhea Kapoor', null),
    HostOperationsFixtures.waitlistUid: ('Kabir Jain', null),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostActionRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostActionRowCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostActionRow');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventRosterSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventRosterPanelCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventRosterSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventActionsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventActionsSectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventActionsSection');

@widgetbook.UseCase(
  name: 'Live attendance catalog',
  type: HostEventParticipantsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventAttendancePanelCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'Live attendance participants');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventManageRouteScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventManageRouteScreenCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostEventManageRouteScreen');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventParticipantsSectionList,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventParticipantsSectionListCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostEventParticipantsSectionList');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventParticipantsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventParticipantsPanelCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostEventParticipantsSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventSummarySection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventSummarySectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventSummarySection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventSummaryRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventSummaryRowCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventSummaryRow');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventCheckInQrSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventCheckInQrSectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostEventCheckInQrSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostCapacitySection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostCapacitySectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostCapacitySection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostFullCapacityBanner,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostFullCapacityBannerCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostFullCapacityBanner');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostInviteLinkRow,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostInviteLinkRowCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostInviteLinkRow');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostInviteLinksSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostInviteLinksSectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostInviteLinksSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPrivateAccessAsyncBoundary,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPrivateAccessAsyncBoundaryCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostPrivateAccessAsyncBoundary');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPrivateAccessSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPrivateAccessSectionCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostPrivateAccessSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPrivateAccessSurface,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPrivateAccessSurfaceCatalogStates(BuildContext context) =>
    _hostEventManageExactCatalog(context, 'HostPrivateAccessSurface');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPublicRegistrationField,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPublicRegistrationFieldCatalogStates(
  BuildContext context,
) => _hostEventManageExactCatalog(context, 'HostPublicRegistrationField');

class _HostManageComponentFrame extends StatelessWidget {
  const _HostManageComponentFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookHostDeviceFrame(
      child: WidgetbookHostManageRouteScope(
        child: WidgetbookHostComponentScaffold(child: child),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Operator location sharing',
  type: HostEventLiveLocationField,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostEventLiveLocationFieldStates(BuildContext context) {
  final plan = RouteEventPlan.socialRun.copyWith(
    liveTrackingPolicy: const RouteLiveTrackingPolicy(
      mode: RouteLiveTrackingMode.authorizedOperators,
      staleAfterSeconds: 120,
      retentionMinutes: 15,
    ),
  );
  final event = HostOperationsFixtures.upcomingEvent.copyWith(
    eventFormat: EventFormatSnapshot.fromActivityKind(
      ActivityKind.socialRun,
      activityDetails: {'routePlan': plan.toJson()},
    ),
  );
  return widgetbookHostComponentStates('HostEventLiveLocationField', [
    (
      'sharing off',
      ProviderScope(
        overrides: [
          eventLivePositionPublisherProvider.overrideWithValue(
            const _PreviewLivePositionPublisher(),
          ),
        ],
        child: CatchSection.fieldRows(
          first: true,
          children: [HostEventLiveLocationField(event: event)],
        ),
      ),
    ),
  ]);
}

class _PreviewLivePositionPublisher implements EventLivePositionPublisher {
  const _PreviewLivePositionPublisher();

  @override
  Future<void> publish({
    required String eventId,
    required EventLivePositionSample position,
  }) async {}

  @override
  Future<void> stop({required String eventId}) async {}
}
