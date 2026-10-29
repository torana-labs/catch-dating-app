import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'public_profile_repository.g.dart';

class PublicProfileRepository {
  const PublicProfileRepository(this._db);

  static const _collectionPath = 'publicProfiles';

  final FirebaseFirestore _db;

  CollectionReference<PublicProfile> get _publicProfilesRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<PublicProfile>(
        idField: 'uid',
        fromJson: PublicProfile.fromJson,
        toJson: (profile) => profile.toJson(),
      );

  DocumentReference<PublicProfile> _publicProfileRef(String uid) =>
      _publicProfilesRef.doc(uid);

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<PublicProfile?> watchPublicProfile({required String uid}) =>
      withBackendErrorStream(
        () => _publicProfileRef(
          uid,
        ).snapshots().map((doc) => doc.exists ? doc.data() : null),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch public profile',
          resource: _collectionPath,
        ),
      );

  Future<PublicProfile?> fetchPublicProfile({required String uid}) =>
      withBackendErrorContext(
        () async {
          final doc = await _publicProfileRef(uid).get();
          return doc.exists ? doc.data() : null;
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'fetch public profile',
          resource: _collectionPath,
        ),
      );

  /// Fetches profiles by UID with document reads instead of a document-id query.
  ///
  /// Public profile rules depend on the profile document id and block/deletion
  /// lookups. Individual document reads let Firestore evaluate that rule shape
  /// without exposing cancelled, deleted, or blocked profiles through queries.
  Future<List<PublicProfile>> fetchPublicProfiles(List<String> uids) =>
      withBackendErrorContext(
        () async {
          if (uids.isEmpty) return [];

          // Keep per-document reads (public-profile rules evaluate block /
          // deletion per doc id, which a whereIn query cannot), but fetch them
          // in parallel instead of awaiting each one sequentially.
          final uniqueUids = <String>{...uids}.toList(growable: false);
          final docs = await Future.wait(
            uniqueUids.map((uid) => _publicProfileRef(uid).get()),
          );
          return [
            for (final doc in docs)
              if (doc.exists && doc.data() != null) doc.data()!,
          ];
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'fetch public profiles',
          resource: _collectionPath,
        ),
      );
}

@riverpod
PublicProfileRepository publicProfileRepository(Ref ref) =>
    PublicProfileRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<PublicProfile?> watchPublicProfile(Ref ref, String uid) =>
    ref.watch(publicProfileRepositoryProvider).watchPublicProfile(uid: uid);
