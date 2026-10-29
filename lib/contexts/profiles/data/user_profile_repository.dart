import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_profile_repository.g.dart';

class UserProfileRepository {
  const UserProfileRepository(this._db, this._functions);

  static const _collectionPath = 'users';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<UserProfile> get _usersRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<UserProfile>(
        idField: 'uid',
        fromJson: UserProfile.fromJson,
        toJson: (user) => user.toJson(),
      );

  DocumentReference<UserProfile> _userRef(String uid) => _usersRef.doc(uid);

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<UserProfile?> watchUserProfile({required String? uid}) {
    if (uid == null) return Stream.value(null);
    return withBackendErrorStream(
      () => _userRef(
        uid,
      ).snapshots().map((snap) => snap.exists ? snap.data() : null),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch profile',
        resource: _collectionPath,
      ),
    );
  }

  Future<UserProfile?> fetchUserProfile({required String? uid}) =>
      withBackendErrorContext(
        () async {
          if (uid == null) return null;
          final doc = await _userRef(uid).get();
          return doc.exists ? doc.data() : null;
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'fetch profile',
          resource: _collectionPath,
        ),
      );

  // ── Write ─────────────────────────────────────────────────────────────────

  Future<void> setUserProfile({required UserProfile userProfile}) =>
      withBackendErrorContext(
        () => _userRef(userProfile.uid).set(userProfile),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'set profile',
          resource: _collectionPath,
        ),
      );

  /// Applies a validated profile patch via the `updateUserProfile` callable.
  ///
  /// Profile edits are server-owned after initial profile creation because this
  /// document has many fast-evolving fields and Firestore rules hit expression
  /// limits when they try to validate every changed field directly.
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) {
    if (patch.isEmpty) return Future<void>.value();

    return withBackendErrorContext(
      () => _functions
          .httpsCallable('updateUserProfile')
          .call(patch.toCallableJson()),
      context: BackendErrorContext(
        service: BackendService.functions,
        action: action,
        resource: _collectionPath,
      ),
    );
  }

  Future<void> updateProfilePhotos({
    required String uid,
    required List<ProfilePhoto> profilePhotos,
  }) {
    final normalizedPhotos = normalizeProfilePhotos(profilePhotos);
    return updateUserProfile(
      uid: uid,
      patch: UpdateUserProfilePatch(profilePhotos: normalizedPhotos),
      action: 'update profile photos',
    );
  }

  Future<void> updateDetectedLocation({
    required String uid,
    required double latitude,
    required double longitude,
    String? city,
  }) {
    // `city` is only included when detected, mirroring the previous
    // spread-when-non-null behavior. Passing `null` would explicitly clear
    // the stored city, which is not what callers want.
    final patch = city == null
        ? UpdateUserProfilePatch(latitude: latitude, longitude: longitude)
        : UpdateUserProfilePatch(
            latitude: latitude,
            longitude: longitude,
            city: city,
          );
    return updateUserProfile(uid: uid, patch: patch);
  }

  Future<void> setProfileComplete({required String uid}) => updateUserProfile(
    uid: uid,
    patch: UpdateUserProfilePatch(profileComplete: true),
    action: 'set profile complete',
  );
}

// keepalive: profile repository is a shared Firestore/Functions facade used by
// profile, public profile, chat, and matching surfaces.
@Riverpod(keepAlive: true)
UserProfileRepository userProfileRepository(Ref ref) => UserProfileRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

// keepalive: current user profile is app-wide identity data reused by
// navigation, onboarding, and profile surfaces.
@Riverpod(keepAlive: true)
Stream<UserProfile?> watchUserProfile(Ref ref) {
  final uidAsync = ref.watch(uidProvider);

  return switch (uidAsync) {
    AsyncData(:final value) =>
      ref.watch(userProfileRepositoryProvider).watchUserProfile(uid: value),
    AsyncError(:final error, :final stackTrace) => Stream.error(
      error,
      stackTrace,
    ),
    _ => const Stream.empty(),
  };
}
