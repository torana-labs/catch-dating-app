import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_participant_context_repository.g.dart';

/// The signed-in guest's own roster identity for one event, read from their
/// `guestEventStatuses/{eventId}_{uid}` row (#2306) instead of the
/// `getEventAssistanceParticipantContext` callable. Rules let only that
/// guest read the row, and its trigger resolves the link from the linked uid
/// alone, so another guest's row never reaches it.
class EventParticipantContextRepository {
  const EventParticipantContextRepository(
    this._firestore, [
    this._clock = const AppClock(),
  ]);
  final FirebaseFirestore _firestore;
  final AppClock _clock;

  Future<EventParticipantContext> fetch({
    required String eventId,
    required String subjectUid,
  }) => withBackendErrorContext(
    () async {
      final snapshot = await _firestore
          .collection('guestEventStatuses')
          .doc('${eventId}_$subjectUid')
          .get();
      return EventParticipantContext.fromStatusRow(
        snapshot.data(),
        eventId: eventId,
        subjectUid: subjectUid,
        serverTime: _clock.now().millisecondsSinceEpoch,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'resolve own event attendee identity',
      resource: 'guestEventStatuses',
    ),
  );
}

@riverpod
EventParticipantContextRepository eventParticipantContextRepository(Ref ref) =>
    EventParticipantContextRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(appClockProvider),
    );
