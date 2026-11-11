import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_recap_controller.g.dart';

/// The after-event screen's two writes: picking someone you'd like to see
/// again, and the private rating.
@riverpod
class EventRecapController extends _$EventRecapController {
  static final pickMutation = Mutation<void>();
  static final rateMutation = Mutation<void>();

  @override
  void build() {}

  /// Records a pick as the existing profile decision. When both people pick
  /// each other the backend opens a direct chat; neither is told otherwise.
  Future<void> pick({required String eventId, required String targetId}) {
    final uid = requireSignedInUid(ref, action: 'pick someone after an event');
    return ref
        .read(swipeRepositoryProvider)
        .recordSwipe(
          swipe: Swipe(
            swiperId: uid,
            targetId: targetId,
            eventId: eventId,
            direction: SwipeDirection.like,
            createdAt: DateTime.now(),
          ),
        );
  }

  /// Saves the star rating as the guest's private Event Success feedback.
  /// It reaches the organiser only inside the event's summary. A guest who
  /// already left fuller feedback keeps their other answers.
  Future<void> rate({
    required Event event,
    required int rating,
    required int pickedCount,
    EventSuccessFeedback? existing,
  }) {
    final uid = requireSignedInUid(ref, action: 'rate an event');
    final now = DateTime.now();
    final feedback =
        existing?.copyWith(welcomeRating: rating) ??
        EventSuccessFeedback(
          id: eventSuccessFeedbackId(eventId: event.id, uid: uid),
          eventId: event.id,
          organizerId: event.organizerId,
          uid: uid,
          welcomeRating: rating,
          structureRating: rating,
          metNewPeopleCount: pickedCount,
          createdAt: now,
          updatedAt: now,
        );
    return ref.read(eventSuccessRepositoryProvider).submitFeedback(feedback);
  }
}
