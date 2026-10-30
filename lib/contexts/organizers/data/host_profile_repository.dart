import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_profile_repository.g.dart';

class HostProfileRepository {
  const HostProfileRepository(this._db);

  static const collectionPath = 'hostProfiles';

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _hostProfileRef(String uid) =>
      _db.collection(collectionPath).doc(uid);

  Stream<HostProfile?> watchHostProfile(String uid) => withBackendErrorStream(
    () => _hostProfileRef(uid).snapshots().map(
      (doc) => doc.exists ? _hostProfileFromDocument(doc) : null,
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch host profile',
      resource: collectionPath,
    ),
  );

  Future<void> ensureHostProfile({
    required String uid,
    required String displayName,
  }) => withBackendErrorContext(
    () => _hostProfileRef(uid).set({
      'displayName': displayName.trim().isEmpty
          ? 'Catch Host'
          : displayName.trim(),
      'status': 'active',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true)),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save host profile',
      resource: collectionPath,
    ),
  );

  Future<void> saveHostProfile({
    required String uid,
    required String displayName,
    String? roleTitle,
    String? bio,
  }) => withBackendErrorContext(
    () => _hostProfileRef(uid).set({
      'displayName': displayName.trim(),
      'roleTitle': _nullableTrimmed(roleTitle),
      'bio': _nullableTrimmed(bio),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true)),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save host profile',
      resource: collectionPath,
    ),
  );
}

HostProfile _hostProfileFromDocument(
  DocumentSnapshot<Map<String, dynamic>> doc,
) {
  final data = doc.data() ?? const <String, dynamic>{};
  return HostProfile(
    uid: doc.id,
    displayName: _string(data['displayName']) ?? 'Catch Host',
    avatarUrl: _string(data['avatarUrl']),
    roleTitle: _string(data['roleTitle']),
    bio: _string(data['bio']),
    status: _status(data['status']),
    verified: data['verified'] == true,
    linkedOrganizerIds: [
      for (final value in data['linkedClubIds'] as List? ?? const [])
        if (value is String && value.isNotEmpty) value,
    ],
    createdAt: nullableDateTimeFromFirestoreValue(data['createdAt']),
    updatedAt: nullableDateTimeFromFirestoreValue(data['updatedAt']),
  );
}

String? _nullableTrimmed(String? value) {
  final normalized = value?.trim();
  return normalized == null || normalized.isEmpty ? null : normalized;
}

String? _string(Object? value) {
  if (value is! String) return null;
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}

HostProfileStatus _status(Object? value) {
  return switch (value) {
    'pending' => HostProfileStatus.pending,
    'suspended' => HostProfileStatus.suspended,
    _ => HostProfileStatus.active,
  };
}

@riverpod
HostProfileRepository hostProfileRepository(Ref ref) {
  return HostProfileRepository(ref.watch(firebaseFirestoreProvider));
}

@riverpod
Stream<HostProfile?> watchHostProfile(Ref ref, String uid) {
  return ref.watch(hostProfileRepositoryProvider).watchHostProfile(uid);
}
