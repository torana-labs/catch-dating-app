import 'dart:convert';

import 'package:catch_dating_app/platform/analytics/host_analytics_choice.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 10, 21);

  test(
    'only a current explicit versioned choice restores permission',
    () async {
      String? stored;
      final store = HostAnalyticsChoiceStore(
        read: () async => stored,
        write: (value) async {
          stored = value;
          return true;
        },
        now: () => now,
      );
      expect(await store.permittedUntil(), isNull);
      expect(await store.save(true), now.add(const Duration(days: 30)));
      expect(await store.permittedUntil(), now.add(const Duration(days: 30)));
      await store.save(false);
      expect(await store.permittedUntil(), isNull);
      expect((jsonDecode(stored!) as Map<String, dynamic>).keys, [
        'version',
        'analytics',
        'chosenAt',
      ]);
    },
  );

  test('old, future, expired and malformed records cannot grant', () async {
    for (final raw in [
      'true',
      '{}',
      'malformed',
      jsonEncode({
        'version': 0,
        'analytics': true,
        'chosenAt': now.millisecondsSinceEpoch,
      }),
      jsonEncode({
        'version': 1,
        'analytics': true,
        'chosenAt': now.add(const Duration(seconds: 1)).millisecondsSinceEpoch,
      }),
      jsonEncode({
        'version': 1,
        'analytics': true,
        'chosenAt': now
            .subtract(const Duration(days: 30))
            .millisecondsSinceEpoch,
      }),
    ]) {
      final store = HostAnalyticsChoiceStore(
        read: () async => raw,
        now: () => now,
      );
      expect(await store.permittedUntil(), isNull);
    }
  });

  test(
    'read failure denies; write failure is visible to the choice owner',
    () async {
      final store = HostAnalyticsChoiceStore(
        read: () async => throw StateError('unavailable'),
        write: (_) async => false,
        now: () => now,
      );
      expect(await store.permittedUntil(), isNull);
      await expectLater(store.save(true), throwsStateError);
    },
  );
}
