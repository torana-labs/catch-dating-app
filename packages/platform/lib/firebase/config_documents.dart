import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'config_documents.g.dart';

/// Reads the app-wide public documents under `config/` (cities, brand).
///
/// The Firestore read stays here so the platform services that use these
/// documents hold plain maps, not Firestore types
/// (`catch_arch_firestore_outside_data`). Firestore serves its offline cache
/// when the network is slow.
class ConfigDocuments {
  const ConfigDocuments(this._db);

  final FirebaseFirestore _db;

  /// The data of the document at [path], or null when it does not exist.
  Future<Map<String, dynamic>?> read(String path) => withBackendErrorContext(
    () async => (await _db.doc(path).get()).data(),
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: 'load app configuration',
      resource: path,
    ),
  );
}

// keepalive: a stateless facade over the app's Firestore singleton.
@Riverpod(keepAlive: true)
ConfigDocuments configDocuments(Ref ref) =>
    ConfigDocuments(ref.watch(firebaseFirestoreProvider));
