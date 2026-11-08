import 'package:flutter/foundation.dart';

/// The host's after-the-night choices as `eventCloseOuts/{eventId}` holds
/// them. A night not closed out yet reads as [EventCloseOut.none]: every
/// switch off, revision 0.
@immutable
class EventCloseOut {
  const EventCloseOut({
    required this.revision,
    required this.thankYouAtLocal,
    required this.openStayInTouchPicks,
    required this.noShowNote,
  });

  static const none = EventCloseOut(
    revision: 0,
    thankYouAtLocal: null,
    openStayInTouchPicks: false,
    noShowNote: false,
  );

  /// Reads the stored document; anything missing or malformed reads as off.
  factory EventCloseOut.fromFirestore(Map<String, Object?>? data) {
    if (data == null) return none;
    final thankYou = data['thankYou'];
    final revision = data['revision'];
    return EventCloseOut(
      revision: revision is int && revision > 0 ? revision : 0,
      thankYouAtLocal: thankYou is Map && thankYou['sendAtLocal'] is String
          ? thankYou['sendAtLocal'] as String
          : null,
      openStayInTouchPicks: data['openStayInTouchPicks'] == true,
      noShowNote: data['noShowNote'] == true,
    );
  }

  /// The close-out's fence for the next save.
  final int revision;

  /// The local time the thank-you goes, `HH:mm`; null when it does not.
  final String? thankYouAtLocal;
  final bool openStayInTouchPicks;
  final bool noShowNote;

  bool get closedOut => revision > 0;
}
