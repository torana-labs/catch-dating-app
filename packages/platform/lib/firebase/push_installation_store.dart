import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'push_installation_store.g.dart';

/// `users/{uid}/pushInstallations/{installationId}`: the only push address
/// store; senders pick the newest device of the app they target.
///
/// The Firestore writes stay here so the push service never touches Firestore
/// types (`catch_arch_firestore_outside_data`).
class PushInstallationStore {
  const PushInstallationStore(this._db);

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _installation(
    String uid,
    String installationId,
  ) => _db
      .collection('users')
      .doc(uid)
      .collection('pushInstallations')
      .doc(installationId);

  /// Merges [fields] into the installation and stamps `updatedAt` with the
  /// server time.
  Future<void> save({
    required String uid,
    required String installationId,
    required Map<String, Object?> fields,
  }) => withBackendErrorContext(
    () => _installation(uid, installationId).set({
      ...fields,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true)),
    context: _context,
  );

  /// Deletes the installation, so no sender targets this device again.
  Future<void> delete({required String uid, required String installationId}) =>
      withBackendErrorContext(
        () => _installation(uid, installationId).delete(),
        context: _context,
      );

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'update push notification settings',
    resource: 'pushInstallations',
  );
}

// keepalive: a stateless facade over the app's Firestore singleton, held by
// the app-wide push service.
@Riverpod(keepAlive: true)
PushInstallationStore pushInstallationStore(Ref ref) =>
    PushInstallationStore(ref.watch(firebaseFirestoreProvider));
