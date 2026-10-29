import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'activity_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Performs batch operations for the Activity timeline. [markAllReadMutation]
/// tracks the async lifecycle so the UI can show a loading indicator.
@riverpod
class ActivityController extends _$ActivityController {
  static final markAllReadMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> markAllRead({
    required List<ActivityNotification> notifications,
    required String uid,
  }) async {
    final notificationRepository = ref.read(
      activityNotificationRepositoryProvider,
    );
    await notificationRepository.markAllRead(
      uid: uid,
      notifications: notifications,
    );
  }
}
