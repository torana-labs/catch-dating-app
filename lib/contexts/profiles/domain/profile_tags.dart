import 'package:catch_platform/cache/cache_tags.dart';

/// Profile reads a write can make stale.
abstract final class ProfileTags {
  /// The signed-in person's form profiles: the list a claim changes.
  static const CacheTag formProfiles = _FormProfilesTag();
}

final class _FormProfilesTag extends CacheTag {
  const _FormProfilesTag();

  @override
  List<Object?> get props => const [];
}
