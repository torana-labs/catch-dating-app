import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show HeartbeatEventStaffPresenceCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_staff_presence_repository.g.dart';

/// Whether a door teammate is an organizer manager or event staff.
enum EventStaffPresenceRole { manager, operator }

/// One manager or staff member on an event's door, as
/// `eventStaffPresence/{eventId}_{uid}` holds them.
@immutable
class EventStaffPresence {
  const EventStaffPresence({
    required this.eventId,
    required this.uid,
    required this.displayName,
    required this.role,
    required this.lastSeenAt,
    required this.expiresAt,
  });

  /// Parses a presence row; null for a row this client cannot read, which the
  /// door leaves out rather than failing the guest list.
  static EventStaffPresence? tryParse(Map<String, Object?> data) {
    if (data case {
      'schemaVersion': 1,
      'eventId': final String eventId,
      'uid': final String uid,
      'displayName': final String displayName,
      'role': final String role,
      'lastSeenAt': final Timestamp lastSeenAt,
      'expiresAt': final Timestamp expiresAt,
    }) {
      final parsedRole = EventStaffPresenceRole.values.asNameMap()[role];
      if (parsedRole == null) return null;
      return EventStaffPresence(
        eventId: eventId,
        uid: uid,
        displayName: displayName,
        role: parsedRole,
        lastSeenAt: lastSeenAt.toDate(),
        expiresAt: expiresAt.toDate(),
      );
    }
    return null;
  }

  final String eventId;
  final String uid;
  final String displayName;
  final EventStaffPresenceRole role;
  final DateTime lastSeenAt;
  final DateTime expiresAt;

  /// Still on the door at [now]: the last heartbeat has not lapsed.
  bool isCurrentAt(DateTime now) => expiresAt.isAfter(now);
}

/// The door's presence: the heartbeat a door phone sends and the listener
/// over who else is on the door.
class EventStaffPresenceRepository {
  const EventStaffPresenceRepository(this._db, this._functions);

  static const _collectionPath = 'eventStaffPresence';

  /// How often an open door says its host is still on it; the server lets
  /// presence lapse after two missed beats.
  static const heartbeatInterval = Duration(seconds: 45);

  /// An event's door team is a handful of people; this bounds the read.
  static const maxRows = 50;

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  /// Every presence row for [eventId], lapsed or not, newest first.
  Stream<List<EventStaffPresence>> watchForEvent(String eventId) =>
      withBackendErrorStream(
        () => _db
            .collection(_collectionPath)
            .where('eventId', isEqualTo: eventId)
            .limit(maxRows)
            .snapshots()
            .map(
              (snapshot) =>
                  [
                    for (final document in snapshot.docs)
                      ?EventStaffPresence.tryParse(document.data()),
                  ]..sort(
                    (left, right) =>
                        right.lastSeenAt.compareTo(left.lastSeenAt),
                  ),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event staff presence',
          resource: _collectionPath,
        ),
      );

  /// Says the signed-in manager or staff member is on the door now.
  Future<void> heartbeat(String eventId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('heartbeatEventStaffPresence')
        .call<Object?>(
          HeartbeatEventStaffPresenceCallableRequest(eventId: eventId).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record event staff presence',
      resource: _collectionPath,
    ),
  );
}

// keepalive: One Firebase-backed repository instance serves every event.
@Riverpod(keepAlive: true)
EventStaffPresenceRepository eventStaffPresenceRepository(Ref ref) =>
    EventStaffPresenceRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<EventStaffPresence>> watchEventStaffPresence(
  Ref ref,
  String eventId,
) => ref.watch(eventStaffPresenceRepositoryProvider).watchForEvent(eventId);
