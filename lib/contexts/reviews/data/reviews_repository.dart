import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/reviews/data/review_callable_adapters.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/firestore_converters.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show DeleteEventReviewCallableRequest, SetReviewResponseCallableRequest;
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'reviews_repository.g.dart';

class ReviewsRepository {
  const ReviewsRepository(this._db, this._functions);

  static const _collectionPath = 'reviews';
  static const _reviewIdSeparator = '~';

  /// Firestore rules let other people read only published reviews, so every
  /// organizer or event list filters on it; the author reads their own
  /// pending or rejected reviews through the reviewer queries.
  static const _publishedModerationStatus = 'published';

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

  Stream<List<Review>> watchReviewsForOrganizer(String organizerId) =>
      withBackendErrorStream(
        () => _reviewsRef
            .where('organizerId', isEqualTo: organizerId)
            .where('moderationStatus', isEqualTo: _publishedModerationStatus)
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
            .where('moderationStatus', isEqualTo: _publishedModerationStatus)
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

  Future<CursorPage<Review, PageCursor<Review>>> fetchOrganizerReviewsPage({
    required String organizerId,
    PageCursor<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('organizerId', isEqualTo: organizerId)
        .where('moderationStatus', isEqualTo: _publishedModerationStatus)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch organizer review page',
  );

  Future<CursorPage<Review, PageCursor<Review>>> fetchEventReviewsPage({
    required String eventId,
    PageCursor<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('eventId', isEqualTo: eventId)
        .where('moderationStatus', isEqualTo: _publishedModerationStatus)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch event review page',
  );

  Future<CursorPage<Review, PageCursor<Review>>> fetchUserReviewsPage({
    required String reviewerUserId,
    PageCursor<Review>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => _fetchReviewsPage(
    _reviewsRef
        .where('reviewerUserId', isEqualTo: reviewerUserId)
        .orderBy('createdAt', descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch user review page',
  );

  Future<CursorPage<Review, PageCursor<Review>>> _fetchReviewsPage(
    Query<Review> query, {
    required PageCursor<Review>? startAfter,
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
Stream<List<Review>> watchReviewsForOrganizer(Ref ref, String organizerId) =>
    ref.watch(reviewsRepositoryProvider).watchReviewsForOrganizer(organizerId);

/// The event's published reviews plus the signed-in viewer's own review of
/// it, so an author whose review is pending or rejected still finds it on
/// the event page and edits it instead of trying to write a second one.
@riverpod
Stream<List<Review>> watchReviewsForEvent(Ref ref, String eventId) {
  final repository = ref.watch(reviewsRepositoryProvider);
  final published = repository.watchReviewsForEvent(eventId);
  final viewerUid = ref.watch(uidProvider).value;
  if (viewerUid == null) return published;
  return combineLatest(
    published,
    repository.watchUserReviewForEvent(
      eventId: eventId,
      reviewerUserId: viewerUid,
    ),
    withOwnEventReview,
  );
}

/// Adds [own] to the published [reviews] when the list does not already hold
/// it, keeping the newest-first order.
List<Review> withOwnEventReview(List<Review> reviews, Review? own) {
  if (own == null || reviews.any((review) => review.id == own.id)) {
    return reviews;
  }
  return [...reviews, own]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
}

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
