import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_signals.g.dart';

/// The revisions of one event chat's content-free change signal. A missing
/// document reads as all zeros: nothing has changed since the chat began.
class EventChatSignal {
  const EventChatSignal({
    this.messageRevision = 0,
    this.typingRevision = 0,
    this.accessRevision = 0,
  });

  factory EventChatSignal.fromData(Map<String, Object?>? data) =>
      EventChatSignal(
        messageRevision: _revision(data?['messageRevision']),
        typingRevision: _revision(data?['typingRevision']),
        accessRevision: _revision(data?['accessRevision']),
      );

  /// Messages were sent, removed or reacted to.
  final int messageRevision;

  /// Someone started, kept or stopped typing.
  final int typingRevision;

  /// The room or a membership changed.
  final int accessRevision;

  bool contentChangedSince(EventChatSignal seen) =>
      messageRevision != seen.messageRevision ||
      accessRevision != seen.accessRevision;

  bool typingChangedSince(EventChatSignal seen) =>
      typingRevision != seen.typingRevision;

  static int _revision(Object? value) => value is num ? value.toInt() : 0;
}

/// Where the event chat hears that something changed.
abstract interface class EventChatSignalSource {
  Stream<EventChatSignal> watch(String eventId);
}

/// Listens to `eventChatSignals/{eventId}`, which triggers move when the
/// chat's messages, typing, room or memberships change. It carries no chat
/// content; the messages stay behind the callables that filter them per
/// viewer.
class FirestoreEventChatSignalSource implements EventChatSignalSource {
  const FirestoreEventChatSignalSource(this._firestore);

  static const _path = 'eventChatSignals';

  final FirebaseFirestore _firestore;

  @override
  Stream<EventChatSignal> watch(String eventId) => withBackendErrorStream(
    () => _firestore
        .collection(_path)
        .doc(eventId)
        .snapshots()
        .map((snapshot) => EventChatSignal.fromData(snapshot.data())),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event chat changes',
      resource: _path,
    ),
  );
}

// keepalive: a stateless listener facade with no account state.
@Riverpod(keepAlive: true)
EventChatSignalSource eventChatSignalSource(Ref ref) =>
    FirestoreEventChatSignalSource(ref.watch(firebaseFirestoreProvider));
