import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/dashboard/presentation/notification_route_util.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ActivitySignedOutEmptyState extends StatelessWidget {
  const ActivitySignedOutEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentRelaxed,
      child: CatchEmptyState(
        icon: CatchIcons.notifications,
        title: context.l10n.dashboardActivitySectionTitleNoActivityYet,
        message: context.l10n.dashboardActivitySectionMessageSignInAndBook,
      ),
    );
  }
}

class ActivitySection extends ConsumerWidget {
  const ActivitySection({
    super.key,
    required this.uid,
    this.state,
    this.showEmptyState = true,
    this.showMarkAllReadAction = true,
    this.onRetry,
    this.onOpenRoute,
  });

  const ActivitySection.fromState({
    super.key,
    required this.state,
    this.showEmptyState = true,
    this.onRetry,
    this.onOpenRoute,
  }) : uid = null,
       showMarkAllReadAction = false;

  final String? uid;
  final NotificationsListState? state;
  final bool showEmptyState;
  final bool showMarkAllReadAction;
  final VoidCallback? onRetry;
  final ValueChanged<String>? onOpenRoute;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = CatchTokens.of(context);
    final sectionState =
        state ??
        buildNotificationsListState(
          l10n: context.l10n,
          uid: AsyncData(uid!),
          notifications: ref.watch(watchActivityNotificationsProvider(uid!)),
          now: DateTime.now(),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (sectionState is NotificationsActivityLoading ||
            sectionState is NotificationsAccessLoading) ...[
          const ActivitySectionSkeleton(count: 2),
        ] else if (sectionState is NotificationsAccessError) ...[
          CatchLocalizedErrorState(
            sectionState.error,
            context: AppErrorContext.auth,
            mode: CatchErrorStateMode.compact,
            onRetry: onRetry,
          ),
        ] else if (sectionState is NotificationsActivityError) ...[
          if (sectionState.error case final error?)
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.dashboard,
              mode: CatchErrorStateMode.compact,
              onRetry:
                  onRetry ??
                  (uid == null
                      ? null
                      : () {
                          ref.invalidate(
                            watchActivityNotificationsProvider(uid!),
                          );
                        }),
            )
          else
            CatchErrorState(
              retryLabel: context.l10n.sharedActionTryAgain,
              title:
                  context.l10n.dashboardActivitySectionTitleActivityUnavailable,
              message: context
                  .l10n
                  .dashboardActivitySectionMessageCouldNotLoadActivity,
              mode: CatchErrorStateMode.compact,
              onRetry:
                  onRetry ??
                  (uid == null
                      ? null
                      : () {
                          ref.invalidate(
                            watchActivityNotificationsProvider(uid!),
                          );
                        }),
            ),
        ] else if (sectionState is NotificationsEmpty ||
            sectionState is NotificationsSignedOut) ...[
          if (showEmptyState)
            CatchEmptyState(
              icon: CatchIcons.notifications,
              title: context.l10n.dashboardActivitySectionTitleNoNewActivity,
              message: context
                  .l10n
                  .dashboardActivitySectionMessageNewCatchesBookingsAnd,
              iconSize: CatchIconSize.emptyState,
              titleStyle: CatchTextStyles.titleL(context),
              messageStyle: CatchTextStyles.supporting(context, color: t.ink2),
            ),
        ] else if (sectionState is NotificationsContent) ...[
          NotificationDayList(
            groups: sectionState.groups,
            onOpenRoute: onOpenRoute,
          ),
        ] else ...[
          const SizedBox.shrink(),
        ],
      ],
    );
  }
}

class NotificationDayList extends StatelessWidget {
  const NotificationDayList({
    super.key,
    required this.groups,
    this.onOpenRoute,
  });

  final List<NotificationDayGroup> groups;
  final ValueChanged<String>? onOpenRoute;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final groupEntry in groups.indexed)
          CatchSection.fieldRows(
            title: groupEntry.$2.label,
            first: groupEntry.$1 == 0,
            children: [
              for (final row in groupEntry.$2.rows)
                NotificationRow(
                  type: row.type,
                  title: row.title,
                  time: row.timeLabel,
                  body: row.subtitle,
                  unread: row.isUnread,
                  onTap: row.route == null
                      ? null
                      : () =>
                            (onOpenRoute ??
                            (route) => openNotificationRoute(context, route))(
                              row.route!,
                            ),
                ),
            ],
          ),
      ],
    );
  }
}

class ActivitySectionSkeleton extends StatelessWidget {
  const ActivitySectionSkeleton({super.key, this.count = 4});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchSkeleton.text(width: CatchLayout.skeletonTextMetaLabelWidth),
        gapH8,
        for (var i = 0; i < count; i++) NotificationRowSkeleton(divider: i > 0),
      ],
    );
  }
}

