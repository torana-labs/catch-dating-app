import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart'
    as app_ops;
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_detail_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns event-detail side effects that are not booking operations.
@riverpod
class EventDetailController extends _$EventDetailController {
  static final toggleSavedEventMutation = Mutation<bool>();

  @override
  void build() {}

  Future<bool> toggleSavedEvent({
    required Event event,
    required UserProfile userProfile,
    required bool isSaved,
  }) async {
    final repository = ref.read(savedEventRepositoryProvider);
    if (isSaved) {
      await repository.unsaveEvent(uid: userProfile.uid, eventId: event.id);
      return false;
    }

    await repository.saveEvent(uid: userProfile.uid, eventId: event.id);
    return true;
  }

  Future<void> recordInviteLinkOpenBestEffort({
    required String eventId,
    required String inviteLinkId,
  }) async {
    await app_ops.runLoggingAppErrors(
      () => ref
          .read(eventRepositoryProvider)
          .recordInviteLinkOpen(eventId: eventId, inviteLinkId: inviteLinkId),
      context: const app_ops.AppErrorContext(
        operation: app_ops.AppOperation.runtime,
        action: 'record invite link open best effort',
        resource: 'eventInviteLinks',
      ),
      logError: ref.read(errorLoggerProvider),
    );
  }
}
