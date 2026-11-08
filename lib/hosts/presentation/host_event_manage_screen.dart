import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show
        EventSuccessAssignment,
        EventSuccessHostSection,
        EventSuccessHostTab,
        EventSuccessSpatialPreview,
        EventSuccessSpatialReassign;
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_entry_field.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_screen.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_roster_summary.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_live_location_field.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_manage_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_private_access_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_reviews_panel.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_roster_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_staff_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

export 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart'
    show HostEventManageSection;

part 'host_event_manage_actions.dart';
part 'host_event_manage_route_screen.dart';

CatchAsyncState<T>? _nullableCatchAsyncState<T>(AsyncValue<T>? value) =>
    value == null ? null : catchAsyncStateFromAsyncValue(value);

class HostEventManageScreen extends ConsumerStatefulWidget {
  const HostEventManageScreen({
    super.key,
    required this.organizer,
    required this.event,
    required this.onBackToSuccess,
    this.initialSection = HostEventManageSection.setup,
    this.onSectionChanged,
    this.initialSpatialSelectionUid,
    this.onPreviewSpatial,
    this.onReassignSpatial,
    this.onConfirmSpatial,
    this.onReleaseSpatial,
    this.initialParticipantSearchQuery = '',
    this.referenceNow,
  });

  final Organizer organizer;
  final Event event;
  final VoidCallback onBackToSuccess;
  final HostEventManageSection initialSection;
  final ValueChanged<HostEventManageSection>? onSectionChanged;
  final String? initialSpatialSelectionUid;
  final EventSuccessSpatialPreview? onPreviewSpatial;
  final EventSuccessSpatialReassign? onReassignSpatial;
  final Future<void> Function(EventSuccessAssignment assignment)?
  onConfirmSpatial;
  final Future<void> Function(EventSuccessAssignment assignment)?
  onReleaseSpatial;
  final String initialParticipantSearchQuery;

  /// A deterministic clock used by captures and lifecycle-focused tests.
  /// Production callers leave this null and use the device clock.
  final DateTime? referenceNow;

  @override
  ConsumerState<HostEventManageScreen> createState() =>
      _HostEventManageScreenState();
}

