import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_directory_repository.g.dart';

/// Lists `eventChatDirectoryEntries` rows for one person. Triggers rebuild
/// each row from current admission, the event, the room and the chat
/// membership, so one listener keeps the chat list current. Opening a chat
/// still goes through the access and message callables.
class EventChatDirectoryRepository {
  const EventChatDirectoryRepository(this._db);

  static const _collection = 'eventChatDirectoryEntries';

  final FirebaseFirestore _db;

  /// Newest events first. [now] decides each room's scheduled window.
  Stream<List<EventChatAccess>> watch(
    String uid,
    DateTime Function() now,
  ) => withBackendErrorStream(
    // firestore-index: eventChatDirectoryEntries (uid:ASCENDING,eventStartAtMillis:DESCENDING)
    () => _db
        .collection(_collection)
        .where('uid', isEqualTo: uid)
        .orderBy('eventStartAtMillis', descending: true)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map(
          (snap) => List<EventChatAccess>.unmodifiable(
            snap.docs.map(
              (doc) =>
                  EventChatAccess.fromDirectoryEntry(doc.data(), now: now()),
            ),
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event chats',
      resource: _collection,
    ),
  );
}

@riverpod
EventChatDirectoryRepository eventChatDirectoryRepository(Ref ref) =>
    EventChatDirectoryRepository(ref.watch(firebaseFirestoreProvider));
