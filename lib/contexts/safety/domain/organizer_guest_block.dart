/// Someone an organiser has stopped booking their events, as the
/// organiser block list returns them. [displayName] is null when the
/// account has no name.
class OrganizerGuestBlock {
  const OrganizerGuestBlock({
    required this.uid,
    required this.displayName,
    required this.blockedByUid,
    required this.createdAt,
  });

  final String uid;
  final String? displayName;
  final String blockedByUid;

  /// When they were blocked; null when the server sent no time.
  final DateTime? createdAt;

  /// Reads one list item, or null when it has no uid.
  static OrganizerGuestBlock? fromCallable(Object? value) {
    if (value is! Map) return null;
    final uid = value['uid'];
    if (uid is! String || uid.isEmpty) return null;
    final name = value['displayName'];
    final blockedBy = value['blockedByUid'];
    final millis = value['createdAtMillis'];
    return OrganizerGuestBlock(
      uid: uid,
      displayName: name is String && name.trim().isNotEmpty
          ? name.trim()
          : null,
      blockedByUid: blockedBy is String ? blockedBy : '',
      createdAt: millis is num && millis > 0
          ? DateTime.fromMillisecondsSinceEpoch(millis.toInt())
          : null,
    );
  }
}
