import 'dart:async';

import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/reviews/shared/write_review_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('submit creates a trimmed event review', () async {
    final repository = _FakeReviewsRepository();
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await container
        .read(writeReviewControllerProvider.notifier)
        .submit(
          clubId: 'club-1',
          eventId: 'event-1',
          reviewerUserId: 'runner-1',
          reviewerName: 'Runner One',
          rating: 4,
          comment: '  Great hosts.  ',
        );

    expect(repository.addedReview?.organizerId, 'club-1');
    expect(repository.addedReview?.eventId, 'event-1');
    expect(repository.addedReview?.rating, 4);
    expect(repository.addedReview?.comment, 'Great hosts.');
  });

  test('submit updates an existing review', () async {
    final repository = _FakeReviewsRepository();
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);
    final existing = buildReview(comment: 'Old');

    await container
        .read(writeReviewControllerProvider.notifier)
        .submit(
          clubId: existing.organizerId,
          eventId: existing.eventId!,
          reviewerUserId: existing.reviewerUserId!,
          reviewerName: existing.reviewerName,
          rating: 5,
          comment: '  Updated  ',
          existingReview: existing,
        );

    expect(repository.updatedReview?.id, 'review-1');
    expect(repository.updatedReview?.rating, 5);
    expect(repository.updatedReview?.comment, 'Updated');
  });

  test('submit deduplicates an active review write snapshot', () async {
    final pendingWrite = Completer<void>();
    final repository = _FakeReviewsRepository()..writeCompleter = pendingWrite;
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);
    final controller = container.read(writeReviewControllerProvider.notifier);

    final first = controller.submit(
      clubId: 'club-1',
      eventId: 'event-1',
      reviewerUserId: 'runner-1',
      reviewerName: 'Runner One',
      rating: 4,
      comment: 'Frozen comment',
    );
    final duplicate = controller.submit(
      clubId: 'club-1',
      eventId: 'event-1',
      reviewerUserId: 'runner-1',
      reviewerName: 'Runner One',
      rating: 1,
      comment: 'Must not replace the request',
    );

    expect(identical(first, duplicate), isTrue);
    expect(repository.addCallCount, 1);
    pendingWrite.complete();
    await Future.wait([first, duplicate]);
    expect(repository.addedReview?.rating, 4);
    expect(repository.addedReview?.comment, 'Frozen comment');

    repository.writeCompleter = null;
    await controller.submit(
      clubId: 'club-1',
      eventId: 'event-1',
      reviewerUserId: 'runner-1',
      reviewerName: 'Runner One',
      rating: 5,
      comment: 'Next write',
    );
    expect(repository.addCallCount, 2);
  });

  test('submit rejects invalid ratings', () async {
    final container = _reviewsContainer(_FakeReviewsRepository());
    addTearDown(container.dispose);

    await expectLater(
      container
          .read(writeReviewControllerProvider.notifier)
          .submit(
            clubId: 'club-1',
            eventId: 'event-1',
            reviewerUserId: 'runner-1',
            reviewerName: 'Runner One',
            rating: 0,
            comment: '',
          ),
      throwsArgumentError,
    );
  });

  test('delete delegates to repository', () async {
    final repository = _FakeReviewsRepository();
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await container
        .read(writeReviewControllerProvider.notifier)
        .delete('review-1');

    expect(repository.deletedReviewId, 'review-1');
  });

  test('setOwnerResponse delegates trimmed host response', () async {
    final repository = _FakeReviewsRepository();
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await container
        .read(writeReviewControllerProvider.notifier)
        .setOwnerResponse(
          reviewId: 'review-1',
          message: '  Thanks for joining us.  ',
        );

    expect(repository.responseReviewId, 'review-1');
    expect(repository.responseMessage, 'Thanks for joining us.');
  });
}

ProviderContainer _reviewsContainer(_FakeReviewsRepository repository) {
  final container = ProviderContainer(
    overrides: [reviewsRepositoryProvider.overrideWith((ref) => repository)],
  );
  WriteReviewController.submitMutation.reset(container);
  WriteReviewController.deleteMutation.reset(container);
  WriteReviewController.responseMutation.reset(container);
  return container;
}

class _FakeReviewsRepository extends Fake implements ReviewsRepository {
  Completer<void>? writeCompleter;
  int addCallCount = 0;
  Review? addedReview;
  Review? updatedReview;
  String? deletedReviewId;
  String? responseReviewId;
  String? responseMessage;

  @override
  Future<void> addReview(Review review) async {
    addCallCount += 1;
    final pendingWrite = writeCompleter;
    if (pendingWrite != null) await pendingWrite.future;
    addedReview = review;
  }

  @override
  Future<void> updateReview(Review review) async {
    updatedReview = review;
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    deletedReviewId = reviewId;
  }

  @override
  Future<void> setReviewResponse({
    required String reviewId,
    required String message,
  }) async {
    responseReviewId = reviewId;
    responseMessage = message;
  }
}
