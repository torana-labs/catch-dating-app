import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'write_review_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Most common mutation pattern in the app. [build] returns void — the
/// controller holds no Riverpod state. [Mutation]s ([submitMutation],
/// [deleteMutation]) track the lifecycle of single-shot operations.
/// The UI watches mutations directly via `ref.watch(controller.mutation)`
/// and checks `.isPending`, `.hasError`, `.isSuccess`.
@riverpod
class WriteReviewController extends _$WriteReviewController {
  static final submitMutation = Mutation<void>();
  static final deleteMutation = Mutation<void>();
  static final responseMutation = Mutation<void>();

  Future<void>? _writeInFlight;

  @override
  void build() {}

  Future<void> submit({
    required String clubId,
    required String eventId,
    required String reviewerUserId,
    required String reviewerName,
    required int rating,
    required String comment,
    Review? existingReview,
  }) {
    return _trackWrite(
      () => _submit(
        clubId: clubId,
        eventId: eventId,
        reviewerUserId: reviewerUserId,
        reviewerName: reviewerName,
        rating: rating,
        comment: comment,
        existingReview: existingReview,
      ),
    );
  }

  Future<void> _submit({
    required String clubId,
    required String eventId,
    required String reviewerUserId,
    required String reviewerName,
    required int rating,
    required String comment,
    required Review? existingReview,
  }) async {
    if (rating < 1 || rating > 5) {
      throw ArgumentError.value(rating, 'rating', 'Rating must be 1-5.');
    }

    final trimmedComment = comment.trim();
    final repo = ref.read(reviewsRepositoryProvider);
    if (existingReview != null) {
      await repo.updateReview(
        existingReview.copyWith(rating: rating, comment: trimmedComment),
      );
    } else {
      await repo.addReview(
        Review(
          id: '',
          organizerId: clubId,
          eventId: eventId,
          reviewerUserId: reviewerUserId,
          reviewerName: reviewerName,
          rating: rating,
          comment: trimmedComment,
          createdAt: DateTime.now(),
        ),
      );
    }
  }

  Future<void> delete(String reviewId) {
    return _trackWrite(() => _delete(reviewId));
  }

  Future<void> _delete(String reviewId) async {
    if (reviewId.isEmpty) {
      throw ArgumentError.value(reviewId, 'reviewId', 'Review id is required.');
    }
    await ref.read(reviewsRepositoryProvider).deleteReview(reviewId);
  }

  Future<void> _trackWrite(Future<void> Function() operation) {
    final existingRequest = _writeInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<void> trackedRequest;
    trackedRequest = operation().whenComplete(() {
      if (identical(_writeInFlight, trackedRequest)) {
        _writeInFlight = null;
      }
    });
    _writeInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> setOwnerResponse({
    required String reviewId,
    required String message,
  }) async {
    final trimmedMessage = message.trim();
    if (reviewId.isEmpty) {
      throw ArgumentError.value(reviewId, 'reviewId', 'Review id is required.');
    }
    if (trimmedMessage.isEmpty) {
      throw ArgumentError.value(message, 'message', 'Response is required.');
    }
    await ref
        .read(reviewsRepositoryProvider)
        .setReviewResponse(reviewId: reviewId, message: trimmedMessage);
  }
}
