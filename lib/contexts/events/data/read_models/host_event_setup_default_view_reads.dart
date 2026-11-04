import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_view.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_setup_default_view_reads.g.dart';

/// Manager listener on `hostEventSetupDefaultViews/{organizerId}`. Rules
/// allow a current manager of an active organizer to get it; the server
/// writes it.
class HostEventSetupDefaultViewReads {
  const HostEventSetupDefaultViewReads(this._db);

  static const collection = 'hostEventSetupDefaultViews';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _db;

  Stream<ManagerEventSetupDefaultsView> watch(String organizerId) {
    if (!_documentId.hasMatch(organizerId)) {
      throw ArgumentError.value(organizerId, 'organizerId');
    }
    return withBackendErrorStream(
      () => _db
          .collection(collection)
          .doc(organizerId)
          .snapshots()
          .map(
            (snapshot) => ManagerEventSetupDefaultsView.fromFirestore(
              organizerId: organizerId,
              data: snapshot.data(),
            ),
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer event defaults',
        resource: collection,
      ),
    );
  }
}

@riverpod
HostEventSetupDefaultViewReads hostEventSetupDefaultViewReads(Ref ref) =>
    HostEventSetupDefaultViewReads(ref.watch(firebaseFirestoreProvider));

/// The organizer defaults read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.
@riverpod
Stream<ManagerEventSetupDefaultsView> managerEventSetupDefaultsView(
  Ref ref,
  String organizerId,
) => ref.watch(hostEventSetupDefaultViewReadsProvider).watch(organizerId);
