import 'dart:async';

import 'package:catch_dating_app/chats/chats.dart' show EventChatEntrySection;
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_profile_requirements.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_event_consent_controller.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventMessagePreferencesNavigationSection;
import 'package:catch_dating_app/events/presentation/attendee_event_share_controller.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_loading_skeleton.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/kernel/organizer_supply_capabilities.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_host_contact_controller.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart'
    as app_ops;
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'event_detail_screen_actions.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  const EventDetailScreen({
    super.key,
    required this.clubId,
    required this.eventId,
    this.initialEvent,
    this.inviteCode,
    this.inviteLinkId,
    this.presentationMode = EventDetailPresentationMode.standard,
    this.heroTag,
    this.attribution,
    this.enableMapNetworkTiles = true,
  });

  final String clubId;
  final String eventId;
  final Event? initialEvent;
  final String? inviteCode;
  final String? inviteLinkId;
  final EventDetailPresentationMode presentationMode;
  final Object? heroTag;
  final EventDetailAttribution? attribution;
  final bool enableMapNetworkTiles;

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen>
    with _EventDetailScreenActions {
  String? _recordedInviteLinkId;

  @override
  void initState() {
    super.initState();
    _recordInviteLinkOpen();
  }

  @override
  void didUpdateWidget(covariant EventDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventId != widget.eventId ||
        oldWidget.inviteLinkId != widget.inviteLinkId) {
      _recordInviteLinkOpen();
    }
  }

  void _recordInviteLinkOpen() {
    final inviteLinkId = widget.inviteLinkId?.trim();
    if (inviteLinkId == null || inviteLinkId.isEmpty) return;
    if (_recordedInviteLinkId ==
        context.l10n.eventsEventDetailScreenVisiblecopyEventidInvitelinkid(
          eventId: widget.eventId,
          inviteLinkId: inviteLinkId,
        )) {
      return;
    }
    _recordedInviteLinkId = context.l10n
        .eventsEventDetailScreenVisiblecopyEventidInvitelinkid(
          eventId: widget.eventId,
          inviteLinkId: inviteLinkId,
        );
    unawaited(
      ref
          .read(eventDetailControllerProvider.notifier)
          .recordInviteLinkOpenBestEffort(
            eventId: widget.eventId,
            inviteLinkId: inviteLinkId,
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vmAsync = ref.watch(eventDetailViewModelProvider(widget.eventId));
    final uidAsync = ref.watch(uidProvider);
    final vmState = _catchAsyncState(vmAsync);
    final uidState = _catchAsyncState(uidAsync);
    final vm = vmState.value;
    final resolvedOrganizerId = vm?.event.clubId ?? widget.clubId;
    final organizerAsync = ref.watch(fetchOrganizerProvider(resolvedOrganizerId));
    final organizerState = _catchAsyncState(organizerAsync);
    final isHostApp = AppConfig.appRole.isHost;

    if (vm != null) {
      if (vm.event.clubId != widget.clubId) {
        return CatchScaffold.workspace(
          body: SafeArea(
            child: CatchErrorState(
              title: context.l10n.eventsEventDetailScreenTitleEventNotFound,
              message: context.l10n.eventsEventDetailScreenMessageThisEventIsNo,
              actions: const [CatchErrorBackButton()],
            ),
          ),
        );
      }
      final now = DateTime.now();
      final sectionVisibility = eventDetailSectionVisibilityStateFrom(
        event: vm.event,
        participation: vm.participation,
        isHostApp: isHostApp,
        isHost: vm.isHost,
        now: now,
      );
      final isSpotlightDark =
          widget.presentationMode == EventDetailPresentationMode.spotlightDark;
      final style = _eventDetailSurfaceStyle(
        context,
        presentationMode: widget.presentationMode,
      );
      final saveMutation = ref.watch(
        EventDetailController.toggleSavedEventMutation,
      );
      final crossPathsConsentMutation = ref.watch(
        CrossPathsEventConsentController.setConsentMutation,
      );
      final crossPathsEligible = crossPathsEventConsentEligible(
        event: vm.event,
        participation: vm.participation,
        userProfile: vm.userProfile,
        now: now,
      );
      final crossPathsConsentReadable = vm.userProfile != null;
      final crossPathsConsentAsync = crossPathsConsentReadable
          ? ref.watch(
              watchCrossPathsEventConsentProvider(
                vm.event.id,
                vm.userProfile!.uid,
              ),
            )
          : null;
      final crossPathsConsentSnapshotState = crossPathsConsentAsync == null
          ? null
          : catchAsyncStateFromAsyncValue(crossPathsConsentAsync);
      final crossPathsConsentState = crossPathsEventConsentSectionStateFrom(
        eligibleToEnable: crossPathsEligible,
        loaded: crossPathsConsentSnapshotState?.hasData == true,
        enabled: crossPathsConsentSnapshotState?.value?.enabled == true,
        pending: crossPathsConsentMutation.isPending,
        unavailable: crossPathsConsentSnapshotState?.hasError == true,
      );
      final share = ref.watch(externalShareControllerProvider);
      final calendar = ref.watch(eventCalendarControllerProvider);
      final canOpenCompanion = eventDetailCanOpenCompanion(
        participation: vm.participation,
        showConsumerActions: sectionVisibility.showConsumerActions,
      );
      final companionState = eventDetailCompanionStateFrom(
        participation: vm.participation,
        showConsumerActions: sectionVisibility.showConsumerActions,
        planState: canOpenCompanion
            ? _catchAsyncState(
                ref.watch(watchEventSuccessPlanProvider(vm.event.id)),
              )
            : null,
      );
      final hostState = eventDetailHostStateFrom(
        l10n: context.l10n,
        organizerState: organizerState,
        currentUid: vm.userProfile?.uid,
        canMessageHost:
            sectionVisibility.showConsumerActions &&
            (organizerState.value?.supplyCapabilities.hostContactEnabled ?? false) &&
            vm.userProfile?.hasSocialReadyProfileOn(now) == true,
      );
      final socialState = eventDetailSocialStateFrom(
        event: vm.event,
        hasReviews: vm.reviews.isNotEmpty,
        userProfile: vm.userProfile,
        isAuthenticated: vm.isAuthenticated,
        renderAsHost: sectionVisibility.renderSocialAsHost,
        participation: vm.participation,
        now: now,
      );
      final informationState = eventDetailInformationStateFrom(
        event: vm.event,
        l10n: context.l10n,
      );

      if (vm.isAuthenticated) {
        ref.listen(EventBookingController.bookMutation, (prev, next) {
          final attribution = widget.attribution;
          if (attribution?.source == EventDetailAttributionSource.crossPaths &&
              prev?.isPending != true &&
              next.isPending) {
            ref
                .read(appAnalyticsProvider)
                .logEvent(
                  AnalyticsEvents.crossPathsBookingStarted,
                  parameters: {
                    AnalyticsParameters.eventId: vm.event.id,
                    AnalyticsParameters.surface: 'event_detail',
                    AnalyticsParameters.rankingVersion:
                        attribution!.rankingVersion,
                    AnalyticsParameters.reasonCodes: attribution.reasonCodes
                        .join(','),
                  },
                );
          }
          if (prev?.isPending == true && next.isSuccess) {
            if (attribution?.source ==
                EventDetailAttributionSource.crossPaths) {
              ref
                  .read(appAnalyticsProvider)
                  .logEvent(
                    AnalyticsEvents.crossPathsBookingCompleted,
                    parameters: {
                      AnalyticsParameters.eventId: vm.event.id,
                      AnalyticsParameters.surface: 'event_detail',
                      AnalyticsParameters.rankingVersion:
                          attribution!.rankingVersion,
                      AnalyticsParameters.reasonCodes: attribution.reasonCodes
                          .join(','),
                    },
                  );
            }
            showCatchNotice(
              context,
              context.l10n.eventsEventDetailScreenVisiblecopyBookingConfirmed,
            );
          }
        });
        ref.listen(EventBookingController.cancelMutation, (prev, next) {
          if (prev?.isPending == true && next.isSuccess) {
            showCatchNotice(
              context,
              context.l10n.eventsEventDetailScreenVisiblecopyBookingCancelled,
            );
          }
        });
      }

      void shareEvent(BuildContext buttonContext) => unawaited(
        _shareEvent(
          buttonContext,
          vm.event,
          share,
          ref.read(attendeeEventShareActionsProvider),
          vm.isAuthenticated && !vm.isHost,
          widget.inviteCode,
          widget.inviteLinkId,
        ),
      );

      listenToCatchMutationErrors(
        context,
        ref,
        mutations: [
          EventDetailController.toggleSavedEventMutation,
          CrossPathsEventConsentController.setConsentMutation,
        ],
        errorContext: AppErrorContext.event,
      );
      return CatchScaffold.workspace(
        backgroundColor: style.pageBackground,
        body: EventDetailBody(
          event: vm.event,
          userProfile: vm.userProfile,
          clubId: widget.clubId,
          reviews: vm.reviews,
          isAuthenticated: vm.isAuthenticated,
          sectionVisibility: sectionVisibility,
          isSaved: vm.isSaved,
          participation: vm.participation,
          savePending: saveMutation.isPending,
          surfaceStyle: style,
          onBack: () => Navigator.of(context).pop(),
          onShare: shareEvent,
          showAddToCalendar: _canAddEventToCalendar(
            event: vm.event,
            participation: vm.participation,
            isHost: sectionVisibility.renderSocialAsHost,
            now: now,
          ),
          onAddToCalendar: (buttonContext) =>
              unawaited(_addEventToCalendar(buttonContext, vm.event, calendar)),
          onToggleSaved: () => _toggleSavedEvent(
            context,
            event: vm.event,
            clubId: widget.clubId,
            userProfile: vm.userProfile,
            isAuthenticated: vm.isAuthenticated,
            isSaved: vm.isSaved,
            now: now,
          ),
          companionState: companionState,
          hostState: hostState,
          socialState: socialState,
          informationState: informationState,
          onLocationTap: () => context.pushNamed(
            Routes.eventLocationMapScreen.name,
            pathParameters: {
              context.l10n.eventsEventDetailScreenBodyEventid: vm.event.id,
            },
          ),
          onOpenCompanion: () => context.pushNamed(
            Routes.eventSuccessCompanionScreen.name,
            pathParameters: {
              context.l10n.eventsEventDetailScreenBodyOrganizerid: widget.clubId,
              context.l10n.eventsEventDetailScreenBodyEventid: vm.event.id,
            },
            extra: vm.event,
          ),
          onRetryCompanion: () =>
              ref.invalidate(watchEventSuccessPlanProvider(vm.event.id)),
          onViewOrganizer: (clubId) => context.pushNamed(
            eventDetailOrganizerRouteFor(isHostApp: isHostApp).name,
            pathParameters: {
              context.l10n.eventsEventDetailScreenBodyOrganizerid: clubId,
            },
          ),
          onMessageHost: (clubId, hostUid) => unawaited(
            _messageHost(
              context,
              clubId: clubId,
              hostUid: hostUid,
              eventId: widget.eventId,
            ),
          ),
          onRetryHosts: () =>
              ref.invalidate(fetchOrganizerProvider(vm.event.clubId)),
          inviteCode: widget.inviteCode,
          inviteLinkId: widget.inviteLinkId,
          now: now,
          presentationMode: widget.presentationMode,
          heroTag: widget.heroTag,
          enableMapNetworkTiles: widget.enableMapNetworkTiles,
          crossPathsConsentState: crossPathsConsentState,
          messagePreferencesSection: !isHostApp && vm.isAuthenticated
              ? Theme(
                  data: Theme.of(context).copyWith(
                    extensions: [
                      ...Theme.of(context).extensions.values,
                      if (style.isDark) CatchTokens.editorialDark,
                    ],
                  ),
                  child: Column(
                    children: [
                      EventChatEntrySection(eventId: vm.event.id),
                      if (vm.participation != null)
                        EventMessagePreferencesNavigationSection(
                          eventId: vm.event.id,
                        ),
                    ],
                  ),
                )
              : null,
          onCrossPathsConsentChanged: (enabled) =>
              CrossPathsEventConsentController.setConsentMutation.run(
                ref,
                (tx) => tx
                    .get(crossPathsEventConsentControllerProvider.notifier)
                    .setConsent(eventId: vm.event.id, enabled: enabled),
              ),
        ),
        footer:
            _showsEventDetailBottomNavigation(
              event: vm.event,
              userProfile: vm.userProfile,
              isAuthenticated: vm.isAuthenticated,
              organizerCapabilities:
                  organizerState.value?.supplyCapabilities ??
                  const OrganizerSupplyCapabilities.unclaimedReadOnly(
                    claimable: false,
                  ),
              now: now,
              sectionVisibility: sectionVisibility,
            )
            ? _EventDetailBottomNavigationBar(
                event: vm.event,
                userProfile: vm.userProfile,
                clubId: widget.clubId,
                isAuthenticated: vm.isAuthenticated,
                isSaved: vm.isSaved,
                isHosted: vm.isHost,
                isOrganizerMember: vm.isOrganizerMember,
                participation: vm.participation,
                organizerCapabilities:
                    organizerState.value?.supplyCapabilities ??
                    const OrganizerSupplyCapabilities.unclaimedReadOnly(
                      claimable: false,
                    ),
                inviteCode: widget.inviteCode,
                inviteLinkId: widget.inviteLinkId,
                now: now,
                darkSurface: isSpotlightDark,
                completeProfileLabel: context
                    .l10n
                    .eventsEventDetailScreenLabelCompleteBookingProfile,
                onGuestBook: () => _openEventSignIn(
                  context,
                  clubId: widget.clubId,
                  eventId: vm.event.id,
                  inviteCode: widget.inviteCode,
                  inviteLinkId: widget.inviteLinkId,
                ),
                onCompleteProfile: () => _openEventProfileCompletion(
                  context,
                  event: vm.event,
                  clubId: widget.clubId,
                  eventId: vm.event.id,
                ),
              )
            : null,
      );
    }

    final canRenderGuestInitialEvent =
        !isHostApp &&
        uidState.hasData &&
        uidState.value == null &&
        organizerState.value?.isPubliclyBrowseable == true;
    if (vmState.isLoading &&
        _initialEventMatchesRoute &&
        canRenderGuestInitialEvent) {
      final event = widget.initialEvent!;
      final now = DateTime.now();
      final sectionVisibility = eventDetailSectionVisibilityStateFrom(
        event: event,
        participation: null,
        isHostApp: isHostApp,
        isHost: false,
        now: now,
      );
      final isSpotlightDark =
          widget.presentationMode == EventDetailPresentationMode.spotlightDark;
      final style = _eventDetailSurfaceStyle(
        context,
        presentationMode: widget.presentationMode,
      );
      final informationState = eventDetailInformationStateFrom(
        event: event,
        l10n: context.l10n,
      );

      return CatchScaffold.workspace(
        backgroundColor: style.pageBackground,
        body: EventDetailBody(
          event: event,
          userProfile: null,
          clubId: widget.clubId,
          reviews: const [],
          isAuthenticated: false,
          sectionVisibility: sectionVisibility,
          isSaved: false,
          participation: null,
          savePending: false,
          surfaceStyle: style,
          onBack: () => Navigator.of(context).pop(),
          onShare: (_) {},
          showShareAction: false,
          showAddToCalendar: false,
          onAddToCalendar: (_) {},
          onToggleSaved: () => _openEventSignIn(
            context,
            clubId: widget.clubId,
            eventId: event.id,
            inviteCode: widget.inviteCode,
            inviteLinkId: widget.inviteLinkId,
          ),
          companionState: const EventDetailCompanionState.hidden(),
          hostState: const EventDetailHostState.loading(),
          socialState: const EventDetailSocialState.loading(),
          informationState: informationState,
          onLocationTap: () => context.pushNamed(
            Routes.eventLocationMapScreen.name,
            pathParameters: {
              context.l10n.eventsEventDetailScreenBodyEventid: event.id,
            },
          ),
          onOpenCompanion: () {},
          onRetryCompanion: () =>
              ref.invalidate(watchEventSuccessPlanProvider(event.id)),
          onViewOrganizer: (clubId) => context.pushNamed(
            Routes.organizerDetailScreen.name,
            pathParameters: {
              context.l10n.eventsEventDetailScreenBodyOrganizerid: clubId,
            },
          ),
          onMessageHost: (clubId, hostUid) => unawaited(
            _messageHost(
              context,
              clubId: clubId,
              hostUid: hostUid,
              eventId: widget.eventId,
            ),
          ),
          onRetryHosts: () => ref.invalidate(fetchOrganizerProvider(widget.clubId)),
          inviteCode: widget.inviteCode,
          inviteLinkId: widget.inviteLinkId,
          now: now,
          presentationMode: widget.presentationMode,
          heroTag: widget.heroTag,
          enableMapNetworkTiles: widget.enableMapNetworkTiles,
        ),
        footer:
            _showsEventDetailBottomNavigation(
              event: event,
              userProfile: null,
              isAuthenticated: false,
              organizerCapabilities: organizerState.value!.supplyCapabilities,
              now: now,
              sectionVisibility: sectionVisibility,
            )
            ? _EventDetailBottomNavigationBar(
                event: event,
                userProfile: null,
                clubId: widget.clubId,
                isAuthenticated: false,
                participation: null,
                organizerCapabilities: organizerState.value!.supplyCapabilities,
                inviteCode: widget.inviteCode,
                inviteLinkId: widget.inviteLinkId,
                now: now,
                darkSurface: isSpotlightDark,
                completeProfileLabel: context
                    .l10n
                    .eventsEventDetailScreenLabelCompleteBookingProfile,
                onGuestBook: () => _openEventSignIn(
                  context,
                  clubId: widget.clubId,
                  eventId: event.id,
                  inviteCode: widget.inviteCode,
                  inviteLinkId: widget.inviteLinkId,
                ),
                onCompleteProfile: () {},
              )
            : null,
      );
    }

    if (vmState.isLoading) {
      return EventDetailLoadingScreen(
        presentationMode: widget.presentationMode,
        showBottomNavigation: !isHostApp,
      );
    }

    if (vmState.hasError) {
      return CatchScaffold.workspace(
        body: SafeArea(
          child: CatchLocalizedErrorState(
            vmState.error!,
            context: AppErrorContext.event,
            onRetry: () =>
                ref.invalidate(eventDetailViewModelProvider(widget.eventId)),
          ),
        ),
      );
    }

    return CatchScaffold.workspace(
      body: SafeArea(
        child: CatchErrorState(
          title: context.l10n.eventsEventDetailScreenTitleEventNotFound,
          message: context.l10n.eventsEventDetailScreenMessageThisEventIsNo,
          actions: const [CatchErrorBackButton()],
        ),
      ),
    );
  }

  bool get _initialEventMatchesRoute =>
      widget.initialEvent != null &&
      widget.initialEvent!.id == widget.eventId &&
      widget.initialEvent!.clubId == widget.clubId;
}

class _EventDetailBottomNavigationBar extends StatelessWidget {
  const _EventDetailBottomNavigationBar({
    required this.event,
    required this.userProfile,
    required this.clubId,
    required this.isAuthenticated,
    this.isSaved = false,
    this.isHosted = false,
    this.isOrganizerMember = false,
    required this.participation,
    required this.organizerCapabilities,
    required this.inviteCode,
    required this.inviteLinkId,
    required this.now,
    required this.darkSurface,
    required this.completeProfileLabel,
    required this.onGuestBook,
    required this.onCompleteProfile,
  });

  final Event event;
  final UserProfile? userProfile;
  final String clubId;
  final bool isAuthenticated;
  final bool isSaved;
  final bool isHosted;
  final bool isOrganizerMember;
  final EventParticipation? participation;
  final OrganizerSupplyCapabilities organizerCapabilities;
  final String? inviteCode;
  final String? inviteLinkId;
  final DateTime now;
  final bool darkSurface;
  final String completeProfileLabel;
  final VoidCallback onGuestBook;
  final VoidCallback onCompleteProfile;

  @override
  Widget build(BuildContext context) {
    if (!isAuthenticated) {
      return GuestBookDock(onPressed: onGuestBook, darkSurface: darkSurface);
    }

    if (!eventDetailHasBookingReadyProfile(
      userProfile,
      now: now,
      event: event,
    )) {
      return EventBookingDock(
        label: completeProfileLabel,
        onPressed: onCompleteProfile,
      );
    }

    return EventDetailDock(
      event: event,
      userProfile: userProfile!,
      clubId: clubId,
      participation: participation,
      organizerCapabilities: organizerCapabilities,
      isSaved: isSaved,
      isHosted: isHosted,
      isOrganizerMember: isOrganizerMember,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      now: now,
      darkSurface: darkSurface,
    );
  }
}

/// Keeps Event Detail inside the runtime's route family. In particular, a
/// host preview must never navigate to the consumer-only organizer route.
Routes eventDetailOrganizerRouteFor({required bool isHostApp}) =>
    isHostApp ? Routes.hostOrganizerDetailScreen : Routes.organizerDetailScreen;

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
