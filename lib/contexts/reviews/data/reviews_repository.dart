import 'package:catch_dating_app/contexts/reviews/data/review_callable_adapters.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show DeleteEventReviewCallableRequest, SetReviewResponseCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'reviews_repository.g.dart';

class ReviewsRepository {
  const ReviewsRepository(this._db, this._functions);

  static const _collectionPath = 'reviews';
  static const _reviewIdSeparator = '~';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Review> get _reviewsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Review>(
        idField: 'id',
        fromJson: Review.fromJson,
        toJson: (review) => review.toJson(),
      );

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<List<Review>> watchReviewsForOrganizer(String clubId) =>
      withBackendErrorStream(
        () => _reviewsRef
            .where('organizerId', isEqualTo: clubId)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map((s) => s.docs.map((d) => d.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizer reviews',
          resource: _collectionPath,
        ),
      );

  Stream<List<Review>> watchReviewsForEvent(String eventId) =>
      withBackendErrorStream(
        () => _reviewsRef
            .where('eventId', isEqualTo: eventId)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map((s) => s.docs.map((d) => d.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event reviews',
          resource: _collectionPath,
        ),
      );

  Stream<List<Review>> watchReviewsByUser(String reviewerUserId) =>
      withBackendErrorStream(
        () => _reviewsRef
            .where('reviewerUserId', isEqualTo: reviewerUserId)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map((s) => s.docs.map((d) => d.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch user reviews',
          resource: _collectionPath,
        ),
      );

  Future<CursorPage<Review, DocumentSnapshot<Review>>> fetchOrganizerReviewsPage({
    required String clubId,
    DocumentSnapshot<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('organizerId', isEqualTo: clubId)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch organizer review page',
  );

  Future<CursorPage<Review, DocumentSnapshot<Review>>> fetchEventReviewsPage({
    required String eventId,
    DocumentSnapshot<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('eventId', isEqualTo: eventId)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch event review page',
  );

  Future<CursorPage<Review, DocumentSnapshot<Review>>> fetchUserReviewsPage({
    required String reviewerUserId,
    DocumentSnapshot<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('reviewerUserId', isEqualTo: reviewerUserId)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch user review page',
  );

  Future<CursorPage<Review, DocumentSnapshot<Review>>> _fetchReviewsPage(
    Query<Review> query, {
    required DocumentSnapshot<Review>? startAfter,
    required int limit,
    required String action,
  }) => withBackendErrorContext(
    () async {
      final page = await query.fetchDocumentCursorPage(
        limit: limit,
        startAfter: startAfter,
        errorContext: BackendErrorContext(
          service: BackendService.firestore,
          action: action,
          resource: _collectionPath,
        ),
      );
      return CursorPage(
        items: List.unmodifiable(page.items.map((document) => document.data())),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      );
    },
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: _collectionPath,
    ),
  );

  /// Watches the review this user wrote for a specific event (null if none).
  Stream<Review?> watchUserReviewForEvent({
    required String eventId,
    required String reviewerUserId,
  }) => withBackendErrorStream(
    () => _reviewRefForEventUser(
      eventId: eventId,
      reviewerUserId: reviewerUserId,
    ).snapshots().map((s) => s.exists ? s.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch user event review',
      resource: _collectionPath,
    ),
  );

  // ── Write ─────────────────────────────────────────────────────────────────

  Future<void> addReview(Review review) {
    final eventId = review.eventId;
    if (eventId == null || eventId.isEmpty) {
      throw ArgumentError.value(
        eventId,
        'review.eventId',
        'Event reviews require an eventId.',
      );
    }

    return withBackendErrorContext(
      () => _functions
          .httpsCallable('createEventReview')
          .call(
            createEventReviewCallableRequestFromReview(
              review,
              eventId: eventId,
            ).toJson(),
          ),
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'add review',
        resource: _collectionPath,
      ),
    );
  }

  Future<void> updateReview(Review review) => withBackendErrorContext(
    () => _functions
        .httpsCallable('updateEventReview')
        .call(updateEventReviewCallableRequestFromReview(review).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update review',
      resource: _collectionPath,
    ),
  );

  Future<void> deleteReview(String reviewId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('deleteEventReview')
        .call(DeleteEventReviewCallableRequest(reviewId: reviewId).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'delete review',
      resource: _collectionPath,
    ),
  );

  Future<void> setReviewResponse({
    required String reviewId,
    required String message,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('setReviewResponse')
        .call(
          SetReviewResponseCallableRequest(
            reviewId: reviewId,
            message: message,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'set review response',
      resource: _collectionPath,
    ),
  );

  DocumentReference<Review> _reviewRefForEventUser({
    required String eventId,
    required String reviewerUserId,
  }) => _reviewsRef.doc(
    reviewIdForEventUser(eventId: eventId, reviewerUserId: reviewerUserId),
  );

  static String reviewIdForEventUser({
    required String eventId,
    required String reviewerUserId,
  }) {
    if (eventId.isEmpty) {
      throw ArgumentError.value(
        eventId,
        'eventId',
        'Event id cannot be empty.',
      );
    }
    if (reviewerUserId.isEmpty) {
      throw ArgumentError.value(
        reviewerUserId,
        'reviewerUserId',
        'Reviewer user id cannot be empty.',
      );
    }
    if (eventId.contains('/') || reviewerUserId.contains('/')) {
      throw ArgumentError.value(
        '$eventId:$reviewerUserId',
        'eventId/reviewerUserId',
        'Review id parts cannot contain path separators.',
      );
    }

    return '$eventId$_reviewIdSeparator$reviewerUserId';
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

@riverpod
ReviewsRepository reviewsRepository(Ref ref) => ReviewsRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<List<Review>> watchReviewsForOrganizer(Ref ref, String clubId) =>
    ref.watch(reviewsRepositoryProvider).watchReviewsForOrganizer(clubId);

@riverpod
Stream<List<Review>> watchReviewsForEvent(Ref ref, String eventId) =>
    ref.watch(reviewsRepositoryProvider).watchReviewsForEvent(eventId);

@riverpod
Stream<List<Review>> watchReviewsByUser(Ref ref, String reviewerUserId) =>
    ref.watch(reviewsRepositoryProvider).watchReviewsByUser(reviewerUserId);

@riverpod
Stream<Review?> watchUserReviewForEvent(
  Ref ref, {
  required String eventId,
  required String reviewerUserId,
}) => ref
    .watch(reviewsRepositoryProvider)
    .watchUserReviewForEvent(eventId: eventId, reviewerUserId: reviewerUserId);
