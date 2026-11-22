import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_notice_repository.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/notification_route_util.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/safety_appeal_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/activity_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

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
    // Safety notices are a quiet extra: while they load or fail to load,
    // Activity shows without them.
    final notices = uid == null
        ? const <SafetyNotice>[]
        : ref.watch(watchSafetyNoticesProvider(uid)).asData?.value ??
              const <SafetyNotice>[];
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
      topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
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
                notices: notices,
                onAppeal: (notice) => unawaited(_appeal(notice)),
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

  /// Asks why the decision is wrong and sends the appeal from the sheet,
  /// which closes once it is sent.
  Future<void> _appeal(SafetyNotice notice) async {
    final actionId = notice.actionId;
    if (actionId == null) return;
    final l10n = context.l10n;
    var text = '';
    final sent = await showCatchBottomSheet<bool>(
      context: context,
      builder: (_) => Consumer(
        builder: (sheetContext, ref, _) {
          final sending = ref
              .watch(SafetyAppealController.appealMutation)
              .isPending;
          return StatefulBuilder(
            builder: (context, setSheetState) => CatchSheet.standard(
              title: l10n.dashboardActivityAppealTitle,
              footer: CatchButton.sheet(
                key: const ValueKey<String>('activity-appeal-send'),
                label: l10n.dashboardActivityAppealSend,
                role: CatchButtonEmphasis.commit,
                onPressed: sending || text.trim().isEmpty
                    ? null
                    : () => unawaited(
                        _sendAppeal(
                          sheetContext,
                          actionId: actionId,
                          text: text,
                        ),
                      ),
              ),
              child: CatchFieldLanes.single(
                child: CatchField.input(
                  copy: catchFieldCopy(l10n),
                  title: l10n.dashboardActivityAppealField,
                  contractExemption:
                      'Free text checked by submitSafetyAppeal (1 to 2000).',
                  autofocus: true,
                  maxLength: 2000,
                  minLines: 4,
                  maxLines: 8,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (value) => setSheetState(() => text = value),
                ),
              ),
            ),
          );
        },
      ),
    );
    if (sent == true && mounted) {
      showCatchNotice(
        context,
        l10n.dashboardActivityAppealSent,
        tone: CatchNoticeTone.success,
      );
    }
  }

  /// Sends the appeal and closes the sheet. A decision already appealed or
  /// no longer in force cannot be appealed, so that refusal says so and
  /// closes the sheet too.
  Future<void> _sendAppeal(
    BuildContext sheetContext, {
    required String actionId,
    required String text,
  }) async {
    final l10n = context.l10n;
    try {
      await SafetyAppealController.appealMutation.run(
        ref,
        (tx) => tx
            .get(safetyAppealControllerProvider.notifier)
            .appeal(actionId: actionId, text: text),
      );
    } on Object catch (error) {
      if (!mounted) return;
      if (backendCallableErrorIdentity(error)?.code == 'failed-precondition') {
        showCatchNotice(
          context,
          l10n.dashboardActivityAppealClosed,
          tone: CatchNoticeTone.warning,
        );
        if (sheetContext.mounted) Navigator.of(sheetContext).pop(false);
      } else {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.dashboard,
        );
      }
      return;
    }
    if (sheetContext.mounted) Navigator.of(sheetContext).pop(true);
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

/// Activity: From Catch safety notices first, when there are any, then the
/// activity timeline.
class ActivityScreenBody extends StatelessWidget {
  const ActivityScreenBody({
    super.key,
    required this.state,
    this.onRetry,
    required this.onOpenRoute,
    this.notices = const <SafetyNotice>[],
    this.onAppeal,
  });

  final NotificationsListState state;
  final VoidCallback? onRetry;
  final ValueChanged<String> onOpenRoute;

  /// Safety notices from Catch, newest first; none hides the section.
  final List<SafetyNotice> notices;

  /// Appeals the decision a notice is about; null hides Appeal.
  final ValueChanged<SafetyNotice>? onAppeal;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final dates = DateFormat.yMMMd(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final appeal = onAppeal;
    return CatchSectionList.responsive(
      emptyStateOmitted: true,
      items: [
        if (notices.isNotEmpty)
          CatchSectionListItem(
            child: CatchSection(
              key: const ValueKey<String>('activity-safety-notices'),
              title: l10n.dashboardActivityFromCatch,
              children: [
                for (final notice in notices)
                  CatchStack(
                    key: ValueKey<String>(
                      'activity-safety-notice-${notice.id}',
                    ),
                    gap: CatchStackGap.g4,
                    align: CatchStackAlign.start,
                    children: [
                      CatchIndexRow(
                        title: notice.title,
                        titleMaxLines: 2,
                        body: notice.body,
                        meta: switch (notice.createdAt) {
                          final createdAt? => dates.format(createdAt),
                          null => null,
                        },
                        onTap: null,
                      ),
                      if (notice.canAppeal && appeal != null)
                        CatchButton(
                          label: l10n.dashboardActivityAppeal,
                          variant: CatchButtonVariant.quiet,
                          onPressed: () => appeal(notice),
                        ),
                    ],
                  ),
              ],
            ),
          ),
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
