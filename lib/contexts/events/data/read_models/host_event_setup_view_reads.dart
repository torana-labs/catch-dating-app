import 'package:catch_dating_app/contexts/events/data/private_event_setup_view.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_setup_view_reads.g.dart';

/// Manager listener on `hostEventSetupViews/{eventId}`. Rules allow a current
/// manager of an active organizer to get it; the server writes it.
class HostEventSetupViewReads {
  const HostEventSetupViewReads(this._db, {this.clock = const AppClock()});

  static const collection = 'hostEventSetupViews';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _db;

  /// Applies time to publication readiness on every delivered snapshot.
  final AppClock clock;

  Stream<PrivateEventSetupView> watch({
    required String organizerId,
    required String eventId,
  }) {
    if (!_documentId.hasMatch(organizerId) || !_documentId.hasMatch(eventId)) {
      throw ArgumentError('Organizer and event ids are required');
    }
    return withBackendErrorStream(
      () => _db
          .collection(collection)
          .doc(eventId)
          .snapshots()
          .map(
            (snapshot) => PrivateEventSetupView.fromFirestore(
              organizerId: organizerId,
              eventId: eventId,
              data: snapshot.data(),
              now: clock.now(),
            ),
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch private event setup',
        resource: collection,
      ),
    );
  }
}

@riverpod
HostEventSetupViewReads hostEventSetupViewReads(Ref ref) =>
    HostEventSetupViewReads(
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

/// The setup steps' event read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.
@riverpod
Stream<PrivateEventSetupView> privateEventSetupView(
  Ref ref, {
  required String organizerId,
  required String eventId,
}) => ref
    .watch(hostEventSetupViewReadsProvider)
    .watch(organizerId: organizerId, eventId: eventId);
