/// Cache keys.
///
/// - A read's family argument is its cache key: a value-equality query
///   object (ARCH-PROVIDER-CODEGEN-001). Sets are sorted, strings trimmed and
///   defaults filled before the key is built, so equal requests share one
///   entry.
/// - A timed or session read of account data carries the
///   `AuthenticatedSession` in its key (CACHE-ACCOUNT-001). Watching the uid
///   alone is not enough: a reload keeps the previous account's value
///   attached. Host reads also carry the `organizerId`.
/// - The key builds the request: a `CacheQuery`'s `toRequest()` produces the
///   callable payload, so the key and the request cannot drift apart.
/// - Time never enters a key raw (CACHE-KEY-001). A key that needs time takes
///   a [CacheTimeBucket], or a boundary the owning screen resets on purpose.
library;

import 'package:flutter/foundation.dart';

/// The unit a [CacheTimeBucket] truncates to.
enum CacheTimeBucketUnit { minute, hour, day }

/// A moment truncated to the start of its minute, hour or calendar day, so
/// every read inside that span shares one cache key. The bucket keeps the
/// time zone of the moment it was built from.
@immutable
final class CacheTimeBucket {
  /// The minute that holds [now].
  CacheTimeBucket.minute(DateTime now)
    : this._(
        _truncate(now, CacheTimeBucketUnit.minute),
        CacheTimeBucketUnit.minute,
      );

  /// The hour that holds [now].
  CacheTimeBucket.hour(DateTime now)
    : this._(
        _truncate(now, CacheTimeBucketUnit.hour),
        CacheTimeBucketUnit.hour,
      );

  /// The calendar day that holds [now], in [now]'s time zone.
  CacheTimeBucket.day(DateTime now)
    : this._(_truncate(now, CacheTimeBucketUnit.day), CacheTimeBucketUnit.day);

  const CacheTimeBucket._(this.start, this.unit);

  /// The first instant of the bucket.
  final DateTime start;

  /// The span the bucket covers.
  final CacheTimeBucketUnit unit;

  /// Whether [moment] falls inside this bucket.
  bool contains(DateTime moment) => _truncate(moment, unit) == start;

  @override
  bool operator ==(Object other) =>
      other is CacheTimeBucket && other.unit == unit && other.start == start;

  @override
  int get hashCode => Object.hash(unit, start);

  @override
  String toString() => 'CacheTimeBucket.${unit.name}($start)';
}

DateTime _truncate(DateTime moment, CacheTimeBucketUnit unit) {
  final hour = unit == CacheTimeBucketUnit.day ? 0 : moment.hour;
  final minute = unit == CacheTimeBucketUnit.minute ? moment.minute : 0;
  return moment.isUtc
      ? DateTime.utc(moment.year, moment.month, moment.day, hour, minute)
      : DateTime(moment.year, moment.month, moment.day, hour, minute);
}
