/// Presence expiry and request pacing for event conversations, not animation.
abstract final class EventChatTiming {
  static const participantProfileRefresh = Duration(seconds: 15);

  /// Typing alone reads the chat again at most this often.
  static const typingRefreshGap = Duration(seconds: 3);

  /// A scheduled room is read again this long after it opens or closes.
  static const roomBoundaryGrace = Duration(seconds: 1);
  static const idleTyping = Duration(seconds: 6);
  static const typingHeartbeat = Duration(seconds: 4);
  static const presenceDisplayTick = Duration(seconds: 1);
}
