import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'guest_event_cards_repository.g.dart';

// firestore-index: guestEventStatuses (uid:ASCENDING, participationStatus:ASCENDING, eventCard.startTimeMillis:ASCENDING)
// firestore-index: guestEventStatuses (uid:ASCENDING, participationStatus:ASCENDING, eventCard.startTimeMillis:DESCENDING)

/// A guest's own event lists, each one bounded listener over documents the
/// guest owns: their `guestEventStatuses` rows for bookings, payments and
/// reviews, and their `savedEvents` edges for saved events. Every row carries
/// the event card the guest event triggers keep current, so no list joins
/// `events`. Lists show only published events with a card.
class GuestEventCardsRepository {
  const GuestEventCardsRepository(this._db, {this._clock = const AppClock()});

  final FirebaseFirestore _db;
  final AppClock _clock;

  static const _statusesPath = 'guestEventStatuses';
  static const _savedPath = 'savedEvents';

  /// Events the guest has a Catch booking at in one of [statuses], by start.
  /// [limit] keeps a history list to its most recent rows.
  Stream<List<GuestEventCard>> watchBookedCards({
    required String uid,
    required Set<EventParticipationStatus> statuses,
    bool descending = false,
    int limit = ReadLimitPolicy.boundedWorkingSet,
  }) {
    if (statuses.isEmpty) return Stream.value(const []);
    final names = statuses.map((status) => status.name).toList()..sort();
    Query<Map<String, dynamic>> query = _db
        .collection(_statusesPath)
        .where('uid', isEqualTo: uid);
    query = names.length == 1
        ? query.where('participationStatus', isEqualTo: names.single)
        : query.where('participationStatus', whereIn: names);
    return withBackendErrorStream(
      () => query
          .orderBy('eventCard.startTimeMillis', descending: descending)
          .limit(limit)
          .snapshots()
          .map((snap) => _listed(snap.docs.map((doc) => doc.data())))
          .distinct(_sameCards),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch booked event cards',
        resource: _statusesPath,
      ),
    );
  }

  /// Every event the guest has a record of their own at (a booking, roster
  /// place, payment, application or offer), keyed by event id, for history
  /// lists that name events by id.
  Stream<Map<String, GuestEventCard>> watchOwnCardsById({
    required String uid,
  }) => withBackendErrorStream(
    () => _db
        .collection(_statusesPath)
        .where('uid', isEqualTo: uid)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map(
          (snap) => {
            for (final card in _listed(snap.docs.map((doc) => doc.data())))
              card.eventId: card,
          },
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch own event cards',
      resource: _statusesPath,
    ),
  );

  /// Events the guest saved, by start: every coming one (from the start of
  /// today, soonest first) and the most recent past page, each a bounded
  /// listener in server order. Saved past events are not browsed further
  /// back; a saved edge for an event long over is history.
  // firestore-index: savedEvents (uid:ASCENDING,eventCard.startTimeMillis:ASCENDING)
  // firestore-index: savedEvents (uid:ASCENDING,eventCard.startTimeMillis:DESCENDING)
  Stream<List<GuestEventCard>> watchSavedCards({required String uid}) {
    final now = _clock.now();
    final boundary = DateTime(
      now.year,
      now.month,
      now.day,
    ).millisecondsSinceEpoch;
    Query<Map<String, dynamic>> saved() =>
        _db.collection(_savedPath).where('uid', isEqualTo: uid);
    final coming = saved()
        .where('eventCard.startTimeMillis', isGreaterThanOrEqualTo: boundary)
        .orderBy('eventCard.startTimeMillis')
        .limit(ReadLimitPolicy.boundedWorkingSet);
    final past = saved()
        .where('eventCard.startTimeMillis', isLessThan: boundary)
        .orderBy('eventCard.startTimeMillis', descending: true)
        .limit(ReadLimitPolicy.directoryPage);
    List<GuestEventCard> cards(QuerySnapshot<Map<String, dynamic>> snap) =>
        _listed(snap.docs.map((doc) => doc.data()));
    return withBackendErrorStream(
      () => combineLatest(
        coming.snapshots().map(cards),
        past.snapshots().map(cards),
        (upcoming, ended) => [...ended.reversed, ...upcoming],
      ).distinct(_sameCards),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch saved event cards',
        resource: _savedPath,
      ),
    );
  }

  static List<GuestEventCard> _listed(Iterable<Map<String, dynamic>> rows) => [
    for (final row in rows)
      if (GuestEventCard.fromData(row['eventCard']) case final card?
          when card.published)
        card,
  ];

  static bool _sameCards(List<GuestEventCard> a, List<GuestEventCard> b) {
    if (a.length != b.length) return false;
    for (var index = 0; index < a.length; index++) {
      if (a[index] != b[index]) return false;
    }
    return true;
  }
}

@riverpod
GuestEventCardsRepository guestEventCardsRepository(Ref ref) =>
    GuestEventCardsRepository(
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

/// Upcoming and past events the guest is booked at.
@riverpod
Stream<List<GuestEventCard>> watchSignedUpEventCards(Ref ref, String uid) => ref
    .watch(guestEventCardsRepositoryProvider)
    .watchBookedCards(
      uid: uid,
      statuses: const {EventParticipationStatus.signedUp},
    );

/// The guest's most recent attended events, newest first. Attendance only
/// grows, and its readers (the home's catch windows and review prompt, and
/// Explore's time-of-day signal) use recent events, so the listener reads
/// one history page instead of every event the guest ever attended.
@riverpod
Stream<List<GuestEventCard>> watchAttendedEventCards(Ref ref, String uid) => ref
    .watch(guestEventCardsRepositoryProvider)
    .watchBookedCards(
      uid: uid,
      statuses: const {EventParticipationStatus.attended},
      descending: true,
      limit: ReadLimitPolicy.historyPage,
    );

/// Events the guest is booked or waitlisted at, for schedule overlaps.
@riverpod
Stream<List<GuestEventCard>> watchScheduledEventCards(Ref ref, String uid) =>
    ref
        .watch(guestEventCardsRepositoryProvider)
        .watchBookedCards(
          uid: uid,
          statuses: const {
            EventParticipationStatus.signedUp,
            EventParticipationStatus.waitlisted,
          },
        );

/// Events the guest saved.
@riverpod
Stream<List<GuestEventCard>> watchSavedEventCards(Ref ref, String uid) =>
    ref.watch(guestEventCardsRepositoryProvider).watchSavedCards(uid: uid);

/// The guest's event cards by event id, for payment and review history.
@riverpod
Stream<Map<String, GuestEventCard>> watchOwnEventCardsById(
  Ref ref,
  String uid,
) => ref.watch(guestEventCardsRepositoryProvider).watchOwnCardsById(uid: uid);
