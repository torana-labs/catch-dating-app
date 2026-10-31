import 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show CreateOrganizerPostCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_posts_repository.g.dart';

class OrganizerPostsRepository {
  const OrganizerPostsRepository(this._db, this._functions);

  static const weeklyQuota = 3;
  static const _organizersCollectionPath = 'organizers';
  static const _postsCollectionPath = 'posts';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, dynamic>> _postsRef(String organizerId) => _db
      .collection(_organizersCollectionPath)
      .doc(organizerId)
      .collection(_postsCollectionPath);

  Stream<int> watchRemainingWeeklyQuota({
    required String organizerId,
    DateTime? now,
  }) {
    final referenceNow = now ?? DateTime.now();
    final windowStart = Timestamp.fromDate(
      referenceNow.subtract(const Duration(days: 7)),
    );

    return withBackendErrorStream(
      () => _postsRef(organizerId)
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
        resource: _organizersCollectionPath,
      ),
    );
  }

  Future<CreateOrganizerPostCallableResponse> createPost({
    required String organizerId,
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
              organizerId: organizerId,
              requestId: requestId,
              text: text,
              eventId: eventId,
              photoPath: photoPath,
            ).toJson(),
          );
      return CreateOrganizerPostCallableResponse.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create organizer post',
      resource: _organizersCollectionPath,
    ),
  );
}

// keepalive: club post composer and quota streams share one Functions-backed
// repository instance across host panels during a session.
@Riverpod(keepAlive: true)
OrganizerPostsRepository organizerPostsRepository(Ref ref) =>
    OrganizerPostsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<int> watchOrganizerPostRemainingWeeklyQuota(Ref ref, String organizerId) {
  return ref
      .watch(organizerPostsRepositoryProvider)
      .watchRemainingWeeklyQuota(organizerId: organizerId);
}
