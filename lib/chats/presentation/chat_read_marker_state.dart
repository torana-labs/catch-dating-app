import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';

class ChatReadMarkerState {
  String? _lastMarkedUid;
  String? _lastKnownUid;

  String? markForUid(String? uid, {bool force = false}) {
    if (uid == null) return null;
    _lastKnownUid = uid;
    if (!force && uid == _lastMarkedUid) return null;

    _lastMarkedUid = uid;
    return uid;
  }

  String? markForIncomingLatest({
    required String? uid,
    required List<ChatMessage> messages,
  }) {
    final latest = messages.isEmpty ? null : messages.last;
    if (uid == null || latest == null || latest.senderId == uid) return null;
    return markForUid(uid, force: true);
  }

  String? get disposeMarkUid => _lastKnownUid;
}
