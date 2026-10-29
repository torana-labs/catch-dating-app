import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

NotificationsListState buildNotificationsListState({
  required AsyncValue<String?> uid,
  required AsyncValue<List<ActivityNotification>>? notifications,
  required DateTime now,
  required AppLocalizations l10n,
  bool markAllReadPending = false,
}) {
  final uidState = catchAsyncStateFromAsyncValue(uid);
  if (uidState.isLoading) {
    return const NotificationsAccessLoading();
  }

  if (uidState.hasError) {
    return NotificationsAccessError(error: uidState.error!);
  }

  final userId = uidState.value;
  if (userId == null) {
    return const NotificationsSignedOut();
  }

  final notificationsAsync = notifications;
  if (notificationsAsync == null) {
    return NotificationsActivityLoading(uid: userId);
  }
  final notificationsState = catchAsyncStateFromAsyncValue(notificationsAsync);
  if (notificationsState.isLoading) {
    return NotificationsActivityLoading(uid: userId);
  }

  if (notificationsState.hasError) {
    return NotificationsActivityError(
      uid: userId,
      error: notificationsState.error!,
    );
  }

  final visibleNotifications =
      (notificationsState.value ?? const <ActivityNotification>[])
          .where((notification) => notification.isVisibleInActivity)
          .toList(growable: false);
  if (visibleNotifications.isEmpty) {
    return NotificationsEmpty(uid: userId);
  }

  return NotificationsContent(
    uid: userId,
    visibleNotifications: visibleNotifications,
    groups: groupNotificationRows(
      notificationRowsFromNotifications(
        visibleNotifications,
        now: now,
        l10n: l10n,
      ),
      now: now,
      l10n: l10n,
    ),
    markAllReadPending: markAllReadPending,
  );
}
