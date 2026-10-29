import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'booked_events_repository.g.dart';

/// The events a person has booked or attended, read through their
/// participations. Bookings own the participation query; [EventRepository]
/// owns reading the events themselves.
class BookedEventsRepository {
  const BookedEventsRepository(this._db, this._events);

  final FirebaseFirestore _db;
  final EventRepository _events;

  CollectionReference<EventParticipation> get _participationsRef => _db
      .collection('eventParticipations')
      .withDocumentIdConverter<EventParticipation>(
        idField: 'id',
        fromJson: EventParticipation.fromJson,
        toJson: (participation) => participation.toJson(),
      );

  Stream<List<Event>> watchAttendedEvents({required String uid}) =>
      _watchEventsForParticipationStatuses(
        uid: uid,
        statuses: const {EventParticipationStatus.attended},
        descending: true,
      );

  /// Streams upcoming events the user has signed up for (paid / reserved a spot).
  Stream<List<Event>> watchSignedUpEvents({required String uid}) =>
      _watchEventsForParticipationStatuses(
        uid: uid,
        statuses: const {EventParticipationStatus.signedUp},
      );

  Stream<List<Event>> _watchEventsForParticipationStatuses({
    required String uid,
    required Set<EventParticipationStatus> statuses,
    bool descending = false,
  }) {
    if (statuses.isEmpty) return Stream.value(const []);

    Query<EventParticipation> query = _participationsRef.where(
      'uid',
      isEqualTo: uid,
    );
    final statusNames = statuses.map((status) => status.name).toList();
    query = statusNames.length == 1
        ? query.where('status', isEqualTo: statusNames.single)
        : query.where('status', whereIn: statusNames);

    final idStream = query
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map(
          (snap) => snap.docs.map((doc) => doc.data().eventId).toSet().toList(),
        );

    return _events.watchEventsForIdStream(
      idStream,
      descending: descending,
      action: 'watch events by participation',
    );
  }
}

@riverpod
BookedEventsRepository bookedEventsRepository(Ref ref) =>
    BookedEventsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(eventRepositoryProvider),
    );

@riverpod
Stream<List<Event>> watchAttendedEvents(Ref ref, String uid) =>
    ref.watch(bookedEventsRepositoryProvider).watchAttendedEvents(uid: uid);

@riverpod
Stream<List<Event>> watchSignedUpEvents(Ref ref, String uid) =>
    ref.watch(bookedEventsRepositoryProvider).watchSignedUpEvents(uid: uid);
