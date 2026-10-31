import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';

sealed class NotificationsListState {
  const NotificationsListState({this.uid, this.markAllReadPending = false});

  final String? uid;
  final bool markAllReadPending;

  bool get showMarkAllReadAction => false;
  bool get canMarkAllRead => false;
  String markAllReadLabel(AppLocalizations l10n) => markAllReadPending
      ? l10n.dashboardNotificationsListStateVisiblecopyMarking
      : l10n.dashboardNotificationsListStateVisiblecopyMarkAllRead;
  List<ActivityNotification> get unreadNotifications =>
      const <ActivityNotification>[];
}

final class NotificationsAccessLoading extends NotificationsListState {
  const NotificationsAccessLoading();
}

final class NotificationsAccessError extends NotificationsListState {
  const NotificationsAccessError({required this.error});

  final Object error;
}

final class NotificationsSignedOut extends NotificationsListState {
  const NotificationsSignedOut();
}

final class NotificationsActivityLoading extends NotificationsListState {
  const NotificationsActivityLoading({required super.uid});
}

final class NotificationsActivityError extends NotificationsListState {
  const NotificationsActivityError({required super.uid, this.error});

  final Object? error;
}

final class NotificationsEmpty extends NotificationsListState {
  const NotificationsEmpty({required super.uid});
}

final class NotificationsContent extends NotificationsListState {
  const NotificationsContent({
    required super.uid,
    required this.visibleNotifications,
    required this.groups,
    required super.markAllReadPending,
  });

  final List<ActivityNotification> visibleNotifications;
  final List<NotificationDayGroup> groups;

  @override
  bool get showMarkAllReadAction => unreadNotifications.isNotEmpty;

  @override
  bool get canMarkAllRead => showMarkAllReadAction && !markAllReadPending;

  @override
  List<ActivityNotification> get unreadNotifications => [
    for (final notification in visibleNotifications)
      if (notification.isUnread) notification,
  ];
}

final class NotificationDayGroup {
  const NotificationDayGroup({required this.label, required this.rows});

  final String label;
  final List<NotificationRowDisplay> rows;
}

final class NotificationRowDisplay {
  const NotificationRowDisplay({
    required this.type,
    required this.title,
    required this.subtitle,
    required this.createdAt,
    required this.timeLabel,
    required this.isUnread,
    this.route,
  });

  final ActivityNotificationType type;
  final String title;
  final String subtitle;
  final DateTime createdAt;
  final String timeLabel;
  final bool isUnread;
  final String? route;
}

List<NotificationRowDisplay> notificationRowsFromNotifications(
  Iterable<ActivityNotification> notifications, {
  required DateTime now,
  required AppLocalizations l10n,
}) {
  return notifications
      .where((notification) => notification.isVisibleInActivity)
      .map(
        (notification) => NotificationRowDisplay(
          type: notification.type,
          title: notification.title,
          subtitle: notification.body,
          createdAt: notification.createdAt,
          route: notificationRoute(notification),
          timeLabel: relativeNotificationTime(
            notification.createdAt,
            now,
            l10n,
          ),
          isUnread: notification.isUnread,
        ),
      )
      .toList(growable: false)
    ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
}

List<NotificationDayGroup> groupNotificationRows(
  List<NotificationRowDisplay> rows, {
  required DateTime now,
  required AppLocalizations l10n,
}) {
  final today = <NotificationRowDisplay>[];
  final yesterday = <NotificationRowDisplay>[];
  final thisWeek = <NotificationRowDisplay>[];
  final earlier = <NotificationRowDisplay>[];
  final weekAgo = now.subtract(const Duration(days: 7));

  for (final row in rows) {
    if (DateUtils.isSameDay(row.createdAt, now)) {
      today.add(row);
    } else if (DateUtils.isSameDay(
      row.createdAt,
      now.subtract(const Duration(days: 1)),
    )) {
      yesterday.add(row);
    } else if (row.createdAt.isAfter(weekAgo)) {
      thisWeek.add(row);
    } else {
      earlier.add(row);
    }
  }

  return [
    if (today.isNotEmpty)
      NotificationDayGroup(
        label: l10n.dashboardNotificationsListStateLabelToday,
        rows: today,
      ),
    if (yesterday.isNotEmpty)
      NotificationDayGroup(
        label: l10n.dashboardNotificationsListStateLabelYesterday,
        rows: yesterday,
      ),
    if (thisWeek.isNotEmpty)
      NotificationDayGroup(
        label: l10n.dashboardNotificationsListStateLabelThisWeek,
        rows: thisWeek,
      ),
    if (earlier.isNotEmpty)
      NotificationDayGroup(
        label: l10n.dashboardNotificationsListStateLabelEarlier,
        rows: earlier,
      ),
  ];
}

String? notificationRoute(ActivityNotification notification) {
  if (notification.matchId case final matchId?) {
    return Routes.chatScreen.path.replaceFirst(':matchId', matchId);
  }
  if (notification.invitationId case final invitationId?) {
    return Routes.crossPathsInvitationScreen.path.replaceFirst(
      ':invitationId',
      invitationId,
    );
  }
  final organizerId = notification.organizerId;
  if (notification.eventId case final eventId? when organizerId != null) {
    return Routes.eventDetailScreen.path
        .replaceFirst(':organizerId', organizerId)
        .replaceFirst(':eventId', eventId);
  }
  if (organizerId != null) {
    return Routes.organizerDetailScreen.path.replaceFirst(
      ':organizerId',
      organizerId,
    );
  }
  return null;
}

String relativeNotificationTime(
  DateTime time,
  DateTime now,
  AppLocalizations l10n,
) {
  final difference = now.difference(time);
  if (difference.inMinutes < 1) {
    return l10n.dashboardNotificationsListStateVisiblecopyNow;
  }
  if (difference.inMinutes < 60) {
    return l10n.dashboardNotificationsListStateVisiblecopyInminutesM(
      inMinutes: difference.inMinutes,
    );
  }
  if (difference.inHours < 24) {
    return l10n.dashboardNotificationsListStateVisiblecopyInhoursH(
      inHours: difference.inHours,
    );
  }
  return l10n.dashboardNotificationsListStateVisiblecopyIndaysD(
    inDays: difference.inDays,
  );
}
