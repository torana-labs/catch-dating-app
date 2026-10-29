import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_empty_content.dart';

sealed class CatchesEventScreenState {
  const CatchesEventScreenState();
}

final class CatchesEventQueueLoading extends CatchesEventScreenState {
  const CatchesEventQueueLoading();
}

final class CatchesEventQueueError extends CatchesEventScreenState {
  const CatchesEventQueueError(this.error);

  final Object error;
}

final class CatchesEventEmpty extends CatchesEventScreenState {
  const CatchesEventEmpty({required this.content});

  final SwipeEmptyContent content;
}

final class CatchesEventReady extends CatchesEventScreenState {
  const CatchesEventReady({
    required this.profile,
    required this.remainingCount,
    required this.viewerProfile,
    required this.sharedRunTitle,
  });

  final PublicProfile profile;
  final int remainingCount;
  final UserProfile? viewerProfile;
  final String? sharedRunTitle;
}

CatchesEventScreenState buildCatchesEventScreenState({
  required AppLocalizations l10n,
  required CatchAsyncState<List<PublicProfile>> queue,
  required CatchAsyncState<Event?> event,
  required CatchAsyncState<UserProfile?> currentUser,
  required CatchAsyncState<EventParticipation?>? currentUserParticipation,
  DateTime? now,
}) {
  return switch (queue.status) {
    CatchAsyncStatus.loading => const CatchesEventQueueLoading(),
    CatchAsyncStatus.error => CatchesEventQueueError(queue.error!),
    CatchAsyncStatus.data => _catchesEventDataState(
      l10n: l10n,
      profiles: queue.value ?? const <PublicProfile>[],
      event: event.value,
      currentUser: currentUser.value,
      currentUserParticipation: currentUserParticipation?.value,
      now: now,
    ),
  };
}

CatchesEventScreenState _catchesEventDataState({
  required AppLocalizations l10n,
  required List<PublicProfile> profiles,
  required Event? event,
  required UserProfile? currentUser,
  required EventParticipation? currentUserParticipation,
  DateTime? now,
}) {
  if (profiles.isEmpty) {
    return CatchesEventEmpty(
      content: buildSwipeEmptyContent(
        l10n: l10n,
        event: event,
        currentUser: currentUser,
        currentUserParticipation: currentUserParticipation,
        now: now,
      ),
    );
  }

  return CatchesEventReady(
    profile: profiles.first,
    remainingCount: profiles.length,
    viewerProfile: currentUser,
    sharedRunTitle: event?.title,
  );
}
