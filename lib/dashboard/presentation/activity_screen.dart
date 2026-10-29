import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/notification_route_util.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/activity_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  @override
  Widget build(BuildContext context) {
    final uidAsync = ref.watch(uidProvider);
    final uid = catchAsyncStateFromAsyncValue(uidAsync).value;
    final notificationsAsync = uid == null
        ? null
        : ref.watch(watchActivityNotificationsProvider(uid));
    final markAllReadMutation = ref.watch(
      ActivityController.markAllReadMutation,
    );
    final state = buildNotificationsListState(
      l10n: context.l10n,
      uid: uidAsync,
      notifications: notificationsAsync,
      now: DateTime.now(),
      markAllReadPending: markAllReadMutation.isPending,
    );

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [ActivityController.markAllReadMutation],
      errorContext: AppErrorContext.dashboard,
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.dashboardActivityScreenTitleActivity,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          if (state.showMarkAllReadAction)
            CatchButton.text(
              label: state.markAllReadLabel(context.l10n),
              onPressed: state.canMarkAllRead
                  ? () => unawaited(
                      _markAllRead(
                        uid: state.uid!,
                        notifications: state.unreadNotifications,
                      ),
                    )
                  : null,
            ),
        ],
      ),
      body: CatchRouteBody.standard(
        child: CatchAsyncBoundary<String?>(
          value: uidAsync,
          errorContext: AppErrorContext.auth,
          onRetry: () => ref.invalidate(uidProvider),
          loadingBuilder: (_) => const ActivityScreenSkeleton(),
          errorBuilder: (context, error, _, onRetry) => ActivityScreenBody(
            state: NotificationsAccessError(error: error),
            onRetry: onRetry,
            onOpenRoute: _openNotificationRoute,
          ),
          builder: (context, uid) {
            if (uid == null) {
              return const CatchSectionList.responsive(
                emptyStateOmitted: true,
                items: [
                  CatchSectionListItem(child: ActivitySignedOutEmptyState()),
                ],
              );
            }
            return CatchAsyncBoundary<List<ActivityNotification>>(
              value:
                  notificationsAsync ??
                  const AsyncLoading<List<ActivityNotification>>(),
              loadingBuilder: (_) => const ActivityScreenSkeleton(),
              onRetry: () =>
                  ref.invalidate(watchActivityNotificationsProvider(uid)),
              errorBuilder: (context, error, _, onBoundaryRetry) =>
                  ActivityScreenBody(
                    state: NotificationsActivityError(uid: uid, error: error),
                    onRetry: onBoundaryRetry,
                    onOpenRoute: _openNotificationRoute,
                  ),
              builder: (context, _) => ActivityScreenBody(
                state: state,
                onRetry: state.uid == null
                    ? null
                    : () {
                        ref.invalidate(
                          watchActivityNotificationsProvider(state.uid!),
                        );
                      },
                onOpenRoute: _openNotificationRoute,
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _markAllRead({
    required String uid,
    required List<ActivityNotification> notifications,
  }) async {
    final unread = notifications
        .where((notification) => notification.isUnread)
        .toList(growable: false);
    if (unread.isEmpty) return;
    final markReadAction =
        context.l10n.dashboardActivityScreenVisiblecopyMarkNotificationsRead;
    final activityResource =
        context.l10n.dashboardActivityScreenVisiblecopyActivityScreen;
    try {
      await ActivityController.markAllReadMutation.run(
        ref,
        (tx) async => tx
            .get(activityControllerProvider.notifier)
            .markAllRead(notifications: unread, uid: uid),
      );
    } catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logAppException(
            normalizeBackendError(
              error,
              stackTrace: stackTrace,
              context: BackendErrorContext(
                service: BackendService.local,
                action: markReadAction,
                resource: activityResource,
              ),
            ),
          );
    }
  }

  void _openNotificationRoute(String route) {
    openNotificationRoute(context, route);
  }
}

class ActivityScreenSkeleton extends StatelessWidget {
  const ActivityScreenSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const CatchSectionList.responsive(
      emptyStateOmitted: true,
      items: [CatchSectionListItem(child: ActivitySectionSkeleton())],
    );
  }
}

class ActivityScreenBody extends StatelessWidget {
  const ActivityScreenBody({
    super.key,
    required this.state,
    this.onRetry,
    required this.onOpenRoute,
  });

  final NotificationsListState state;
  final VoidCallback? onRetry;
  final ValueChanged<String> onOpenRoute;

  @override
  Widget build(BuildContext context) {
    return CatchSectionList.responsive(
      emptyStateOmitted: true,
      items: [
        CatchSectionListItem(
          child: ActivitySection.fromState(
            state: state,
            onRetry: onRetry,
            onOpenRoute: onOpenRoute,
          ),
        ),
      ],
    );
  }
}
