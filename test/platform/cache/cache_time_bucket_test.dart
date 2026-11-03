import 'package:catch_platform/cache/cache_time_bucket.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads inside one span share a key and the next span does not', () {
    final now = DateTime(2026, 11, 3, 21, 47, 33, 120);
    expect(
      CacheTimeBucket.minute(now),
      CacheTimeBucket.minute(DateTime(2026, 11, 3, 21, 47, 59)),
    );
    expect(
      CacheTimeBucket.minute(now),
      isNot(CacheTimeBucket.minute(DateTime(2026, 11, 3, 21, 48))),
    );
    expect(CacheTimeBucket.minute(now).start, DateTime(2026, 11, 3, 21, 47));
    expect(CacheTimeBucket.hour(now).start, DateTime(2026, 11, 3, 21));
    expect(CacheTimeBucket.day(now).start, DateTime(2026, 11, 3));
    expect(
      CacheTimeBucket.day(now).contains(DateTime(2026, 11, 3, 23, 59)),
      isTrue,
    );
    expect(CacheTimeBucket.day(now).contains(DateTime(2026, 11, 4)), isFalse);
  });

  test('a bucket keeps its time zone and its unit', () {
    final utc = DateTime.utc(2026, 11, 3, 21, 47, 33);
    expect(CacheTimeBucket.hour(utc).start, DateTime.utc(2026, 11, 3, 21));
    expect(CacheTimeBucket.hour(utc).start.isUtc, isTrue);
    expect(
      CacheTimeBucket.day(DateTime(2026, 11, 3)),
      isNot(CacheTimeBucket.hour(DateTime(2026, 11, 3))),
    );
  });
}
