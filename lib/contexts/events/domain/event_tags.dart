import 'package:catch_platform/cache/cache_tags.dart';

/// Event data a write can make stale, for the function reads that project
/// it. Firestore listeners on events declare none: they deliver the write.
abstract final class EventTags {
  /// What the signed-in viewer may do with [eventId]: book, cancel or use the
  /// waitlist, at the server's quote.
  static CacheTag viewer(String eventId) => _EventViewerTag(eventId);
}

final class _EventViewerTag extends CacheTag {
  const _EventViewerTag(this.eventId);

  final String eventId;

  @override
  List<Object?> get props => [eventId];
}
