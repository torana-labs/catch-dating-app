import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(null as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

void main() {
  group('ReviewsRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late ReviewsRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = ReviewsRepository(firestore, functions);
    });

    test('reviewIdForEventUser is deterministic and path-safe', () {
      expect(
        ReviewsRepository.reviewIdForEventUser(
          eventId: 'event-1',
          reviewerUserId: 'runner-1',
        ),
        'event-1~runner-1',
      );

      expect(
        () => ReviewsRepository.reviewIdForEventUser(
          eventId: '',
          reviewerUserId: 'runner-1',
        ),
        throwsArgumentError,
      );
      expect(
        () => ReviewsRepository.reviewIdForEventUser(
          eventId: 'event-1',
          reviewerUserId: 'runner/1',
        ),
        throwsArgumentError,
      );
    });

    test(
      'addReview delegates deterministic event reviews to callable',
      () async {
        final review = _review();

        await repository.addReview(review);

        final callable =
            functions.httpsCallable('createEventReview') as TestHttpsCallable;
        expect(callable.calls, [
          {
            'organizerId': 'club-1',
            'eventId': 'event-1',
            'rating': 5,
            'comment': 'Great event.',
          },
        ]);
      },
    );

    test('updateReview and deleteReview delegate to callables', () async {
      await repository.updateReview(
        _review().copyWith(id: 'event-1~runner-1', rating: 4),
      );
      await repository.deleteReview('event-1~runner-1');

      final updateCallable =
          functions.httpsCallable('updateEventReview') as TestHttpsCallable;
      final deleteCallable =
          functions.httpsCallable('deleteEventReview') as TestHttpsCallable;
      expect(updateCallable.calls, [
        {
          'reviewId': 'event-1~runner-1',
          'rating': 4,
          'comment': 'Great event.',
        },
      ]);
      expect(deleteCallable.calls, [
        {'reviewId': 'event-1~runner-1'},
      ]);
    });

    test('setReviewResponse delegates host responses to callable', () async {
      await repository.setReviewResponse(
        reviewId: 'event-1~runner-1',
        message: 'Thanks for joining us.',
      );

      final callable =
          functions.httpsCallable('setReviewResponse') as TestHttpsCallable;
      expect(callable.calls, [
        {'reviewId': 'event-1~runner-1', 'message': 'Thanks for joining us.'},
      ]);
    });

    test(
      'watchUserReviewForEvent emits the deterministic review doc',
      () async {
        await firestore.collection('reviews').doc('event-1~runner-1').set({
          'organizerId': 'club-1',
          'eventId': 'event-1',
          'reviewerUserId': 'runner-1',
          'reviewerName': 'Runner One',
          'rating': 5,
          'comment': 'Great event.',
          'createdAt': DateTime.utc(2026, 5),
        });

        await expectLater(
          repository.watchUserReviewForEvent(
            eventId: 'event-1',
            reviewerUserId: 'runner-1',
          ),
          emits(
            isA<Review>()
                .having((r) => r.id, 'id', 'event-1~runner-1')
                .having((r) => r.eventId, 'eventId', 'event-1')
                .having((r) => r.reviewerUserId, 'reviewerUserId', 'runner-1'),
          ),
        );
      },
    );

    test(
      'watchUserReviewForEvent emits null when the deterministic doc is absent',
      () async {
        await expectLater(
          repository.watchUserReviewForEvent(
            eventId: 'event-missing',
            reviewerUserId: 'runner-1',
          ),
          emits(isNull),
        );
      },
    );

    test('addReview rejects reviews without a eventId', () async {
      expect(
        () => repository.addReview(_review(eventId: null)),
        throwsArgumentError,
      );
    });
  });
}

Review _review({
  String clubId = 'club-1',
  String? eventId = 'event-1',
  String reviewerUserId = 'runner-1',
}) {
  return Review(
    id: '',
    organizerId: clubId,
    eventId: eventId,
    reviewerUserId: reviewerUserId,
    reviewerName: 'Runner One',
    rating: 5,
    comment: 'Great event.',
    createdAt: DateTime.utc(2026, 5),
  );
}