class _HostEventManageScreenState extends ConsumerState<HostEventManageScreen> {
  @override
  Widget build(BuildContext context) {
    final organizer = widget.organizer;
    final event = widget.event;
    final now = widget.referenceNow ?? DateTime.now();
    final screenState = HostEventManageScreenState.resolve(
      event: event,
      requestedSection: widget.initialSection,
      now: now,
    );
    final onBackToSuccess = widget.onBackToSuccess;
    // A night in one room runs on the live console; a night that moves keeps
    // the movement console below.
    if (widget.initialSection != HostEventManageSection.guests &&
        screenState.phase == HostEventWorkspacePhase.runtime &&
        hostLiveConsoleFits(
          event,
          plan: ref.watch(watchEventSuccessPlanProvider(event.id)).value,
        )) {
      return HostLiveScreen(
        organizer: organizer,
        event: event,
        onBack: onBackToSuccess,
        onOpenGuests: _openRoster,
        now: widget.referenceNow,
      );
    }
    final rosterAsync = ref.watch(
      watchEventParticipationRosterProvider(event.id),
    );
    final roster = catchAsyncStateFromAsyncValue(rosterAsync).value;
    final bookedCount = hostManageBookedCount(event, roster);
    final operationalAttendees =
        screenState.phase == HostEventWorkspacePhase.runtime
        ? catchAsyncStateFromAsyncValue(
            ref.watch(watchEventAttendeesProvider(event.id)),
          ).value
        : null;
    final operationalRosterSummary = hostEventManageOperationalRosterSummary(
      operationalAttendees,
    );
    final cancelMutation = ref.watch(
      HostEventBookingController.hostCancelEventMutation,
    );
    final deleteMutation = ref.watch(
      HostEventBookingController.deleteEventMutation,
    );
    final publicRegistrationMutation = ref.watch(
      HostEventBookingController.publicRegistrationMutation,
    );
    final isInviteOnly = event.effectiveEventPolicy.usesInviteOnly;
    final accessAsync = isInviteOnly
        ? ref.watch(watchEventPrivateAccessProvider(event.id))
        : null;
    final inviteLinksAsync = isInviteOnly
        ? ref.watch(watchEventInviteLinksProvider(event.id))
        : null;
    final shareMutation = ref.watch(
      HostEventManageController.sharePrivateLinkMutation,
    );
    final createInviteLinkMutation = ref.watch(
      HostEventManageController.createInviteLinkMutation,
    );
    final copyInviteLinkMutation = ref.watch(
      HostEventManageController.copyInviteLinkMutation,
    );
    final disableInviteLinkMutation = ref.watch(
      HostEventManageController.disableInviteLinkMutation,
    );
    final actionState = HostEventActionDisplayState.resolve(
      event: event,
      roster: roster,
      l10n: context.l10n,
      cancelEventPending: cancelMutation.isPending,
      deleteEventPending: deleteMutation.isPending,
    );
    final privateAccessState = _nullableCatchAsyncState(accessAsync);
    final inviteLinksState = _nullableCatchAsyncState(inviteLinksAsync);
    final privateLinkActionState = isInviteOnly
        ? HostPrivateLinkActionState.resolve(
            l10n: context.l10n,
            accessState: privateAccessState,
            inviteLinksState: inviteLinksState,
            inviteLink: hostEventInviteUrl(
              organizerId: organizer.id,
              eventId: event.id,
              inviteCode: privateAccessState?.value?.inviteCode,
            ),
            sharePending: shareMutation.isPending,
          )
        : null;
    final inviteLinksListState = HostInviteLinksListDisplayState.resolve(
      createPending: createInviteLinkMutation.isPending,
      copyPending: copyInviteLinkMutation.isPending,
      disablePending: disableInviteLinkMutation.isPending,
    );
    final inviteLinksMutationError = _firstMutationError([
      createInviteLinkMutation,
      copyInviteLinkMutation,
      disableInviteLinkMutation,
    ]);
    final actionError = _firstMutationError([cancelMutation, deleteMutation]);
    final hostActions = HostEventActionsSection(
      organizer: organizer,
      event: event,
      actionState: actionState,
      actionError: actionError,
      privateLinkActionState: privateLinkActionState,
      onManagePublication: event.setupRevision != null
          ? () => context.pushNamed(
              Routes.hostEventPublicationScreen.name,
              pathParameters: {
                'organizerId': organizer.id,
                'eventId': event.id,
              },
              extra: organizer,
            )
          : null,
      onEditEvent: () {
        unawaited(
          _handleHostEventActionIntent(
            HostEventManageActionIntent.editEvent,
            event: event,
            onDeleted: onBackToSuccess,
          ),
        );
      },
      onCancelEvent: () => _handleHostEventActionIntent(
        HostEventManageActionIntent.cancelEvent,
        event: event,
        onDeleted: onBackToSuccess,
      ),
      onDeleteEvent: () => _handleHostEventActionIntent(
        HostEventManageActionIntent.deleteEvent,
        event: event,
        onDeleted: onBackToSuccess,
      ),
      onSharePrivateLink: (inviteLink) => _shareHostPrivateLink(
        organizer: organizer,
        event: event,
        inviteLink: inviteLink,
      ),
    );
    final eventSuccessSetup = EventSuccessHostSection(
      event: event,
      referenceNow: now,
      showTabs: false,
      initialSpatialSelectionUid: widget.initialSpatialSelectionUid,
      onPreviewSpatial: widget.onPreviewSpatial,
      onReassignSpatial: widget.onReassignSpatial,
      onConfirmSpatial: widget.onConfirmSpatial,
      onReleaseSpatial: widget.onReleaseSpatial,
    );
    final workspaceChildren = switch (screenState.phase) {
      HostEventWorkspacePhase.preparation => <Widget>[
        if (hostShowsCapacityNotice(event)) ...[
          const HostFullCapacityBanner(),
          gapH12,
        ],
        HostCapacitySection(event: event, roster: roster),
        gapH20,
        HostEventSummarySection(
          organizer: organizer,
          event: event,
          title: context.l10n.hostsHostEventManagePreparationEventDetails,
        ),
        gapH20,
        CatchSection.fieldRows(
          title: context.l10n.hostsHostEventManagePreparationGuestSources,
          children: [
            HostPublicRegistrationField(
              organizer: organizer,
              event: event,
              mutation: publicRegistrationMutation,
              onChanged: (enabled) =>
                  _setPublicRegistration(event: event, enabled: enabled),
            ),
            HostGuestIntakeField(
              eventId: event.id,
              organizerId: event.organizerId,
              bookingProvider: event.eventOrigin?.provider,
              suggestedRevenueAmountMinor: event.priceInPaise,
              revenueCurrency: event.currency,
            ),
          ],
        ),
        if (event.effectiveEventPolicy.usesInviteOnly) ...[
          gapH20,
          HostPrivateAccessAsyncBoundary(
            organizer: organizer,
            event: event,
            accessAsync: accessAsync!,
            inviteLinksAsync: inviteLinksAsync!,
            shareMutation: shareMutation,
            inviteLinksListState: inviteLinksListState,
            inviteLinksMutationError: inviteLinksMutationError,
            onRetryPrivateAccess: () =>
                ref.invalidate(watchEventPrivateAccessProvider(event.id)),
            onRetryInviteLinks: () =>
                ref.invalidate(watchEventInviteLinksProvider(event.id)),
            onSharePrivateLink: (inviteLink) => _shareHostPrivateLink(
              organizer: organizer,
              event: event,
              inviteLink: inviteLink,
            ),
            onCreateInviteLink: (draft) => _createNamedInviteLink(
              event: event,
              inviteCode: privateLinkActionState!.inviteCode!,
              draft: draft,
            ),
            onCopyInviteLink: (link) => unawaited(
              _copyNamedInviteLink(
                event: event,
                inviteCode: privateAccessState!.value!.inviteCode,
                link: link,
              ),
            ),
            onDisableInviteLink: (link) =>
                unawaited(_disableNamedInviteLink(event: event, link: link)),
          ),
        ],
        gapH20,
        CatchSection.fieldRows(
          title: context.l10n.hostsHostEventManagePreparationTeamAccess,
          children: [HostEventStaffSection(eventId: event.id)],
        ),
        gapH20,
        CatchSection.fieldRows(
          children: [
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostEventRehearsalEntryTitle,
              body: context.l10n.hostEventRehearsalEntryBody,
              icon: CatchIcons.labs,
              emphasis: CatchFieldEmphasis.title,
              onTap: () => context.pushNamed(
                Routes.hostEventRehearsalStartScreen.name,
                pathParameters: {'organizerId': organizer.id},
                queryParameters: {'eventId': event.id},
              ),
            ),
            OrganizerMomentsEntryField(organizerId: organizer.id, event: event),
          ],
        ),
        gapH20,
        eventSuccessSetup,
        gapH20,
        hostActions,
      ],
      HostEventWorkspacePhase.runtime => <Widget>[
        if (event.eventFormat.routePlan?.liveTrackingPolicy.enabled ==
            true) ...[
          CatchSection.fieldRows(
            first: true,
            children: [HostEventLiveLocationField(event: event)],
          ),
          gapH20,
        ],
        EventSuccessHostSection(
          event: event,
          referenceNow: now,
          initialTab: EventSuccessHostTab.live,
          showTabs: false,
          compactLiveControls: true,
          operationalRosterSummary: operationalRosterSummary,
          onOpenGuests: () => _openRoster(),
          guestsWorkspaceSemanticLabel: context.l10n
              .hostsHostEventRosterDrawerOpen(count: bookedCount),
          initialSpatialSelectionUid: widget.initialSpatialSelectionUid,
          onPreviewSpatial: widget.onPreviewSpatial,
          onReassignSpatial: widget.onReassignSpatial,
          onConfirmSpatial: widget.onConfirmSpatial,
          onReleaseSpatial: widget.onReleaseSpatial,
        ),
      ],
      HostEventWorkspacePhase.recap => <Widget>[
        HostEventReviewsPanel(eventId: event.id),
        gapH20,
        EventSuccessHostSection(
          event: event,
          referenceNow: now,
          initialTab: EventSuccessHostTab.report,
          showTabs: false,
          initialSpatialSelectionUid: widget.initialSpatialSelectionUid,
          onPreviewSpatial: widget.onPreviewSpatial,
          onReassignSpatial: widget.onReassignSpatial,
          onConfirmSpatial: widget.onConfirmSpatial,
          onReleaseSpatial: widget.onReleaseSpatial,
        ),
        gapH20,
        CatchSection.fieldRows(
          first: true,
          children: [
            CatchField.control(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostEventManageReviewSetupTitle,
              body: context.l10n.hostsHostEventManageReviewSetupBody,
              contractExemption:
                  'Read and management disclosure for an existing event; it '
                  'does not submit a scalar field value.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  HostEventSummarySection(organizer: organizer, event: event),
                  gapH20,
                  hostActions,
                  gapH20,
                  eventSuccessSetup,
                ],
              ),
            ),
          ],
        ),
      ],
    };
    final rosterMode = switch (screenState.phase) {
      HostEventWorkspacePhase.preparation => HostEventParticipantsMode.setup,
      HostEventWorkspacePhase.runtime => HostEventParticipantsMode.live,
      HostEventWorkspacePhase.recap => HostEventParticipantsMode.report,
    };
    final rosterChildren = <Widget>[
      if (event.isExternalCompanion &&
          event.hasWebRuntime &&
          screenState.phase != HostEventWorkspacePhase.recap) ...[
        CatchSection.fieldRows(
          first: true,
          children: [
            CatchField.control(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostEventAttendancePanelTitleCheckInQr,
              contractExemption:
                  'Disclosure-only public runtime URL and QR; no editable '
                  'value is submitted or persisted.',
              body: context.l10n.hostsHostEventAttendancePanelBodyCheckInQr,
              icon: CatchIcons.qrCode,
              child: HostEventCheckInQrSection(event: event),
            ),
          ],
        ),
        gapH20,
      ],
      HostOperationalRosterSection(
        eventId: event.id,
        organizerId: event.organizerId,
        allowManualGuest: screenState.phase == HostEventWorkspacePhase.runtime,
        allowAttendanceChanges:
            screenState.phase != HostEventWorkspacePhase.recap,
        allowRuntimeClaimReview:
            screenState.phase == HostEventWorkspacePhase.runtime,
      ),
      if (!event.isExternalCompanion) ...[
        gapH20,
        HostEventParticipantsSection(
          eventId: event.id,
          mode: rosterMode,
          initialSearchQuery: widget.initialParticipantSearchQuery,
        ),
      ],
    ];
    final workspaceBody = screenState.phase == HostEventWorkspacePhase.runtime
        ? workspaceChildren.single
        : ListView(
            key: Key(
              context.l10n.hostsHostEventManageScreenBodyHostEventManageScroll,
            ),
            padding: CatchInsets.pageBody,
            children: workspaceChildren,
          );
    final topBarTitle = hostEventManageLifecycleLabel(
      context.l10n,
      event: event,
      phase: screenState.phase,
    );
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventManageController.sharePrivateLinkMutation],
      errorContext: AppErrorContext.event,
    );
    if (widget.initialSection == HostEventManageSection.guests) {
      return HostEventRosterSection(
        bookedCount: bookedCount,
        onClose: onBackToSuccess,
        onMessageGuests: () => _openEventMessages(organizer, event),
        child: ListView(
          key: const ValueKey('host-event-roster-scroll'),
          padding: CatchInsets.pageBody,
          children: rosterChildren,
        ),
      );
    }
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
        title: topBarTitle,
        subtitle: screenState.eventTitle,
        leading: CatchIconAction.toolbar(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: CatchIcons.back,
          onPressed: onBackToSuccess,
        ),
        actions: [
          CatchIconAction.toolbar(
            tooltip: context.l10n.eventChatTitle,
            icon: CatchIcons.chat,
            onPressed: () => context.pushNamed(
              Routes.eventChatScreen.name,
              pathParameters: {'eventId': event.id},
              queryParameters: {'organizerId': organizer.id},
            ),
          ),
          CatchTopBarPrimaryButton(
            label: context.l10n.hostsHostEventRosterDrawerTitle,
            icon: CatchIcons.people,
            onPressed: () => _openRoster(),
          ),
        ],
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.fullBleed(child: workspaceBody),
    );
  }
}

Object? _firstMutationError(Iterable<Object> mutations) =>
    mutations.whereType<MutationError>().firstOrNull?.error;
