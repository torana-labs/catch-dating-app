import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_location_links.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_event_focus_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/club_posts_home_section.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/dashboard_empty_sliver_body.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/empty_hero_card.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/event_focus_list.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show showEventVenueSessionScanner;
import 'package:catch_dating_app/event_success/event_success_companion_launcher.dart';
import 'package:catch_dating_app/events/shared/event_check_in_celebration_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/reviews/shared/write_review_sheet.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class DashboardFullSliverBody extends ConsumerStatefulWidget {
  const DashboardFullSliverBody({
    super.key,
    required this.viewModel,
    required this.user,
  });

  final DashboardFullViewModel viewModel;
  final UserProfile user;

  @override
  ConsumerState<DashboardFullSliverBody> createState() =>
      _DashboardFullSliverBodyState();
}

class _DashboardFullSliverBodyState
    extends ConsumerState<DashboardFullSliverBody> {
  @override
  Widget build(BuildContext context) {
    final focusEvents = [
      ...widget.viewModel.windowedEvents.map((window) => window.event),
      ...widget.viewModel.upcomingEvents,
      if (widget.viewModel.pendingReviewEvent != null)
        widget.viewModel.pendingReviewEvent!,
    ];
    final clubNamesAsync = ref.watch(
      clubNameLookupProvider(
        ClubNameLookupQuery(focusEvents.map((event) => event.clubId)),
      ),
    );
    final clubNames = catchAsyncStateFromAsyncValue(clubNamesAsync).value;
    final checkInMutation = ref.watch(
      DashboardEventFocusController.selfCheckInMutation,
    );

    return SliverToBoxAdapter(
      child: CatchSectionList(
        emptyStateOmitted: true,
        gap: CatchSpacing.micro18,
        children: [
          if (focusEvents.isEmpty) ...[
            EmptyHeroCard(onFindEvent: () => _openExplore(context)),
            const HowCatchWorksSection(),
          ] else
            EventFocusList(
              upcomingEvents: widget.viewModel.upcomingEvents,
              arrivalAction: widget.viewModel.arrivalAction,
              windowedEvents: widget.viewModel.windowedEvents,
              pendingReviewEvent: widget.viewModel.pendingReviewEvent,
              now: ref.watch(dashboardNowProvider),
              onWindowImpression: _logWindowImpression,
              clubNameBuilder: (event) => clubNames?[event.clubId],
              checkInState: EventFocusCheckInState(
                isPending: checkInMutation.isPending,
                error: checkInMutation.hasError
                    ? (checkInMutation as MutationError).error
                    : null,
              ),
              actions: _buildEventFocusActions(context),
            ),
          if (widget.viewModel.clubPostNotifications.isNotEmpty)
            ClubPostsHomeSection(
              notifications: widget.viewModel.clubPostNotifications,
              onOpenPost: (notification) =>
                  _openClubPost(context, notification),
            ),
        ],
      ),
    );
  }

  void _logWindowImpression(Event event) {
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.catchWindowImpression,
          parameters: {
            AnalyticsParameters.surface: 'home',
            AnalyticsParameters.eventId: event.id,
          },
        );
  }

  EventFocusActions _buildEventFocusActions(BuildContext context) {
    return EventFocusActions(
      onViewEvent: (event) => _openEvent(context, event),
      onCheckIn: (event) => _checkIn(context, event),
      onOpenSwipe: (event) => _openSwipe(context, event),
      onWriteReview: (event) => _writeReview(context, event),
      onOpenDirections: _openDirections,
      onAddToCalendar: _addToCalendar,
      onResetCheckInError: () =>
          DashboardEventFocusController(ref: ref).resetSelfCheckInError(),
    );
  }

  void _logAction(String module, String action) {
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.homeActionTap,
          parameters: {
            AnalyticsParameters.homeModule: module,
            AnalyticsParameters.homeAction: action,
          },
        );
  }

  String _moduleForEvent(Event event) {
    return widget.viewModel.windowedEvents.any(
          (window) => window.event.id == event.id,
        )
        ? context.l10n.dashboardDashboardFullVisiblecopyCatchWindow
        : context.l10n.dashboardDashboardFullVisiblecopyFocusRail;
  }

  void _openExplore(BuildContext context) {
    _logAction(
      context.l10n.dashboardDashboardFullVisiblecopyIdleCta,
      context.l10n.dashboardDashboardFullVisiblecopyFindEvent,
    );
    context.go(Routes.exploreScreen.path);
  }

  void _openClubPost(BuildContext context, ActivityNotification notification) {
    _logAction(
      context.l10n.dashboardDashboardFullVisiblecopyClubPosts,
      context.l10n.dashboardDashboardFullVisiblecopyOpenPost,
    );
    final parameters = <String, Object>{};
    final clubId = notification.organizerId ?? notification.clubId;
    final eventId = notification.eventId;
    if (clubId != null) {
      parameters[AnalyticsParameters.clubId] = clubId;
    }
    if (eventId != null) {
      parameters[AnalyticsParameters.eventId] = eventId;
    }
    ref
        .read(appAnalyticsProvider)
        .logEvent(AnalyticsEvents.clubPostOpen, parameters: parameters);
    unawaited(
      ref
          .read(activityControllerProvider.notifier)
          .markAllRead(uid: notification.uid, notifications: [notification]),
    );
    final route = notificationRoute(notification);
    if (route != null) {
      context.push(route);
    }
  }

  void _openEvent(BuildContext context, Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyViewEvent,
    );
    context.pushNamed(
      Routes.dashboardEventDetailScreen.name,
      pathParameters: {'clubId': event.clubId, 'eventId': event.id},
      extra: event,
    );
  }

  void _openDirections(Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyDirections,
    );
    unawaited(
      ref
          .read(externalLinkControllerProvider)
          .openExternal(directionsUriForEvent(event)),
    );
  }

  void _addToCalendar(Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyAddToCalendar,
    );
    unawaited(ref.read(eventCalendarControllerProvider).addToCalendar(event));
  }

  void _openSwipe(BuildContext context, Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyOpenCatchWindow,
    );
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.catchWindowOpen,
          parameters: {
            AnalyticsParameters.surface: 'home',
            AnalyticsParameters.eventId: event.id,
          },
        );
    context.pushNamed(
      Routes.swipeEventScreen.name,
      pathParameters: {'eventId': event.id},
    );
  }

  void _writeReview(BuildContext context, Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyWriteReview,
    );
    showWriteReviewSheet(
      context: context,
      clubId: event.clubId,
      eventId: event.id,
      reviewer: widget.user,
    );
  }

  void _checkIn(BuildContext context, Event event) {
    _logAction(
      _moduleForEvent(event),
      context.l10n.dashboardDashboardFullVisiblecopyCheckIn,
    );
    unawaited(_runCheckInFlow(context, event));
  }

  Future<void> _runCheckInFlow(BuildContext context, Event event) async {
    final controller = DashboardEventFocusController(ref: ref);
    final venueSessionToken = await showEventVenueSessionScanner(
      context: context,
      eventId: event.id,
    );
    if (venueSessionToken == null || !context.mounted) return;
    try {
      await DashboardEventFocusController.selfCheckInMutation.run(ref, (
        tx,
      ) async {
        await controller.selfCheckIn(tx, event, venueSessionToken);
        if (!context.mounted) return;
        final launchResult = await launchEventSuccessCompanionIfAvailable(
          context: context,
          ref: ref,
          uid: widget.user.uid,
          event: event,
        );
        if (!context.mounted ||
            launchResult != EventSuccessCompanionLaunchResult.unavailable) {
          return;
        }
        await Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute<void>(
            fullscreenDialog: true,
            builder: (routeContext) => EventCheckInCelebrationScreen(
              event: event,
              onViewEvent: () {
                Navigator.of(routeContext).pop();
                GoRouter.of(context).goNamed(
                  Routes.eventDetailScreen.name,
                  pathParameters: {'clubId': event.clubId, 'eventId': event.id},
                  extra: event,
                );
              },
              onBackHome: () {
                Navigator.of(routeContext).pop();
                GoRouter.of(context).goNamed(Routes.dashboardScreen.name);
              },
            ),
          ),
        );
      });
    } catch (_) {
      // Mutation state owns the inline error display in EventFocusList.
    }
  }
}
