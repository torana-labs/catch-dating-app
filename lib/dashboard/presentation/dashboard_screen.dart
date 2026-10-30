import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/dashboard_empty_sliver_body.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/dashboard_full.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'dashboard_empty_home_screen.dart';
part 'dashboard_error_screen.dart';
part 'dashboard_home_screen.dart';
part 'dashboard_loading_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  Timer? _homeClock;
  String? _lastLoggedHomeState;
  final Set<String> _loggedModuleImpressions = <String>{};

  @override
  void initState() {
    super.initState();
    _homeClock = Timer.periodic(dashboardHomeClockTick, (_) {
      if (mounted) ref.invalidate(dashboardNowProvider);
    });
  }

  @override
  void dispose() {
    _homeClock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = ref.watch(dashboardNowProvider);
    final state = ref.watch(dashboardHomeScreenStateProvider);
    _logHomeAnalytics(state, now: now);

    return switch (state.status) {
      DashboardHomeScreenStatus.loading => const DashboardLoadingScreen(),
      DashboardHomeScreenStatus.error => DashboardErrorScreen(
        error: state.error!.error,
        onRetry: () {
          final error = state.error!;
          switch (error.retryTarget) {
            case DashboardHomeRetryTarget.userProfile:
              ref.invalidate(watchUserProfileProvider);
            case DashboardHomeRetryTarget.memberships:
              final uid = error.uid;
              if (uid != null) {
                ref.invalidate(
                  watchActiveOrganizerMembershipsForUserProvider(uid),
                );
              }
            case DashboardHomeRetryTarget.signedUpEvents:
              final uid = error.uid;
              if (uid != null) {
                ref.invalidate(watchSignedUpEventsProvider(uid));
              }
          }
        },
      ),
      DashboardHomeScreenStatus.empty => const DashboardEmptyHomeScreen(),
      DashboardHomeScreenStatus.full => DashboardHomeScreen(
        header: state.header,
        dashboardSliver: DashboardFullSliverBody(
          viewModel: state.viewModel!,
          user: state.user!,
        ),
        actions: [
          Consumer(
            builder: (context, ref, child) {
              return CatchIconAction.toolbar(
                icon: CatchIcons.date,
                tooltip: context.l10n.dashboardDashboardScreenTooltipCalendar,
                onPressed: () {
                  ref
                      .read(appAnalyticsProvider)
                      .logEvent(
                        AnalyticsEvents.homeActionTap,
                        parameters: {
                          AnalyticsParameters.homeModule: context
                              .l10n
                              .dashboardDashboardScreenVisiblecopyHeader,
                          AnalyticsParameters.homeAction: context
                              .l10n
                              .dashboardDashboardScreenVisiblecopyCalendar,
                        },
                      );
                  context.push(Routes.calendarScreen.path);
                },
              );
            },
          ),
          NotificationsAction(uid: state.notificationUid!),
        ],
      ),
    };
  }

  void _logHomeAnalytics(
    DashboardHomeScreenState state, {
    required DateTime now,
  }) {
    if (state.status == DashboardHomeScreenStatus.loading ||
        state.status == DashboardHomeScreenStatus.error) {
      return;
    }

    final analytics = ref.read(appAnalyticsProvider);
    final liveState = dashboardHomeLiveStateFor(state, now: now);
    final stateValue = liveState.analyticsValue;
    if (_lastLoggedHomeState != stateValue) {
      _lastLoggedHomeState = stateValue;
      analytics.logEvent(
        AnalyticsEvents.homeOpened,
        parameters: {AnalyticsParameters.homeState: stateValue},
      );
    }

    for (final module in dashboardHomeModuleImpressionsFor(state)) {
      final key = context.l10n
          .dashboardDashboardScreenVisiblecopyStatevalueModule(
            stateValue: stateValue,
            module: module,
          );
      if (!_loggedModuleImpressions.add(key)) continue;
      analytics.logEvent(
        AnalyticsEvents.homeModuleImpression,
        parameters: {AnalyticsParameters.homeModule: module},
      );
      if (module ==
          context.l10n.dashboardDashboardScreenVisiblecopyOrganizerPosts) {
        analytics.logEvent(
          AnalyticsEvents.organizerPostImpression,
          parameters: {
            AnalyticsParameters.surface:
                context.l10n.dashboardDashboardScreenVisiblecopyHome,
          },
        );
      }
    }
  }
}

class NotificationsAction extends ConsumerWidget {
  const NotificationsAction({super.key, required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(
      watchActivityNotificationsProvider(uid),
    );
    final notificationsState = catchAsyncStateFromAsyncValue(
      notificationsAsync,
    );
    final unreadCount =
        notificationsState.value
            ?.where((notification) => notification.isUnread)
            .length ??
        0;

    return CatchIconAction.counted(
      icon: unreadCount > 0
          ? CatchIcons.notifications
          : CatchIcons.notifications,
      count: unreadCount,
      tooltip: context.l10n.dashboardDashboardScreenTooltipNotifications,
      onPressed: () {
        ref
            .read(appAnalyticsProvider)
            .logEvent(
              AnalyticsEvents.homeActionTap,
              parameters: {
                AnalyticsParameters.homeModule:
                    context.l10n.dashboardDashboardScreenVisiblecopyHeader,
                AnalyticsParameters.homeAction: context
                    .l10n
                    .dashboardDashboardScreenVisiblecopyNotifications,
              },
            );
        context.pushNamed(Routes.notificationsScreen.name);
      },
    );
  }
}

class DashboardLoadingHeader extends StatelessWidget {
  const DashboardLoadingHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.screenTitleBlockCompact,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchSkeleton.text(width: CatchLayout.skeletonTextEyebrowWidth),
                gapH8,
                CatchSkeleton.text(width: CatchLayout.skeletonTextHeroWidth),
              ],
            ),
          ),
          gapW12,
          CatchSkeleton.box(
            width: CatchLayout.eventInfoTileExtent,
            height: CatchLayout.eventInfoTileExtent,
            radius: CatchRadius.sm,
          ),
        ],
      ),
    );
  }
}

class DashboardFocusLoadingCard extends StatelessWidget {
  const DashboardFocusLoadingCard({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextLabelWidth),
          gapH12,
          CatchSkeleton.text(width: CatchLayout.skeletonTextBannerWidth),
          gapH12,
          CatchSkeleton.textBlock(lines: 2),
          gapH16,
          Row(
            children: [
              Expanded(
                child: CatchSkeleton.box(
                  height: CatchLayout.controlMdMinHeight,
                  radius: CatchRadius.sm,
                ),
              ),
              gapW10,
              Expanded(
                child: CatchSkeleton.box(
                  height: CatchLayout.controlMdMinHeight,
                  radius: CatchRadius.sm,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
