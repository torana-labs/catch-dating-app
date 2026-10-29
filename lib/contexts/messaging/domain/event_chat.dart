import 'package:meta/meta.dart';

enum EventChatAction {
  open,
  close,
  join,
  leave,
  mute,
  unmute,
  pause,
  announcementsOnly,
  resume,
  archive,
  schedule,
}

enum EventChatSafetyAction { report, block, remove }

enum EventChatReportReason { harassment, spam, inappropriate, other }

enum EventChatReaction {
  like('👍'),
  love('❤️'),
  laugh('😂'),
  wow('😮'),
  sad('😢'),
  thanks('🙏');

  const EventChatReaction(this.emoji);
  final String emoji;
}

@immutable
class EventChatAccess {
  const EventChatAccess({
    required this.eventId,
    required this.title,
    required this.organizerId,
    required this.roomStatus,
    required this.roomRevision,
    required this.membershipStatus,
    required this.membershipRevision,
    required this.canManage,
    required this.canJoin,
    required this.canReadMessages,
    bool? canPostMessages,
    this.notificationsMuted = false,
    this.opensAtMillis,
    this.closesAtMillis,
    required this.profileClaimRequired,
    required this.termsVersion,
  }) : canPostMessages = canPostMessages ?? canReadMessages;
  factory EventChatAccess.fromMap(Map<Object?, Object?> json) {
    final room = json['room']! as Map;
    final member = json['membership']! as Map;
    return EventChatAccess(
      eventId: json['eventId']! as String,
      title: json['title']! as String,
      organizerId: json['organizerId']! as String,
      roomStatus: room['status']! as String,
      roomRevision: (room['revision']! as num).toInt(),
      membershipStatus: member['status']! as String,
      membershipRevision: (member['revision']! as num).toInt(),
      canManage: json['canManage']! as bool,
      canJoin: json['canJoin']! as bool,
      canReadMessages: json['canReadMessages']! as bool,
      canPostMessages: json['canPostMessages']! as bool,
      notificationsMuted: member['notificationsMuted'] == true,
      opensAtMillis: (room['opensAtMillis'] as num?)?.toInt(),
      closesAtMillis: (room['closesAtMillis'] as num?)?.toInt(),
      profileClaimRequired: json['profileClaimRequired']! as bool,
      termsVersion: json['termsVersion']! as String,
    );
  }
  final String eventId, title, organizerId, roomStatus, membershipStatus;
  final String termsVersion;
  final int roomRevision, membershipRevision;
  final int? opensAtMillis, closesAtMillis;
  final bool canManage, canJoin, canReadMessages, canPostMessages;
  final bool notificationsMuted, profileClaimRequired;
  bool get isRoomOpen =>
      roomStatus == 'open' ||
      roomStatus == 'paused' ||
      roomStatus == 'announcementsOnly';
  bool get hasJoined => membershipStatus == 'joined';
  bool get membershipUnavailable =>
      membershipStatus == 'removed' || membershipStatus == 'banned';
  bool get announcementsOnly => roomStatus == 'announcementsOnly';

  int revisionFor(EventChatAction action) => switch (action) {
    EventChatAction.open || EventChatAction.close ||
    EventChatAction.pause || EventChatAction.announcementsOnly ||
    EventChatAction.resume || EventChatAction.archive ||
    EventChatAction.schedule => roomRevision,
    EventChatAction.join || EventChatAction.leave ||
    EventChatAction.mute || EventChatAction.unmute => membershipRevision,
  };
}

@immutable
class EventChatReply {
  const EventChatReply({
    required this.messageId,
    required this.available,
    required this.senderName,
    required this.text,
  });
  factory EventChatReply.fromMap(Map<Object?, Object?> json) => EventChatReply(
    messageId: json['messageId']! as String,
    available: json['available']! as bool,
    senderName: json['available'] == true
        ? json['senderName'] as String?
        : null,
    text: json['available'] == true ? json['text'] as String? : null,
  );
  final String messageId;
  final bool available;
  final String? senderName, text;
}

@immutable
class EventChatMessage {
  EventChatMessage({
    required this.messageId,
    required this.sequence,
    required this.sentAt,
    required this.senderUid,
    required this.senderName,
    required this.available,
    required this.text,
    required this.reply,
    required Map<EventChatReaction, int> reactionCounts,
    required this.myReaction,
    required this.myReactionRevision,
    this.kind = 'text',
  }) : reactionCounts = Map.unmodifiable(reactionCounts);
  factory EventChatMessage.fromMap(Map<Object?, Object?> json) {
    final available = json['available']! as bool;
    final counts = json['reactionCounts']! as Map;
    return EventChatMessage(
      messageId: json['messageId']! as String,
      sequence: (json['sequence']! as num).toInt(),
      sentAt: DateTime.fromMillisecondsSinceEpoch(
        (json['sentAtMillis']! as num).toInt(),
        isUtc: true,
      ),
      senderUid: available ? json['senderUid'] as String? : null,
      senderName: available ? json['senderName'] as String? : null,
      available: available,
      text: available ? json['text'] as String? : null,
      reply: available && json['reply'] != null
          ? EventChatReply.fromMap(json['reply']! as Map)
          : null,
      reactionCounts: {
        for (final reaction in EventChatReaction.values)
          reaction: available ? (counts[reaction.name]! as num).toInt() : 0,
      },
      myReaction: available && json['myReaction'] != null
          ? EventChatReaction.values.byName(json['myReaction']! as String)
          : null,
      myReactionRevision: available
          ? (json['myReactionRevision']! as num).toInt()
          : 0,
      kind: available ? (json['kind'] as String? ?? 'text') : 'text',
    );
  }
  final String messageId;
  final int sequence;
  final DateTime sentAt;
  final String? senderUid, senderName, text;
  final bool available;
  final EventChatReply? reply;
  final Map<EventChatReaction, int> reactionCounts;
  final EventChatReaction? myReaction;
  final int myReactionRevision;
  final String kind;
}

@immutable
class EventChatTyping {
  const EventChatTyping({
    required this.uid,
    required this.displayName,
    required this.expiresAtMillis,
  });
  factory EventChatTyping.fromMap(Map<Object?, Object?> json) =>
      EventChatTyping(
        uid: json['uid']! as String,
        displayName: json['displayName']! as String,
        expiresAtMillis: (json['expiresAtMillis']! as num).toInt(),
      );
  final String uid, displayName;
  final int expiresAtMillis;
}

@immutable
class EventChatPage {
  EventChatPage({
    required Iterable<EventChatMessage> messages,
    required this.nextBeforeSequence,
    required Iterable<EventChatTyping> typing,
    required this.ownTypingRevision,
    required this.serverTimeMillis,
    required this.typingHasMore,
  }) : messages = List.unmodifiable(messages),
       typing = List.unmodifiable(typing);
  factory EventChatPage.fromMap(Map<Object?, Object?> json) => EventChatPage(
    messages: (json['messages']! as List).map(
      (value) => EventChatMessage.fromMap(value as Map),
    ),
    nextBeforeSequence: (json['nextBeforeSequence'] as num?)?.toInt(),
    typing: (json['typing']! as List).map(
      (value) => EventChatTyping.fromMap(value as Map),
    ),
    ownTypingRevision: (json['ownTypingRevision']! as num).toInt(),
    serverTimeMillis: (json['serverTimeMillis']! as num).toInt(),
    typingHasMore: json['typingHasMore']! as bool,
  );
  final List<EventChatMessage> messages;
  final int? nextBeforeSequence;
  final List<EventChatTyping> typing;
  final int ownTypingRevision, serverTimeMillis;
  final bool typingHasMore;
}
