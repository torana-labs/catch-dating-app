import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_close_out_repository.g.dart';

/// Close-out: a manager listener on `eventCloseOuts/{eventId}` (rules let
/// the event's organizer hosts get it; only the server writes it) and the
/// `setEventCloseOut` command.
class EventCloseOutRepository {
  const EventCloseOutRepository(this._db, this._functions);

  static const collection = 'eventCloseOuts';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  Stream<EventCloseOut> watch(String eventId) => withBackendErrorStream(
    () => _db
        .collection(collection)
        .doc(eventId)
        .snapshots()
        .map((snapshot) => EventCloseOut.fromFirestore(snapshot.data())),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch close out',
      resource: collection,
    ),
  );

  /// Saves the after-the-night choices, fenced on [expectedRevision]. A
  /// retry with the same [requestId] replays.
  Future<void> set({
    required String organizerId,
    required String eventId,
    required String requestId,
    required int expectedRevision,
    required String? thankYouAtLocal,
    required bool openStayInTouchPicks,
    required bool noShowNote,
  }) => withBackendErrorContext(
    () => _functions.httpsCallable('setEventCloseOut').call<Object?>({
      'organizerId': organizerId,
      'eventId': eventId,
      'requestId': requestId,
      'expectedRevision': expectedRevision,
      'thankYou': thankYouAtLocal == null
          ? null
          : {'sendAtLocal': thankYouAtLocal},
      'openStayInTouchPicks': openStayInTouchPicks,
      'noShowNote': noShowNote,
    }),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'close out the night',
      resource: collection,
    ),
  );
}

@riverpod
EventCloseOutRepository eventCloseOutRepository(Ref ref) =>
    EventCloseOutRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

/// The event's close-out, by listener.
@riverpod
Stream<EventCloseOut> watchEventCloseOut(Ref ref, String eventId) =>
    ref.watch(eventCloseOutRepositoryProvider).watch(eventId);
