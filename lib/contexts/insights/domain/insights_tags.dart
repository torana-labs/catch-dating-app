import 'package:catch_platform/cache/cache_tags.dart';

/// Host reports a write can make stale. Reports are computed by Cloud
/// Functions, so a write that changes what they count declares these tags.
abstract final class InsightsTags {
  /// The tag a host report read provides: one organizer's reports, or every
  /// operable organizer's reports when [organizerId] is null.
  static CacheTag hostReports(String? organizerId) =>
      _HostReportsTag(organizerId);

  /// The tags a write to [organizerId]'s data makes stale: that organizer's
  /// reports and the every-organizer reports that include them.
  static Set<CacheTag> writtenFor(String organizerId) => {
    _HostReportsTag(organizerId),
    const _HostReportsTag(null),
  };
}

final class _HostReportsTag extends CacheTag {
  const _HostReportsTag(this.organizerId);

  final String? organizerId;

  @override
  List<Object?> get props => [organizerId];
}
