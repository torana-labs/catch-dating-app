/// Presence expiry and request pacing for event conversations, not animation.
abstract final class EventChatTiming {
  static const participantProfileRefresh = Duration(seconds: 15);
  static const refreshPerHistoryPage = Duration(seconds: 3);
  static const idleTyping = Duration(seconds: 6);
  static const typingHeartbeat = Duration(seconds: 4);
  static const presenceDisplayTick = Duration(seconds: 1);
}
