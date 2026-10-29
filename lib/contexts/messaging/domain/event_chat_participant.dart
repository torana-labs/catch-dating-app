import 'package:meta/meta.dart';

@immutable
class EventChatParticipant {
  const EventChatParticipant({
    required this.uid,
    required this.displayName,
    required this.isHost,
    this.membershipStatus = 'joined',
    this.membershipRevision = 0,
  });
  factory EventChatParticipant.fromMap(Map<Object?, Object?> json) =>
      EventChatParticipant(
        uid: json['uid']! as String,
        displayName: json['displayName']! as String,
        isHost: json['role'] == 'host',
        membershipStatus: json['membershipStatus']! as String,
        membershipRevision: (json['membershipRevision']! as num).toInt(),
      );
  final String uid, displayName;
  final bool isHost;
  final String membershipStatus;
  final int membershipRevision;
  bool get isJoined => membershipStatus == 'joined';
  bool get isRemoved => membershipStatus == 'removed';
  bool get isBanned => membershipStatus == 'banned';
}

@immutable
class EventChatParticipantPage {
  EventChatParticipantPage({
    required Iterable<EventChatParticipant> items,
    required Map<String, Object?>? nextCursor,
  }) : items = List.unmodifiable(items),
       nextCursor = nextCursor == null ? null : Map.unmodifiable(nextCursor);
  factory EventChatParticipantPage.fromMap(Map<Object?, Object?> json) =>
      EventChatParticipantPage(
        items: (json['items']! as List).map(
          (row) => EventChatParticipant.fromMap(row as Map),
        ),
        nextCursor: (json['nextCursor'] as Map?)?.cast<String, Object?>(),
      );
  final List<EventChatParticipant> items;
  final Map<String, Object?>? nextCursor;
}