class NotificationRowSkeleton extends StatelessWidget {
  const NotificationRowSkeleton({super.key, required this.divider});

  final bool divider;

  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: CatchInsets.contentVerticalMedium,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.box(
            width: CatchIconSize.md,
            height: CatchIconSize.md,
            radius: CatchRadius.sm,
          ),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: CatchSkeleton.text()),
                    gapW8,
                    CatchSkeleton.text(
                      width: CatchLayout.skeletonTextTimeWidth,
                    ),
                  ],
                ),
                gapH6,
                CatchSkeleton.textBlock(lines: 2),
              ],
            ),
          ),
        ],
      ),
    );

    return Stack(
      children: [
        if (divider)
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: CatchDivider.fieldRow(),
          ),
        row,
      ],
    );
  }
}

class NotificationRow extends StatelessWidget {
  const NotificationRow({
    super.key,
    this.type = ActivityNotificationType.eventReminder,
    this.title = '',
    this.time = '',
    this.body = '',
    this.unread = false,
    this.onTap,
  });

  final ActivityNotificationType type;
  final String title;
  final String time;
  final String body;
  final bool unread;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = _NotificationVisual.from(type, t);
    final timeColor = unread ? t.primary : t.ink3;
    final timeLabel = time.trim().toUpperCase();

    return Semantics(
      button: onTap != null,
      label: body.isEmpty
          ? title
          : context.l10n.dashboardActivitySectionLabelTitleBody(
              title: title,
              body: body,
            ),
      child: CatchFieldLanes.single(
        child: CatchField.content(
          copy: catchFieldCopy(context.l10n),
          icon: visual.icon,
          iconColor: visual.accent,
          title: title,
          body: body,
          emphasis: CatchFieldEmphasis.title,
          showChevron: false,
          actions: timeLabel.isEmpty
              ? null
              : Text(
                  timeLabel,
                  style: CatchTextStyles.monoLabelS(context, color: timeColor),
                ),
          onTap: onTap,
        ),
      ),
    );
  }
}

class _NotificationVisual {
  const _NotificationVisual({required this.icon, required this.accent});

  final IconData icon;
  final Color accent;

  static _NotificationVisual from(
    ActivityNotificationType type,
    CatchTokens t,
  ) {
    _NotificationVisual visual({
      required IconData icon,
      required Color accent,
    }) {
      return _NotificationVisual(icon: icon, accent: accent);
    }

    return switch (type) {
      ActivityNotificationType.message => visual(
        icon: CatchIcons.chat,
        accent: t.ink2,
      ),
      ActivityNotificationType.match => visual(
        icon: CatchIcons.like,
        accent: t.primary,
      ),
      ActivityNotificationType.eventReminder => visual(
        icon: CatchIcons.notifications,
        accent: t.primary,
      ),
      ActivityNotificationType.eventSignup => visual(
        icon: CatchIcons.success,
        accent: t.success,
      ),
      ActivityNotificationType.waitlistPromotion => visual(
        icon: CatchIcons.time,
        accent: t.warning,
      ),
      ActivityNotificationType.waitlistOffer => visual(
        icon: CatchIcons.time,
        accent: t.warning,
      ),
      ActivityNotificationType.waitlistOfferExpiring => visual(
        icon: CatchIcons.time,
        accent: t.warning,
      ),
      ActivityNotificationType.waitlistOfferExpired => visual(
        icon: CatchIcons.eventUnavailable,
        accent: t.ink3,
      ),
      ActivityNotificationType.eventCancelled => visual(
        icon: CatchIcons.eventUnavailable,
        accent: t.danger,
      ),
      ActivityNotificationType.eventUpdated => visual(
        icon: CatchIcons.history,
        accent: t.ink2,
      ),
      ActivityNotificationType.organizerUpdate => visual(
        icon: CatchIcons.people,
        accent: t.ink2,
      ),
      ActivityNotificationType.organizerUpdate => visual(
        icon: CatchIcons.people,
        accent: t.ink2,
      ),
      ActivityNotificationType.crossPathsInvitation => visual(
        icon: CatchIcons.like,
        accent: t.primary,
      ),
      ActivityNotificationType.crossPathsInvitationAccepted => visual(
        icon: CatchIcons.chat,
        accent: t.success,
      ),
      ActivityNotificationType.crossPathsInvitationDeclined => visual(
        icon: CatchIcons.like,
        accent: t.ink3,
      ),
      ActivityNotificationType.crossPathsPlanCancelled => visual(
        icon: CatchIcons.eventUnavailable,
        accent: t.danger,
      ),
    };
  }
}
