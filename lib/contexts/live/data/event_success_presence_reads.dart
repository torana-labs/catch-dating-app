import 'package:catch_dating_app/contexts/live/domain/event_success_presence_derivation.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_presence_reads.g.dart';

/// Manager listeners on an event's room presence heartbeats and late-arrival
/// placements. Rules list both for a current manager of the organizer the
/// query names; only the server writes them.
class EventSuccessPresenceReads {
  const EventSuccessPresenceReads(this._db);

  static const presenceCollection = 'eventSuccessPresence';
  static const lateArrivalsCollection = 'eventSuccessLateArrivals';

  final FirebaseFirestore _db;

  /// The event's heartbeats; a row the server could not have written (no
  /// uid or heartbeat time) is skipped, as the retired summary skipped it.
  Stream<List<EventSuccessPresenceHeartbeatRow>> watchHeartbeats({
    required String organizerId,
    required String eventId,
  }) => withBackendErrorStream(
    () => _db
        .collection(presenceCollection)
        .where('organizerId', isEqualTo: organizerId)
        .where('eventId', isEqualTo: eventId)
        .orderBy(FieldPath.documentId)
        .limit(ReadLimitPolicy.eventSuccessPresence)
        .snapshots()
        .map(
          (snapshot) => [
            for (final doc in snapshot.docs)
              if ((doc.data()['uid'], doc.data()['heartbeatAt']) case (
                final String uid,
                final Timestamp heartbeatAt,
              ) when uid.isNotEmpty && doc.data()['eventId'] == eventId)
                (
                  uid: uid,
                  heartbeatAtMillis: heartbeatAt.millisecondsSinceEpoch,
                ),
          ],
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event presence',
      resource: presenceCollection,
    ),
  );

  /// The event's late-arrival placements, each for one target round.
  Stream<List<EventSuccessLateArrivalPlacementRow>> watchPlacements({
    required String organizerId,
    required String eventId,
  }) => withBackendErrorStream(
    () => _db
        .collection(lateArrivalsCollection)
        .where('organizerId', isEqualTo: organizerId)
        .where('eventId', isEqualTo: eventId)
        .orderBy(FieldPath.documentId)
        .limit(ReadLimitPolicy.eventSuccessPresence)
        .snapshots()
        .map(
          (snapshot) => [
            for (final doc in snapshot.docs)
              if ((doc.data()['uid'], doc.data()['targetRoundIndex']) case (
                final String uid,
                final int targetRoundIndex,
              ) when uid.isNotEmpty && doc.data()['eventId'] == eventId)
                (uid: uid, targetRoundIndex: targetRoundIndex),
          ],
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch late arrival placements',
      resource: lateArrivalsCollection,
    ),
  );
}

@riverpod
EventSuccessPresenceReads eventSuccessPresenceReads(Ref ref) =>
    EventSuccessPresenceReads(ref.watch(firebaseFirestoreProvider));

/// The room presence read owner. It is a Firestore listener: it declares no
/// cache tags or lifetime, and writes never invalidate it.
@riverpod
Stream<List<EventSuccessPresenceHeartbeatRow>> eventSuccessPresenceHeartbeats(
  Ref ref, {
  required String organizerId,
  required String eventId,
}) => ref
    .watch(eventSuccessPresenceReadsProvider)
    .watchHeartbeats(organizerId: organizerId, eventId: eventId);

/// The late-arrival placement read owner. It is a Firestore listener: a
/// placement reaches it from the server, so the console never rereads after
/// placing a guest.
@riverpod
Stream<List<EventSuccessLateArrivalPlacementRow>>
eventSuccessLateArrivalPlacements(
  Ref ref, {
  required String organizerId,
  required String eventId,
}) => ref
    .watch(eventSuccessPresenceReadsProvider)
    .watchPlacements(organizerId: organizerId, eventId: eventId);
