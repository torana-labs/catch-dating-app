import 'package:catch_dating_app/contexts/organizers/data/club_callable_responses.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show CreateOrganizerPostCallableRequest;
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'club_posts_repository.g.dart';

class ClubPostsRepository {
  const ClubPostsRepository(this._db, this._functions);

  static const weeklyQuota = 3;
  static const _clubsCollectionPath = 'organizers';
  static const _postsCollectionPath = 'posts';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, dynamic>> _postsRef(String clubId) => _db
      .collection(_clubsCollectionPath)
      .doc(clubId)
      .collection(_postsCollectionPath);

  Stream<int> watchRemainingWeeklyQuota({
    required String clubId,
    DateTime? now,
  }) {
    final referenceNow = now ?? DateTime.now();
    final windowStart = Timestamp.fromDate(
      referenceNow.subtract(const Duration(days: 7)),
    );

    return withBackendErrorStream(
      () => _postsRef(clubId)
          .where('createdAt', isGreaterThanOrEqualTo: windowStart)
          .limit(ReadLimitPolicy.boundedWorkingSet)
          .snapshots()
          .map((snap) {
            final activeCount = snap.docs
                .where((doc) => doc.data()['status'] == 'active')
                .length;
            return (weeklyQuota - activeCount).clamp(0, weeklyQuota).toInt();
          }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer post quota',
        resource: _clubsCollectionPath,
      ),
    );
  }

  Future<CreateClubPostCallableResponse> createPost({
    required String clubId,
    required String requestId,
    required String text,
    String? eventId,
    String? photoPath,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createOrganizerPost')
          .call<Object?>(
            CreateOrganizerPostCallableRequest(
              organizerId: clubId,
              requestId: requestId,
              text: text,
              eventId: eventId,
              photoPath: photoPath,
            ).toJson(),
          );
      return CreateClubPostCallableResponse.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create organizer post',
      resource: _clubsCollectionPath,
    ),
  );
}

// keepalive: club post composer and quota streams share one Functions-backed
// repository instance across host panels during a session.
@Riverpod(keepAlive: true)
ClubPostsRepository clubPostsRepository(Ref ref) => ClubPostsRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<int> watchClubPostRemainingWeeklyQuota(Ref ref, String clubId) {
  return ref
      .watch(clubPostsRepositoryProvider)
      .watchRemainingWeeklyQuota(clubId: clubId);
}
