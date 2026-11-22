import 'package:catch_platform/cache/cache_tags.dart';

/// Audience reads a write can make stale.
abstract final class AudienceTags {
  /// One organizer's messaging setup: the WhatsApp connection, its templates
  /// and the last test send, which every WhatsApp setup command changes.
  static CacheTag messagingSetup(String organizerId) =>
      _MessagingSetupTag(organizerId);
}

final class _MessagingSetupTag extends CacheTag {
  const _MessagingSetupTag(this.organizerId);

  final String organizerId;

  @override
  List<Object?> get props => [organizerId];
}
